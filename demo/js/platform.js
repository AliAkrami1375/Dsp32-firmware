// Platform services shared by the shell and every app.
//
// Three things live here because more than one place needs them and they must
// agree: how a pointer activates something, what opens a given file, and a
// small event bus so an action in one window refreshes another.
window.Platform = (function () {
  // ---- input ------------------------------------------------------------
  // A phone is the most likely thing connected to an ESP32 hotspot, and
  // dblclick is unreliable on touch. Coarse pointers open on a single tap;
  // mice keep double-click so selection still works the way people expect.
  //
  // Only the media queries are consulted. navigator.maxTouchPoints reports a
  // non-zero value on every Windows laptop with a touchscreen — including
  // while the user is driving it with a mouse — which made those machines
  // open things on a single click.
  const coarse = matchMedia('(pointer: coarse)').matches &&
                 matchMedia('(hover: none)').matches;

  function singleClickOpens() {
    const pref = Shell.settings && Shell.settings.openMode;
    if (pref === 'single') return true;
    if (pref === 'double') return false;
    return coarse;                       // "auto"
  }

  // Set by a drag so the click that follows it does not also open the item.
  // Relying on stopImmediatePropagation does not work here: listeners on the
  // event's own target fire in registration order regardless of the capture
  // flag, so a suppressor added later still runs last.
  let dragUntil = 0;
  function suppressNextClick(ms) { dragUntil = Date.now() + (ms || 400); }
  const clickSuppressed = () => Date.now() < dragUntil;

  // Wires up open-on-activate for a list item, whichever input is in use.
  // `onOpen` runs once per activation; `onSelect` runs on every press.
  function bindActivate(el, onOpen, onSelect) {
    let lastOpen = 0;

    el.addEventListener('click', e => {
      if (clickSuppressed()) return;
      if (onSelect) onSelect(e);
      if (!singleClickOpens()) return;
      // A touch double-tap emits two clicks; only the first should open.
      const now = Date.now();
      if (now - lastOpen < 400) return;
      lastOpen = now;
      onOpen(e);
    });

    el.addEventListener('dblclick', e => {
      if (clickSuppressed() || singleClickOpens()) return;
      onOpen(e);
    });

    // Long-press stands in for right-click on touch.
    let timer = null, startPt = null;
    el.addEventListener('touchstart', e => {
      const t = e.touches[0];
      startPt = { x: t.clientX, y: t.clientY };
      timer = setTimeout(() => {
        suppressNextClick(600);
        el.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true,
          clientX: startPt.x, clientY: startPt.y,
        }));
      }, 500);
    }, { passive: true });

    const cancel = () => { clearTimeout(timer); timer = null; };
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('touchmove', e => {
      // A finger that has travelled is dragging or scrolling, not pressing.
      if (!startPt) return cancel();
      const t = e.touches[0];
      if (Math.abs(t.clientX - startPt.x) + Math.abs(t.clientY - startPt.y) > 10) cancel();
    }, { passive: true });
  }

  // ---- file types -------------------------------------------------------
  // One table, so Explorer, the desktop, the terminal and any app all agree
  // on what a file is and which app should get it.
  const TYPES = [
    {
      id: 'text', label: 'Text document', icon: () => I.fileText,
      ext: ['txt', 'md', 'log', 'csv', 'ini', 'conf', 'cfg', 'nfo'],
      handlers: ['notepad'],
    },
    {
      id: 'code', label: 'Source file', icon: () => I.fileCode,
      ext: ['js', 'json', 'c', 'h', 'cpp', 'hpp', 'py', 'html', 'htm', 'css',
            'xml', 'yml', 'yaml', 'sh', 'ts', 'rs', 'go', 'java', 'sql'],
      handlers: ['notepad'],
    },
    {
      id: 'image', label: 'Image', icon: () => I.fileImg,
      ext: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'],
      handlers: ['viewer'],
    },
    {
      id: 'audio', label: 'Audio', icon: () => I.fileAudio,
      ext: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
      handlers: [],
    },
    {
      id: 'video', label: 'Video', icon: () => I.fileVideo,
      ext: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
      handlers: [],
    },
    {
      id: 'archive', label: 'Archive', icon: () => I.fileZip,
      ext: ['zip', 'gz', 'tar', '7z', 'rar', 'bz2', 'xz'],
      handlers: [],
    },
    {
      id: 'package', label: 'Dsp32 app package', icon: () => I.appbox,
      ext: ['dib'],
      handlers: ['appstore'],
      // The store needs to land on its install page with this file.
      open: (path) => Shell.launch('appstore', { section: 'install', path }),
    },
    {
      id: 'flow', label: 'Diba Manager flow', icon: () => I.appbox,
      ext: ['flow'],
      handlers: ['ir.dibachain.manager'],
    },
  ];

  const extOf = (path) => (String(path).split('.').pop() || '').toLowerCase();

  function typeOf(path) {
    const e = extOf(path);
    return TYPES.find(t => t.ext.includes(e)) || null;
  }

  function describe(path, isDir) {
    if (isDir) return 'Folder';
    const t = typeOf(path);
    if (t) return t.label;
    const e = extOf(path);
    return e ? `${e.toUpperCase()} file` : 'File';
  }

  function iconFor(path, isDir) {
    if (isDir) return I.folder;
    const t = typeOf(path);
    return t ? t.icon() : I.file;
  }

  // Every app that can open this file, best first. An app opts in either by
  // appearing in a type's `handlers` or by declaring `opens` when it registers.
  function handlersFor(path) {
    const t = typeOf(path);
    const ids = t ? [...t.handlers] : [];
    const e = extOf(path);

    Shell.apps.forEach(app => {
      if (!app.opens) return;
      const claims = app.opens === '*' || app.opens.includes(e) ||
                     (t && app.opens.includes(t.id));
      if (claims && !ids.includes(app.id)) ids.push(app.id);
    });

    // A text-ish file can always fall back to the editor.
    if (t && (t.id === 'text' || t.id === 'code') && !ids.includes('notepad')) {
      ids.push('notepad');
    }
    return ids.filter(id => Shell.registry[id]).map(id => Shell.registry[id]);
  }

  // Opens a path with the best available app, or offers a choice when
  // nothing claims it.
  function open(path, appId) {
    if (appId) return Shell.launch(appId, path);

    const t = typeOf(path);
    if (t && t.open) return t.open(path);

    const apps = handlersFor(path);
    if (apps.length) return Shell.launch(apps[0].id, path);

    return openWithDialog(path);
  }

  function openWithDialog(path) {
    const name = path.split('/').pop();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="font-size:13px;color:var(--text-2);margin-bottom:10px">
        Nothing on this device claims <b>${escapeHtml(name)}</b>.
        Pick an app, or download it to your own device.
      </div>
      <div class="picker-list"></div>`;

    const list = wrap.querySelector('.picker-list');
    const candidates = Shell.apps.filter(a =>
      ['notepad', 'viewer', 'appstore'].includes(a.id) || a.opens);

    let dlg;
    candidates.forEach(app => {
      const row = document.createElement('div');
      row.className = 'picker-item';
      row.innerHTML = `${app.icon}<span>${escapeHtml(app.name)}</span>`;
      row.onclick = () => { dlg.close(); Shell.launch(app.id, path); };
      list.appendChild(row);
    });

    dlg = Shell.dialog({
      title: 'Open with',
      body: wrap,
      buttons: [
        { label: 'Cancel' },
        { label: 'Download', primary: true, onClick: () => Shell.downloadPath(path) },
      ],
    });
    return null;
  }

  // ---- event bus --------------------------------------------------------
  // Actions ripple: writing a file should refresh any Explorer showing that
  // folder, installing an app should refresh the store, and so on. Windows
  // subscribe and re-read rather than polling.
  const listeners = {};

  function on(topic, fn) {
    (listeners[topic] = listeners[topic] || []).push(fn);
    return () => {
      const l = listeners[topic] || [];
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    };
  }

  function emit(topic, data) {
    (listeners[topic] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('bus:', topic, e); }
    });
    (listeners['*'] || []).forEach(fn => {
      try { fn(topic, data); } catch (e) {}
    });
  }

  // Binds a listener to a window's lifetime so a closed window stops reacting.
  function onWindow(win, topic, fn) {
    const off = on(topic, fn);
    const prev = win.onClose;
    win.onClose = () => { off(); if (prev) prev(); };
    return off;
  }

  return {
    coarse, singleClickOpens, bindActivate, suppressNextClick, clickSuppressed,
    TYPES, typeOf, describe, iconFor, handlersFor, open, openWithDialog, extOf,
    on, emit, onWindow,
  };
})();
