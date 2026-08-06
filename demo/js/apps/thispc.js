// This PC — device overview: drives, hardware, network
(function () {
  function create() {
    const win = WM.open({ appId: 'thispc', title: 'This PC', icon: I.drive, w: 780, h: 540 });

    async function render() {
      const s = Shell.sys || {};
      const info = await Shell.refreshFsInfo() || {};
      let wifi = null;
      try { wifi = await API.wifiStatus(); } catch (e) {}

      const drive = (name, icon, m, path) => {
        if (!m || !m.ok) return `
          <div class="tpc-card" style="opacity:.55">${icon}
            <div class="grow"><b>${name}</b><small>Not mounted</small></div></div>`;
        const pct = m.total ? Math.round(m.used / m.total * 100) : 0;
        return `
          <div class="tpc-card" data-nav="${path}">${icon}
            <div class="grow"><b>${name} (${path})</b>
              <div class="meter${pct > 90 ? ' crit' : pct > 75 ? ' warn' : ''}"><i style="width:${pct}%"></i></div>
              <small>${fmtBytes(m.total - m.used)} free of ${fmtBytes(m.total)}</small>
            </div></div>`;
      };

      win.body.innerHTML = `<div class="tpc">
        <h3>Devices and drives</h3>
        <div class="tpc-grid">
          ${drive('Flash storage', I.hdd, info.flash, '/flash')}
          ${drive('SD card', I.sdcard, info.sd, '/sd')}
        </div>
        <h3>Hardware</h3>
        <div class="tpc-grid">
          <div class="tpc-card">${I.monitor}<div class="grow"><b>${escapeHtml(s.chip || '—')}</b>
            <small>rev ${s.revision} · ${s.cores} core${s.cores > 1 ? 's' : ''} @ ${s.cpuMhz} MHz</small></div></div>
          <div class="tpc-card">${I.fileZip}<div class="grow"><b>Memory</b>
            <small>${fmtBytes(s.heapFree)} heap free${s.psramTotal ? ' · ' + fmtBytes(s.psramTotal) + ' PSRAM' : ''}</small></div></div>
          <div class="tpc-card" ${s.camera ? 'data-app="camera"' : 'style="opacity:.55"'}>${I.camera}
            <div class="grow"><b>Camera</b><small>${s.camera ? 'Detected — click to open' : 'Not present'}</small></div></div>
          <div class="tpc-card" data-app="monitor">${I.cpu}<div class="grow"><b>Flash chip</b>
            <small>${fmtBytes(s.flashSize)} · firmware ${fmtBytes(s.sketchSize)}</small></div></div>
        </div>
        <h3>Network</h3>
        <div class="tpc-grid">
          <div class="tpc-card" data-app-arg="network" data-app="settings">${I.wifi}
            <div class="grow"><b>${wifi ? escapeHtml(wifi.ap.ssid) : 'Hotspot'}</b>
            <small>${wifi ? wifi.ap.ip + ' · ' + wifi.ap.stations + ' client(s)' : ''}</small></div></div>
          <div class="tpc-card" data-app="firewall">${I.network}
            <div class="grow"><b>Firewall</b><small>Manage connected clients</small></div></div>
        </div>
      </div>`;

      win.body.querySelectorAll('[data-nav]').forEach(el =>
        el.addEventListener('dblclick', () => Shell.launch('explorer', el.dataset.nav)));
      win.body.querySelectorAll('[data-app]').forEach(el =>
        el.addEventListener('click', () => Shell.launch(el.dataset.app, el.dataset.appArg)));
    }

    render();
    return win;
  }

  Shell.registerApp({
    id: 'thispc', name: 'This PC', icon: I.drive, order: 2, pin: true,
    launch: () => create(),
  });
})();
