// App Store — install, update and remove .dib packages
(function () {
  const defaultRegistry = () => DIB.defaultRegistry();

  const PERM_TEXT = {
    storage: 'Store its own settings and data on the device',
    fs: 'Read and write files on flash and SD card',
    net: 'Make network requests through the device',
    notify: 'Show desktop notifications',
    system: 'Read chip, memory and sensor information',
    camera: 'Take photos with the camera',
  };

  // The store is opened three ways: bare, with a section name, and with
  // { section, path } when a .dib file is opened from Explorer.
  const argOf = (arg) => (arg && typeof arg === 'object') ? arg : { section: arg };

  function create(arg) {
    const win = WM.open({ appId: 'appstore', title: 'App Store', icon: I.appbox, w: 760, h: 600 });
    const opts = argOf(arg);
    let view = opts.section || 'installed';
    let pendingPath = opts.path || null;

    win.body.innerHTML = `<div class="set">
      <div class="set-side">
        <div class="snav" data-v="installed">${I.appbox}<span>Installed</span></div>
        <div class="snav" data-v="browse">${I.download}<span>Browse</span></div>
        <div class="snav" data-v="install">${I.upload}<span>Install</span></div>
        <div class="snav" data-v="develop">${I.fileCode}<span>Develop</span></div>
      </div>
      <div class="set-body"></div>
    </div>`;

    const body = win.body.querySelector('.set-body');
    const navs = win.body.querySelectorAll('.set-side .snav');
    navs.forEach(n => n.addEventListener('click', () => show(n.dataset.v)));

    function show(v) {
      view = v;
      navs.forEach(n => n.classList.toggle('sel', n.dataset.v === v));
      ({ installed, browse, install, develop }[v] || installed)();
    }
    win.data.showSection = show;
    win.session = () => ({ section: view });

    // ---------- Installed ----------
    async function installed() {
      body.innerHTML = '<h2>Installed apps</h2><div id="list">Loading…</div>';
      let apps;
      try { apps = await DIB.listInstalled(); }
      catch (e) { body.querySelector('#list').textContent = 'Cannot read the app folders'; return; }

      const list = body.querySelector('#list');
      if (!apps.length) {
        list.innerHTML = `<div class="empty-state" style="padding:40px 0">${I.appbox}
          <div><b>No apps installed yet</b><br>
          <small style="color:var(--text-3)">Browse the registry, or install a .dib file you have.</small></div></div>`;
        return;
      }

      list.innerHTML = '';
      apps.forEach(app => {
        const m = app.manifest;
        const el = document.createElement('div');
        el.className = 'as-app';
        const iconHtml = m.icon && app.kind === 'package'
          ? `<img class="app-icon" src="${app.iconUrl || ''}" alt="">`
          : I.appbox;
        el.innerHTML = `${iconHtml}
          <div class="grow">
            <b>${escapeHtml(m.name)}</b>
            <small>${escapeHtml(m.id)} · v${escapeHtml(m.version)}${
              app.kind === 'script' ? ' · loose script' : ''}${
              m.author ? ' · ' + escapeHtml(m.author) : ''}</small>
          </div>
          <button class="btn sm" data-a="open">Open</button>
          <button class="btn sm" data-a="info">Details</button>
          <button class="btn sm danger" data-a="rm">Remove</button>`;

        el.querySelector('[data-a=open]').onclick = () => {
          if (Shell.registry[m.id]) Shell.launch(m.id);
          else Shell.toast('App Store', `${m.name} is installed but not loaded — reload the desktop.`);
        };
        el.querySelector('[data-a=info]').onclick = () => details(app);
        el.querySelector('[data-a=rm]').onclick = async () => {
          if (!await Shell.confirm('Remove app',
            `Delete "${m.name}" and all of its files from the device?`, 'Remove')) return;
          try {
            await DIB.uninstall(app.kind === 'script' ? app.path : app.dir);
            DIB.deactivate(m.id);
            Shell.toast('App Store', `${m.name} removed`, I.appbox);
            installed();
          } catch (e) { Shell.toast('App Store', 'Remove failed: ' + e.message); }
        };
        list.appendChild(el);
      });

      if (DIB.errors.length) {
        const warn = document.createElement('div');
        warn.style.cssText = 'margin-top:18px;padding:12px 14px;border-radius:7px;' +
          'background:rgba(232,17,35,.12);border:1px solid rgba(232,17,35,.3);font-size:12.5px';
        warn.innerHTML = '<b>Some apps failed to load at startup</b>' +
          DIB.errors.map(e => `<div style="margin-top:5px;color:var(--text-2)">
            ${escapeHtml(e.id)}: ${escapeHtml(e.error)}</div>`).join('');
        list.appendChild(warn);
      }
    }

    function details(app) {
      const m = app.manifest;
      const perms = m.permissions || [];
      Shell.dialog({
        title: m.name,
        wide: true,
        body: `
          <div style="font-size:13px;line-height:1.8">
            <b>${escapeHtml(m.id)}</b> · v${escapeHtml(m.version)}<br>
            ${m.author ? 'by ' + escapeHtml(m.author) + '<br>' : ''}
            ${m.description ? `<p style="margin:10px 0">${escapeHtml(m.description)}</p>` : ''}
            <div style="color:var(--text-3);font-size:12px;margin-top:8px">
              ${escapeHtml(app.dir)}${m.installedAt
                ? '<br>installed ' + new Date(m.installedAt).toLocaleString() : ''}
              ${m.source ? '<br>source: ' + escapeHtml(m.source) : ''}
            </div>
            <h3 style="font-size:13px;margin:16px 0 8px">Permissions</h3>
            ${perms.length
              ? perms.map(p => `<div style="display:flex;gap:8px;margin-bottom:5px">
                  <span style="color:var(--accent)">•</span>
                  <span>${escapeHtml(PERM_TEXT[p] || p)}</span></div>`).join('')
              : '<div style="color:var(--text-3)">None declared</div>'}
          </div>`,
        buttons: [{ label: 'Close', primary: true }],
      });
    }

    // ---------- Browse a registry ----------
    async function browse() {
      const url = Shell.settings.registry || defaultRegistry();
      body.innerHTML = `<h2>Browse</h2>
        <div class="set-row" style="margin-bottom:14px">
          <div class="grow" style="display:flex;flex-direction:column;gap:8px">
            <b>Registry</b>
            <input class="tinput" id="reg-url" value="${escapeHtml(url)}">
            <small>A JSON index of packages. Point it anywhere you like.</small>
          </div>
          <button class="btn primary" id="reg-load">Load</button>
        </div>
        <div id="reg-list"></div>`;

      body.querySelector('#reg-load').onclick = () => {
        Shell.settings.registry = body.querySelector('#reg-url').value.trim();
        Shell.saveSettings();
        loadRegistry();
      };
      loadRegistry();

      async function loadRegistry() {
        const out = body.querySelector('#reg-list');
        const target = body.querySelector('#reg-url').value.trim();
        out.innerHTML = '<div style="padding:14px;color:var(--text-2)">Fetching the registry through the device…</div>';

        let reg;
        try { reg = await DIB.fetchRegistry(target); }
        catch (e) {
          out.innerHTML = `<div style="padding:16px;border-radius:7px;
            background:var(--card);border:1px solid var(--stroke);font-size:13px">
            <b>Could not load the registry</b>
            <div style="color:var(--text-2);margin-top:6px">${escapeHtml(e.message)}</div>
            <div style="color:var(--text-3);margin-top:10px;font-size:12px">
              The device fetches this, not your browser, so it needs a Wi-Fi
              uplink — check <b>Settings → Network</b>. A <b>404</b> on a
              registry that should exist usually means the repository hosting
              it is private; raw file URLs on a private repository are not
              readable without a token. You can point the box above at any
              other registry, or install a <b>.dib</b> file directly from the
              Install tab.
            </div></div>`;
          return;
        }

        const local = await DIB.listInstalled();
        out.innerHTML = `<h3 style="font-size:13px;margin:6px 0 10px">
          ${escapeHtml(reg.name || 'Registry')} · ${reg.apps.length} app(s)</h3>`;

        reg.apps.forEach(entry => {
          const have = local.find(a => a.manifest.id === entry.id);
          const newer = have && DIB.cmpVersion(entry.version, have.manifest.version) > 0;
          const el = document.createElement('div');
          el.className = 'as-app';
          el.innerHTML = `${I.appbox}
            <div class="grow">
              <b>${escapeHtml(entry.name)}</b>
              <small>v${escapeHtml(entry.version)}${entry.author ? ' · ' + escapeHtml(entry.author) : ''}
                ${entry.size ? ' · ' + fmtBytes(entry.size) : ''}</small>
              ${entry.description ? `<small style="display:block;margin-top:3px">${escapeHtml(entry.description)}</small>` : ''}
            </div>
            <button class="btn sm ${have && !newer ? '' : 'primary'}">${
              newer ? 'Update' : have ? 'Reinstall' : 'Install'}</button>`;
          el.querySelector('button').onclick = () => installFromUrl(entry.url, entry.sha256, entry.name);
          out.appendChild(el);
        });
      }
    }

    // ---------- Install ----------
    function install() {
      body.innerHTML = `<h2>Install an app</h2>
        <div class="set-group">
          <h3>From a .dib file</h3>
          <div class="set-row">
            <div class="grow"><b>Choose a package</b>
              <small>The file is unpacked in your browser and written to the device.</small></div>
            <button class="btn primary" id="pick">Choose file…</button>
            <input type="file" accept=".dib" hidden>
          </div>
          <div class="set-row">
            <div class="grow"><b>From the device</b>
              <small>A .dib already sitting on flash or the SD card.</small></div>
            <button class="btn" id="from-fs">Browse device…</button>
          </div>
        </div>
        <div class="set-group">
          <h3>From a URL</h3>
          <div class="set-row">
            <div class="grow" style="display:flex;flex-direction:column;gap:8px">
              <b>Direct link to a .dib</b>
              <input class="tinput" id="url" placeholder="https://example.com/app.dib">
              <small>The device downloads it — your browser cannot fetch other sites from here.</small>
            </div>
            <button class="btn primary" id="go-url">Install</button>
          </div>
        </div>`;

      const fileInput = body.querySelector('input[type=file]');
      body.querySelector('#pick').onclick = () => fileInput.click();
      fileInput.onchange = async () => {
        const f = fileInput.files[0];
        fileInput.value = '';
        if (f) installBytes(new Uint8Array(await f.arrayBuffer()), 'file:' + f.name);
      };

      body.querySelector('#from-fs').onclick = async () => {
        const p = await Shell.pickPath({ mode: 'open', title: 'Choose a .dib package' });
        if (!p) return;
        const r = await fetch(API.fsReadUrl(p));
        installBytes(new Uint8Array(await r.arrayBuffer()), 'device:' + p);
      };

      body.querySelector('#go-url').onclick = () => {
        const u = body.querySelector('#url').value.trim();
        if (u) installFromUrl(u);
      };
    }

    async function installFromUrl(url, sha256, label) {
      const d = progressDialog(`Downloading ${label || 'package'}…`,
        'The device is fetching this over its Wi-Fi uplink.');
      try {
        const bytes = await DIB.download(url, { sha256 });
        d.close();
        installBytes(bytes, url);
      } catch (e) {
        d.close();
        Shell.dialog({
          title: 'Download failed',
          body: `<div style="font-size:13px;line-height:1.7">${escapeHtml(e.message)}
            <div style="color:var(--text-3);margin-top:10px;font-size:12px">
              The device downloads packages, not your browser. It needs a Wi-Fi
              uplink — check <b>Settings → Network</b>.</div></div>`,
          buttons: [{ label: 'Close', primary: true }],
        });
      }
    }

    function progressDialog(title, note) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div style="margin-bottom:10px" class="p-note">${escapeHtml(note || '')}</div>
        <div class="meter"><i style="width:30%"></i></div>`;
      return Object.assign(
        Shell.dialog({ title, body: wrap, buttons: [], dismissable: false }),
        {
          set(pct, text) {
            wrap.querySelector('.meter i').style.width = pct + '%';
            if (text) wrap.querySelector('.p-note').textContent = text;
          },
        });
    }

    async function installBytes(bytes, source) {
      let pkg;
      try { pkg = await DIB.parse(bytes); }
      catch (e) {
        Shell.dialog({
          title: 'This package cannot be installed',
          body: `<div style="font-size:13px;line-height:1.7">${escapeHtml(e.message)}</div>`,
          buttons: [{ label: 'Close', primary: true }],
        });
        return;
      }

      const m = pkg.manifest;
      const existing = (await DIB.listInstalled()).find(a => a.manifest.id === m.id);
      const perms = m.permissions || [];

      const ok = await new Promise(res => {
        Shell.dialog({
          title: existing ? `Update ${m.name}?` : `Install ${m.name}?`,
          wide: true,
          body: `<div style="font-size:13px;line-height:1.7">
            <b>${escapeHtml(m.name)}</b> v${escapeHtml(m.version)}
            ${existing ? `<span style="color:var(--text-3)"> — replacing v${escapeHtml(existing.manifest.version)}</span>` : ''}
            ${m.author ? '<br>by ' + escapeHtml(m.author) : ''}
            ${m.description ? `<p style="margin:10px 0">${escapeHtml(m.description)}</p>` : ''}
            <div style="color:var(--text-3);font-size:12px">
              ${pkg.files.size} file(s) · ${fmtBytes(pkg.packageSize)}
            </div>
            <h3 style="font-size:13px;margin:16px 0 8px">This app will be able to</h3>
            ${perms.length
              ? perms.map(p => `<div style="display:flex;gap:8px;margin-bottom:5px">
                  <span style="color:var(--accent)">•</span>
                  <span>${escapeHtml(PERM_TEXT[p] || p)}</span></div>`).join('')
              : '<div style="color:var(--text-3)">Nothing beyond drawing its own window</div>'}
            <div style="margin-top:16px;padding:11px 13px;border-radius:6px;
                        background:rgba(255,185,0,.1);border:1px solid rgba(255,185,0,.28);
                        font-size:12px;color:var(--text-2)">
              Installed apps run with the same privileges as the desktop itself.
              Only install packages from a source you trust.
            </div>
          </div>`,
          buttons: [
            { label: 'Cancel', onClick: () => res(false) },
            { label: existing ? 'Update' : 'Install', primary: true, onClick: () => res(true) },
          ],
          dismissable: false,
        });
      });
      if (!ok) return;

      const d = progressDialog(`Installing ${m.name}…`, 'Writing files to the device');
      try {
        await DIB.install(pkg, {
          source,
          onProgress: (done, total, path) =>
            d.set(Math.round(done / total * 100), `${done}/${total}  ${path}`),
        });
        // Started right here rather than after a reload. Installing
        // something is not a reason to close everything the user had open.
        d.set(100, 'Starting it…');
        let live = true;
        try { await DIB.activate(m.id); }
        catch (e) { live = false; console.warn('activate failed', e); }
        d.close();

        if (live) {
          Shell.toast('App Store', `${m.name} is installed and ready`, I.appbox);
          show('installed');
        } else {
          Shell.dialog({
            title: `${m.name} installed`,
            body: `<div style="font-size:13px;line-height:1.7">
              The files are on the device, but the app would not start on this
              running desktop. Reloading will pick it up.</div>`,
            buttons: [
              { label: 'Later', onClick: () => show('installed') },
              { label: 'Reload now', primary: true, onClick: () => location.reload() },
            ],
          });
        }
      } catch (e) {
        d.close();
        Shell.toast('App Store', 'Install failed: ' + e.message);
      }
    }

    // ---------- Develop ----------
    function develop() {
      body.innerHTML = `<h2>Develop</h2>
        <div style="font-size:13px;line-height:1.75;color:var(--text-2);margin-bottom:18px">
          A Dsp32 app is a <code>.dib</code> package: a manifest plus your code,
          in one file. Build one with <code>tools/dibpack.py</code>, then install
          it here — or drop a plain <code>.js</code> file in
          <code>/flash/Apps</code> and skip the packaging entirely.
        </div>
        <div class="set-group">
          <div class="set-row">
            <div class="grow"><b>Create a starter app</b>
              <small>Writes a working single-file app to /flash/Apps and opens it in Notepad.</small></div>
            <button class="btn primary" id="scaffold">Create</button>
          </div>
          <div class="set-row">
            <div class="grow"><b>Open the app folder</b>
              <small>/flash/Apps</small></div>
            <button class="btn" id="open-dir">Open</button>
          </div>
        </div>
        <div class="set-group">
          <h3>Package layout</h3>
          <pre style="background:var(--card);border:1px solid var(--stroke);border-radius:7px;
                      padding:14px;font-size:12px;font-family:var(--mono);overflow-x:auto;
                      color:var(--text-2);line-height:1.6">myapp/
  dib.json      manifest: id, name, version, entry, permissions
  main.js       calls Dsp32.app(fn)
  icon.svg      optional

python3 tools/dibpack.py myapp/ -o myapp.dib</pre>
        </div>
        <div class="set-group">
          <h3>Permissions you can declare</h3>
          ${DIB.KNOWN_PERMS.map(p => `<div class="set-row" style="padding:9px 14px">
            <div class="grow"><b style="font-family:var(--mono);font-size:12.5px">${p}</b>
            <small>${escapeHtml(PERM_TEXT[p])}</small></div></div>`).join('')}
        </div>`;

      body.querySelector('#scaffold').onclick = async () => {
        try { await API.fsMkdir('/flash/Apps'); } catch (e) {}
        const path = '/flash/Apps/hello.js';
        await API.fsWrite(path, SCAFFOLD);
        Shell.toast('App Store', 'Starter app written — reload to run it', I.appbox);
        Shell.launch('notepad', path);
      };
      body.querySelector('#open-dir').onclick = () => Shell.launch('explorer', '/flash/Apps');
    }

    win.data.installPath = async (p) => {
      show('install');
      try {
        const r = await fetch(API.fsReadUrl(p));
        installBytes(new Uint8Array(await r.arrayBuffer()), 'device:' + p);
      } catch (e) { Shell.toast('App Store', 'Could not read ' + p); }
    };

    show(view);
    if (pendingPath) { const p = pendingPath; pendingPath = null; win.data.installPath(p); }
    return win;
  }

  const SCAFFOLD = `// Dsp32 app — drop this in /flash/Apps and reload the desktop.
// Everything the platform offers is available: Shell, WM, API, I (icons).
(function () {
  Shell.registerApp({
    id: 'hello',
    name: 'Hello App',
    icon: I.appbox,
    launch() {
      const win = WM.open({ appId: 'hello', title: 'Hello App', icon: I.appbox, w: 440, h: 320 });
      win.body.innerHTML = \`
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;
                    justify-content:center;gap:14px;padding:24px;text-align:center">
          <h2>Hello from your own app</h2>
          <button class="btn primary" id="go">Read the chip</button>
          <div id="out" style="color:var(--text-2);font-size:13px"></div>
        </div>\`;
      win.body.querySelector('#go').onclick = async () => {
        const s = await API.system();
        win.body.querySelector('#out').textContent =
          s.chip + ' @ ' + s.cpuMhz + ' MHz · ' + fmtBytes(s.heapFree) + ' free';
      };
      return win;
    },
  });
})();
`;

  Shell.registerApp({
    id: 'appstore', name: 'App Store', icon: I.appbox, order: 10, pin: true,
    launch: (arg) => create(arg),
    onArgs: (win, arg) => {
      const o = argOf(arg);
      if (o.section && win.data.showSection) win.data.showSection(o.section);
      if (o.path && win.data.installPath) win.data.installPath(o.path);
    },
  });
})();
