// Dsp32 window manager — drag, resize, snap, minimize/maximize, z-order
window.WM = (function () {
  const wins = [];
  const listeners = [];
  let zTop = 100, seq = 0, active = null;

  const TB = 48; // taskbar height
  const layer = () => document.getElementById('windows');
  const snapEl = () => document.getElementById('snap-preview');

  function emit(ev, win) { listeners.forEach(f => { try { f(ev, win); } catch (e) {} }); }

  function setActive(win) {
    if (active === win) return;
    if (active) active.el.classList.add('inactive');
    active = win;
    if (win) {
      win.el.classList.remove('inactive');
      win.el.style.zIndex = ++zTop;
      emit('focus', win);
    }
  }

  function open(o) {
    const el = document.createElement('div');
    el.className = 'window';
    seq++;

    const W = Math.min(o.w || 760, innerWidth - 24);
    const H = Math.min(o.h || 520, innerHeight - TB - 24);
    const off = (seq % 7) * 26;
    el.style.width = W + 'px';
    el.style.height = H + 'px';
    el.style.left = Math.max(8, Math.round((innerWidth - W) / 2 - 60 + off)) + 'px';
    el.style.top = Math.max(8, Math.round((innerHeight - TB - H) / 2 - 30 + off * 0.6)) + 'px';

    el.innerHTML = `
      <div class="titlebar">
        <span class="app-ico-holder">${o.icon || ''}</span>
        <span class="t-title"></span>
        <div class="t-controls">
          <button class="t-min" title="Minimize">${I.winMin}</button>
          <button class="t-max" title="Maximize">${I.winMax}</button>
          <button class="t-close" title="Close">${I.winClose}</button>
        </div>
      </div>
      <div class="win-body"></div>
      ${['n','s','e','w','ne','nw','se','sw'].map(d => `<div class="rh ${d}" data-d="${d}"></div>`).join('')}`;

    const win = {
      id: seq,
      appId: o.appId || 'app',
      el,
      body: el.querySelector('.win-body'),
      titleEl: el.querySelector('.t-title'),
      icon: o.icon || '',
      title: o.title || 'Window',
      maxed: false, mini: false, prevRect: null,
      onClose: o.onClose || null,
      data: {},
      setTitle(t) { this.title = t; this.titleEl.textContent = t; emit('title', this); },
      focus() {
        if (this.mini) { this.mini = false; this.el.classList.remove('mini'); emit('restore', this); }
        setActive(this);
      },
      min() { this.mini = true; this.el.classList.add('mini'); if (active === this) active = null; emit('min', this); },
      close() {
        if (this.onClose) { try { this.onClose(); } catch (e) {} }
        this.el.classList.add('closing');
        setTimeout(() => this.el.remove(), 140);
        const i = wins.indexOf(this);
        if (i >= 0) wins.splice(i, 1);
        if (active === this) active = null;
        emit('close', this);
      },
      rect() { return { x: this.el.offsetLeft, y: this.el.offsetTop, w: this.el.offsetWidth, h: this.el.offsetHeight }; },
      setRect(r) {
        this.el.style.left = r.x + 'px'; this.el.style.top = r.y + 'px';
        this.el.style.width = r.w + 'px'; this.el.style.height = r.h + 'px';
      },
      toggleMax() { this.maxed ? this.unmax() : this.max(); },
      max() {
        if (this.maxed) return;
        this.prevRect = this.rect();
        this.maxed = true;
        this.el.classList.add('maxed');
        this.setRect({ x: 0, y: 0, w: innerWidth, h: innerHeight - TB });
        this.el.querySelector('.t-max').innerHTML = I.winRestore;
      },
      unmax() {
        if (!this.maxed) return;
        this.maxed = false;
        this.el.classList.remove('maxed');
        if (this.prevRect) this.setRect(this.prevRect);
        this.el.querySelector('.t-max').innerHTML = I.winMax;
      },
      snapTo(dir) {
        if (this.maxed) this.unmax();
        if (!this.prevRect) this.prevRect = this.rect();
        const h = innerHeight - TB;
        if (dir === 'left') this.setRect({ x: 0, y: 0, w: Math.round(innerWidth / 2), h });
        else if (dir === 'right') this.setRect({ x: Math.round(innerWidth / 2), y: 0, w: Math.round(innerWidth / 2), h });
      },
    };
    win.setTitle(win.title);

    // interactions
    el.addEventListener('pointerdown', () => win.focus());
    el.querySelector('.t-min').addEventListener('click', e => { e.stopPropagation(); win.min(); });
    el.querySelector('.t-max').addEventListener('click', e => { e.stopPropagation(); win.toggleMax(); });
    el.querySelector('.t-close').addEventListener('click', e => { e.stopPropagation(); win.close(); });

    installDrag(win);
    installResize(win);

    layer().appendChild(el);
    wins.push(win);
    setActive(win);
    emit('open', win);
    return win;
  }

  function installDrag(win) {
    const tb = win.el.querySelector('.titlebar');
    let sx, sy, ox, oy, dragging = false, snapDir = null;

    tb.addEventListener('dblclick', e => {
      if (e.target.closest('.t-controls')) return;
      win.toggleMax();
    });

    tb.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.t-controls')) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = win.el.offsetLeft; oy = win.el.offsetTop;
      try { tb.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    });

    tb.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (win.maxed) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        // un-maximize under the cursor
        const ratio = e.clientX / innerWidth;
        win.unmax();
        ox = Math.round(e.clientX - win.el.offsetWidth * ratio);
        oy = Math.max(0, e.clientY - 18);
        sx = e.clientX; sy = e.clientY;
        win.setRect({ x: ox, y: oy, w: win.el.offsetWidth, h: win.el.offsetHeight });
        return;
      }
      const nx = Math.min(Math.max(ox + dx, -win.el.offsetWidth + 80), innerWidth - 80);
      const ny = Math.min(Math.max(oy + dy, 0), innerHeight - TB - 24);
      win.el.style.left = nx + 'px';
      win.el.style.top = ny + 'px';

      snapDir = e.clientY <= 4 ? 'top' : e.clientX <= 4 ? 'left'
        : e.clientX >= innerWidth - 5 ? 'right' : null;
      showSnap(snapDir);
    });

    const finish = e => {
      if (!dragging) return;
      dragging = false;
      showSnap(null);
      if (snapDir === 'top') win.max();
      else if (snapDir) win.snapTo(snapDir);
      snapDir = null;
    };
    tb.addEventListener('pointerup', finish);
    tb.addEventListener('pointercancel', finish);
  }

  function showSnap(dir) {
    const s = snapEl();
    if (!dir) { s.style.display = 'none'; return; }
    const h = innerHeight - TB;
    const r = dir === 'top' ? { x: 0, y: 0, w: innerWidth, h }
      : dir === 'left' ? { x: 0, y: 0, w: innerWidth / 2, h }
        : { x: innerWidth / 2, y: 0, w: innerWidth / 2, h };
    s.style.display = 'block';
    s.style.left = r.x + 'px'; s.style.top = r.y + 'px';
    s.style.width = r.w + 'px'; s.style.height = r.h + 'px';
  }

  function installResize(win) {
    win.el.querySelectorAll('.rh').forEach(h => {
      const d = h.dataset.d;
      let start = null;
      h.addEventListener('pointerdown', e => {
        if (win.maxed) return;
        e.stopPropagation();
        win.focus();
        start = { x: e.clientX, y: e.clientY, r: win.rect() };
        try { h.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      });
      h.addEventListener('pointermove', e => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        let { x, y, w, h: hh } = start.r;
        if (d.includes('e')) w = Math.max(320, start.r.w + dx);
        if (d.includes('s')) hh = Math.max(200, start.r.h + dy);
        if (d.includes('w')) { const nw = Math.max(320, start.r.w - dx); x = start.r.x + (start.r.w - nw); w = nw; }
        if (d.includes('n')) { const nh = Math.max(200, start.r.h - dy); y = Math.max(0, start.r.y + (start.r.h - nh)); hh = nh; }
        win.setRect({ x, y, w, h: hh });
      });
      const done = () => { start = null; };
      h.addEventListener('pointerup', done);
      h.addEventListener('pointercancel', done);
    });
  }

  return {
    open,
    list: () => wins.slice(),
    byApp: (appId) => wins.find(w => w.appId === appId) || null,
    allByApp: (appId) => wins.filter(w => w.appId === appId),
    activeWin: () => active,
    on: (f) => listeners.push(f),
  };
})();
