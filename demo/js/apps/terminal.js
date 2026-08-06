// Terminal — a shell over the Dsp32 REST API.
(function () {
  const BANNER = String.raw`
   ____  _ _                _           _
  |  _ \(_) |__   __ _  ___| |__   __ _(_)_ __
  | | | | | '_ \ / _` + '`' + ` |/ __| '_ \ / _` + '`' + ` | | '_ \
  | |_| | | |_) | (_| | (__| | | | (_| | | | | |
  |____/|_|_.__/ \__,_|\___|_| |_|\__,_|_|_| |_|
`;

  function create() {
    const win = WM.open({ appId: 'terminal', title: 'Terminal', icon: I.terminal, w: 780, h: 500 });
    win.body.innerHTML = `<div class="term"></div>`;
    const term = win.body.querySelector('.term');

    const st = { cwd: '/flash', user: 'root', host: 'dsp32' };
    const history = [];
    let hIdx = -1;

    // ---- output ----------------------------------------------------------
    function line(html, cls) {
      const el = document.createElement('div');
      el.className = 't-line' + (cls ? ' ' + cls : '');
      el.innerHTML = html;
      term.insertBefore(el, inputLine);
      term.scrollTop = term.scrollHeight;
      return el;
    }
    const print = (text, cls) => line(escapeHtml(String(text)), cls);
    const printHtml = (html) => line(html);

    const inputLine = document.createElement('div');
    inputLine.className = 't-line t-in';
    inputLine.innerHTML = `<span class="prompt"></span><input spellcheck="false" autocomplete="off">`;
    term.appendChild(inputLine);
    const input = inputLine.querySelector('input');
    const promptEl = inputLine.querySelector('.prompt');

    const promptText = () => `${st.user}@${st.host}:${st.cwd}$ `;
    const updatePrompt = () => { promptEl.textContent = promptText(); };

    term.addEventListener('click', e => {
      if (!getSelection().toString()) input.focus();
    });
    setTimeout(() => input.focus(), 80);

    // ---- banner ----------------------------------------------------------
    async function banner() {
      printHtml(`<span class="banner">${escapeHtml(BANNER)}</span>`);
      let s = Shell.sys;
      if (!s) { try { s = await API.system(); } catch (e) {} }
      if (s) {
        st.host = (s.name || 'dsp32').toLowerCase();
        printHtml(
          `<span class="dim">  ${escapeHtml(s.name)} ${escapeHtml(s.version)} · ` +
          `${escapeHtml(s.chip)} · ${s.cores} core${s.cores > 1 ? 's' : ''} @ ${s.cpuMhz} MHz · ` +
          `${fmtBytes(s.heapFree)} free</span>`);
      }
      printHtml('<span class="dim">  Type <b>help</b> for commands, ' +
                '<b>help &lt;command&gt;</b> for detail.</span>');
      print('');
      updatePrompt();
    }

    // ---- path handling ---------------------------------------------------
    function resolve(p) {
      if (!p) return st.cwd;
      if (p === '~') return '/flash';
      const base = p.startsWith('/') ? [] : st.cwd.split('/').filter(Boolean);
      for (const part of p.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') base.pop();
        else base.push(part);
      }
      return '/' + base.join('/');
    }

    // ---- commands --------------------------------------------------------
    // Each entry carries its own help so `help <cmd>` never drifts from the
    // implementation.
    const cmds = {
      help: {
        help: 'help [command] — list commands, or explain one',
        group: 'shell',
        run(a) {
          if (a[0]) {
            const c = cmds[a[0]];
            if (!c) return print(`help: no such command: ${a[0]}`, 'err');
            return print('  ' + c.help);
          }
          const groups = {};
          Object.entries(cmds).forEach(([name, c]) => {
            (groups[c.group] = groups[c.group] || []).push(name);
          });
          Object.entries(groups).forEach(([g, names]) => {
            printHtml(`<span class="head">${g}</span>`);
            const sorted = names.sort();
            for (let i = 0; i < sorted.length; i += 6) {
              print('  ' + sorted.slice(i, i + 6).map(n => n.padEnd(11)).join(''));
            }
          });
          printHtml('<span class="dim">\n  help &lt;command&gt; explains any of them.</span>');
        },
      },

      // ---- filesystem ----
      ls: {
        help: 'ls [-l] [path] — list a directory',
        group: 'files',
        async run(a) {
          const long = a.includes('-l');
          const target = resolve(a.find(x => !x.startsWith('-')));
          const r = await API.fsList(target);
          if (!r.entries.length) return print('(empty)', 'dim');
          const sorted = r.entries.sort((x, y) => (y.dir - x.dir) || x.name.localeCompare(y.name));
          if (long) {
            sorted.forEach(e => print(
              `${e.dir ? 'd' : '-'}  ${String(fmtBytes(e.size)).padStart(9)}  ` +
              `${Platform.describe(e.name, e.dir).padEnd(20)} ${e.name}`));
          } else {
            sorted.forEach(e => printHtml(
              `<span class="${e.dir ? 'dir' : ''}">${escapeHtml(e.name)}${e.dir ? '/' : ''}</span>` +
              `<span class="dim">${e.dir ? '' : '  ' + fmtBytes(e.size)}</span>`));
          }
        },
      },
      cd: {
        help: 'cd [path] — change directory (no argument goes to /flash)',
        group: 'files',
        async run(a) {
          const p = resolve(a[0] || '/flash');
          await API.fsList(p);
          st.cwd = p;
          updatePrompt();
        },
      },
      pwd: { help: 'pwd — print the working directory', group: 'files', run() { print(st.cwd); } },
      cat: {
        help: 'cat <file> — print a file',
        group: 'files',
        async run(a) {
          if (!a[0]) throw new Error('usage: cat <file>');
          const t = await API.fsReadText(resolve(a[0]));
          print(t.length > 16384 ? t.slice(0, 16384) + '\n… (truncated)' : t);
        },
      },
      head: {
        help: 'head [-n N] <file> — first lines of a file (default 10)',
        group: 'files',
        async run(a) {
          const n = a[0] === '-n' ? (a.splice(0, 2), +a[-1] || 10) : 10;
          const count = a.includes('-n') ? +a[a.indexOf('-n') + 1] : n;
          const file = a.filter(x => !x.startsWith('-') && isNaN(+x)).pop();
          if (!file) throw new Error('usage: head [-n N] <file>');
          const t = await API.fsReadText(resolve(file));
          print(t.split('\n').slice(0, count || 10).join('\n'));
        },
      },
      tail: {
        help: 'tail [-n N] <file> — last lines of a file (default 10)',
        group: 'files',
        async run(a) {
          const count = a.includes('-n') ? +a[a.indexOf('-n') + 1] : 10;
          const file = a.filter(x => !x.startsWith('-') && isNaN(+x)).pop();
          if (!file) throw new Error('usage: tail [-n N] <file>');
          const t = await API.fsReadText(resolve(file));
          print(t.split('\n').slice(-(count || 10)).join('\n'));
        },
      },
      write: {
        help: 'write <file> <text…> — write text to a file, replacing it',
        group: 'files',
        async run(a) {
          if (a.length < 2) throw new Error('usage: write <file> <text>');
          await API.fsWrite(resolve(a[0]), a.slice(1).join(' '));
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      append: {
        help: 'append <file> <text…> — add a line to the end of a file',
        group: 'files',
        async run(a) {
          if (a.length < 2) throw new Error('usage: append <file> <text>');
          const p = resolve(a[0]);
          let existing = '';
          try { existing = await API.fsReadText(p); } catch (e) { /* new file */ }
          await API.fsWrite(p, existing + (existing && !existing.endsWith('\n') ? '\n' : '') +
                               a.slice(1).join(' ') + '\n');
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      mkdir: {
        help: 'mkdir <path> — create a directory',
        group: 'files',
        async run(a) {
          if (!a[0]) throw new Error('usage: mkdir <path>');
          await API.fsMkdir(resolve(a[0]));
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      rm: {
        help: 'rm <path> — delete a file or directory, recursively',
        group: 'files',
        async run(a) {
          if (!a[0]) throw new Error('usage: rm <path>');
          await API.fsDelete(resolve(a[0]));
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      mv: {
        help: 'mv <from> <to> — rename or move',
        group: 'files',
        async run(a) {
          if (a.length < 2) throw new Error('usage: mv <from> <to>');
          await API.fsRename(resolve(a[0]), resolve(a[1]));
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      cp: {
        help: 'cp <from> <to> — copy a file',
        group: 'files',
        async run(a) {
          if (a.length < 2) throw new Error('usage: cp <from> <to>');
          const data = await API.fsReadText(resolve(a[0]));
          await API.fsWrite(resolve(a[1]), data);
          Platform.emit('fs:changed', st.cwd);
          print('ok');
        },
      },
      find: {
        help: 'find [path] <name> — search for files by name, recursively',
        group: 'files',
        async run(a) {
          if (!a.length) throw new Error('usage: find [path] <name>');
          const needle = a.pop().toLowerCase();
          const root = resolve(a[0]);
          let hits = 0;
          const walk = async (dir, depth) => {
            if (depth > 6) return;
            let r;
            try { r = await API.fsList(dir); } catch (e) { return; }
            for (const e of r.entries) {
              const full = dir + '/' + e.name;
              if (e.name.toLowerCase().includes(needle)) { print(full); hits++; }
              if (e.dir) await walk(full, depth + 1);
            }
          };
          await walk(root, 0);
          if (!hits) print('nothing found', 'dim');
        },
      },
      du: {
        help: 'du [path] — total size of a directory tree',
        group: 'files',
        async run(a) {
          const root = resolve(a[0]);
          let total = 0, files = 0;
          const walk = async (dir, depth) => {
            if (depth > 6) return;
            let r;
            try { r = await API.fsList(dir); } catch (e) { return; }
            for (const e of r.entries) {
              if (e.dir) await walk(dir + '/' + e.name, depth + 1);
              else { total += e.size; files++; }
            }
          };
          await walk(root, 0);
          print(`${fmtBytes(total)} in ${files} file(s) under ${root}`);
        },
      },
      df: {
        help: 'df — storage usage for every mount',
        group: 'files',
        async run() {
          const i = await API.fsInfo();
          const show = (n, m) => m && m.ok
            ? print(`${n.padEnd(8)} ${fmtBytes(m.used).padStart(10)} / ${fmtBytes(m.total).padEnd(10)}` +
                    ` ${String(Math.round(m.used / m.total * 100)).padStart(3)}%`)
            : print(`${n.padEnd(8)} not mounted`, 'dim');
          show('/flash', i.flash);
          show('/sd', i.sd);
        },
      },
      open: {
        help: 'open <file> — open a file in whichever app handles it',
        group: 'files',
        run(a) {
          if (!a[0]) throw new Error('usage: open <file>');
          const p = resolve(a[0]);
          Platform.open(p);
          print(`opening ${p}`);
        },
      },

      // ---- system ----
      sysinfo: {
        help: 'sysinfo — chip, memory and peripherals',
        group: 'system',
        async run() {
          const s = await API.system();
          print(`${s.name} ${s.version}`);
          print(`chip     ${s.chip} rev${s.revision}, ${s.cores} core(s) @ ${s.cpuMhz} MHz`);
          print(`memory   ${fmtBytes(s.heapFree)} free of ${fmtBytes(s.heapTotal)}` +
                (s.psramTotal ? `, PSRAM ${fmtBytes(s.psramFree)} / ${fmtBytes(s.psramTotal)}` : ''));
          print(`flash    ${fmtBytes(s.flashSize)}`);
          print(`mac      ${s.mac}`);
          print(`sdk      ${s.sdk}`);
          print(`devices  camera:${s.camera ? 'yes' : 'no'} sd:${s.sd ? 'yes' : 'no'}` +
                (s.tempC != null ? ` temp:${s.tempC}°C` : ''));
          print(`uptime   ${fmtUptime(s.uptimeMs)}`);
        },
      },
      free: {
        help: 'free — memory usage',
        group: 'system',
        async run() {
          const s = await API.system();
          const pct = Math.round((1 - s.heapFree / s.heapTotal) * 100);
          print(`heap   ${fmtBytes(s.heapFree)} free of ${fmtBytes(s.heapTotal)}  (${pct}% used, min ever ${fmtBytes(s.heapMin)})`);
          if (s.psramTotal) print(`psram  ${fmtBytes(s.psramFree)} free of ${fmtBytes(s.psramTotal)}`);
        },
      },
      uptime: { help: 'uptime — how long the board has been running', group: 'system',
        async run() { print(fmtUptime((await API.system()).uptimeMs)); } },
      ps: {
        help: 'ps — running threads',
        group: 'system',
        async run() {
          const r = await API.tasks();
          if (!r.supported) return print(r.reason || 'process list unavailable', 'dim');
          printHtml('<span class="head">  NAME          STATE      PRIO CORE  STACK    CPU</span>');
          r.tasks.forEach(t => print(
            `  ${String(t.name).padEnd(13)} ${String(t.state).padEnd(10)} ` +
            `${String(t.priority).padStart(4)} ${String(t.core ?? '-').padStart(4)}  ` +
            `${String(fmtBytes(t.stackFree)).padStart(8)}  ${(t.cpuPct ?? 0).toFixed(1)}%`));
        },
      },
      power: {
        help: 'power [max] [min] [0|1] — show or set CPU frequency and light sleep',
        group: 'system',
        async run(a) {
          if (!a.length) {
            const p = await API.power();
            print(`cpu          ${p.minMhz}–${p.maxMhz} MHz (max ${p.defaultMhz})`);
            print(`light sleep  ${p.lightSleep ? 'on' : 'off'}`);
            print(`scaling      ${p.supported ? 'available' : 'not compiled in'}`, p.supported ? '' : 'dim');
            return;
          }
          const r = await API.setPower(+a[0], +(a[1] || a[0]), a[2] === '1');
          print(`cpu now ${r.minMhz}–${r.maxMhz} MHz, light sleep ${r.lightSleep ? 'on' : 'off'}`);
        },
      },
      temp: {
        help: 'temp — internal temperature sensor',
        group: 'system',
        async run() {
          const s = await API.system();
          print(s.tempC == null ? 'no usable sensor on this chip' : `${s.tempC} °C`);
        },
      },
      reboot: { help: 'reboot — restart the device', group: 'system',
        run() { print('rebooting…'); Shell.rebootDevice(); } },
      sleep: {
        help: 'sleep <seconds> — deep sleep, 0 means until reset',
        group: 'system',
        async run(a) {
          const s = +(a[0] || 0);
          print(`entering deep sleep${s ? ` for ${s}s` : ' until reset'}…`);
          await API.deepSleep(s);
        },
      },

      // ---- pins ----
      pins: {
        help: 'pins [free|used] — the pin map for this chip',
        group: 'pins',
        async run(a) {
          const m = await API.gpioPins();
          const filter = a[0];
          let list = m.pins;
          if (filter === 'free') list = list.filter(p => !p.reserved && p.mode === 'unused');
          if (filter === 'used') list = list.filter(p => p.mode !== 'unused');
          print(`${m.chip} · ${m.pins.length} pins · ADC 0–${m.adcMax} · ${m.pwmChannels} PWM channels`);
          printHtml('<span class="head">  PIN  MODE          CAPABILITIES</span>');
          list.forEach(p => {
            const caps = [p.output ? 'out' : 'in-only', p.adc && 'adc', p.pwm && 'pwm',
                          p.strapping && 'strapping'].filter(Boolean).join(' ');
            printHtml(`  ${String(p.pin).padStart(3)}  ` +
              `<span class="${p.mode !== 'unused' ? 'dir' : ''}">${p.mode.padEnd(13)}</span>` +
              (p.reserved ? `<span class="err">reserved: ${escapeHtml(p.reservedFor)}</span>`
                          : `<span class="dim">${caps}</span>`));
          });
        },
      },
      pin: {
        help: 'pin <n> [mode] — read a pin, or set its mode ' +
              '(in, in_pullup, in_pulldown, out, adc, pwm, unused)',
        group: 'pins',
        async run(a) {
          if (!a[0]) throw new Error('usage: pin <n> [mode]');
          const n = +a[0];
          if (a[1]) {
            await API.gpioConfig(n, a[1]);
            print(`GPIO ${n} → ${a[1]}`);
            return;
          }
          const r = await fetch(`/api/gpio/read?pin=${n}`);
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'read failed');
          print(`GPIO ${n} = ${d.value}`);
        },
      },
      set: {
        help: 'set <pin> <value> — drive an output pin (or a PWM duty)',
        group: 'pins',
        async run(a) {
          if (a.length < 2) throw new Error('usage: set <pin> <value>');
          await API.gpioWrite(+a[0], +a[1]);
          print('ok');
        },
      },

      // ---- network ----
      wifi: {
        help: 'wifi — hotspot and uplink status',
        group: 'network',
        async run() {
          const w = await API.wifiStatus();
          print(`AP   "${w.ap.ssid}"  ${w.ap.ip}  ${w.ap.stations} client(s)  ${w.ap.secured ? 'WPA2' : 'open'}`);
          print(w.sta.configured
            ? `STA  "${w.sta.ssid}"  ${w.sta.connected ? `${w.sta.ip}  ${w.sta.rssi} dBm` : 'not connected'}`
            : 'STA  not configured', w.sta.connected ? '' : 'dim');
        },
      },
      scan: {
        help: 'scan — look for nearby Wi-Fi networks',
        group: 'network',
        async run() {
          print('scanning…', 'dim');
          const nets = await API.wifiScan();
          if (!nets.length) return print('no networks found', 'dim');
          nets.sort((a, b) => b.rssi - a.rssi).forEach(n => print(
            `${String(n.rssi).padStart(4)} dBm  ch${String(n.channel).padStart(2)}  ` +
            `${(n.open ? 'open' : 'secure').padEnd(7)} ${n.ssid}`));
        },
      },
      connect: {
        help: 'connect <ssid> [password] — join a Wi-Fi network',
        group: 'network',
        async run(a) {
          if (!a[0]) throw new Error('usage: connect <ssid> [password]');
          await API.wifiSta(a[0], a[1] || '');
          print(`connecting to ${a[0]}…`);
          for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const w = await API.wifiStatus();
            if (w.sta.connected) return print(`connected · ${w.sta.ip}`);
          }
          print('still not connected — check the password', 'err');
        },
      },
      disconnect: { help: 'disconnect — drop the Wi-Fi uplink', group: 'network',
        async run() { await API.wifiForget(); print('ok'); } },
      clients: {
        help: 'clients — devices connected to the hotspot',
        group: 'network',
        async run() {
          const r = await API.wifiClients();
          if (!r.clients.length) return print('no clients connected', 'dim');
          r.clients.forEach(c => print(`${c.mac}   ${c.rssi} dBm`));
        },
      },
      fetch: {
        help: 'fetch <url> — download a URL through the device',
        group: 'network',
        async run(a) {
          if (!a[0]) throw new Error('usage: fetch <url>');
          const bytes = await DIB.download(a[0]);
          const text = new TextDecoder().decode(bytes.slice(0, 4096));
          print(`${fmtBytes(bytes.length)} received`);
          print(text + (bytes.length > 4096 ? '\n… (truncated)' : ''));
        },
      },

      // ---- apps ----
      apps: {
        help: 'apps — installed applications',
        group: 'apps',
        async run() {
          const list = await DIB.listInstalled();
          if (!list.length) return print('no apps installed', 'dim');
          list.forEach(a => print(
            `${String(a.manifest.id).padEnd(24)} ${String(a.manifest.version).padEnd(8)} ` +
            `${a.kind === 'package' ? 'package' : 'script '}  ${a.manifest.name}`));
        },
      },
      install: {
        help: 'install <url|path> — install a .dib package',
        group: 'apps',
        async run(a) {
          if (!a[0]) throw new Error('usage: install <url|path>');
          const src = a[0].startsWith('http') || a[0].startsWith('/apps')
            ? a[0] : API.fsReadUrl(resolve(a[0]));
          print('fetching…', 'dim');
          const bytes = await DIB.download(src);
          const pkg = await DIB.parse(bytes);
          print(`${pkg.manifest.name} ${pkg.manifest.version} — ` +
                `permissions: ${(pkg.manifest.permissions || []).join(', ') || 'none'}`);
          await DIB.install(pkg, { source: a[0] });
          print(`installed to /flash/Apps/${pkg.manifest.id} — reload to run it`);
        },
      },
      uninstall: {
        help: 'uninstall <id> — remove an installed app',
        group: 'apps',
        async run(a) {
          if (!a[0]) throw new Error('usage: uninstall <id>');
          const list = await DIB.listInstalled();
          const app = list.find(x => x.manifest.id === a[0]);
          if (!app) throw new Error(`not installed: ${a[0]}`);
          await DIB.uninstall(app.kind === 'script' ? app.path : app.dir);
          print('removed — reload to apply');
        },
      },
      launch: {
        help: 'launch <id> [arg] — start an app',
        group: 'apps',
        run(a) {
          if (!a[0]) throw new Error('usage: launch <id>');
          if (!Shell.registry[a[0]]) throw new Error(`no such app: ${a[0]}`);
          Shell.launch(a[0], a[1]);
          print(`launched ${a[0]}`);
        },
      },

      // ---- shell ----
      clear: { help: 'clear — empty the screen', group: 'shell',
        run() { term.querySelectorAll('.t-line:not(.t-in)').forEach(e => e.remove()); } },
      echo: { help: 'echo <text…> — print its arguments', group: 'shell',
        run(a) { print(a.join(' ')); } },
      date: { help: 'date — current date and time (from your browser)', group: 'shell',
        run() { print(new Date().toString()); } },
      history: { help: 'history — commands you have run', group: 'shell',
        run() { history.forEach((h, i) => print(`${String(i + 1).padStart(4)}  ${h}`)); } },
      theme: {
        help: 'theme <dark|light> — switch the desktop theme',
        group: 'shell',
        run(a) {
          const t = /^l/i.test(a[0] || '') ? 'light' : 'dark';
          Shell.settings.theme = t;
          Shell.saveSettings();
          Shell.applySettings();
          print('theme: ' + t);
        },
      },
      banner: { help: 'banner — print the welcome banner again', group: 'shell', run: banner },
      exit: { help: 'exit — close this terminal', group: 'shell', run() { win.close(); } },
    };

    // ---- completion ------------------------------------------------------
    async function complete() {
      const text = input.value;
      const parts = text.split(' ');

      if (parts.length === 1) {
        const hits = Object.keys(cmds).filter(c => c.startsWith(parts[0]));
        if (hits.length === 1) { input.value = hits[0] + ' '; return; }
        if (hits.length > 1) {
          printHtml(`<span class="prompt">${escapeHtml(promptText())}</span>${escapeHtml(text)}`);
          print('  ' + hits.join('  '), 'dim');
        }
        return;
      }

      // Complete a path against the directory it names.
      const frag = parts[parts.length - 1];
      const slash = frag.lastIndexOf('/');
      const dir = resolve(slash >= 0 ? frag.slice(0, slash) || '/' : '');
      const stem = slash >= 0 ? frag.slice(slash + 1) : frag;
      let r;
      try { r = await API.fsList(dir); } catch (e) { return; }

      const hits = r.entries.filter(e => e.name.startsWith(stem));
      if (hits.length === 1) {
        parts[parts.length - 1] =
          (slash >= 0 ? frag.slice(0, slash + 1) : '') + hits[0].name + (hits[0].dir ? '/' : '');
        input.value = parts.join(' ');
      } else if (hits.length > 1) {
        printHtml(`<span class="prompt">${escapeHtml(promptText())}</span>${escapeHtml(text)}`);
        print('  ' + hits.map(h => h.name + (h.dir ? '/' : '')).join('  '), 'dim');
      }
    }

    // ---- execution -------------------------------------------------------
    async function exec(raw) {
      printHtml(`<span class="prompt">${escapeHtml(promptText())}</span>${escapeHtml(raw)}`);
      const parts = raw.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const args = parts.map(p => p.replace(/^"|"$/g, ''));
      const name = args.shift();
      if (!name) return;

      const cmd = cmds[name];
      if (!cmd) {
        const near = Object.keys(cmds).filter(c => c.startsWith(name[0]));
        print(`${name}: command not found`, 'err');
        if (near.length) print(`did you mean: ${near.slice(0, 6).join(', ')}?`, 'dim');
        return;
      }
      try { await cmd.run(args); }
      catch (e) { print(String(e.message || e), 'err'); }
    }

    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        const raw = input.value.trim();
        input.value = '';
        if (raw) { history.push(raw); hIdx = history.length; }
        await exec(raw);
        term.scrollTop = term.scrollHeight;
      } else if (e.key === 'Tab') {
        e.preventDefault();
        await complete();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx > 0) input.value = history[--hIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx < history.length) input.value = history[++hIdx] || '';
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        cmds.clear.run();
      } else if (e.key === 'c' && e.ctrlKey && !getSelection().toString()) {
        e.preventDefault();
        printHtml(`<span class="prompt">${escapeHtml(promptText())}</span>${escapeHtml(input.value)}^C`);
        input.value = '';
      }
    });

    updatePrompt();
    banner();
    return win;
  }

  Shell.registerApp({
    id: 'terminal', name: 'Terminal', icon: I.terminal, order: 3, pin: true, multi: true,
    launch: () => create(),
  });
})();
