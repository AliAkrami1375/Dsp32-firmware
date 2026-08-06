// Background services.
//
// A window is not a process. Closing a Diba Manager window should not stop the
// flow it deployed, any more than closing a terminal stops what it started —
// so work that outlives its window registers here instead of hanging off the
// window's lifetime.
//
// A service is a plain object with start/stop and a tick, driven by one shared
// timer. One timer for all of them, rather than one each, keeps a dozen
// deployed flows from turning into a dozen competing intervals on a device
// that answers every request itself.
window.Services = (function () {
  const services = new Map();      // id -> record
  const listeners = [];
  const KEY = 'dsp32.services';
  const BASE_TICK = 100;           // resolution of the shared clock

  let clock = null;
  let seq = 0;

  function emit() {
    listeners.forEach(f => { try { f(list()); } catch (e) {} });
  }

  function ensureClock() {
    if (clock) return;
    clock = setInterval(() => {
      const now = Date.now();
      for (const rec of services.values()) {
        if (rec.state !== 'running') continue;
        if (now < rec.nextTick) continue;
        rec.nextTick = now + rec.interval;
        rec.ticks++;
        try {
          const r = rec.tick(rec);
          // A tick may be async; a rejection must not kill the clock.
          if (r && typeof r.then === 'function') {
            r.catch(e => fail(rec, e));
          }
        } catch (e) {
          fail(rec, e);
        }
      }
    }, BASE_TICK);
  }

  function stopClockIfIdle() {
    if (clock && ![...services.values()].some(r => r.state === 'running')) {
      clearInterval(clock);
      clock = null;
    }
  }

  // A service that throws repeatedly is broken, not unlucky: it is stopped
  // rather than left to spam the device and the log forever.
  function fail(rec, err) {
    rec.errors++;
    rec.lastError = String(err && err.message || err);
    console.error(`[service ${rec.id}]`, err);
    if (rec.errors >= 5) {
      rec.state = 'failed';
      Shell.toast(rec.name, `Stopped after repeated errors: ${rec.lastError}`, rec.icon);
      stopClockIfIdle();
    }
    emit();
  }

  // ---- registry ----------------------------------------------------------

  function start(opts) {
    if (!opts || !opts.tick) throw new Error('a service needs a tick function');
    const id = opts.id || `svc-${++seq}`;
    stop(id);                        // replacing a deployment restarts it

    const rec = {
      id,
      name: opts.name || id,
      appId: opts.appId || null,
      icon: opts.icon || I.appbox,
      detail: opts.detail || '',
      interval: Math.max(BASE_TICK, opts.interval || 1000),
      tick: opts.tick,
      onStop: opts.onStop || null,
      widget: opts.widget || null,   // () => HTML for the desktop rail
      openWith: opts.openWith || null,
      state: 'running',
      startedAt: Date.now(),
      nextTick: 0,
      ticks: 0,
      errors: 0,
      lastError: null,
      data: opts.data || {},
    };
    services.set(id, rec);
    ensureClock();
    persist();
    emit();
    return rec;
  }

  function stop(id) {
    const rec = services.get(id);
    if (!rec) return false;
    if (rec.onStop) { try { rec.onStop(rec); } catch (e) {} }
    services.delete(id);
    stopClockIfIdle();
    persist();
    emit();
    return true;
  }

  function pause(id) {
    const rec = services.get(id);
    if (!rec || rec.state !== 'running') return false;
    rec.state = 'paused';
    stopClockIfIdle();
    emit();
    return true;
  }

  function resume(id) {
    const rec = services.get(id);
    if (!rec) return false;
    rec.state = 'running';
    rec.errors = 0;
    rec.nextTick = 0;
    ensureClock();
    emit();
    return true;
  }

  const get = (id) => services.get(id) || null;
  const list = () => [...services.values()];
  const count = () => services.size;
  const running = () => list().filter(r => r.state === 'running').length;

  function on(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  // ---- restart across reloads -------------------------------------------
  // Only the descriptor is stored; the owning app re-registers the live tick
  // when it loads. Nothing else can safely resurrect an arbitrary closure.
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(list().map(r => ({
        id: r.id, appId: r.appId, name: r.name, detail: r.detail,
        interval: r.interval, data: r.data,
      }))));
    } catch (e) { /* quota */ }
  }

  function pending(appId) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      return saved.filter(s => !appId || s.appId === appId);
    } catch (e) { return []; }
  }

  function forget(id) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      localStorage.setItem(KEY, JSON.stringify(saved.filter(s => s.id !== id)));
    } catch (e) {}
  }

  // ---- desktop rail ------------------------------------------------------
  // Deployed work is visible without opening anything: a tile per service in
  // the top-right of the desktop, which is also where a widget draws.
  function mountRail() {
    let rail = document.getElementById('svc-rail');
    if (!rail) {
      rail = document.createElement('div');
      rail.id = 'svc-rail';
      document.getElementById('desktop').appendChild(rail);
    }
    renderRail();
    on(renderRail);
  }

  function renderRail() {
    const rail = document.getElementById('svc-rail');
    if (!rail) return;

    const items = list();
    rail.hidden = !items.length;
    rail.innerHTML = '';

    items.forEach(rec => {
      const el = document.createElement('div');
      el.className = 'svc-tile ' + rec.state;

      const body = rec.widget ? rec.widget(rec) : '';
      el.innerHTML = `
        <div class="svc-head">
          <span class="svc-ico">${rec.icon}</span>
          <div class="grow">
            <b>${escapeHtml(rec.name)}</b>
            <small>${escapeHtml(rec.detail || rec.state)}</small>
          </div>
          <span class="svc-dot" title="${rec.state}"></span>
        </div>
        ${body ? `<div class="svc-body">${body}</div>` : ''}`;

      el.addEventListener('click', () => {
        if (rec.openWith) rec.openWith(rec);
        else if (rec.appId) Shell.launch(rec.appId);
      });

      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        Shell.ctxMenu(e.clientX, e.clientY, [
          { label: rec.state === 'running' ? 'Pause' : 'Resume',
            icon: rec.state === 'running' ? I.x : I.refresh,
            onClick: () => rec.state === 'running' ? pause(rec.id) : resume(rec.id) },
          { label: 'Open owner', icon: I.openFile, disabled: !rec.appId,
            onClick: () => Shell.launch(rec.appId) },
          { sep: true },
          { label: 'Stop', icon: I.trash, danger: true,
            onClick: () => { forget(rec.id); stop(rec.id); } },
        ]);
      });

      rail.appendChild(el);
    });
  }

  return {
    start, stop, pause, resume, get, list, count, running, on,
    pending, forget, mountRail, renderRail,
  };
})();
