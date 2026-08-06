// About Dsp32
(function () {
  function create() {
    const win = WM.open({ appId: 'about', title: 'About Dsp32', icon: I.info, w: 560, h: 620 });
    const s = Shell.sys || {};

    win.body.innerHTML = `
      <div class="about-scroll">
        <div class="about-hero">
          <img src="assets/hero.svg" alt="">
          <h1>Dsp32</h1>
          <div class="ver">Web Desktop OS · version ${escapeHtml(s.version || '1.0.0')}</div>
        </div>

        <p class="about-lede">
          Dsp32 turns an ESP32 into a self-contained computer. The board raises
          its own Wi-Fi hotspot, runs a captive portal, and serves a complete
          desktop to any phone or laptop that connects — windows, taskbar, start
          menu, file manager, terminal, network manager, firewall and an app
          store, all rendered in the browser and backed by real hardware on the
          device.
        </p>
        <p class="about-lede">
          It is native ESP-IDF firmware with no Arduino layer. The entire
          interface is compressed into the firmware image, so nothing is
          installed on the client and nothing is fetched from the internet.
          Everything works with no network at all beyond the board's own
          hotspot.
        </p>

        <div class="about-group">
          <h3>This device</h3>
          <table>
            <tr><td>Chip</td><td>${escapeHtml(s.chip || '—')} rev ${s.revision ?? '—'}</td></tr>
            <tr><td>Cores</td><td>${s.cores ?? '—'} @ ${s.cpuMhz ?? '—'} MHz</td></tr>
            <tr><td>Flash</td><td>${fmtBytes(s.flashSize)}</td></tr>
            <tr><td>Memory</td><td>${fmtBytes(s.heapTotal)}${s.psramTotal ? ' + ' + fmtBytes(s.psramTotal) + ' PSRAM' : ''}</td></tr>
            <tr><td>MAC address</td><td>${escapeHtml(s.mac || '—')}</td></tr>
            <tr><td>Camera</td><td>${s.camera ? 'detected' : 'not present'}</td></tr>
            <tr><td>SD card</td><td>${s.sd ? 'mounted' : 'not present'}</td></tr>
            <tr><td>Framework</td><td>${escapeHtml(s.sdk || '—')}</td></tr>
            <tr><td>Uptime</td><td>${fmtUptime(s.uptimeMs || 0)}</td></tr>
          </table>
        </div>

        <div class="about-group">
          <h3>What it can do</h3>
          <ul class="about-list">
            <li><b>Storage</b> — FAT on internal flash plus SD card, browsable and
              writable from the desktop or over HTTP.</li>
            <li><b>Pins</b> — digital I/O, ADC and PWM, with a capability map
              generated per chip so only pins that exist are offered.</li>
            <li><b>Camera</b> — live MJPEG stream and capture, on boards that
              carry a sensor.</li>
            <li><b>Network</b> — hotspot management, uplink to a router, connected
              client list and a MAC firewall.</li>
            <li><b>Apps</b> — installable <code>.dib</code> packages from a file, a
              URL or a registry, with a permission prompt before they run.</li>
          </ul>
        </div>

        <div class="about-group">
          <h3>Made by</h3>
          <a class="about-link" href="https://dibachain.ir/" target="_blank" rel="noopener">
            <span class="about-link-ico">${I.network}</span>
            <span class="grow">
              <b>Dibachain</b>
              <small>dibachain.ir</small>
            </span>
            <span class="about-chev">${I.chevR}</span>
          </a>
          <a class="about-link" href="https://github.com/AliAkrami1375/Dsp32" target="_blank" rel="noopener">
            <span class="about-link-ico">${I.fileCode}</span>
            <span class="grow">
              <b>Source code</b>
              <small>github.com/AliAkrami1375/Dsp32</small>
            </span>
            <span class="about-chev">${I.chevR}</span>
          </a>
          <a class="about-link" href="https://github.com/AliAkrami1375/Dsp32-firmware" target="_blank" rel="noopener">
            <span class="about-link-ico">${I.download}</span>
            <span class="grow">
              <b>Prebuilt firmware</b>
              <small>Ready-to-flash images for every supported board</small>
            </span>
            <span class="about-chev">${I.chevR}</span>
          </a>
        </div>

        <div class="about-foot">
          Released under the MIT License.<br>
          Links open outside the desktop and need internet on your own device.
        </div>
      </div>`;

    return win;
  }

  Shell.registerApp({
    id: 'about', name: 'About', icon: I.info, order: 20, desktop: false,
    launch: () => create(),
  });
})();
