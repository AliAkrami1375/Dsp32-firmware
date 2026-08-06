// Settings — system, personalization, network, storage
(function () {
  const sectionOf = (arg) =>
    (arg && typeof arg === 'object' ? arg.section : arg) || null;

  function create(section) {
    const win = WM.open({ appId: 'settings', title: 'Settings', icon: I.settings, w: 860, h: 580 });
    let cur = sectionOf(section) || 'system';

    win.body.innerHTML = `<div class="set">
      <div class="set-side">
        <div class="snav" data-s="system">${I.cpu}<span>System</span></div>
        <div class="snav" data-s="account">${I.user}<span>Account</span></div>
        <div class="snav" data-s="power">${I.power}<span>Power &amp; sleep</span></div>
        <div class="snav" data-s="personal">${I.palette}<span>Personalization</span></div>
        <div class="snav" data-s="network">${I.wifi}<span>Network &amp; hotspot</span></div>
        <div class="snav" data-s="storage">${I.storage}<span>Storage</span></div>
        <div class="snav" data-s="camera">${I.camera}<span>Camera</span></div>
        <div class="snav" data-s="battery">${I.battery}<span>Battery</span></div>
        <div class="snav" data-s="about">${I.info}<span>About</span></div>
      </div>
      <div class="set-body"></div>
    </div>`;

    const body = win.body.querySelector('.set-body');
    const navs = win.body.querySelectorAll('.set-side .snav');
    navs.forEach(n => n.addEventListener('click', () => show(n.dataset.s)));

    function show(s) {
      cur = s;
      navs.forEach(n => n.classList.toggle('sel', n.dataset.s === s));
      ({ system, account, power, personal, network, storage, camera, battery,
         about }[s] || system)();
    }
    win.data.showSection = show;
    win.session = () => ({ section: cur });

    // ---------- System ----------
    function system() {
      const s = Shell.sys || {};
      body.innerHTML = `<h2>System</h2>
        <div class="set-group">
          <div class="set-row">${I.cpu.replace('<svg', '<svg class="lead"')}
            <div class="grow"><b>${escapeHtml(s.chip || '')} · ${s.cores || '?'} cores @ ${s.cpuMhz || '?'} MHz</b>
            <small>${s.name} v${s.version} · SDK ${escapeHtml(s.sdk || '')}</small></div></div>
          <div class="set-row"><div class="grow"><b>Uptime</b><small>${fmtUptime(s.uptimeMs || 0)}</small></div></div>
          <div class="set-row"><div class="grow"><b>MAC address</b><small>${s.mac || ''}</small></div></div>
        </div>
        <div class="set-group"><h3>Power</h3>
          <div class="set-row"><div class="grow"><b>Reboot device</b>
            <small>Restarts the board; the desktop reconnects automatically.</small></div>
            <button class="btn" id="rb">Reboot</button></div>
        </div>`;
      body.querySelector('#rb').addEventListener('click', Shell.rebootDevice);
    }

    // ---------- Power & sleep ----------
    async function power() {
      body.innerHTML = '<h2>Power &amp; sleep</h2><div id="pw">Reading power state…</div>';
      let p;
      try { p = await API.power(); }
      catch (e) {
        body.querySelector('#pw').innerHTML =
          '<div class="set-row">This firmware has no power API.</div>';
        return;
      }

      const steps = p.steps || [p.defaultMhz];
      const opt = (v, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v} MHz</option>`;

      body.querySelector('#pw').innerHTML = `
        ${p.supported ? '' : `
          <div class="set-row" style="border-color:rgba(255,185,0,.3);background:rgba(255,185,0,.08)">
            <div class="grow"><b>Frequency scaling is not compiled in</b>
              <small>${escapeHtml(p.reason || '')} Values below are read-only.</small></div>
          </div>`}

        <div class="set-group"><h3>Processor</h3>
          <div class="set-row">
            <div class="grow"><b>Maximum frequency</b>
              <small>The speed the chip runs at under load.</small></div>
            <select class="tinput" id="pw-max" style="width:120px" ${p.supported ? '' : 'disabled'}>
              ${steps.map(v => opt(v, p.maxMhz)).join('')}
            </select>
          </div>
          <div class="set-row">
            <div class="grow"><b>Minimum frequency</b>
              <small>Idle speed. Lower saves power; below 80 MHz the Wi-Fi
                radio may need to wake the clock more often.</small></div>
            <select class="tinput" id="pw-min" style="width:120px" ${p.supported ? '' : 'disabled'}>
              ${steps.map(v => opt(v, p.minMhz)).join('')}
            </select>
          </div>
          <div class="set-row">
            <div class="grow"><b>Automatic light sleep</b>
              <small>Halts the CPU between events and wakes on demand. Saves
                real power; adds a few milliseconds to the first response
                after an idle spell.</small></div>
            <label class="switch"><input type="checkbox" id="pw-ls"
              ${p.lightSleep ? 'checked' : ''} ${p.supported ? '' : 'disabled'}><i></i></label>
          </div>
        </div>

        <div class="set-group"><h3>Deep sleep</h3>
          <div class="set-row">
            <div class="grow"><b>Sleep now</b>
              <small>Everything shuts down — hotspot, desktop, storage — until
                the timer expires or the board is reset. You will lose this
                connection.</small></div>
            <select class="tinput" id="pw-secs" style="width:130px">
              <option value="30">30 seconds</option>
              <option value="300">5 minutes</option>
              <option value="1800">30 minutes</option>
              <option value="0">Until reset</option>
            </select>
            <button class="btn danger" id="pw-sleep">Sleep</button>
          </div>
        </div>

        <div class="set-group"><h3>Restart</h3>
          <div class="set-row">
            <div class="grow"><b>Reboot device</b>
              <small>The desktop reconnects on its own.</small></div>
            <button class="btn" id="pw-reboot">Reboot</button>
          </div>
        </div>`;

      const apply = async () => {
        const max = +body.querySelector('#pw-max').value;
        const min = +body.querySelector('#pw-min').value;
        const ls = body.querySelector('#pw-ls').checked;
        try {
          const r = await API.setPower(max, min, ls);
          // The device clamps min to max; reflect what it actually applied.
          body.querySelector('#pw-min').value = r.minMhz;
          body.querySelector('#pw-max').value = r.maxMhz;
          Shell.toast('Power', `${r.minMhz}–${r.maxMhz} MHz, light sleep ${r.lightSleep ? 'on' : 'off'}`, I.power);
        } catch (e) { Shell.toast('Power', 'Could not apply: ' + e.message); }
      };
      ['#pw-max', '#pw-min', '#pw-ls'].forEach(sel => {
        const el = body.querySelector(sel);
        if (el && !el.disabled) el.onchange = apply;
      });

      body.querySelector('#pw-sleep').onclick = async () => {
        const secs = +body.querySelector('#pw-secs').value;
        const wake = secs ? `for ${secs >= 60 ? secs / 60 + ' minutes' : secs + ' seconds'}`
                          : 'until you reset it';
        if (!await Shell.confirm('Deep sleep',
          `The board sleeps ${wake}. The hotspot goes away and this desktop will disconnect.`,
          'Sleep')) return;
        try {
          await API.deepSleep(secs);
          Shell.dialog({
            title: 'Device is sleeping',
            body: `<div style="font-size:13px;line-height:1.7">
              The board has powered down. Reconnect to the hotspot once it wakes,
              then reload this page.</div>`,
            buttons: [{ label: 'OK', primary: true }],
          });
        } catch (e) { Shell.toast('Power', 'Failed: ' + e.message); }
      };
      body.querySelector('#pw-reboot').onclick = Shell.rebootDevice;
    }

    // ---------- Personalization ----------
    function personal() {
      const st = Shell.settings;
      body.innerHTML = `<h2>Personalization</h2>
        <div class="set-group"><h3>Theme</h3>
          <div class="set-row"><div class="grow"><b>Dark mode</b><small>Acrylic surfaces look best in the dark.</small></div>
            <label class="switch"><input type="checkbox" id="p-theme" ${st.theme === 'dark' ? 'checked' : ''}><i></i></label></div>
          <div class="set-row"><div class="grow"><b>Desktop logo</b><small>Show the Dsp32 hero logo on the wallpaper.</small></div>
            <label class="switch"><input type="checkbox" id="p-logo" ${st.showLogo ? 'checked' : ''}><i></i></label></div>
        </div>
        <div class="set-group"><h3>Opening items</h3>
          <div class="set-row"><div class="grow"><b>How to open files and apps</b>
            <small>Automatic uses a single tap on touch screens and a double
              click with a mouse.</small></div>
            <select class="tinput" id="p-openmode" style="width:150px">
              <option value="auto" ${(st.openMode || 'auto') === 'auto' ? 'selected' : ''}>Automatic</option>
              <option value="single" ${st.openMode === 'single' ? 'selected' : ''}>Single click</option>
              <option value="double" ${st.openMode === 'double' ? 'selected' : ''}>Double click</option>
            </select></div>
          <div class="set-row"><div class="grow"><b>This device</b>
            <small>Detected as a ${Platform.coarse ? 'touch screen' : 'mouse and keyboard'} —
              currently opening on ${Platform.singleClickOpens() ? 'a single click' : 'a double click'}.</small></div></div>
        </div>
        <div class="set-group"><h3>Accent color</h3><div class="accent-dots" id="p-accents"></div></div>
        <div class="set-group"><h3>Background</h3><div class="wp-thumbs" id="p-wps"></div></div>`;

      body.querySelector('#p-theme').addEventListener('change', e => {
        st.theme = e.target.checked ? 'dark' : 'light'; Shell.saveSettings(); Shell.applySettings();
      });
      body.querySelector('#p-logo').addEventListener('change', e => {
        st.showLogo = e.target.checked; Shell.saveSettings(); Shell.applySettings();
      });
      body.querySelector('#p-openmode').addEventListener('change', e => {
        st.openMode = e.target.value;
        Shell.saveSettings();
        Shell.buildDesktopIcons();     // rebind the icons to the new mode
        personal();
      });
      const ac = body.querySelector('#p-accents');
      Shell.ACCENTS.forEach((a, i) => {
        const dot = document.createElement('div');
        dot.className = 'accent-dot' + (i === st.accent ? ' sel' : '');
        dot.style.background = a.c;
        dot.addEventListener('click', () => { st.accent = i; Shell.saveSettings(); Shell.applySettings(); personal(); });
        ac.appendChild(dot);
      });
      const wps = body.querySelector('#p-wps');
      Shell.WALLPAPERS.forEach(w => {
        const t = document.createElement('div');
        t.className = 'wp-thumb ' + w.cls + (w.id === st.wallpaper ? ' sel' : '');
        t.title = w.name;
        t.addEventListener('click', () => { st.wallpaper = w.id; Shell.saveSettings(); Shell.applySettings(); personal(); });
        wps.appendChild(t);
      });
    }

    // ---------- Network ----------
    async function network() {
      body.innerHTML = '<h2>Network &amp; hotspot</h2><div id="net-body">Loading…</div>';
      let w;
      try { w = await API.wifiStatus(); }
      catch (e) { body.querySelector('#net-body').textContent = 'Cannot read network status'; return; }

      body.querySelector('#net-body').innerHTML = `
        <div class="set-group"><h3>Hotspot (access point)</h3>
          <div class="set-row"><div class="grow"><b>${escapeHtml(w.ap.ssid)}</b>
            <small>${w.ap.ip} · ${w.ap.stations} client(s) · ${w.ap.secured ? 'WPA2 secured' : 'open network'}</small></div>
            ${I.wifi.replace('<svg', '<svg class="lead"')}</div>
          <div class="set-row"><div class="grow" style="display:flex;flex-direction:column;gap:8px">
            <b>Change hotspot credentials</b>
            <input class="tinput" id="ap-ssid" placeholder="Hotspot name" value="${escapeHtml(w.ap.ssid)}">
            <input class="tinput" id="ap-pass" type="password" placeholder="Password (min 8 chars, empty = open)">
            <div><button class="btn primary" id="ap-save">Apply</button></div>
            <small>Connected clients will need to rejoin after applying.</small>
          </div></div>
          <div class="set-row"><div class="grow"><b>Client firewall</b><small>View and block connected devices.</small></div>
            <button class="btn" id="open-fw">Open Firewall</button></div>
        </div>
        <div class="set-group"><h3>Wi-Fi uplink (station)</h3>
          <div class="set-row"><div class="grow"><b>${w.sta.configured ? escapeHtml(w.sta.ssid) : 'Not configured'}</b>
            <small>${w.sta.configured ? (w.sta.connected ? 'Connected · ' + w.sta.ip + ' · ' + w.sta.rssi + ' dBm' : 'Not connected') : 'Join a router to give the device internet access.'}</small></div>
            ${w.sta.configured ? '<button class="btn" id="sta-forget">Forget</button>' : ''}</div>
          <div class="set-row"><div class="grow"><b>Available networks</b><small>Scan and connect</small></div>
            <button class="btn" id="sta-scan">Scan</button></div>
          <div id="scan-out"></div>
        </div>`;

      body.querySelector('#ap-save').addEventListener('click', async () => {
        const ssid = body.querySelector('#ap-ssid').value.trim();
        const pass = body.querySelector('#ap-pass').value;
        if (!ssid) return Shell.toast('Network', 'Hotspot name required');
        if (pass && pass.length < 8) return Shell.toast('Network', 'Password must be at least 8 characters');
        if (!await Shell.confirm('Apply hotspot settings',
          `Hotspot becomes "${ssid}" (${pass ? 'WPA2' : 'open'}). You will need to reconnect.`)) return;
        try { await API.wifiAp(ssid, pass); Shell.toast('Network', 'Hotspot updated — reconnect to ' + ssid, I.wifi); }
        catch (e) { Shell.toast('Network', 'Failed: ' + e.message); }
      });
      body.querySelector('#open-fw').addEventListener('click', () => Shell.launch('firewall'));
      const forget = body.querySelector('#sta-forget');
      if (forget) forget.addEventListener('click', async () => {
        await API.wifiForget(); Shell.toast('Network', 'Uplink removed'); network();
      });
      body.querySelector('#sta-scan').addEventListener('click', async () => {
        const out = body.querySelector('#scan-out');
        out.innerHTML = '<div style="padding:10px;color:var(--text-2)">Scanning…</div>';
        try {
          const nets = await API.wifiScan();
          out.innerHTML = '';
          if (!nets.length) out.innerHTML = '<div style="padding:10px;color:var(--text-3)">No networks found</div>';
          nets.sort((a, b) => b.rssi - a.rssi).forEach(n => {
            const el = document.createElement('div');
            el.className = 'net-item';
            el.innerHTML = `${I.wifi}<div style="flex:1"><b style="font-size:13px">${escapeHtml(n.ssid)}</b>
              <small style="color:var(--text-2);display:block">${n.rssi} dBm · ch${n.channel} · ${n.open ? 'open' : 'secured'}</small></div>
              <button class="btn sm">Connect</button>`;
            el.querySelector('button').addEventListener('click', async () => {
              let pass = '';
              if (!n.open) {
                pass = await Shell.prompt('Connect to ' + n.ssid, 'Wi-Fi password');
                if (pass == null) return;
              }
              try { await API.wifiSta(n.ssid, pass); Shell.toast('Network', 'Connecting to ' + n.ssid + '…', I.wifi); setTimeout(network, 4000); }
              catch (e) { Shell.toast('Network', 'Failed: ' + e.message); }
            });
            out.appendChild(el);
          });
        } catch (e) { out.innerHTML = '<div style="padding:10px;color:var(--text-3)">Scan failed</div>'; }
      });
    }

    // ---------- Storage ----------
    async function storage() {
      const info = await Shell.refreshFsInfo() || {};
      let sd = null;
      try { sd = await API.sdConfig(); } catch (e) { /* older firmware */ }

      const meter = (m) => {
        if (!m || !m.ok) return '<small>Not mounted</small>';
        const pct = m.total ? Math.round(m.used / m.total * 100) : 0;
        return `<div class="meter${pct > 90 ? ' crit' : pct > 75 ? ' warn' : ''}"
                     style="margin:7px 0 5px"><i style="width:${pct}%"></i></div>
                <small>${fmtBytes(m.used)} used of ${fmtBytes(m.total)}</small>`;
      };

      body.innerHTML = `<h2>Storage</h2>
        <div class="set-group">
          <div class="set-row"><div class="grow"><b>Flash storage (/flash)</b>
            ${meter(info.flash)}</div></div>
          <div class="set-row"><div class="grow"><b>SD card (/sd)</b>
            ${meter(info.sd)}</div></div>
        </div>
        <div id="sd-move"></div>
        <div id="sd-cfg"></div>
        <div class="set-group"><h3>Maintenance</h3>
          <div class="set-row"><div class="grow"><b>Format flash storage</b>
            <small>Erases every file on /flash — apps, documents and photos.
              Cannot be undone.</small></div>
            <button class="btn danger" id="fmt">Format</button></div>
        </div>`;

      body.querySelector('#fmt').onclick = async () => {
        if (!await Shell.confirm('Format flash',
          'ALL files on /flash will be erased permanently. Continue?', 'Format')) return;
        if (!await Shell.confirm('Are you absolutely sure?',
          'Last chance — this deletes everything on /flash, including installed apps.',
          'Erase everything')) return;
        try {
          await API.fsFormat();
          Shell.toast('Storage', 'Flash formatted');
          Platform.emit('fs:changed', '/flash');
          storage();
        } catch (e) { Shell.toast('Storage', 'Format failed: ' + e.message); }
      };

      if (sd) renderSdConfig(sd);
      renderMigration(info);
    }

    // Everything Dsp32 keeps lives under a handful of well-known folders, and
    // all of them can sit on either mount. A card fitted after the fact is
    // the interesting case: the data is already on flash, the flash is the
    // scarce thing, and moving it is exactly the kind of chore that should be
    // one button rather than a session with the file manager.
    const MOVABLE = [
      { dir: 'Dsp32', label: 'Account and app data' },
      { dir: 'Apps', label: 'Installed apps' },
      { dir: 'Documents', label: 'Documents' },
      { dir: 'DCIM', label: 'Photos' },
    ];

    async function measure(root) {
      const out = [];
      for (const m of MOVABLE) {
        let bytes = 0, files = 0;
        const walk = async (p) => {
          let r;
          try { r = await API.fsList(p); } catch (e) { return; }
          for (const e of r.entries) {
            if (e.dir) await walk(`${p}/${e.name}`);
            else { bytes += e.size || 0; files++; }
          }
        };
        await walk(`${root}/${m.dir}`);
        if (files) out.push(Object.assign({ bytes, files }, m));
      }
      return out;
    }

    async function renderMigration(info) {
      const host = body.querySelector('#sd-move');
      if (!host) return;
      const sdOk = info.sd && info.sd.ok;
      if (!sdOk) { host.innerHTML = ''; return; }

      const onFlash = await measure('/flash');
      if (!onFlash.length) {
        host.innerHTML = `<div class="set-group"><h3>Card</h3>
          <div class="set-row">${I.sdcard.replace('<svg', '<svg class="lead"')}
            <div class="grow"><b>Everything is already on the card</b>
              <small>Nothing of Dsp32's is left on the internal flash.</small>
            </div></div></div>`;
        return;
      }

      const total = onFlash.reduce((a, x) => a + x.bytes, 0);
      const count = onFlash.reduce((a, x) => a + x.files, 0);
      host.innerHTML = `<div class="set-group">
        <h3>Move to the card</h3>
        <div class="set-row">${I.sdcard.replace('<svg', '<svg class="lead"')}
          <div class="grow">
            <b>${fmtBytes(total)} in ${count} file(s) is on the internal flash</b>
            <small>A card is fitted, so this can move across and free the
            flash. Files are copied first and only deleted once the copy is
            verified, so an interrupted move loses nothing.</small>
          </div>
          <button class="btn primary" id="mv-go">Move</button>
        </div>
        ${onFlash.map(x => `<div class="set-row"><div class="grow">
          <b>${escapeHtml(x.label)}</b>
          <small><code>/flash/${x.dir}</code> · ${x.files} file(s) · ${fmtBytes(x.bytes)}</small>
        </div></div>`).join('')}
        <div class="set-row"><div class="grow"><small id="mv-msg"></small></div></div>
      </div>`;

      host.querySelector('#mv-go').onclick = () => migrate(onFlash, total, count);
    }

    async function migrate(groups, total, count) {
      if (!await Shell.confirm('Move to the SD card',
        `${fmtBytes(total)} in ${count} file(s) will be copied to the card and ` +
        'then removed from the internal flash. Apps are reloaded afterwards.',
        'Move')) return;

      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="up-name" style="margin-bottom:8px"></div>
        <div class="meter"><i style="width:0%"></i></div>
        <div class="up-pct" style="margin-top:6px;font-size:12px;color:var(--text-3)"></div>`;
      const dlg = Shell.dialog({ title: 'Moving to the card…', body: wrap,
                                 buttons: [], dismissable: false });
      const name = wrap.querySelector('.up-name');
      const bar = wrap.querySelector('.meter i');
      const pct = wrap.querySelector('.up-pct');

      let done = 0, moved = 0, failed = [];

      // Copy then verify then delete, one file at a time. A board has neither
      // the RAM to stage a whole tree nor a filesystem that can rename across
      // mounts, so this is the only shape available — and doing it in that
      // order means an interruption leaves both copies rather than neither.
      const copyTree = async (from, to) => {
        let r;
        try { r = await API.fsList(from); } catch (e) { return; }
        try { await API.fsMkdir(to); } catch (e) { /* already there */ }
        for (const e of r.entries) {
          if (e.dir) { await copyTree(`${from}/${e.name}`, `${to}/${e.name}`); continue; }
          name.textContent = `${from}/${e.name}`;
          try {
            const bytes = await API.fsReadBytes(`${from}/${e.name}`);
            await API.fsWrite(`${to}/${e.name}`, bytes);
            const check = await API.fsList(to);
            const wrote = check.entries.find(x => x.name === e.name);
            if (!wrote || wrote.size !== (e.size || 0)) throw new Error('size mismatch');
            await API.fsDelete(`${from}/${e.name}`);
            moved += e.size || 0;
          } catch (err) {
            failed.push(`${from}/${e.name}: ${err.message}`);
          }
          done++;
          const p = Math.round(done / count * 100);
          bar.style.width = p + '%';
          pct.textContent = `${done} of ${count} · ${fmtBytes(moved)}`;
        }
        // Only remove the source folder once it is genuinely empty.
        try {
          const left = await API.fsList(from);
          if (!left.entries.length) await API.fsDelete(from);
        } catch (e) { /* leave it */ }
      };

      for (const g of groups) await copyTree(`/flash/${g.dir}`, `/sd/${g.dir}`);

      dlg.close();
      Platform.emit('fs:changed', '/flash');
      Platform.emit('fs:changed', '/sd');
      await Account.load();

      if (failed.length) {
        Shell.dialog({
          title: 'Move finished with problems',
          body: `<div style="font-size:13px;line-height:1.7">
            ${fmtBytes(moved)} moved. ${failed.length} file(s) could not be
            moved and were left on the flash:
            <pre style="margin-top:8px;font-size:11.5px;white-space:pre-wrap">${
              escapeHtml(failed.slice(0, 8).join('\n'))}</pre></div>`,
          buttons: [{ label: 'Close', primary: true }],
        });
      } else {
        Shell.toast('Storage',
          `${fmtBytes(moved)} moved to the card — reload to run the apps from there`,
          I.sdcard);
      }
      storage();
    }

    // SD wiring is a runtime setting, so a board with a soldered-on reader can
    // be made to work without rebuilding the firmware.
    function renderSdConfig(sd) {
      const host = body.querySelector('#sd-cfg');
      const pinRow = (id, label, value) => `
        <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2)">
          ${label}
          <input class="tinput" type="number" id="${id}" value="${value}" min="-1" max="48" style="width:80px">
        </label>`;

      host.innerHTML = `
        <div class="set-group"><h3>SD card wiring</h3>
          <div class="set-row">
            <div class="grow"><b>${sd.mounted ? 'Card mounted' : 'No card mounted'}</b>
              <small>${sd.mounted
                ? `Using ${sd.mode === 'sdmmc' ? 'SDMMC' : 'SPI'} at ${Math.round(sd.freqKhz / 1000)} MHz.`
                : escapeHtml(sd.error || 'Configure the wiring below, or let the device probe for it.')}</small>
            </div>
            <button class="btn primary" id="sd-detect">Detect</button>
          </div>
          <div class="set-row">
            <div class="grow"><b>Interface</b>
              <small>SDMMC is faster but only exists on some chips and has fixed
                pins. SPI works anywhere you can spare four pins.</small></div>
            <select class="tinput" id="sd-mode" style="width:130px">
              <option value="none" ${sd.mode === 'none' ? 'selected' : ''}>None</option>
              <option value="sdmmc" ${sd.mode === 'sdmmc' ? 'selected' : ''}
                ${sd.sdmmcAvailable ? '' : 'disabled'}>SDMMC</option>
              <option value="spi" ${sd.mode === 'spi' ? 'selected' : ''}>SPI</option>
            </select>
          </div>
          <div class="set-row" id="sd-pins" ${sd.mode === 'spi' ? '' : 'hidden'}>
            <div class="grow" style="display:flex;gap:12px;flex-wrap:wrap">
              ${pinRow('sd-cs', 'CS', sd.cs)}
              ${pinRow('sd-clk', 'CLK', sd.clk)}
              ${pinRow('sd-miso', 'MISO', sd.miso)}
              ${pinRow('sd-mosi', 'MOSI', sd.mosi)}
              <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-2)">
                Speed
                <select class="tinput" id="sd-freq" style="width:110px">
                  <option value="20000" ${sd.freqKhz === 20000 ? 'selected' : ''}>20 MHz</option>
                  <option value="10000" ${sd.freqKhz === 10000 ? 'selected' : ''}>10 MHz</option>
                  <option value="4000" ${sd.freqKhz === 4000 ? 'selected' : ''}>4 MHz</option>
                  <option value="1000" ${sd.freqKhz === 1000 ? 'selected' : ''}>1 MHz</option>
                </select>
              </label>
            </div>
            <button class="btn" id="sd-apply">Apply</button>
          </div>
        </div>`;

      const modeSel = host.querySelector('#sd-mode');
      modeSel.onchange = () => {
        host.querySelector('#sd-pins').hidden = modeSel.value !== 'spi';
        if (modeSel.value !== 'spi') applySd();
      };
      host.querySelector('#sd-apply').onclick = applySd;
      host.querySelector('#sd-detect').onclick = async () => {
        const btn = host.querySelector('#sd-detect');
        btn.disabled = true; btn.textContent = 'Probing…';
        try {
          const r = await API.sdDetect();
          Shell.toast('Storage', r.mounted
            ? `Card found on ${r.mode === 'sdmmc' ? 'SDMMC' : `SPI (CS ${r.cs})`}`
            : 'No card found on any known wiring', I.sdcard);
        } catch (e) { Shell.toast('Storage', 'Probe failed: ' + e.message); }
        storage();
      };

      async function applySd() {
        const v = id => +host.querySelector(id).value;
        try {
          const r = await API.sdSet({
            mode: modeSel.value,
            cs: v('#sd-cs'), clk: v('#sd-clk'),
            miso: v('#sd-miso'), mosi: v('#sd-mosi'),
            freqKhz: v('#sd-freq'),
          });
          Shell.toast('Storage', r.mounted ? 'SD card mounted' :
            (r.error || 'Card did not mount'), I.sdcard);
          storage();
        } catch (e) { Shell.toast('Storage', 'Failed: ' + e.message); }
      }
    }

    // ---------- Camera ----------
    // The wiring is found at boot by trying each board the firmware knows, so
    // in the normal case there is nothing to choose here. What this page is
    // for is the board that is not in the table: sixteen pins, applied
    // straight away so a wrong entry says so instead of going quiet until the
    // next reboot.
    const CAM_PINS = ['PWDN', 'RESET', 'XCLK', 'SIOD', 'SIOC',
                      'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0',
                      'VSYNC', 'HREF', 'PCLK'];

    async function camera() {
      body.innerHTML = '<h2>Camera</h2><div class="set-group"><div class="set-row">Checking…</div></div>';

      let st;
      try { st = await API.camStatus(); }
      catch (e) { st = { supported: false, present: false, reason: e.message }; }

      if (!st.supported) {
        body.innerHTML = `<h2>Camera</h2>
          <div class="set-group">
            <div class="set-row">${I.camera.replace('<svg', '<svg class="lead"')}
              <div class="grow"><b>Not supported on this board</b>
                <small>${escapeHtml(st.reason || 'This chip has no camera interface.')}</small>
              </div></div>
          </div>`;
        return;
      }

      body.innerHTML = `<h2>Camera</h2>
        <div class="set-group">
          <h3>Detection</h3>
          <div class="set-row">${I.camera.replace('<svg', '<svg class="lead"')}
            <div class="grow">
              <b>${st.present ? escapeHtml(st.board || 'Camera ready') : 'No module found'}</b>
              <small>${st.present
                ? 'Found by trying each wiring the firmware knows, and remembered for next boot.'
                : `Nothing answered on any of the ${st.known || 0} known wirings.`}</small>
            </div>
            <button class="btn sm" id="cam-again">Search again</button>
          </div>
        </div>

        <div class="set-group">
          <h3>Custom wiring</h3>
          <div class="set-row"><div class="grow">
            <small>For a board the firmware does not know. Enter the GPIO each
            signal is on, and <b>-1</b> where a signal is not connected. The
            pins are tried the moment you apply them, so a mistake reports
            itself rather than waiting for a reboot.</small>
          </div></div>
          <div class="cam-pin-grid" id="cam-pins">
            ${CAM_PINS.map(n => `
              <label><span>${n}</span>
                <input class="tinput" type="number" data-p="${n}" value="-1"></label>`).join('')}
          </div>
          <div class="set-row">
            <div class="grow"><b>Apply these pins</b>
              <small id="cam-msg">Nothing is written until a sensor answers on them.</small></div>
            <button class="btn primary" id="cam-apply">Apply</button>
          </div>
        </div>`;

      body.querySelector('#cam-again').onclick = async () => {
        try {
          await API.camDetect();
          Shell.toast('Camera', 'Wiring forgotten — reboot to search again', I.camera);
        } catch (e) { Shell.toast('Camera', e.message); }
      };

      body.querySelector('#cam-apply').onclick = async () => {
        const pins = [...body.querySelectorAll('#cam-pins input')].map(i => parseInt(i.value, 10));
        const msg = body.querySelector('#cam-msg');
        if (pins.some(v => Number.isNaN(v))) {
          msg.textContent = 'Every field needs a number — use -1 for unconnected.';
          return;
        }
        msg.textContent = 'Trying those pins…';
        try {
          await API.camPins(pins);
          Shell.toast('Camera', 'Camera came up on the pins you entered', I.camera);
          camera();
        } catch (e) { msg.textContent = e.message; }
      };
    }

    // ---------- Battery ----------
    // A board cannot tell that a battery is attached, so this page is where
    // one gets described: which ADC pin the divider taps, the two resistors,
    // the chemistry and the thresholds. Nothing else in the desktop shows a
    // battery until it has been filled in — a gauge with nothing behind it is
    // worse than no gauge.
    const CHEM = ['Li-ion (18650, 4.2 V)', 'LiPo (pouch, 4.2 V)', 'LiFePO4 (3.6 V)'];
    const ACTIONS = ['Notify only', 'Switch to power saver', 'Deep sleep'];
    const CHEM_RANGE = [[3.30, 4.20], [3.30, 4.20], [2.80, 3.60]];

    let batTimer = null;
    win.onClose = () => clearInterval(batTimer);

    async function battery() {
      clearInterval(batTimer);
      body.innerHTML = '<h2>Battery</h2><div class="set-group"><div class="set-row">Reading…</div></div>';

      let b;
      try { b = await API.batStatus(); }
      catch (e) {
        body.innerHTML = `<h2>Battery</h2><div class="set-group"><div class="set-row">
          <div class="grow"><b>Not available</b>
          <small>This firmware has no battery monitor.</small></div></div></div>`;
        return;
      }

      let pins = [];
      try { pins = (await API.gpioPins()).pins.filter(p => p.adc); } catch (e) {}

      const cfg = {
        pin: b.pin != null && b.pin >= 0 ? b.pin : (pins[0] ? pins[0].pin : -1),
        cells: b.cells || 1, chemistry: b.chemistry || 0,
        r1: b.r1 || 100000, r2: b.r2 || 100000,
        emptyV: b.emptyV || 3.3, fullV: b.fullV || 4.2,
        warnPct: b.warnPct || 20, criticalPct: b.criticalPct || 5,
        action: b.action || 0, capacityMah: b.capacityMah || 0,
      };

      const num = (k, label, step) =>
        `<label><span>${label}</span><input class="tinput" type="number"
          step="${step || 1}" data-b="${k}" value="${cfg[k]}"></label>`;

      body.innerHTML = `<h2>Battery</h2>

        ${b.configured ? `<div class="set-group">
          <h3>Now</h3>
          <div id="bat-live"></div>
        </div>` : `<div class="set-group">
          <div class="set-row">${I.battery.replace('<svg', '<svg class="lead"')}
            <div class="grow"><b>No battery configured</b>
              <small>The board has no way to know a pack is attached. Describe
              the divider below and the gauge appears in the tray.</small></div>
          </div>
        </div>`}

        <div class="set-group">
          <h3>Wiring</h3>
          <div class="set-row"><div class="grow"><small>
            Two resistors from the battery positive to ground, with the pin on
            the join: <b>R1</b> from the pack to the pin, <b>R2</b> from the
            pin to ground. Only ADC1 pins can be used — ADC2 shares hardware
            with the radio and reads nothing useful while Wi-Fi is up.
          </small></div></div>
          <div class="bat-grid">
            <label><span>Sense pin</span>
              <select class="tinput" data-b="pin">
                ${pins.length
                  ? pins.map(p => `<option value="${p.pin}" ${p.pin === cfg.pin ? 'selected' : ''}>GPIO ${p.pin}</option>`).join('')
                  : '<option value="-1">no ADC1 pin free</option>'}
              </select></label>
            ${num('r1', 'R1 — pack to pin (Ω)', 100)}
            ${num('r2', 'R2 — pin to ground (Ω)', 100)}
            ${num('cells', 'Cells in series')}
          </div>
          <div class="bat-calc" id="bat-calc"></div>
        </div>

        <div class="set-group">
          <h3>Pack</h3>
          <div class="bat-grid">
            <label><span>Chemistry</span>
              <select class="tinput" data-b="chemistry">
                ${CHEM.map((c, i) => `<option value="${i}" ${i === cfg.chemistry ? 'selected' : ''}>${c}</option>`).join('')}
              </select></label>
            ${num('emptyV', 'Empty, per cell (V)', 0.01)}
            ${num('fullV', 'Full, per cell (V)', 0.01)}
            ${num('capacityMah', 'Capacity (mAh, optional)', 50)}
          </div>
        </div>

        <div class="set-group">
          <h3>Thresholds</h3>
          <div class="bat-grid">
            ${num('warnPct', 'Warn at (%)')}
            ${num('criticalPct', 'Critical at (%)')}
            <label><span>At critical</span>
              <select class="tinput" data-b="action">
                ${ACTIONS.map((a, i) => `<option value="${i}" ${i === cfg.action ? 'selected' : ''}>${a}</option>`).join('')}
              </select></label>
          </div>
          <div class="set-row">
            <div class="grow"><b>${b.configured ? 'Save changes' : 'Enable battery monitoring'}</b>
              <small id="bat-msg">Checked against the ADC's range before anything is stored.</small></div>
            ${b.configured ? '<button class="btn" id="bat-off">Turn off</button>' : ''}
            <button class="btn primary" id="bat-save">${b.configured ? 'Save' : 'Enable'}</button>
          </div>
        </div>`;

      const read = () => {
        const out = {};
        body.querySelectorAll('[data-b]').forEach(el => {
          out[el.dataset.b] = el.type === 'number' ? Number(el.value) : Number(el.value);
        });
        return out;
      };

      // The divider maths is shown live because getting it wrong is the whole
      // difficulty here: too little division clips a full pack at the ADC
      // ceiling and the gauge sticks, too much throws away resolution.
      function recalc() {
        const c = read();
        const el = body.querySelector('#bat-calc');
        const packFull = c.fullV * c.cells;
        const ratio = c.r2 > 0 ? c.r2 / (c.r1 + c.r2) : 1;
        const tap = packFull * ratio;
        const drain = c.r1 + c.r2 > 0 ? packFull / (c.r1 + c.r2) * 1e6 : 0;
        const bad = tap > 3.1 || c.r2 <= 0 || c.fullV <= c.emptyV;
        el.className = 'bat-calc' + (bad ? ' bad' : '');
        el.innerHTML = tap > 3.1
          ? `A full pack (<b>${packFull.toFixed(2)} V</b>) would put
             <b>${tap.toFixed(2)} V</b> on the pin — above the ~3.1 V the ADC
             can read. Raise R1 or lower R2.`
          : c.r2 <= 0
          ? 'R2 must be above zero.'
          : c.fullV <= c.emptyV
          ? 'Full voltage must be above empty voltage.'
          : `A full pack (<b>${packFull.toFixed(2)} V</b>) reads
             <b>${tap.toFixed(2)} V</b> at the pin, comfortably inside the
             ADC's ~3.1 V range. The divider draws about
             <b>${drain.toFixed(0)} µA</b> continuously.`;
      }
      body.querySelectorAll('[data-b]').forEach(el => el.addEventListener('input', recalc));
      recalc();

      body.querySelector('#bat-save').onclick = async () => {
        const msg = body.querySelector('#bat-msg');
        msg.textContent = 'Applying…';
        try {
          await API.batConfig(Object.assign({ enabled: 1 }, read()));
          Shell.toast('Battery', 'Monitoring is on', I.battery);
          Shell.refreshBattery();
          battery();
        } catch (e) { msg.textContent = e.message; }
      };

      const off = body.querySelector('#bat-off');
      if (off) off.onclick = async () => {
        if (!await Shell.confirm('Turn off battery monitoring',
          'The gauge disappears and the sense pin becomes available again.',
          'Turn off')) return;
        try {
          await API.batConfig({ enabled: 0 });
          Shell.refreshBattery();
          battery();
        } catch (e) { Shell.toast('Battery', e.message); }
      };

      if (b.configured) {
        const paint = (v) => {
          const host = body.querySelector('#bat-live');
          if (!host || !v.configured) return;
          const cls = v.charging ? 'charging' : v.percent <= v.criticalPct ? 'crit'
                    : v.percent <= v.warnPct ? 'warn' : '';
          const hrs = v.capacityMah && v.mvPerMin < -1
            ? ` · about ${(v.percent / 100 * v.capacityMah / (Math.abs(v.mvPerMin) * 2)).toFixed(1)} h left`
            : '';
          host.innerHTML = `<div class="bat-preview">
            <div class="bat-big"><b>${v.percent}</b><span>%</span></div>
            <div class="bat-bar ${cls}"><i style="width:${v.percent}%"></i></div>
            <div class="bat-facts">
              <small>${v.volts.toFixed(3)} V pack · ${v.cellVolts.toFixed(3)} V/cell</small>
              <small>${v.charging ? 'charging' : 'discharging'} ·
                ${v.mvPerMin >= 0 ? '+' : ''}${v.mvPerMin.toFixed(0)} mV/min${hrs}</small>
            </div>
          </div>`;
        };
        paint(b);
        batTimer = setInterval(async () => {
          if (cur !== 'battery') return;
          try { paint(await API.batStatus()); } catch (e) {}
        }, 4000);
      }
    }

    // ---------- Account ----------
    // The account lives on the board rather than in this browser's storage,
    // because the board is the thing being signed into. Connect from another
    // phone and the same account is there.
    const ACCT_COLOURS = ['#4cc2ff', '#0078d4', '#8764b8', '#00cc6a',
                          '#ffb900', '#ff8c00', '#e74856', '#00b7c3'];

    async function account() {
      await Account.load();
      const a = Account.current();

      if (!a) {
        body.innerHTML = `<h2>Account</h2>
          <div class="set-group">
            <div class="set-row">${I.user.replace('<svg', '<svg class="lead"')}
              <div class="grow"><b>No account yet</b>
                <small>Give the board an owner. The record is written to the
                SD card if one is fitted and to the internal flash otherwise,
                so it follows the board rather than the browser.</small></div>
            </div>
            <div class="bat-grid">
              <label><span>User name</span>
                <input class="tinput" id="ac-user" value="dsp32" autocomplete="username"></label>
              <label><span>Display name</span>
                <input class="tinput" id="ac-name" placeholder="Your name"></label>
            </div>
            <div class="set-row">
              <div class="grow"><b>Create the account</b>
                <small id="ac-msg">A password can be set afterwards.</small></div>
              <button class="btn primary" id="ac-create">Create</button>
            </div>
          </div>`;
        body.querySelector('#ac-create').onclick = async () => {
          const user = body.querySelector('#ac-user').value.trim();
          if (!user) return;
          await Account.create(user, '', { name: body.querySelector('#ac-name').value.trim() || user });
          Shell.toast('Account', `Created — stored at ${Account.where()}`, I.user);
          account();
        };
        return;
      }

      body.innerHTML = `<h2>Account</h2>
        <div class="set-group">
          <div class="acct-head">
            <div class="acct-av" style="background:${escapeHtml(a.colour)}">
              ${escapeHtml(Account.initials(a.name))}</div>
            <div class="grow">
              <b>${escapeHtml(a.name)}</b>
              <small>${escapeHtml(a.user)} · ${Account.hasPassword()
                ? 'password set' : 'no password — the desktop opens straight up'}</small>
              <small>stored at <code>${escapeHtml(Account.where())}</code></small>
            </div>
          </div>
          <div class="bat-grid">
            <label><span>Display name</span>
              <input class="tinput" id="ac-name" value="${escapeHtml(a.name)}"></label>
            <label><span>User name</span>
              <input class="tinput" id="ac-user" value="${escapeHtml(a.user)}"></label>
          </div>
          <div class="acct-colours" id="ac-colours">
            ${ACCT_COLOURS.map(c => `<i data-c="${c}" style="background:${c}"
              class="${c === a.colour ? 'sel' : ''}"></i>`).join('')}
          </div>
          <div class="set-row">
            <div class="grow"><b>Save profile</b><small id="ac-msg2"></small></div>
            <button class="btn primary" id="ac-save">Save</button>
          </div>
        </div>

        <div class="set-group">
          <h3>Password</h3>
          <div class="set-row"><div class="grow"><small>
            The board serves plain HTTP over its own hotspot, so the password
            crosses the air in the clear and anyone holding the board can read
            the flash. It is salted and stretched so the password itself does
            not leak to whoever reads the file — worth doing, because people
            reuse passwords — but treat this as a lock on a drawer rather than
            a safe.
          </small></div></div>
          <div class="bat-grid">
            ${Account.hasPassword()
              ? '<label><span>Current password</span><input class="tinput" type="password" id="ac-old"></label>'
              : ''}
            <label><span>New password</span>
              <input class="tinput" type="password" id="ac-pw"
                     autocomplete="new-password"></label>
            <label><span>Repeat</span>
              <input class="tinput" type="password" id="ac-pw2"></label>
            <label><span>Hint (optional)</span>
              <input class="tinput" id="ac-hint" value="${escapeHtml(a.hint || '')}"></label>
          </div>
          <div class="set-row">
            <div class="grow"><b>${Account.hasPassword() ? 'Change password' : 'Set a password'}</b>
              <small id="ac-pwmsg">Hashing takes a moment on a phone — that is
              the point of it.</small></div>
            ${Account.hasPassword()
              ? '<button class="btn" id="ac-clear">Remove password</button>' : ''}
            <button class="btn primary" id="ac-setpw">
              ${Account.hasPassword() ? 'Change' : 'Set'}</button>
          </div>
        </div>`;

      body.querySelectorAll('#ac-colours i').forEach(i => i.onclick = () => {
        body.querySelectorAll('#ac-colours i').forEach(x => x.classList.remove('sel'));
        i.classList.add('sel');
      });

      body.querySelector('#ac-save').onclick = async () => {
        const cur = Account.current();
        cur.name = body.querySelector('#ac-name').value.trim() || cur.user;
        cur.user = body.querySelector('#ac-user').value.trim() || cur.user;
        const sel = body.querySelector('#ac-colours i.sel');
        if (sel) cur.colour = sel.dataset.c;
        await Account.save();
        Shell.buildStartMenu();
        Shell.toast('Account', 'Profile saved', I.user);
        account();
      };

      body.querySelector('#ac-setpw').onclick = async () => {
        const msg = body.querySelector('#ac-pwmsg');
        const pw = body.querySelector('#ac-pw').value;
        const pw2 = body.querySelector('#ac-pw2').value;

        if (Account.hasPassword()) {
          const old = body.querySelector('#ac-old').value;
          msg.textContent = 'Checking the current password…';
          if (!await Account.verify(old)) { msg.textContent = 'The current password is wrong.'; return; }
        }
        if (pw.length < 4) { msg.textContent = 'Use at least four characters.'; return; }
        if (pw !== pw2) { msg.textContent = 'The two new passwords do not match.'; return; }

        msg.textContent = 'Hashing…';
        await Account.setPassword(pw, body.querySelector('#ac-hint').value.trim());
        Shell.toast('Account', 'Password set — the desktop locks on next start', I.lock);
        account();
      };

      const clear = body.querySelector('#ac-clear');
      if (clear) clear.onclick = async () => {
        const old = body.querySelector('#ac-old').value;
        const msg = body.querySelector('#ac-pwmsg');
        msg.textContent = 'Checking…';
        if (!await Account.verify(old)) { msg.textContent = 'The current password is wrong.'; return; }
        if (!await Shell.confirm('Remove password',
          'The desktop will open without asking for anything.', 'Remove')) return;
        await Account.setPassword('', '');
        Shell.toast('Account', 'Password removed', I.user);
        account();
      };
    }

    function about() { Shell.launch('about'); show('system'); }

    show(cur);
    return win;
  }

  Shell.registerApp({
    id: 'settings', name: 'Settings', icon: I.settings, order: 11, pin: true,
    launch: (section) => create(section),
    onArgs: (win, arg) => {
      const s = sectionOf(arg);
      if (s && win.data.showSection) win.data.showSection(s);
    },
  });

  // Alias app so "Network Manager" exists as a first-class entry
  Shell.registerApp({
    id: 'network', name: 'Network Manager', icon: I.wifi, order: 12, desktop: true,
    launch: () => Shell.launch('settings', 'network'),
  });
})();
