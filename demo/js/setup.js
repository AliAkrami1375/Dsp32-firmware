// First-run setup.
//
// A fresh board ships with no apps. Rather than baking a fixed set into the
// firmware, the first boot walks the user through joining a Wi-Fi network and
// then pulls the apps they choose from the registry — so the shipped image
// stays small and the app set stays current.
//
// Every step is skippable. A device with no uplink is a perfectly normal way
// to run Dsp32, and the wizard says so rather than dead-ending.
window.Setup = (function () {
  const DONE_KEY = 'dsp32.setup.done';

  const needed = () => !localStorage.getItem(DONE_KEY);
  const markDone = () => localStorage.setItem(DONE_KEY, '1');

  function run() {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'setup-overlay';
      ov.innerHTML = `
        <div class="setup">
          <div class="setup-head">
            <img src="assets/hero.svg" alt="">
            <div>
              <b>Welcome to Dsp32</b>
              <small id="su-step">Let's get this board set up</small>
            </div>
          </div>
          <div class="setup-body" id="su-body"></div>
          <div class="setup-foot">
            <div class="setup-dots" id="su-dots"></div>
            <button class="btn" id="su-skip">Skip</button>
            <button class="btn primary" id="su-next">Next</button>
          </div>
        </div>`;
      document.body.appendChild(ov);

      const body = ov.querySelector('#su-body');
      const stepLabel = ov.querySelector('#su-step');
      const nextBtn = ov.querySelector('#su-next');
      const skipBtn = ov.querySelector('#su-skip');
      const dots = ov.querySelector('#su-dots');

      const steps = [welcome, network, apps, finish];
      let at = 0;

      function paintDots() {
        dots.innerHTML = steps.map((_, i) =>
          `<i class="${i === at ? 'on' : i < at ? 'done' : ''}"></i>`).join('');
      }

      function go(i) {
        at = Math.max(0, Math.min(steps.length - 1, i));
        paintDots();
        steps[at]();
      }

      function close() {
        markDone();
        ov.remove();
        resolve();
      }

      nextBtn.onclick = () => go(at + 1);
      skipBtn.onclick = close;

      // ---- 1. what this is ----
      function welcome() {
        stepLabel.textContent = 'Step 1 of 4 — What this is';
        nextBtn.textContent = 'Get started';
        skipBtn.hidden = false;
        skipBtn.textContent = 'Skip setup';
        const s = Shell.sys || {};
        body.innerHTML = `
          <p class="su-lede">This board is now a small computer. It runs its own
          Wi-Fi hotspot and serves this desktop to anything that connects — no
          app to install, no internet needed.</p>
          <div class="su-facts">
            <div><b>${escapeHtml(s.chip || 'ESP32')}</b><small>${s.cores || '?'} cores @ ${s.cpuMhz || '?'} MHz</small></div>
            <div><b>${fmtBytes(s.heapTotal)}</b><small>memory${s.psramTotal ? ' + ' + fmtBytes(s.psramTotal) + ' PSRAM' : ''}</small></div>
            <div><b>${fmtBytes(s.flashSize)}</b><small>flash storage</small></div>
            <div><b>${s.camera ? 'Yes' : 'No'}</b><small>camera detected</small></div>
          </div>
          <p class="su-note">The next two steps connect the board to your Wi-Fi
          and install the apps you want. Both are optional — you can do either
          later from Settings and the App Store.</p>`;
      }

      // ---- 2. uplink ----
      let netTimer = null;
      function network() {
        stepLabel.textContent = 'Step 2 of 4 — Connect to Wi-Fi';
        nextBtn.textContent = 'Next';
        skipBtn.hidden = false;
        skipBtn.textContent = 'Skip';
        body.innerHTML = `
          <p class="su-lede">Joining a network gives the board internet access,
          which is what lets it download apps and reach the outside world. Your
          hotspot keeps working either way.</p>
          <div class="su-net" id="su-net">
            <div class="su-scan">Scanning for networks…</div>
          </div>`;
        scanNetworks();
      }

      async function scanNetworks() {
        const host = body.querySelector('#su-net');
        try {
          const status = await API.wifiStatus();
          if (status.sta.connected) {
            host.innerHTML = `<div class="su-connected">${I.wifi}
              <div><b>Connected to ${escapeHtml(status.sta.ssid)}</b>
              <small>${status.sta.ip} · ${status.sta.rssi} dBm</small></div></div>`;
            return;
          }
        } catch (e) { /* fall through to the scan */ }

        let nets = [];
        try { nets = await API.wifiScan(); }
        catch (e) {
          host.innerHTML = '<div class="su-scan">Could not scan for networks.</div>';
          return;
        }
        if (!nets.length) {
          host.innerHTML = '<div class="su-scan">No networks in range.</div>';
          return;
        }

        host.innerHTML = '';
        nets.sort((a, b) => b.rssi - a.rssi).slice(0, 8).forEach(n => {
          const el = document.createElement('div');
          el.className = 'su-net-row';
          el.innerHTML = `${I.wifi}
            <div class="grow"><b>${escapeHtml(n.ssid)}</b>
            <small>${n.open ? 'Open' : 'Secured'} · ${n.rssi} dBm</small></div>
            <button class="btn sm primary">Connect</button>`;
          el.querySelector('button').onclick = () => join(n, el);
          host.appendChild(el);
        });
      }

      async function join(n, row) {
        let pass = '';
        if (!n.open) {
          pass = await Shell.prompt(`Connect to ${n.ssid}`, 'Wi-Fi password');
          if (pass == null) return;
        }
        const btn = row.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Connecting…';
        try {
          await API.wifiSta(n.ssid, pass);
          for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const s = await API.wifiStatus();
            if (s.sta.connected) {
              body.querySelector('#su-net').innerHTML = `<div class="su-connected">${I.wifi}
                <div><b>Connected to ${escapeHtml(s.sta.ssid)}</b>
                <small>${s.sta.ip} · ${s.sta.rssi} dBm</small></div></div>`;
              return;
            }
          }
          btn.disabled = false;
          btn.textContent = 'Retry';
          Shell.toast('Setup', 'Could not connect — check the password');
        } catch (e) {
          btn.disabled = false;
          btn.textContent = 'Retry';
          Shell.toast('Setup', 'Failed: ' + e.message);
        }
      }

      // ---- 3. apps ----
      let catalogue = [];
      const chosen = new Set();

      async function apps() {
        stepLabel.textContent = 'Step 3 of 4 — Choose apps';
        nextBtn.textContent = 'Install';
        skipBtn.hidden = false;
        skipBtn.textContent = 'Skip';
        body.innerHTML = `
          <p class="su-lede">Apps are not built into the firmware — the board
          downloads the ones you pick, so the image stays small and the apps
          stay current.</p>
          <div id="su-apps"><div class="su-scan">Reading the app registry…</div></div>`;

        const host = body.querySelector('#su-apps');
        const registry = Shell.settings.registry ||
          DIB.defaultRegistry();

        try { catalogue = (await DIB.fetchRegistry(registry)).apps; }
        catch (e) {
          host.innerHTML = `<div class="su-scan">
            Could not reach the app registry.<br>
            <small>The board downloads apps over its Wi-Fi uplink. Connect it to
            a network and try again from the App Store later.</small></div>`;
          nextBtn.textContent = 'Next';
          return;
        }

        chosen.clear();
        catalogue.forEach(a => chosen.add(a.id));   // opt-out beats opt-in here

        host.innerHTML = '';
        catalogue.forEach(a => {
          const el = document.createElement('label');
          el.className = 'su-app';
          el.innerHTML = `
            <input type="checkbox" checked>
            ${I.appbox}
            <div class="grow"><b>${escapeHtml(a.name)}</b>
              <small>${escapeHtml(a.description || '')}</small></div>
            <span class="su-size">${fmtBytes(a.size)}</span>`;
          el.querySelector('input').onchange = e => {
            e.target.checked ? chosen.add(a.id) : chosen.delete(a.id);
            nextBtn.textContent = chosen.size ? `Install ${chosen.size}` : 'Skip';
          };
          host.appendChild(el);
        });
        nextBtn.textContent = `Install ${chosen.size}`;
      }

      // ---- 4. install and finish ----
      async function finish() {
        stepLabel.textContent = 'Step 4 of 4 — Finishing up';
        nextBtn.disabled = true;
        // Nothing left to skip past on the final step.
        skipBtn.hidden = true;

        const wanted = catalogue.filter(a => chosen.has(a.id));
        if (!wanted.length) {
          body.innerHTML = `
            <div class="su-done">${I.check}
              <b>All set</b>
              <p>No apps installed. You can add them any time from the App Store.</p>
            </div>`;
          nextBtn.disabled = false;
          nextBtn.textContent = 'Start using Dsp32';
          nextBtn.onclick = close;
          return;
        }

        body.innerHTML = `
          <div class="su-install">
            <div class="su-install-name" id="su-name">Preparing…</div>
            <div class="meter"><i id="su-bar" style="width:0%"></i></div>
            <div class="su-log" id="su-log"></div>
          </div>`;

        const log = body.querySelector('#su-log');
        const bar = body.querySelector('#su-bar');
        const name = body.querySelector('#su-name');
        let done = 0, failed = 0;

        const installedIds = [];
        for (const app of wanted) {
          name.textContent = `Installing ${app.name}…`;
          try {
            const bytes = await DIB.download(app.url, { sha256: app.sha256 });
            const pkg = await DIB.parse(bytes);
            await DIB.install(pkg, { source: 'setup' });
            installedIds.push(pkg.manifest.id);
            log.innerHTML += `<div class="ok">${I.check} ${escapeHtml(app.name)}</div>`;
          } catch (e) {
            failed++;
            log.innerHTML += `<div class="bad">${I.x} ${escapeHtml(app.name)} — ${escapeHtml(e.message)}</div>`;
          }
          bar.style.width = Math.round((++done / wanted.length) * 100) + '%';
          log.scrollTop = log.scrollHeight;
        }

        name.textContent = failed
          ? `${wanted.length - failed} of ${wanted.length} installed`
          : 'Everything installed';

        nextBtn.disabled = false;
        nextBtn.textContent = 'Restart the desktop';
        // The apps just installed are started here rather than by reloading:
        // a first boot that ends by throwing the page away is a strange first
        // impression, and there is nothing a reload would do that this does
        // not.
        nextBtn.onclick = async () => {
          markDone();
          nextBtn.disabled = true;
          nextBtn.textContent = 'Starting…';
          let failed = 0;
          for (const id of installedIds) {
            try { await DIB.activate(id); } catch (e) { failed++; }
          }
          close();
          if (failed) location.reload();
        };
      }

      go(0);
    });
  }

  return { needed, run, markDone, reset: () => localStorage.removeItem(DONE_KEY) };
})();
