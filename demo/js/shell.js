// Dsp32 shell — taskbar, start menu, flyouts, dialogs, app registry
window.Shell = (function () {
  const apps = [];
  const registry = {};
  let sys = null, fsInfo = null;

  const ACCENTS = [
    { c: '#4cc2ff', t: '#003a5c' }, { c: '#0078d4', t: '#ffffff' },
    { c: '#8764b8', t: '#ffffff' }, { c: '#00cc6a', t: '#003317' },
    { c: '#ffb900', t: '#4a3700' }, { c: '#ff8c00', t: '#4a2900' },
    { c: '#e74856', t: '#ffffff' }, { c: '#00b7c3', t: '#00373b' },
  ];
  const WALLPAPERS = [
    { id: 'bloom', cls: 'wp-bloom', name: 'Bloom' },
    { id: 'bloom-light', cls: 'wp-bloom-light', name: 'Bloom Light' },
    { id: 'graphite', cls: 'wp-graphite', name: 'Graphite' },
    { id: 'sunset', cls: 'wp-sunset', name: 'Sunset' },
    { id: 'emerald', cls: 'wp-emerald', name: 'Emerald' },
  ];

  let settings = Object.assign(
    { theme: 'dark', accent: 0, wallpaper: 'bloom', brightness: 100, showLogo: true },
    JSON.parse(localStorage.getItem('dsp32.settings') || '{}'));

  function saveSettings() { localStorage.setItem('dsp32.settings', JSON.stringify(settings)); }

  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    const a = ACCENTS[settings.accent] || ACCENTS[0];
    const root = document.documentElement.style;
    root.setProperty('--accent', a.c);
    root.setProperty('--accent-text', a.t);
    const wp = WALLPAPERS.find(w => w.id === settings.wallpaper) || WALLPAPERS[0];
    const wpEl = document.getElementById('wallpaper');
    if (wpEl) wpEl.className = wp.cls;
    const br = document.getElementById('brightness-overlay');
    if (br) br.style.opacity = (100 - settings.brightness) / 130;
    const logo = document.getElementById('desk-logo');
    if (logo) logo.style.display = settings.showLogo ? '' : 'none';
  }

  // ---------- app registry ----------
  function registerApp(app) {
    if (registry[app.id]) return;
    registry[app.id] = app;
    apps.push(app);
    apps.sort((x, y) => (x.order || 99) - (y.order || 99));
  }

  // Removing an app from a running desktop. The registry and the ordered list
  // have to stay in step, and anything the app left behind — a pinned taskbar
  // slot, a desktop cell — has to go with it.
  function unregisterApp(id) {
    if (!registry[id]) return false;
    delete registry[id];
    const i = apps.findIndex(a => a.id === id);
    if (i >= 0) apps.splice(i, 1);
    if (settings.iconLayout) delete settings.iconLayout[id];
    saveSettings();
    return true;
  }

  function launch(id, args) {
    const app = registry[id];
    if (!app) return null;
    if (!app.multi) {
      const w = WM.byApp(id);
      if (w) { w.focus(); if (args !== undefined && app.onArgs) app.onArgs(w, args); return w; }
    }
    try { return app.launch(args); }
    catch (e) { toast('App error', String(e.message || e)); return null; }
  }

  // ---------- DOM ----------
  function init() {
    const d = document.getElementById('desktop');
    d.innerHTML = `
      <div id="wallpaper"></div>
      <div id="desk-logo">
        <img src="assets/hero.svg" alt="">
        <span>DSP32</span>
        <small id="desk-logo-sub">WEB DESKTOP OS</small>
      </div>
      <div id="icons"></div>
      <div id="windows"></div>
      <div id="snap-preview"></div>
      <div id="brightness-overlay" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9990"></div>
      <div id="taskbar">
        <div></div>
        <div class="tb-center">
          <button class="tb-btn" id="btn-start" title="Start">${I.start}</button>
          <div class="tb-search" id="tb-search">${I.search}<span>Search</span></div>
          <div class="tb-center" id="tb-apps"></div>
        </div>
        <div class="tb-right">
          <div class="tray" id="tray-net" title="Network"><span id="tray-net-icon">${I.wifi}</span></div>
          <div class="tray" id="tray"><span id="tray-icons" style="display:flex;gap:10px;align-items:center"></span></div>
          <div class="clock" id="clock"><div id="clock-time">--:--</div><div id="clock-date"></div></div>
          <div id="show-desktop" title="Show desktop"></div>
        </div>
      </div>
      <div id="start-menu" class="flyout">
        <div class="start-search">${I.search}<input id="start-q" placeholder="Search apps"></div>
        <div class="start-label">Pinned</div>
        <div class="start-grid" id="start-grid"></div>
        <div class="start-footer">
          <div class="start-user"><img src="assets/hero.svg" style="width:30px;height:30px"><span id="start-host">Dsp32</span></div>
          <button class="start-power" id="btn-power" title="Power">${I.power}</button>
        </div>
      </div>
      <div id="quick-settings" class="flyout">
        <div class="qs-grid" id="qs-grid"></div>
        <div class="qs-slider">${I.brightness}<input type="range" id="qs-bright" min="30" max="100"></div>
        <div class="qs-accents" id="qs-accents"></div>
      </div>
      <div id="net-flyout" class="flyout">
        <div class="net-head">
          <div>
            <b id="net-title">Network</b>
            <small id="net-sub"></small>
          </div>
          <button class="btn sm" id="net-rescan">${I.refresh}<span>Scan</span></button>
        </div>
        <div class="net-list" id="net-list"></div>
        <div class="net-foot">
          <span id="net-ap"></span>
          <button class="btn sm" id="net-more">More settings</button>
        </div>
      </div>
      <div id="calendar-flyout" class="flyout">
        <div class="cal-head" id="cal-head"></div>
        <div class="cal-grid" id="cal-grid"></div>
      </div>
      <div id="toasts"></div>`;
    d.hidden = false;

    applySettings();
    buildDesktopIcons();
    buildStartMenu();
    buildQuickSettings();
    bindChrome();
    startClock();
    renderTaskbarApps();
    WM.on(() => renderTaskbarApps());
    Services.mountRail();
    refreshNet();
    setInterval(refreshNet, 12000);
    refreshBattery();
    setInterval(refreshBattery, 10000);
  }

  // ---------- desktop icons ----------
  // Icons are absolutely positioned on a grid and their cells are remembered,
  // so a layout survives a reload the way it does on a real desktop.
  const CELL_W = 88, CELL_H = 96, PAD = 8;

  // Cells are stretched to divide the available area exactly, so the grid
  // reaches the taskbar instead of leaving a ragged strip of dead space under
  // the last row.
  function gridSize() {
    const w = innerWidth - PAD * 2;
    const h = innerHeight - 48 - PAD * 2;
    const cols = Math.max(1, Math.floor(w / CELL_W));
    const rows = Math.max(1, Math.floor(h / CELL_H));
    return { cols, rows, cw: CELL_W, ch: h / rows };
  }

  function cellRect(cell) {
    const g = gridSize();
    return { x: PAD + cell.col * g.cw, y: PAD + cell.row * g.ch };
  }

  function layout() {
    settings.iconLayout = settings.iconLayout || {};
    return settings.iconLayout;
  }

  // On by default, and the reason a first boot looks tidy. Installing apps
  // during setup changes both the length and the order of the app list, so a
  // layout saved before that no longer lines up — honouring it left the new
  // icons scattered into whatever cells happened to be free. While auto
  // arrange is on the grid is simply recomputed from the current list; the
  // first time the user drags an icon they have expressed a preference, and
  // from then on saved cells win.
  function autoArrange() {
    return settings.iconAutoArrange !== false;
  }

  function cellOf(index) {
    const { rows } = gridSize();
    return { col: Math.floor(index / rows), row: index % rows };
  }

  // Nearest free cell, spiralling outward — dropping onto an occupied cell
  // nudges the icon aside instead of stacking two icons on top of each other.
  function freeCell(want, taken) {
    const { cols, rows } = gridSize();
    const key = c => `${c.col},${c.row}`;
    const fits = c => c.col >= 0 && c.row >= 0 && c.col < cols && c.row < rows;
    if (fits(want) && !taken.has(key(want))) return want;
    for (let r = 1; r < Math.max(cols, rows) + 1; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
          const c = { col: want.col + dc, row: want.row + dr };
          if (fits(c) && !taken.has(key(c))) return c;
        }
      }
    }
    return want;
  }

  function desktopApps() { return apps.filter(a => a.desktop !== false); }

  function buildDesktopIcons() {
    const box = document.getElementById('icons');
    box.innerHTML = '';
    const saved = layout();
    const taken = new Set();

    desktopApps().forEach((app, i) => {
      let cell = autoArrange() ? cellOf(i) : saved[app.id];
      if (!cell || taken.has(`${cell.col},${cell.row}`)) {
        cell = freeCell(cell || cellOf(i), taken);
      }
      taken.add(`${cell.col},${cell.row}`);
      saved[app.id] = cell;

      const el = document.createElement('div');
      el.className = 'dicon';
      el.dataset.app = app.id;
      const r = cellRect(cell);
      el.style.left = r.x + 'px';
      el.style.top = r.y + 'px';
      el.innerHTML = `${app.icon}<span>${escapeHtml(app.name)}</span>`;

      installIconDrag(el, app);
      box.appendChild(el);
    });
    saveSettings();
  }

  function selectIcon(el, additive) {
    if (!additive) {
      document.querySelectorAll('.dicon.sel').forEach(x => x.classList.remove('sel'));
    }
    el.classList.add('sel');
  }

  function installIconDrag(el, app) {
    let start = null, moved = false;

    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      selectIcon(el, e.ctrlKey || e.metaKey);
      start = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop };
      moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      e.stopPropagation();
    });

    el.addEventListener('pointermove', e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      moved = true;
      el.classList.add('dragging');
      el.style.left = start.left + dx + 'px';
      el.style.top = start.top + dy + 'px';
    });

    const drop = () => {
      if (!start) return;
      const wasDragging = moved;
      start = null;
      el.classList.remove('dragging');
      if (!wasDragging) return;
      // The click that follows a drag must not also launch the app.
      Platform.suppressNextClick();

      // Placing an icon by hand is what turns auto arrange off. Every other
      // icon keeps where it currently sits, so nothing jumps.
      if (autoArrange()) {
        settings.iconAutoArrange = false;
        document.querySelectorAll('.dicon').forEach((other, i) => {
          if (other === el) return;
          layout()[other.dataset.app] = layout()[other.dataset.app] || cellOf(i);
        });
      }

      const taken = new Set();
      document.querySelectorAll('.dicon').forEach(other => {
        if (other === el) return;
        const c = layout()[other.dataset.app];
        if (c) taken.add(`${c.col},${c.row}`);
      });

      const g = gridSize();
      const cell = freeCell({
        col: Math.round((el.offsetLeft - PAD) / g.cw),
        row: Math.round((el.offsetTop - PAD) / g.ch),
      }, taken);

      layout()[app.id] = cell;
      saveSettings();
      const r = cellRect(cell);
      el.style.left = r.x + 'px';
      el.style.top = r.y + 'px';
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    Platform.bindActivate(el, () => launch(app.id));

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      selectIcon(el, false);
      iconMenu(e.clientX, e.clientY, app);
    });
  }

  function iconMenu(x, y, app) {
    const running = WM.allByApp(app.id);

    const items = [
      { label: 'Open', icon: I.openFile, onClick: () => launch(app.id) },
    ];

    if (running.length) {
      items.push({
        label: running.length > 1 ? `Close all (${running.length})` : 'Close window',
        icon: I.x,
        onClick: () => running.forEach(w => w.close()),
      });
    }

    items.push({ sep: true });
    items.push({
      label: app.pin ? 'Unpin from taskbar' : 'Pin to taskbar',
      icon: I.start,
      onClick: () => { app.pin = !app.pin; renderTaskbarApps(); },
    });
    items.push({ label: 'Arrange icons', icon: I.refresh, onClick: arrangeIcons });
    items.push({
      label: 'Auto arrange', icon: I.check, checked: autoArrange(),
      onClick: () => setAutoArrange(!autoArrange()),
    });

    if (app.packaged) {
      items.push({ sep: true });
      items.push({
        label: 'App details', icon: I.info,
        onClick: () => launch('appstore', 'installed'),
      });
      items.push({
        label: 'Uninstall', icon: I.trash, danger: true,
        onClick: async () => {
          if (!await confirmDlg('Uninstall',
            `Remove "${app.name}" and all of its files from the device?`, 'Uninstall')) return;
          try {
            const list = await DIB.listInstalled();
            const found = list.find(a => a.manifest.id === app.id);
            if (found) await DIB.uninstall(found.kind === 'script' ? found.path : found.dir);
            DIB.deactivate(app.id);
            toast('Desktop', `${app.name} removed`, I.appbox);
          } catch (e) { toast('Desktop', 'Uninstall failed: ' + e.message); }
        },
      });
    }

    ctxMenu(x, y, items);
  }

  function arrangeIcons() {
    settings.iconLayout = {};
    settings.iconAutoArrange = true;
    saveSettings();
    buildDesktopIcons();
  }

  function setAutoArrange(on) {
    settings.iconAutoArrange = !!on;
    saveSettings();
    buildDesktopIcons();
  }

  // ---------- taskbar ----------
  function renderTaskbarApps() {
    const box = document.getElementById('tb-apps');
    const running = {};
    WM.list().forEach(w => { (running[w.appId] = running[w.appId] || []).push(w); });
    const activeApp = WM.activeWin() ? WM.activeWin().appId : null;

    const shown = apps.filter(a => a.pin).map(a => a.id);
    Object.keys(running).forEach(id => { if (!shown.includes(id)) shown.push(id); });

    box.innerHTML = '';
    shown.forEach(id => {
      const app = registry[id];
      if (!app) return;
      const btn = document.createElement('button');
      btn.className = 'tb-btn' + (running[id] ? ' running' : '') + (id === activeApp ? ' active-win' : '');
      btn.title = app.name;
      btn.innerHTML = `${app.icon}<span class="badge"></span>`;
      btn.addEventListener('click', () => {
        const ws = running[id];
        if (!ws) { launch(id); return; }
        const w = ws[0];
        if (id === activeApp && !w.mini) w.min();
        else w.focus();
      });
      box.appendChild(btn);
    });
  }

  function updateTray() {
    const t = document.getElementById('tray-icons');
    if (!t) return;
    let html = '';
    if (battery && battery.configured) html += batteryTrayHtml();
    if (sys && sys.camera) html += `<span title="Camera detected">${I.camTray}</span>`;
    if (sys && sys.sd) html += `<span title="SD card mounted">${I.sdTray}</span>`;
    t.innerHTML = html;
    const bt = t.querySelector('.tray-bat');
    if (bt) bt.onclick = () => launch('settings', 'battery');
    const host = document.getElementById('start-host');
    const acct = Account.current();
    if (host) {
      host.textContent = acct ? acct.name : (sys ? `${sys.name} · ${sys.chip}` : '');
    }
    const sub = document.getElementById('desk-logo-sub');
    if (sub && sys) sub.textContent = (sys.chip || '') + '  ·  v' + sys.version;
  }


  // ---------- battery ----------
  // Nothing appears anywhere until a battery has been described in Settings:
  // a board on USB has no pack to report on, and an empty gauge in the tray
  // would be worse than no gauge. Polled on the same slow cadence as the rest
  // of the telemetry, because the firmware samples every five seconds and
  // asking faster only costs requests.
  let battery = null;
  let batWarned = 0;

  function batteryTrayHtml() {
    const b = battery;
    const pct = Math.max(0, Math.min(100, b.percent || 0));
    const cls = b.charging ? 'charging' : pct <= b.criticalPct ? 'crit'
              : pct <= b.warnPct ? 'warn' : '';
    const title = `${pct}% · ${(b.volts || 0).toFixed(2)} V` +
                  (b.charging ? ' · charging' : '');
    return `<span class="tray-bat ${cls}" title="${escapeHtml(title)}">
      <span class="bat-glyph">${I.battery}
        <i style="width:${Math.round(pct * 0.13)}px"></i>
        ${b.charging ? `<b>${I.batteryBolt}</b>` : ''}
      </span>
      <small>${pct}%</small>
    </span>`;
  }

  async function refreshBattery() {
    let next;
    try { next = await API.batStatus(); }
    catch (e) { return; }               // an older firmware has no such route

    const was = battery;
    battery = next;
    updateTray();
    Platform.emit('battery', next);

    if (!next.configured || !next.valid || next.charging) { batWarned = 0; return; }

    // One notification per threshold crossing, not one per poll. The level
    // has to climb back above the threshold before it can warn again, which
    // a pack on charge does and a pack being drained does not.
    const level = next.percent <= next.criticalPct ? 2
                : next.percent <= next.warnPct ? 1 : 0;
    if (level > batWarned) {
      batWarned = level;
      if (level === 2) {
        toast('Battery critical',
              `${next.percent}% left — ${
                next.action === 2 ? 'the board will sleep to protect the pack'
                : next.action === 1 ? 'switching to power saver'
                : 'charge it now'}`, I.battery);
      } else {
        toast('Battery low', `${next.percent}% left · ${next.volts.toFixed(2)} V`, I.battery);
      }
    } else if (level === 0) {
      batWarned = 0;
    }
    if (was && was.percent && Math.abs(was.percent - next.percent) > 30) batWarned = 0;
  }

  // ---------- network ----------
  // The tray icon reflects the uplink, not the hotspot: the hotspot is always
  // up, so showing it would make the icon a constant.
  let netState = null;

  async function refreshNet() {
    try { netState = await API.wifiStatus(); } catch (e) { return; }
    const icon = document.getElementById('tray-net-icon');
    const tray = document.getElementById('tray-net');
    if (!icon) return;

    const sta = netState.sta;
    icon.innerHTML = sta.connected ? I.wifi : I.wifiOff;
    icon.style.opacity = sta.connected ? 1 : 0.55;
    tray.title = sta.connected
      ? `Connected to ${sta.ssid} · ${sta.ip}`
      : `Hotspot "${netState.ap.ssid}" · no uplink`;
    return netState;
  }

  async function buildNetFlyout() {
    const list = document.getElementById('net-list');
    await refreshNet();
    if (!netState) { list.innerHTML = '<div class="net-empty">Cannot read network status</div>'; return; }

    const sta = netState.sta;
    document.getElementById('net-title').textContent =
      sta.connected ? sta.ssid : 'Not connected';
    document.getElementById('net-sub').textContent = sta.connected
      ? `${sta.ip} · ${sta.rssi} dBm`
      : 'Pick a network to give this device internet access';
    document.getElementById('net-ap').textContent =
      `Hotspot "${netState.ap.ssid}" · ${netState.ap.stations} client(s)`;

    if (!list.dataset.loaded) {
      list.innerHTML = '<div class="net-empty">Press Scan to look for networks</div>';
    }
    renderNetList(list);
  }

  function renderNetList(list, networks) {
    if (!networks) {
      if (!netState) return;
      // Show the current connection even before a scan has run.
      if (netState.sta.configured) {
        list.dataset.loaded = '1';
        list.innerHTML = '';
        list.appendChild(netRow({
          ssid: netState.sta.ssid, rssi: netState.sta.rssi, open: false,
        }, true));
      }
      return;
    }

    list.dataset.loaded = '1';
    list.innerHTML = '';
    if (!networks.length) {
      list.innerHTML = '<div class="net-empty">No networks found</div>';
      return;
    }
    networks.sort((a, b) => b.rssi - a.rssi).forEach(n => {
      list.appendChild(netRow(n, netState.sta.connected && netState.sta.ssid === n.ssid));
    });
  }

  function bars(rssi) {
    return rssi > -55 ? 4 : rssi > -67 ? 3 : rssi > -78 ? 2 : 1;
  }

  function netRow(n, connected) {
    const el = document.createElement('div');
    el.className = 'net-row' + (connected ? ' connected' : '');
    el.innerHTML = `
      <span class="net-sig" data-bars="${bars(n.rssi)}">${I.wifi}</span>
      <div class="grow">
        <b>${escapeHtml(n.ssid)}</b>
        <small>${connected ? 'Connected' : n.open ? 'Open' : 'Secured'} · ${n.rssi} dBm</small>
      </div>`;

    const btn = document.createElement('button');
    btn.className = 'btn sm' + (connected ? '' : ' primary');
    btn.textContent = connected ? 'Disconnect' : 'Connect';
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (connected) {
        await API.wifiForget();
        toast('Network', 'Disconnected from ' + n.ssid, I.wifiOff);
        setTimeout(buildNetFlyout, 800);
        return;
      }
      let pass = '';
      if (!n.open) {
        pass = await promptDlg(`Connect to ${n.ssid}`, 'Wi-Fi password');
        if (pass == null) return;
      }
      btn.textContent = 'Connecting…';
      btn.disabled = true;
      try {
        await API.wifiSta(n.ssid, pass);
        toast('Network', `Connecting to ${n.ssid}…`, I.wifi);
        // Association plus DHCP takes a moment; poll rather than guess.
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 1500));
          const s = await refreshNet();
          if (s && s.sta.connected) {
            toast('Network', `Connected to ${s.sta.ssid} · ${s.sta.ip}`, I.wifi);
            buildNetFlyout();
            return;
          }
        }
        toast('Network', `Could not connect to ${n.ssid} — check the password`);
        buildNetFlyout();
      } catch (e) {
        toast('Network', 'Failed: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Connect';
      }
    };
    el.appendChild(btn);
    return el;
  }

  async function scanNetworks() {
    const list = document.getElementById('net-list');
    const btn = document.getElementById('net-rescan');
    list.innerHTML = '<div class="net-empty">Scanning…</div>';
    btn.disabled = true;
    try {
      renderNetList(list, await API.wifiScan());
    } catch (e) {
      list.innerHTML = '<div class="net-empty">Scan failed</div>';
    }
    btn.disabled = false;
  }

  // ---------- start menu ----------
  function buildStartMenu(filter) {
    const grid = document.getElementById('start-grid');
    grid.innerHTML = '';
    apps.filter(a => !filter || a.name.toLowerCase().includes(filter)).forEach(app => {
      const el = document.createElement('div');
      el.className = 'start-app';
      el.innerHTML = `${app.icon}<span>${escapeHtml(app.name)}</span>`;
      el.addEventListener('click', () => { hideFlyouts(); launch(app.id); });
      grid.appendChild(el);
    });
  }

  // ---------- quick settings ----------
  function buildQuickSettings() {
    const grid = document.getElementById('qs-grid');
    grid.innerHTML = '';
    const tiles = [
      {
        icon: I.wifi, label: 'Hotspot', on: true,
        click: () => { hideFlyouts(); launch('settings', 'network'); },
      },
      {
        icon: settings.theme === 'dark' ? I.moon : I.sun, label: 'Theme',
        on: settings.theme === 'dark',
        click: () => { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applySettings(); buildQuickSettings(); },
      },
      {
        icon: I.settings, label: 'Settings', on: false,
        click: () => { hideFlyouts(); launch('settings'); },
      },
    ];
    tiles.forEach(t => {
      const el = document.createElement('div');
      el.className = 'qs-tile' + (t.on ? ' on' : '');
      el.innerHTML = `${t.icon}<span>${t.label}</span>`;
      el.addEventListener('click', t.click);
      grid.appendChild(el);
    });

    const br = document.getElementById('qs-bright');
    br.value = settings.brightness;
    br.oninput = () => { settings.brightness = +br.value; saveSettings(); applySettings(); };

    const ac = document.getElementById('qs-accents');
    ac.innerHTML = '';
    ACCENTS.forEach((a, i) => {
      const dot = document.createElement('div');
      dot.className = 'qs-accent' + (i === settings.accent ? ' sel' : '');
      dot.style.background = a.c;
      dot.addEventListener('click', () => { settings.accent = i; saveSettings(); applySettings(); buildQuickSettings(); });
      ac.appendChild(dot);
    });
  }

  // ---------- calendar / clock ----------
  function startClock() {
    const tick = () => {
      const n = new Date();
      document.getElementById('clock-time').textContent =
        n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      document.getElementById('clock-date').textContent =
        n.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
    };
    tick();
    setInterval(tick, 10000);
  }

  function buildCalendar() {
    const n = new Date();
    document.getElementById('cal-head').innerHTML =
      `<span>${n.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>`;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
    const first = new Date(n.getFullYear(), n.getMonth(), 1);
    const days = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    for (let i = 0; i < first.getDay(); i++) grid.innerHTML += '<div class="day dim"></div>';
    for (let d = 1; d <= days; d++) {
      grid.innerHTML += `<div class="day${d === n.getDate() ? ' today' : ''}">${d}</div>`;
    }
  }

  // ---------- flyouts ----------
  function hideFlyouts() {
    document.querySelectorAll('.flyout.show').forEach(f => f.classList.remove('show'));
  }
  function toggleFlyout(id, before) {
    const el = document.getElementById(id);
    const was = el.classList.contains('show');
    hideFlyouts();
    if (!was) { if (before) before(); el.classList.add('show'); }
  }

  function bindChrome() {
    document.getElementById('btn-start').addEventListener('click', e => {
      e.stopPropagation();
      toggleFlyout('start-menu', () => {
        buildStartMenu();
        const q = document.getElementById('start-q');
        q.value = ''; setTimeout(() => q.focus(), 60);
      });
    });
    document.getElementById('tb-search').addEventListener('click', e => {
      e.stopPropagation();
      toggleFlyout('start-menu', () => {
        buildStartMenu();
        setTimeout(() => document.getElementById('start-q').focus(), 60);
      });
    });
    document.getElementById('start-q').addEventListener('input', e =>
      buildStartMenu(e.target.value.trim().toLowerCase()));
    document.getElementById('tray').addEventListener('click', e => {
      e.stopPropagation(); toggleFlyout('quick-settings', buildQuickSettings);
    });
    document.getElementById('tray-net').addEventListener('click', e => {
      e.stopPropagation(); toggleFlyout('net-flyout', buildNetFlyout);
    });
    document.getElementById('net-rescan').addEventListener('click', e => {
      e.stopPropagation(); scanNetworks();
    });
    document.getElementById('net-more').addEventListener('click', e => {
      e.stopPropagation(); hideFlyouts(); launch('settings', 'network');
    });
    document.getElementById('clock').addEventListener('click', e => {
      e.stopPropagation(); toggleFlyout('calendar-flyout', buildCalendar);
    });
    document.getElementById('show-desktop').addEventListener('click', () =>
      WM.list().forEach(w => w.min()));

    document.getElementById('btn-power').addEventListener('click', e => {
      e.stopPropagation();
      const items = [];
      if (Account.hasPassword()) {
        items.push({ label: 'Lock', icon: I.lock, onClick: () => Account.lock() });
        items.push({ sep: true });
      }
      items.push({ label: 'Reload desktop', icon: I.refresh, onClick: () => location.reload() });
      items.push({ label: 'Reboot device', icon: I.power, danger: true, onClick: rebootDevice });
      ctxMenu(e.clientX, e.clientY - 90, items);
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.flyout')) hideFlyouts();
      closeCtx();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { hideFlyouts(); closeCtx(); return; }
      // Win-key style shortcuts, ignored while typing
      const typing = e.target.matches('input, textarea');
      if (e.key === 'Meta' && !typing) {
        e.preventDefault();
        toggleFlyout('start-menu', () => {
          buildStartMenu();
          setTimeout(() => document.getElementById('start-q').focus(), 60);
        });
      }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault(); launch('explorer');
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault(); launch('terminal');
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault(); WM.list().forEach(w => w.min());
      }
      // Win+Left / Win+Right snapping, Win+Up maximize
      const w = WM.activeWin();
      if (w && e.metaKey) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); w.snapTo('left'); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); w.snapTo('right'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); w.max(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); w.maxed ? w.unmax() : w.min(); }
      }
    });
    document.addEventListener('contextmenu', e => {
      if (e.target.closest('#desktop') && !e.target.closest('.window') &&
        !e.target.closest('#taskbar') && !e.target.closest('.flyout')) {
        e.preventDefault();
        desktopMenu(e.clientX, e.clientY);
      } else if (e.target.closest('#taskbar')) {
        e.preventDefault();
        taskbarMenu(e.clientX, e.clientY);
      } else if (!e.target.closest('.term') && !e.target.closest('textarea') &&
        !e.target.closest('input')) {
        e.preventDefault();
      }
    });

    installMarquee();
  }

  function desktopMenu(x, y) {
    ctxMenu(x, y, [
      { label: 'File Explorer', icon: I.explorer, hint: 'Ctrl+Shift+E',
        onClick: () => launch('explorer') },
      { label: 'Terminal', icon: I.terminal, hint: 'Ctrl+Shift+T',
        onClick: () => launch('terminal') },
      { label: 'Task Manager', icon: I.monitor, onClick: () => launch('monitor') },
      { label: 'Install an app', icon: I.appbox,
        onClick: () => launch('appstore', 'install') },
      { sep: true },
      { label: 'Arrange icons', icon: I.refresh, onClick: arrangeIcons },
      {
        label: 'Auto arrange', icon: I.check, checked: autoArrange(),
        onClick: () => setAutoArrange(!autoArrange()),
      },
      { label: 'Change wallpaper', icon: I.photos, onClick: () => wallpaperMenu(x, y) },
      { label: settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: settings.theme === 'dark' ? I.sun : I.moon,
        onClick: () => {
          settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
          saveSettings(); applySettings();
        } },
      { sep: true },
      { label: 'Display settings', icon: I.settings,
        onClick: () => launch('settings', 'personal') },
      { label: 'Reload desktop', icon: I.refresh, hint: 'F5',
        onClick: () => location.reload() },
      { label: 'About Dsp32', icon: I.info, onClick: () => launch('about') },
    ]);
  }

  // Wallpapers get their own menu rather than padding the main one out to
  // fourteen items — which is what pushed it off the bottom of the screen.
  function wallpaperMenu(x, y) {
    ctxMenu(x, y, [
      ...WALLPAPERS.map(w => ({
        label: w.name,
        icon: I.photos,
        checked: w.id === settings.wallpaper,
        onClick: () => { settings.wallpaper = w.id; saveSettings(); applySettings(); },
      })),
      { sep: true },
      { label: 'Next wallpaper', icon: I.refresh, onClick: nextWallpaper },
      { label: 'More in Settings', icon: I.settings,
        onClick: () => launch('settings', 'personal') },
    ]);
  }

  function taskbarMenu(x, y) {
    const open = WM.list();
    ctxMenu(x, y, [
      { label: 'Task Manager', icon: I.monitor, onClick: () => launch('monitor') },
      { label: 'Settings', icon: I.settings, onClick: () => launch('settings') },
      { sep: true },
      { label: 'Show desktop', icon: I.refresh, hint: 'Ctrl+Shift+D',
        disabled: !open.length, onClick: () => open.forEach(w => w.min()) },
      { label: `Close all windows${open.length ? ` (${open.length})` : ''}`,
        icon: I.x, danger: true, disabled: !open.length,
        onClick: async () => {
          if (open.length > 2 && !await confirmDlg('Close all windows',
            `Close ${open.length} open windows?`, 'Close all')) return;
          open.forEach(w => w.close());
        } },
    ]);
  }

  // Drag on empty desktop to rubber-band select icons.
  function installMarquee() {
    const desk = document.getElementById('desktop');
    const box = document.createElement('div');
    box.id = 'marquee';
    desk.appendChild(box);
    let origin = null;

    desk.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('.window, #taskbar, .flyout, .dicon, #ctx-menu')) return;
      origin = { x: e.clientX, y: e.clientY };
      box.style.display = 'block';
      box.style.left = origin.x + 'px';
      box.style.top = origin.y + 'px';
      box.style.width = box.style.height = '0px';
      document.querySelectorAll('.dicon.sel').forEach(i => i.classList.remove('sel'));
    });

    desk.addEventListener('pointermove', e => {
      if (!origin) return;
      const r = {
        left: Math.min(origin.x, e.clientX), top: Math.min(origin.y, e.clientY),
        right: Math.max(origin.x, e.clientX), bottom: Math.max(origin.y, e.clientY),
      };
      box.style.left = r.left + 'px';
      box.style.top = r.top + 'px';
      box.style.width = (r.right - r.left) + 'px';
      box.style.height = (r.bottom - r.top) + 'px';

      document.querySelectorAll('.dicon').forEach(icon => {
        const b = icon.getBoundingClientRect();
        const hit = b.left < r.right && b.right > r.left &&
                    b.top < r.bottom && b.bottom > r.top;
        icon.classList.toggle('sel', hit);
      });
    });

    const end = () => { origin = null; box.style.display = 'none'; };
    desk.addEventListener('pointerup', end);
    desk.addEventListener('pointercancel', end);

    // Keep the grid sane when the window resizes under a saved layout.
    let resizeTimer = null;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildDesktopIcons, 200);
    });
  }

  function nextWallpaper() {
    const i = WALLPAPERS.findIndex(w => w.id === settings.wallpaper);
    settings.wallpaper = WALLPAPERS[(i + 1) % WALLPAPERS.length].id;
    saveSettings(); applySettings();
  }

  async function rebootDevice() {
    if (!await confirmDlg('Reboot device', 'The Dsp32 board will restart. The desktop reconnects automatically.')) return;
    try { await API.reboot(); } catch (e) {}
    const boot = document.getElementById('boot');
    boot.classList.remove('fade');
    document.getElementById('boot-probe').innerHTML =
      '<div class="p-line" style="animation-delay:0s"><b>Rebooting…</b></div>';
    const poll = setInterval(async () => {
      try { await API.system(); clearInterval(poll); location.reload(); } catch (e) {}
    }, 2000);
  }

  // ---------- context menu ----------
  let ctxEl = null;
  function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }

  const MARGIN = 8;

  function ctxMenu(x, y, items) {
    closeCtx();
    const el = document.createElement('div');
    el.id = 'ctx-menu';

    items.forEach(it => {
      if (it.sep) {
        // Built as an element, not appended through innerHTML: assigning to
        // innerHTML reparses the whole subtree and silently drops the click
        // listeners on every row added before it.
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        el.appendChild(sep);
        return;
      }

      const row = document.createElement('div');
      row.className = 'ctx-item' + (it.danger ? ' danger' : '') +
                      (it.disabled ? ' disabled' : '') +
                      (it.checked ? ' checked' : '');
      row.innerHTML =
        `<span class="ctx-ico">${it.icon || ''}</span>` +
        `<span class="ctx-label">${escapeHtml(it.label)}</span>` +
        (it.hint ? `<span class="ctx-hint">${escapeHtml(it.hint)}</span>` : '');

      if (!it.disabled) {
        row.addEventListener('click', e => {
          e.stopPropagation();
          closeCtx();
          if (it.onClick) {
            try { it.onClick(); }
            catch (err) {
              console.error('menu action failed:', it.label, err);
              toast('Menu', `${it.label} failed: ${err.message}`);
            }
          }
        });
      }
      el.appendChild(row);
    });

    document.body.appendChild(el);
    placeMenu(el, x, y);
    ctxEl = el;
    return el;
  }

  // Opens down-right of the cursor when there is room, and flips to the other
  // side when there is not — so a menu near an edge never covers the pointer
  // or runs off the screen. Falls back to clamping when it fits nowhere.
  function placeMenu(el, x, y) {
    // offsetWidth/Height, not getBoundingClientRect: the entry animation
    // starts at scale(.96), so a rect measured now reports the menu smaller
    // than it will settle at and the flip lands short.
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = innerWidth, vh = innerHeight;

    let left = x;
    if (x + w + MARGIN > vw) {
      left = (x - w >= MARGIN) ? x - w : vw - w - MARGIN;
    }

    let top = y;
    if (y + h + MARGIN > vh) {
      top = (y - h >= MARGIN) ? y - h : vh - h - MARGIN;
    }

    // A menu taller than the viewport scrolls instead of overflowing it.
    if (h + MARGIN * 2 > vh) {
      el.style.maxHeight = (vh - MARGIN * 2) + 'px';
      el.style.overflowY = 'auto';
      top = MARGIN;
    }

    el.style.left = Math.max(MARGIN, left) + 'px';
    el.style.top = Math.max(MARGIN, top) + 'px';
  }

  // ---------- toasts ----------
  function toast(title, msg, icon) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon || I.info}<div><b>${escapeHtml(title)}</b><p>${escapeHtml(msg || '')}</p></div>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 350); }, 4500);
  }

  // ---------- dialogs ----------
  function dialog(o) {
    const ov = document.createElement('div');
    ov.className = 'dlg-overlay';
    const dlg = document.createElement('div');
    dlg.className = 'dlg' + (o.wide ? ' wide' : '');
    dlg.innerHTML = `<div class="dlg-title">${escapeHtml(o.title || '')}</div><div class="dlg-body"></div><div class="dlg-actions"></div>`;
    const body = dlg.querySelector('.dlg-body');
    if (typeof o.body === 'string') body.innerHTML = o.body;
    else if (o.body) body.appendChild(o.body);
    const actions = dlg.querySelector('.dlg-actions');
    const close = () => ov.remove();
    (o.buttons || [{ label: 'OK', primary: true }]).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '');
      btn.textContent = b.label;
      // Returning false keeps the dialog open, which is how a button that
      // validates something reports the problem in place. An async handler
      // returns a promise, and a promise is never === false — so every async
      // button was closing the dialog whatever it decided. Awaited here.
      btn.addEventListener('click', async () => {
        if (!b.onClick) return close();
        if (btn.dataset.busy) return;      // no double-firing a slow handler
        btn.dataset.busy = '1';
        try {
          if (await b.onClick() !== false) close();
        } finally {
          delete btn.dataset.busy;
        }
      });
      actions.appendChild(btn);
    });
    ov.appendChild(dlg);
    ov.addEventListener('pointerdown', e => { if (e.target === ov && o.dismissable !== false) close(); });
    document.body.appendChild(ov);
    return { close, el: dlg };
  }

  function confirmDlg(title, msg, okLabel) {
    return new Promise(res => {
      dialog({
        title, body: escapeHtml(msg),
        buttons: [
          { label: 'Cancel', onClick: () => res(false) },
          { label: okLabel || 'Continue', primary: true, onClick: () => res(true) },
        ],
        dismissable: false,
      });
    });
  }

  // `opts.selectRange` preselects part of the text — renaming a file wants
  // the stem highlighted and the extension left alone.
  function promptDlg(title, label, value, opts) {
    opts = opts || {};
    return new Promise(res => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; res(v); } };

      const wrap = document.createElement('div');
      wrap.innerHTML = `<div style="margin-bottom:8px">${escapeHtml(label || '')}</div><input class="tinput">`;
      const input = wrap.querySelector('input');
      input.value = value || '';
      const d = dialog({
        title, body: wrap,
        buttons: [
          { label: 'Cancel', onClick: () => done(null) },
          { label: 'OK', primary: true, onClick: () => done(input.value.trim() || null) },
        ],
        dismissable: false,
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { done(input.value.trim() || null); d.close(); }
        if (e.key === 'Escape') { done(null); d.close(); }
      });
      setTimeout(() => {
        input.focus();
        const r = opts.selectRange;
        if (r) input.setSelectionRange(r[0], r[1]);
        else input.select();
      }, 50);
    });
  }

  // ---------- file picker ----------
  function pickPath(o) {
    o = o || {};
    return new Promise(res => {
      let cur = o.start || '/flash';
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="picker-crumbs"></div>
        <div class="picker-list"></div>
        ${o.mode === 'save' ? '<input class="tinput" placeholder="File name">' : ''}`;
      const crumbs = wrap.querySelector('.picker-crumbs');
      const list = wrap.querySelector('.picker-list');
      const nameInput = wrap.querySelector('input');
      if (nameInput) nameInput.value = o.defaultName || '';
      let picked = null;

      async function render() {
        crumbs.innerHTML = '';
        const parts = cur.split('/').filter(Boolean);
        const rootC = document.createElement('span');
        rootC.className = 'crumb'; rootC.textContent = 'Device';
        rootC.onclick = () => { cur = ''; render(); };
        crumbs.appendChild(rootC);
        let acc = '';
        parts.forEach(p => {
          acc += '/' + p;
          const target = acc;
          crumbs.innerHTML += '<span class="csep">›</span>';
          const c = document.createElement('span');
          c.className = 'crumb'; c.textContent = p;
          c.onclick = () => { cur = target; render(); };
          crumbs.appendChild(c);
        });

        list.innerHTML = '';
        if (!cur) {
          const drives = [{ p: '/flash', n: 'Flash storage', ok: sys ? sys.flashFs : true },
            { p: '/sd', n: 'SD card', ok: sys ? sys.sd : false }];
          drives.filter(d => d.ok).forEach(d => {
            const el = document.createElement('div');
            el.className = 'picker-item';
            el.innerHTML = `${d.p === '/sd' ? I.sdcard : I.hdd}<span>${d.n}</span>`;
            el.onclick = () => { cur = d.p; render(); };
            list.appendChild(el);
          });
          return;
        }
        try {
          const r = await API.fsList(cur);
          const entries = r.entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
          entries.forEach(en => {
            const el = document.createElement('div');
            el.className = 'picker-item';
            el.innerHTML = `${extIcon(en.name, en.dir)}<span>${escapeHtml(en.name)}</span>`;
            el.onclick = () => {
              if (en.dir) { cur = cur + '/' + en.name; render(); }
              else if (o.mode !== 'save') { picked = cur + '/' + en.name; ok(); }
              else if (nameInput) nameInput.value = en.name;
            };
            list.appendChild(el);
          });
          if (!entries.length) list.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:12.5px">Empty folder</div>';
        } catch (e) {
          list.innerHTML = '<div style="padding:16px;color:var(--text-3)">Cannot open folder</div>';
        }
      }

      let d;
      const ok = () => {
        if (o.mode === 'save') {
          const n = nameInput.value.trim();
          if (!n || !cur) return;
          res(cur + '/' + n); d.close();
        } else if (picked) { res(picked); d.close(); }
      };
      d = dialog({
        title: o.title || (o.mode === 'save' ? 'Save as' : 'Open'),
        body: wrap, wide: true,
        buttons: [
          { label: 'Cancel', onClick: () => res(null) },
          { label: o.mode === 'save' ? 'Save' : 'Open', primary: true, onClick: () => { ok(); return false; } },
        ],
        dismissable: false,
      });
      render();
    });
  }

  // ---------- file open routing ----------
  // Platform owns the type table; this stays as the name older code calls.
  function openPath(path) { return Platform.open(path); }
  function downloadPath(path) {
    const a = document.createElement('a');
    a.href = API.fsDownloadUrl(path);
    a.download = path.split('/').pop();
    document.body.appendChild(a); a.click(); a.remove();
  }

  return {
    ACCENTS, WALLPAPERS,
    get settings() { return settings; },
    saveSettings, applySettings,
    get sys() { return sys; },
    setSystem(info) { sys = info; updateTray(); Platform.emit('sys:changed', info); },
    get fsInfo() { return fsInfo; },
    async refreshFsInfo() { try { fsInfo = await API.fsInfo(); } catch (e) {} return fsInfo; },
    registerApp, unregisterApp, launch, apps, registry,
    init, toast, ctxMenu, dialog,
    confirm: confirmDlg, prompt: promptDlg, pickPath,
    openPath, downloadPath, rebootDevice,
    arrangeIcons, setAutoArrange, buildDesktopIcons, buildStartMenu,
    renderTaskbarApps,
    refreshBattery, get battery() { return battery; },
  };
})();
