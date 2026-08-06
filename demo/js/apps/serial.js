// Serial Manager — a terminal on the board's spare UART.
//
// This is UART1, not the console: opening a port here never silences the log
// the user may be watching over USB. The device buffers incoming bytes and the
// app polls, so a device that chatters between polls is not lost.
(function () {
  const BAUDS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600,
                 74880, 115200, 230400, 460800, 921600];
  const POLL_MS = 250;
  const MAX_LINES = 2000;

  function create() {
    const win = WM.open({ appId: 'serial', title: 'Serial Manager', icon: I.terminal, w: 820, h: 560 });

    const st = {
      open: false, poll: null, autoscroll: true, hex: false,
      lineEnding: '\r\n', echo: true, rx: 0, tx: 0, buffer: '',
    };
    win.onClose = () => { clearInterval(st.poll); };

    win.body.innerHTML = `
      <div class="ser">
        <div class="ser-bar">
          <select class="tinput" id="s-baud" style="width:110px">
            ${BAUDS.map(b => `<option ${b === 115200 ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
          <label class="ser-pin">TX<select class="tinput" id="s-tx"></select></label>
          <label class="ser-pin">RX<select class="tinput" id="s-rx"></select></label>
          <button class="btn sm primary" id="s-open">Open</button>
          <div class="tsep"></div>
          <button class="btn sm" id="s-clear">Clear</button>
          <label class="ser-chk"><input type="checkbox" id="s-hex"> Hex</label>
          <label class="ser-chk"><input type="checkbox" id="s-scroll" checked> Autoscroll</label>
          <span class="ser-stat" id="s-stat">Closed</span>
        </div>
        <div class="ser-out" id="s-out"></div>
        <div class="ser-in">
          <input class="tinput" id="s-line" placeholder="Type a command and press Enter" disabled>
          <select class="tinput" id="s-ending" style="width:110px">
            <option value="\\r\\n">CR+LF</option>
            <option value="\\n">LF</option>
            <option value="\\r">CR</option>
            <option value="">None</option>
          </select>
          <button class="btn sm" id="s-send" disabled>Send</button>
        </div>
      </div>`;

    const $ = s => win.body.querySelector(s);
    const out = $('#s-out');

    // ---- pin pickers ----
    // Only pins that exist and are not already claimed; the same map the
    // firmware uses to reject a bad request.
    (async () => {
      let map = null;
      try { map = await API.gpioPins(); } catch (e) {}
      const tx = $('#s-tx'), rx = $('#s-rx');

      if (!map) {
        [tx, rx].forEach(sel => { sel.innerHTML = '<option value="-1">n/a</option>'; });
        setStatus('No pin API on this firmware', 'bad');
        return;
      }
      const free = map.pins.filter(p => !p.reserved);
      tx.innerHTML = free.filter(p => p.output)
        .map(p => `<option value="${p.pin}">${p.pin}</option>`).join('');
      rx.innerHTML = free
        .map(p => `<option value="${p.pin}">${p.pin}</option>`).join('');

      // Remember the wiring — it belongs to the board, not the session.
      const saved = JSON.parse(localStorage.getItem('dsp32.serial') || '{}');
      if (saved.tx != null) tx.value = saved.tx;
      if (saved.rx != null) rx.value = saved.rx;
      if (saved.baud) $('#s-baud').value = saved.baud;

      refreshStatus();
    })();

    function setStatus(text, kind) {
      const el = $('#s-stat');
      el.textContent = text;
      el.className = 'ser-stat' + (kind ? ' ' + kind : '');
    }

    async function refreshStatus() {
      try {
        const s = await API.serialStatus();
        st.open = s.open;
        applyOpenState();
        if (s.open) setStatus(`Open · ${s.baud} baud · TX ${s.tx} RX ${s.rx}`, 'ok');
      } catch (e) { /* no serial API */ }
    }

    function applyOpenState() {
      $('#s-open').textContent = st.open ? 'Close' : 'Open';
      $('#s-open').classList.toggle('primary', !st.open);
      $('#s-open').classList.toggle('danger', st.open);
      $('#s-line').disabled = !st.open;
      $('#s-send').disabled = !st.open;
      ['#s-baud', '#s-tx', '#s-rx'].forEach(s => { $(s).disabled = st.open; });
      if (!st.open) setStatus('Closed');
    }

    // ---- output ----
    function append(text, cls) {
      const atBottom = out.scrollTop + out.clientHeight >= out.scrollHeight - 30;
      const line = document.createElement('div');
      line.className = 'ser-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      out.appendChild(line);

      while (out.childElementCount > MAX_LINES) out.removeChild(out.firstChild);
      if (st.autoscroll && atBottom) out.scrollTop = out.scrollHeight;
    }

    function render(bytes) {
      if (!bytes.length) return;
      st.rx += bytes.length;
      updateCounters();

      if (st.hex) {
        for (let i = 0; i < bytes.length; i += 16) {
          const chunk = [...bytes.slice(i, i + 16)];
          const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
          const ascii = chunk.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
          append(`${hex.padEnd(47)}  ${ascii}`);
        }
        return;
      }

      // Text mode: hold a partial line until its terminator arrives, so a
      // message split across two polls is not printed as two lines.
      st.buffer += new TextDecoder().decode(bytes);
      const parts = st.buffer.split(/\r\n|\n|\r/);
      st.buffer = parts.pop();
      parts.forEach(l => append(l));
    }

    function updateCounters() {
      const el = $('#s-stat');
      if (st.open && !el.classList.contains('bad')) {
        el.textContent = el.textContent.split(' · rx')[0] +
          ` · rx ${fmtBytes(st.rx)} · tx ${fmtBytes(st.tx)}`;
      }
    }

    async function poll() {
      if (!st.open) return;
      try {
        const buf = await API.serialRead();
        render(new Uint8Array(buf));
      } catch (e) {
        // The port went away underneath us.
        st.open = false;
        clearInterval(st.poll);
        applyOpenState();
        setStatus('Port closed unexpectedly', 'bad');
      }
    }

    // ---- controls ----
    $('#s-open').onclick = async () => {
      if (st.open) {
        clearInterval(st.poll);
        try { await API.serialClose(); } catch (e) {}
        st.open = false;
        applyOpenState();
        append('— port closed —', 'meta');
        return;
      }

      const baud = +$('#s-baud').value;
      const tx = +$('#s-tx').value;
      const rx = +$('#s-rx').value;
      if (tx < 0 || rx < 0) { setStatus('Pick TX and RX pins', 'bad'); return; }
      if (tx === rx) { setStatus('TX and RX must be different pins', 'bad'); return; }

      try {
        const s = await API.serialOpen(baud, tx, rx);
        st.open = true;
        st.rx = st.tx = 0;
        st.buffer = '';
        localStorage.setItem('dsp32.serial', JSON.stringify({ baud, tx, rx }));
        applyOpenState();
        setStatus(`Open · ${s.baud} baud · TX ${s.tx} RX ${s.rx}`, 'ok');
        append(`— opened at ${baud} baud, TX ${tx} / RX ${rx} —`, 'meta');
        st.poll = setInterval(poll, POLL_MS);
        setTimeout(() => $('#s-line').focus(), 60);
      } catch (e) {
        setStatus('Could not open: ' + e.message, 'bad');
      }
    };

    async function send() {
      const input = $('#s-line');
      const text = input.value;
      if (!text && !st.lineEnding) return;
      const payload = text + st.lineEnding;
      try {
        await API.serialWrite(payload);
        st.tx += payload.length;
        if (st.echo) append('» ' + text, 'tx');
        input.value = '';
        updateCounters();
      } catch (e) {
        append('send failed: ' + e.message, 'err');
      }
    }

    $('#s-send').onclick = send;
    $('#s-line').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('#s-ending').onchange = e => {
      st.lineEnding = e.target.value.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    };
    $('#s-clear').onclick = () => { out.innerHTML = ''; st.buffer = ''; };
    $('#s-hex').onchange = e => { st.hex = e.target.checked; st.buffer = ''; };
    $('#s-scroll').onchange = e => { st.autoscroll = e.target.checked; };

    append('Serial Manager — pick a baud rate and pins, then Open.', 'meta');
    append('This is UART1, separate from the USB console, so opening it here', 'meta');
    append('will not interfere with the boot log.', 'meta');

    return win;
  }

  Shell.registerApp({
    id: 'serial', name: 'Serial Manager', icon: I.serial, order: 12,
    launch: () => create(),
  });
})();
