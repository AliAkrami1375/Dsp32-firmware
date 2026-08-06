// Camera — live view (MJPEG stream or snapshot polling) + capture to storage
(function () {
  const SIZES = [
    [13, 'UXGA 1600×1200'], [12, 'SXGA 1280×1024'], [10, 'XGA 1024×768'],
    [9, 'SVGA 800×600'], [8, 'VGA 640×480'], [6, 'CIF 400×296'],
  ];

  function create() {
    const win = WM.open({ appId: 'camera', title: 'Camera', icon: I.camera, w: 780, h: 580 });
    let poll = null, status = null;

    win.onClose = () => stopPoll();
    function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }

    async function init() {
      try { status = await API.camStatus(); }
      catch (e) { status = { supported: false, present: false, reason: e.message }; }

      // Two different answers, and they need different words. A chip with no
      // camera interface will never have one however it is wired; a chip that
      // could have one simply has nothing plugged in yet.
      if (!status.supported) {
        win.body.innerHTML = `<div class="empty-state">${I.camera}
          <div><b>Camera not supported</b><br><small style="color:var(--text-3)">
          ${escapeHtml(status.reason || 'This chip has no camera interface.')}
          </small></div></div>`;
        return;
      }

      if (!status.present) {
        win.body.innerHTML = `<div class="empty-state">${I.camera}
          <div><b>No camera module found</b>
          <br><small style="color:var(--text-3)">
            This chip supports a camera, but nothing answered on any of the
            ${status.known || 0} wirings the firmware knows. Check the ribbon
            cable, or enter the pins for your board in
            <b>Settings → Camera</b>.
          </small>
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
            <button class="btn sm" id="cam-retry">${I.refresh}<span>Search again</span></button>
            <button class="btn sm primary" id="cam-setup">Camera settings</button>
          </div></div></div>`;
        win.body.querySelector('#cam-retry').onclick = async () => {
          try { await API.camDetect(); } catch (e) {}
          init();
        };
        win.body.querySelector('#cam-setup').onclick = () => Shell.launch('settings', 'camera');
        return;
      }

      win.body.innerHTML = `
        <div class="cam">
          <div class="cam-view">
            <img alt="">
            <div class="cam-live"><i></i>LIVE</div>
          </div>
          <div class="cam-bar">
            <button class="cam-shot" title="Capture"><i></i></button>
            <select class="tinput" style="width:170px" id="cam-size">
              ${SIZES.map(s => `<option value="${s[0]}" ${s[0] === status.framesize ? 'selected' : ''}>${s[1]}</option>`).join('')}
            </select>
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px">
              <small style="color:var(--text-2)">Quality</small>
              <input type="range" id="cam-q" min="8" max="40" value="${status.quality || 12}">
            </div>
            <button class="btn sm" id="cam-open">${I.photos}<span>Gallery</span></button>
            ${status.board ? `<small style="color:var(--text-3);white-space:nowrap">${escapeHtml(status.board)}</small>` : ''}
          </div>
        </div>`;

      const img = win.body.querySelector('.cam-view img');
      if (status.streamSupported) {
        img.src = `http://${location.hostname}:${status.streamPort || 81}/stream`;
        img.onerror = () => startPolling(img);
      } else {
        startPolling(img);
      }

      win.body.querySelector('.cam-shot').addEventListener('click', capture);
      win.body.querySelector('#cam-size').addEventListener('change', e =>
        API.camConfig(+e.target.value, -1).catch(() => {}));
      win.body.querySelector('#cam-q').addEventListener('change', e =>
        API.camConfig(-1, +e.target.value).catch(() => {}));
      win.body.querySelector('#cam-open').addEventListener('click', () =>
        Shell.launch('explorer', (Shell.sys && Shell.sys.sd ? '/sd' : '/flash') + '/DCIM'));
    }

    function startPolling(img) {
      stopPoll();
      // Through the API, so the frame arrives wherever the desktop is
      // served from. The previous object URL is released or a long session
      // leaks one blob per frame.
      let last = null;
      const step = async () => {
        try {
          const r = await fetch(API.camSnapshotUrl());
          if (!r.ok) return;
          const url = URL.createObjectURL(await r.blob());
          img.src = url;
          if (last) URL.revokeObjectURL(last);
          last = url;
        } catch (e) { /* the next tick tries again */ }
      };
      poll = setInterval(step, 700);
      step();
    }

    async function capture() {
      const dir = (Shell.sys && Shell.sys.sd) ? '/sd/DCIM' : '/flash/DCIM';
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const path = `${dir}/IMG_${ts}.jpg`;
      try {
        try { await API.fsMkdir(dir); } catch (e) {}
        const r = await API.camSave(path);
        Shell.toast('Camera', `Saved ${r.path} (${fmtBytes(r.size)})`, I.camera);
      } catch (e) { Shell.toast('Camera', 'Capture failed: ' + e.message); }
    }

    init();
    return win;
  }

  Shell.registerApp({
    id: 'camera', name: 'Camera', icon: I.camera, order: 5, pin: true,
    launch: () => create(),
  });
})();
