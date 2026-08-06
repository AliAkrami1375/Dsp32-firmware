// Session persistence — open windows survive a browser reload.
//
// A refresh is not "quit". Whatever was open, where it was, and enough of what
// each app was doing to pick the work back up is written to localStorage and
// replayed on the next boot.
//
// Apps opt in to restoring their own contents by setting `win.session` to a
// function returning a JSON-safe object; whatever it returns comes back as the
// launch argument. An app that does not opt in still reopens, at the same size
// and place — which is most of what a refresh should preserve.
window.Session = (function () {
  const KEY = 'dsp32.session';
  const VERSION = 1;
  const SAVE_DEBOUNCE = 600;

  let ready = false;         // suppress saves until the restore pass is done
  let timer = null;

  function snapshot() {
    const wins = WM.list()
      .filter(w => Shell.registry[w.appId])     // skip anything unregistered
      .map(w => {
        const r = w.rect();
        let state = null;
        if (typeof w.session === 'function') {
          try { state = w.session(); } catch (e) { /* app declined */ }
        }
        return {
          appId: w.appId,
          title: w.title,
          rect: r,
          maxed: w.maxed,
          mini: w.mini,
          z: +w.el.style.zIndex || 0,
          state,
        };
      })
      // Oldest first, so replaying them rebuilds the same stacking order.
      .sort((a, b) => a.z - b.z);

    const active = WM.activeWin();
    return {
      v: VERSION,
      at: Date.now(),
      active: active ? active.appId : null,
      wins,
    };
  }

  function save() {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(snapshot())); }
    catch (e) { /* quota — the desktop still works without a session */ }
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DEBOUNCE);
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || raw.v !== VERSION || !Array.isArray(raw.wins)) return null;
      return raw;
    } catch (e) { return null; }
  }

  function clear() { localStorage.removeItem(KEY); }

  // Reopens everything from the last session. Failures are per-window: one
  // app that cannot restore must not cost the user the rest of the desktop.
  async function restore() {
    const data = load();
    ready = true;
    if (!data || !data.wins.length) return { restored: 0, total: 0 };

    let restored = 0;
    for (const rec of data.wins) {
      const app = Shell.registry[rec.appId];
      if (!app) continue;              // uninstalled since the session was saved
      try {
        const win = Shell.launch(rec.appId, rec.state ?? undefined);
        if (!win) continue;
        restored++;

        if (rec.maxed) win.max();
        else if (rec.rect) win.setRect(clampRect(rec.rect));
        if (rec.mini) win.min();
      } catch (e) {
        console.error('session: could not restore', rec.appId, e);
      }
    }

    // Focus whatever was in front, so the desktop comes back the way it left.
    if (data.active) {
      const w = WM.byApp(data.active);
      if (w && !w.mini) w.focus();
    }

    save();
    return { restored, total: data.wins.length };
  }

  // A window saved on a large screen must not come back off a small one.
  function clampRect(r) {
    const maxW = innerWidth - 16;
    const maxH = innerHeight - 48 - 16;
    const w = Math.min(r.w, maxW);
    const h = Math.min(r.h, maxH);
    return {
      w, h,
      x: Math.min(Math.max(0, r.x), Math.max(0, innerWidth - w)),
      y: Math.min(Math.max(0, r.y), Math.max(0, innerHeight - 48 - h)),
    };
  }

  function start() {
    // Any window event is a reason to re-snapshot.
    WM.on(scheduleSave);
    addEventListener('resize', scheduleSave);
    // A reload fires pagehide, not unload, on mobile Safari.
    addEventListener('pagehide', save);
    addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
    setInterval(save, 10000);   // backstop for a crash or a hard kill
  }

  return { start, restore, save, scheduleSave, clear, load, snapshot };
})();
