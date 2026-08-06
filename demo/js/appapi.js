// Runtime handed to an installed .dib application.
//
// A package calls Dsp32.app(fn); fn runs on each launch and receives an `App`
// object built from the manifest's permission list. Methods the manifest did
// not declare throw, so a missing permission shows up while developing rather
// than failing quietly later.
//
// This is not a security boundary. An installed app is JavaScript on the same
// page as the desktop and can reach anything the desktop can, declared or not.
// The permission list tells the user what an honest app intends to use.
window.AppRuntime = (function () {
  const buses = {};          // topic -> [handler]
  let registering = null;    // app being loaded, for Dsp32.app()

  function need(manifest, perm) {
    const have = manifest.permissions || [];
    if (!have.includes(perm)) {
      throw new Error(
        `"${manifest.name}" tried to use ${perm} but its manifest does not ` +
        `declare that permission. Add "${perm}" to permissions in dib.json.`);
    }
  }

  // `args` is whatever Shell.launch was given: a path from Explorer, a
  // section name, or the object a window's session() returned on the last
  // run. Packaged apps read it as App.args.
  function makeApi(app, args) {
    const m = app.manifest;
    const dir = app.dir;
    const prefix = `dsp32.app.${m.id}.`;

    const api = {
      manifest: m,
      dir,
      args: args === undefined ? null : args,

      // URL for a file shipped inside the package.
      asset(path) { return API.fsReadUrl(`${dir}/${path}`); },

      window(opts) {
        opts = opts || {};
        return WM.open({
          appId: m.id,
          title: opts.title || m.name,
          icon: app.icon || I.appbox,
          w: opts.w, h: opts.h,
          onClose: opts.onClose,
        });
      },

      // Messages between running apps.
      bus: {
        on(topic, fn) {
          (buses[topic] = buses[topic] || []).push(fn);
          return () => {
            const list = buses[topic] || [];
            const i = list.indexOf(fn);
            if (i >= 0) list.splice(i, 1);
          };
        },
        emit(topic, data) {
          (buses[topic] || []).forEach(fn => {
            try { fn(data, m.id); } catch (e) { console.error('bus handler:', e); }
          });
        },
      },

      // ---- permissioned ----
      // Every check runs synchronously, before any promise is created, so a
      // missing permission throws at the call site whether or not the caller
      // awaits. Inside an `async` method the same throw would surface as an
      // unhandled rejection instead, which is far easier to miss.
      storage: {
        get(k) {
          need(m, 'storage');
          const v = localStorage.getItem(prefix + k);
          return Promise.resolve(v === null ? null : JSON.parse(v));
        },
        set(k, v) {
          need(m, 'storage');
          localStorage.setItem(prefix + k, JSON.stringify(v));
          return Promise.resolve();
        },
        remove(k) {
          need(m, 'storage');
          localStorage.removeItem(prefix + k);
          return Promise.resolve();
        },
        all() {
          need(m, 'storage');
          const out = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
              out[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key));
            }
          }
          return Promise.resolve(out);
        },
      },

      fs: {
        list(p) { need(m, 'fs'); return API.fsList(p); },
        read(p) { need(m, 'fs'); return API.fsReadText(p); },
        readUrl(p) { need(m, 'fs'); return API.fsReadUrl(p); },
        write(p, data) { need(m, 'fs'); return API.fsWrite(p, data); },
        mkdir(p) { need(m, 'fs'); return API.fsMkdir(p); },
        delete(p) { need(m, 'fs'); return API.fsDelete(p); },
        info() { need(m, 'fs'); return API.fsInfo(); },
      },

      net: {
        // Proxied through the device, so it is not subject to CORS.
        //
        // The proxy streams, so its own status line is committed before the
        // remote's is known; the remote status arrives in X-Dsp32-Status
        // instead. A 4xx from the remote throws with whatever its body gave
        // as a reason, because that reason is the useful part — "the code is
        // wrong" beats "HTTP 400".
        fetch(url, opts) {
          need(m, 'net');
          return (async () => {
            const r = await fetch(`/api/net/fetch?url=${encodeURIComponent(url)}`, opts);
            if (!r.ok) {
              let msg = `HTTP ${r.status}`;
              try { msg = (await r.json()).error || msg; } catch (e) {}
              throw new Error(msg);
            }

            const upstream = Number(r.headers.get('X-Dsp32-Status')) || 200;
            if (upstream >= 400) {
              let msg = `HTTP ${upstream}`;
              const text = await r.text();
              try {
                const j = JSON.parse(text);
                msg = j.error || j.message || j.detail || msg;
              } catch (e) {
                if (text && text.length < 200) msg = text;
              }
              const err = new Error(msg);
              err.status = upstream;
              throw err;
            }
            return r;
          })();
        },
        json(url) { return api.net.fetch(url).then(r => r.json()); },
        text(url) { return api.net.fetch(url).then(r => r.text()); },
      },

      notify(title, body) {
        need(m, 'notify');
        Shell.toast(title || m.name, body || '', app.icon || I.appbox);
      },

      system() { need(m, 'system'); return API.system(); },

      camera: {
        status() { need(m, 'camera'); return API.camStatus(); },
        snapshotUrl() { need(m, 'camera'); return API.camSnapshotUrl(); },
        save(path) { need(m, 'camera'); return API.camSave(path); },
      },

      // Handy bits every app may use.
      ui: {
        confirm: (t, msg, ok) => Shell.confirm(t, msg, ok),
        prompt: (t, label, val, opts) => Shell.prompt(t, label, val, opts),
        dialog: (o) => Shell.dialog(o),
        // The same menu the desktop uses, so an app's overflow button lands
        // in the right place and flips near an edge like everything else.
        menu: (x, y, items) => Shell.ctxMenu(x, y, items),
        pickPath: (o) => Shell.pickPath(o),
        fmtBytes, fmtUptime, escapeHtml,
      },
    };
    return api;
  }

  // Executes a package's entry file. The source calls Dsp32.app(fn); we
  // capture fn and register a desktop app that invokes it with the API.
  function runPackage(app, source) {
    const m = app.manifest;

    let icon = I.appbox;
    if (m.icon) {
      // Read once here rather than pointed at by URL. An <img src> is
      // fetched by the browser itself, so it cannot be intercepted — which
      // the static simulator needs — and on a board it saves an HTTP round
      // trip every time an icon is drawn.
      //
      // No inline size: an inline style would outrank the CSS rule for
      // whichever slot the icon lands in (desktop, taskbar, toast, titlebar)
      // and render at the container's full size.
      icon = `<img class="app-icon" src="${app.iconUrl || ''}" alt="">`;
    }
    app.icon = icon;

    registering = null;
    try {
      new Function(source)();
    } finally {
      const factory = registering;
      registering = null;
      if (typeof factory !== 'function') {
        throw new Error(
          `${m.id} never called Dsp32.app(fn) — a package's entry file must ` +
          `register itself. See docs/DIB_FORMAT.md.`);
      }

      Shell.registerApp({
        id: m.id,
        name: m.name,
        icon,
        order: 50,
        packaged: true,
        manifest: m,
        onArgs: (win, args) => AppRuntime.onArgs(win, args),
        launch(args) {
          try {
            return factory(makeApi(app, args));
          } catch (e) {
            Shell.toast(m.name, e.message, icon);
            console.error(`[${m.id}]`, e);
            return null;
          }
        },
      });
    }
  }

  // The global a package entry file talks to.
  window.Dsp32 = window.Dsp32 || {};
  window.Dsp32.app = function (fn) { registering = fn; };
  window.Dsp32.version = () => (Shell.sys && Shell.sys.version) || '0';

  // Restoring a session relaunches with the saved state, so a packaged app
  // that already has a window should be handed the new arguments too.
  function onArgs(win, args) {
    if (typeof win.onArgs === 'function') {
      try { win.onArgs(args); } catch (e) { console.error(e); }
    }
  }

  return { runPackage, makeApi, onArgs };
})();
