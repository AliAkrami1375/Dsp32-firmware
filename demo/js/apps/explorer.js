// File Explorer — browse flash + SD with upload/download/rename/delete
(function () {
  function create(startPath) {
    const win = WM.open({
      appId: 'explorer', title: 'File Explorer', icon: I.explorer, w: 860, h: 560,
    });
    // A restored session hands back whatever session() returned last time.
    const restored = startPath && typeof startPath === 'object' ? startPath : null;
    const st = {
      path: (restored ? restored.path : startPath) || '/flash',
      history: restored ? restored.history || [] : [],
      sel: new Set(), entries: [],
    };
    win.data.explorer = st;
    win.session = () => ({ path: st.path, history: st.history.slice(-10) });

    win.body.innerHTML = `
      <div class="exp">
        <div class="exp-toolbar">
          <button class="tbtn ico" data-a="back" title="Back">${I.back}</button>
          <button class="tbtn ico" data-a="up" title="Up one level">${I.up}</button>
          <div class="tsep"></div>
          <button class="tbtn" data-a="new-file">${I.newFile}<span>New file</span></button>
          <button class="tbtn" data-a="new-folder">${I.newFolder}<span>New folder</span></button>
          <button class="tbtn" data-a="upload">${I.upload}<span>Upload</span></button>
          <div class="tsep"></div>
          <button class="tbtn need-sel" data-a="download">${I.download}<span>Download</span></button>
          <button class="tbtn need-sel" data-a="rename">${I.rename}<span>Rename</span></button>
          <button class="tbtn need-sel" data-a="delete">${I.trash}<span>Delete</span></button>
          <div class="tsep"></div>
          <button class="tbtn" data-a="refresh">${I.refresh}<span>Refresh</span></button>
          <input type="file" multiple hidden>
        </div>
        <div class="exp-crumbs"></div>
        <div class="exp-main">
          <div class="exp-side"></div>
          <div class="exp-files"></div>
        </div>
        <div class="exp-status"></div>
      </div>`;

    const $ = s => win.body.querySelector(s);
    const filesEl = $('.exp-files');
    const fileInput = $('input[type=file]');

    // ----- sidebar -----
    async function renderSide() {
      const info = await Shell.refreshFsInfo() || {};
      const side = $('.exp-side');
      side.innerHTML = '';
      const items = [
        { p: '/flash', name: 'Flash', icon: I.hdd, info: info.flash },
        { p: '/sd', name: 'SD Card', icon: I.sdcard, info: info.sd },
        { sep: true },
        { p: '/flash/DCIM', name: 'Pictures', icon: I.photos },
        { p: '/flash/Documents', name: 'Documents', icon: I.fileText },
        { p: '/flash/Apps', name: 'Apps', icon: I.fileCode },
      ];
      items.forEach(it => {
        if (it.sep) { side.innerHTML += '<div style="height:1px;background:var(--stroke);margin:8px 4px"></div>'; return; }
        const ok = !it.info || it.info.ok;
        const el = document.createElement('div');
        el.className = 'snav' + (st.path === it.p ? ' sel' : '');
        el.style.opacity = ok ? 1 : 0.45;
        el.innerHTML = `${it.icon}<span>${it.name}</span>`;
        if (ok) el.addEventListener('click', () => nav(it.p));
        side.appendChild(el);
        if (it.info && it.info.ok && it.info.total) {
          const pct = Math.round(it.info.used / it.info.total * 100);
          const u = document.createElement('div');
          u.className = 'susage';
          u.innerHTML = `<div class="meter${pct > 90 ? ' crit' : pct > 75 ? ' warn' : ''}"><i style="width:${pct}%"></i></div>
            <small>${fmtBytes(it.info.total - it.info.used)} free</small>`;
          side.appendChild(u);
        }
      });
    }

    // ----- breadcrumbs -----
    function renderCrumbs() {
      const c = $('.exp-crumbs');
      c.innerHTML = '';
      let acc = '';
      st.path.split('/').filter(Boolean).forEach((p, i) => {
        acc += '/' + p;
        const target = acc;
        if (i) c.innerHTML += '<span class="csep">›</span>';
        const el = document.createElement('span');
        el.className = 'crumb';
        el.textContent = i === 0 ? (p === 'flash' ? 'Flash' : 'SD Card') : p;
        el.addEventListener('click', () => nav(target));
        c.appendChild(el);
      });
    }

    // ----- files -----
    async function refresh() {
      st.sel.clear();
      renderCrumbs();
      renderSide();
      try {
        const r = await API.fsList(st.path);
        st.entries = r.entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      } catch (e) {
        st.entries = [];
        Shell.toast('Explorer', 'Cannot open ' + st.path);
      }
      renderFiles();
    }

    // Selection repaints the existing rows rather than rebuilding them. A
    // rebuild between the two halves of a double-click replaces the element
    // the first click landed on, and the browser then fires dblclick on the
    // container instead of the item — which is why double-click stopped
    // opening anything.
    function paintSelection() {
      filesEl.querySelectorAll('.fitem').forEach(el => {
        el.classList.toggle('sel', st.sel.has(el.dataset.name));
      });
      updateStatus();
      updateToolbar();
    }

    function renderFiles() {
      filesEl.innerHTML = '';
      if (!st.entries.length) {
        filesEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${I.folder}<div>This folder is empty</div></div>`;
      }
      st.entries.forEach(en => {
        const full = st.path + '/' + en.name;
        const el = document.createElement('div');
        el.className = 'fitem' + (st.sel.has(en.name) ? ' sel' : '');
        el.dataset.name = en.name;
        el.innerHTML = `${Platform.iconFor(en.name, en.dir)}<span>${escapeHtml(en.name)}</span>
          <small>${en.dir ? 'Folder' : fmtBytes(en.size)}</small>`;

        // Platform decides whether a tap or a double-click opens, so touch
        // devices — the likely client of an ESP32 hotspot — behave sensibly.
        Platform.bindActivate(el,
          () => openEntry(en),
          (e) => {
            e.stopPropagation();
            if (!e.ctrlKey && !e.metaKey) st.sel.clear();
            st.sel.add(en.name);
            paintSelection();
          });

        el.addEventListener('contextmenu', e => {
          e.preventDefault(); e.stopPropagation();
          if (!st.sel.has(en.name)) { st.sel.clear(); st.sel.add(en.name); paintSelection(); }

          const items = [
            { label: 'Open', icon: I.openFile, onClick: () => openEntry(en) },
          ];

          if (!en.dir) {
            const handlers = Platform.handlersFor(en.name);
            handlers.slice(0, 4).forEach(app => {
              items.push({
                label: `Open with ${app.name}`, icon: app.icon,
                onClick: () => Shell.launch(app.id, full),
              });
            });
            items.push({
              label: 'Open with…', icon: I.appbox,
              onClick: () => Platform.openWithDialog(full),
            });
            items.push({ sep: true });
            items.push({ label: 'Download', icon: I.download, onClick: () => act('download') });
          }

          items.push({ sep: true });
          items.push({ label: 'Rename', icon: I.rename, onClick: () => act('rename') });
          items.push({ label: 'Delete', icon: I.trash, danger: true, onClick: () => act('delete') });
          items.push({ sep: true });
          items.push({
            label: 'Properties', icon: I.info,
            onClick: () => properties(en, full),
          });

          Shell.ctxMenu(e.clientX, e.clientY, items);
        });
        filesEl.appendChild(el);
      });
      updateStatus();
      updateToolbar();
    }

    filesEl.addEventListener('click', e => {
      if (e.target !== filesEl) return;
      st.sel.clear();
      paintSelection();
    });
    filesEl.addEventListener('contextmenu', e => {
      if (e.target !== filesEl) return;
      e.preventDefault();
      Shell.ctxMenu(e.clientX, e.clientY, [
        { label: 'New file', icon: I.newFile, onClick: () => act('new-file') },
        { label: 'New folder', icon: I.newFolder, onClick: () => act('new-folder') },
        { label: 'Upload files', icon: I.upload, onClick: () => act('upload') },
        { sep: true },
        { label: 'Refresh', icon: I.refresh, onClick: refresh },
      ]);
    });

    function updateStatus() {
      const free = (() => {
        const info = Shell.fsInfo;
        const m = st.path.startsWith('/sd') ? (info && info.sd) : (info && info.flash);
        return m && m.total ? fmtBytes(m.total - m.used) + ' free' : '';
      })();
      $('.exp-status').innerHTML =
        `<span>${st.entries.length} items</span>` +
        (st.sel.size ? `<span>${st.sel.size} selected</span>` : '') +
        `<span style="margin-left:auto">${free}</span>`;
    }
    function updateToolbar() {
      win.body.querySelectorAll('.need-sel').forEach(b => b.disabled = !st.sel.size);
    }

    function nav(p) {
      st.history = st.history || [];
      if (st.path && st.path !== p) st.history.push(st.path);
      st.path = p;
      win.setTitle('File Explorer — ' + p);
      refresh();
    }
    function back() {
      if (!st.history || !st.history.length) return;
      st.path = st.history.pop();
      win.setTitle('File Explorer — ' + st.path);
      refresh();
    }
    function up() {
      const parts = st.path.split('/').filter(Boolean);
      if (parts.length > 1) nav('/' + parts.slice(0, -1).join('/'));
    }
    function openEntry(en) {
      const full = st.path + '/' + en.name;
      if (en.dir) nav(full);
      else Platform.open(full);
    }
    function selPaths() { return [...st.sel].map(n => st.path + '/' + n); }

    function properties(en, full) {
      Shell.dialog({
        title: en.name,
        body: `<table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:var(--text-2)">Type</td>
              <td>${escapeHtml(Platform.describe(en.name, en.dir))}</td></tr>
          <tr><td style="padding:6px 0;color:var(--text-2)">Location</td>
              <td style="font-family:var(--mono);font-size:12px">${escapeHtml(st.path)}</td></tr>
          <tr><td style="padding:6px 0;color:var(--text-2)">Size</td>
              <td>${en.dir ? '—' : fmtBytes(en.size) + ` (${en.size.toLocaleString()} bytes)`}</td></tr>
          <tr><td style="padding:6px 0;color:var(--text-2)">Full path</td>
              <td style="font-family:var(--mono);font-size:12px;word-break:break-all">${escapeHtml(full)}</td></tr>
        </table>`,
        buttons: [{ label: 'Close', primary: true }],
      });
    }

    // ----- actions -----
    async function act(a) {
      switch (a) {
        case 'refresh': return refresh();
        case 'back': return back();
        case 'up': return up();
        case 'new-file': {
          const n = await Shell.prompt('New file', 'File name', 'untitled.txt');
          if (!n) return;
          try { await API.fsWrite(st.path + '/' + n, ''); Platform.emit('fs:changed', st.path); }
          catch (e) { Shell.toast('Explorer', 'Create failed: ' + e.message); }
          return;
        }
        case 'new-folder': {
          const n = await Shell.prompt('New folder', 'Folder name', 'New folder');
          if (!n) return;
          try { await API.fsMkdir(st.path + '/' + n); Platform.emit('fs:changed', st.path); }
          catch (e) { Shell.toast('Explorer', 'Create failed: ' + e.message); }
          return;
        }
        case 'upload': return fileInput.click();
        case 'download': return selPaths().forEach(p => Shell.downloadPath(p));
        case 'rename': {
          const old = [...st.sel][0];
          if (!old) return;
          const entry = st.entries.find(x => x.name === old);
          const dot = old.lastIndexOf('.');
          const n = await Shell.prompt('Rename', 'New name', old, {
            // Preselect the stem so typing replaces the name and keeps the
            // extension, which is what every file manager does.
            selectRange: (!entry || entry.dir || dot <= 0) ? null : [0, dot],
          });
          if (!n || n === old) return;
          try { await API.fsRename(st.path + '/' + old, st.path + '/' + n); Platform.emit('fs:changed', st.path); }
          catch (e) { Shell.toast('Explorer', 'Rename failed: ' + e.message); }
          return;
        }
        case 'delete': {
          const items = [...st.sel];
          if (!items.length) return;
          const msg = items.length === 1 ? `Delete "${items[0]}" permanently?`
            : `Delete ${items.length} items permanently?`;
          if (!await Shell.confirm('Delete', msg, 'Delete')) return;
          for (const p of selPaths()) {
            try { await API.fsDelete(p); }
            catch (e) { Shell.toast('Explorer', 'Delete failed: ' + e.message); }
          }
          return Platform.emit('fs:changed', st.path);
        }
      }
    }
    win.body.querySelectorAll('.tbtn').forEach(b =>
      b.addEventListener('click', () => act(b.dataset.a)));

    // ----- uploads -----
    async function uploadFiles(files) {
      if (!files.length) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="up-name" style="margin-bottom:8px"></div>
        <div class="meter"><i style="width:0%"></i></div>
        <div class="up-pct" style="margin-top:6px;font-size:12px;color:var(--text-3)"></div>`;
      const d = Shell.dialog({ title: 'Uploading…', body: wrap, buttons: [], dismissable: false });
      let done = 0;
      for (const f of files) {
        wrap.querySelector('.up-name').textContent = f.name;
        try {
          await new Promise((res, rej) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/fs/write?path=${encodeURIComponent(st.path + '/' + f.name)}`);
            xhr.upload.onprogress = e => {
              const pct = Math.round(((done + (e.loaded / e.total)) / files.length) * 100);
              wrap.querySelector('.meter i').style.width = pct + '%';
              wrap.querySelector('.up-pct').textContent = `${f.name} — ${pct}%`;
            };
            xhr.onload = () => xhr.status < 300 ? res() : rej(new Error('HTTP ' + xhr.status));
            xhr.onerror = () => rej(new Error('network error'));
            xhr.send(f);
          });
        } catch (e) { Shell.toast('Upload failed', f.name + ': ' + e.message); }
        done++;
      }
      d.close();
      Shell.toast('Upload complete', `${files.length} file(s) → ${st.path}`, I.upload);
      Platform.emit('fs:changed', st.path);
    }
    fileInput.addEventListener('change', () => { uploadFiles([...fileInput.files]); fileInput.value = ''; });
    filesEl.addEventListener('dragover', e => { e.preventDefault(); filesEl.classList.add('drag'); });
    filesEl.addEventListener('dragleave', () => filesEl.classList.remove('drag'));
    filesEl.addEventListener('drop', e => {
      e.preventDefault(); filesEl.classList.remove('drag');
      uploadFiles([...e.dataTransfer.files]);
    });

    // Any write from anywhere — another Explorer, Notepad saving, an app
    // install — refreshes this view if it is showing the affected folder.
    Platform.onWindow(win, 'fs:changed', (path) => {
      if (!path || path.startsWith(st.path)) refresh();
    });

    nav(st.path);
    return win;
  }

  Shell.registerApp({
    id: 'explorer', name: 'File Explorer', icon: I.explorer, order: 1, pin: true, multi: true,
    // A string is a path to open; an object is a restored session.
    launch: (arg) => create(arg),
  });
})();
