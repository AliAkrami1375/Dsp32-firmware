// Dsp32 boot sequence.
//
// The splash is a readout, not an animation on a timer: each orbiting node is
// a real peripheral, it lights when the device answers for that peripheral,
// and dims when the answer is "not present". The board is genuinely being
// probed while this runs.
(async function () {
  const orbit = document.getElementById('boot-orbit');
  const caption = document.getElementById('boot-caption');
  const bar = document.getElementById('boot-bar-fill');
  const boot = document.getElementById('boot');

  const firstBoot = !localStorage.getItem('dsp32.booted');
  const step = firstBoot ? 380 : 150;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---- stage --------------------------------------------------------------
  const NODES = [
    { key: 'cpu', icon: I.cpu, label: 'Processor' },
    { key: 'mem', icon: I.fileZip, label: 'Memory' },
    { key: 'flash', icon: I.hdd, label: 'Flash storage' },
    { key: 'sd', icon: I.sdcard, label: 'SD card' },
    { key: 'cam', icon: I.camera, label: 'Camera' },
    { key: 'pins', icon: I.cpu, label: 'Pins' },
    { key: 'net', icon: I.wifi, label: 'Network' },
    { key: 'fs', icon: I.folder, label: 'Filesystem' },
  ];

  const RADIUS = 108;
  const els = {};
  NODES.forEach((n, i) => {
    // Start at the top and go clockwise, so the sweep meets them in order.
    const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
    const el = document.createElement('div');
    el.className = 'boot-node';
    el.style.left = `calc(50% + ${Math.cos(a) * RADIUS}px)`;
    el.style.top = `calc(50% + ${Math.sin(a) * RADIUS}px)`;
    el.innerHTML = `${n.icon}<i></i>`;
    el.title = n.label;
    orbit.appendChild(el);
    els[n.key] = el;
  });

  let done = 0;
  function mark(key, state, text) {
    const el = els[key];
    if (!el) return;
    el.classList.remove('scan');
    el.classList.add('show', state);
    if (text) caption.textContent = text;
    bar.style.width = Math.round((++done / NODES.length) * 100) + '%';
  }

  async function scan(key, text) {
    const el = els[key];
    if (el) el.classList.add('show', 'scan');
    caption.textContent = text;
    await sleep(step);
  }

  // Reveal the nodes before probing, so the ring exists to be filled in.
  for (const n of NODES) {
    els[n.key].classList.add('show');
    await sleep(firstBoot ? 90 : 35);
  }

  // ---- probe --------------------------------------------------------------
  caption.textContent = 'Contacting device';
  let sys = null;
  for (let tries = 0; !sys; tries++) {
    try { sys = await API.system(); }
    catch (e) {
      if (tries === 2) caption.textContent = 'Waiting for the device…';
      await sleep(1200);
    }
  }

  await scan('cpu', 'Identifying processor');
  mark('cpu', 'ok', `${sys.chip} · ${sys.cores} × ${sys.cpuMhz} MHz`);

  await scan('mem', 'Sizing memory');
  mark('mem', 'ok', fmtBytes(sys.heapTotal) +
    (sys.psramTotal ? ` + ${fmtBytes(sys.psramTotal)} PSRAM` : ''));

  await scan('flash', 'Mounting flash storage');
  let fsInfo = null;
  try { fsInfo = await API.fsInfo(); } catch (e) {}
  const flashOk = !!(fsInfo && fsInfo.flash && fsInfo.flash.ok);
  mark('flash', flashOk ? 'ok' : 'none',
    flashOk ? fmtBytes(fsInfo.flash.total) + ' formatted' : 'No flash filesystem');

  await scan('sd', 'Looking for an SD card');
  const sdOk = !!(fsInfo && fsInfo.sd && fsInfo.sd.ok);
  mark('sd', sdOk ? 'ok' : 'none',
    sdOk ? fmtBytes(fsInfo.sd.total) + ' card' : 'No SD card');

  await scan('cam', 'Probing the camera bus');
  let cam = null;
  try { cam = await API.camStatus(); } catch (e) {}
  mark('cam', cam && cam.present ? 'ok' : 'none',
    cam && cam.present ? 'Camera detected' : 'No camera');

  await scan('pins', 'Reading the pin map');
  let pins = null;
  try { pins = await API.gpioPins(); } catch (e) {}
  mark('pins', pins ? 'ok' : 'none',
    pins ? `${pins.pins.length} pins available` : 'No pin controller');

  await scan('net', 'Bringing up the network');
  let net = null;
  try { net = await API.wifiStatus(); } catch (e) {}
  mark('net', 'ok', net
    ? `Hotspot "${net.ap.ssid}" ready` + (net.sta.connected ? ` · uplink ${net.sta.ip}` : '')
    : 'Hotspot ready');

  await scan('fs', 'Loading applications');
  let userApps = { total: 0, loaded: 0 };
  try { userApps = await DIB.loadAll(); } catch (e) {}
  mark('fs', 'ok', userApps.total
    ? `${userApps.loaded} of ${userApps.total} app(s) loaded`
    : 'No installed apps');

  caption.textContent = 'Starting the desktop';
  await sleep(firstBoot ? 550 : 200);

  // ---- desktop ------------------------------------------------------------
  Shell.init();
  Shell.setSystem(sys);
  Shell.refreshFsInfo();

  boot.classList.add('fade');
  setTimeout(() => { boot.style.display = 'none'; }, 750);

  // The account belongs to the board, not to the browser looking at it, so it
  // is read off the device rather than out of localStorage. If it carries a
  // password nothing else happens until it is given — including restoring the
  // previous session, which would otherwise reopen the last user's windows
  // behind the lock screen.
  await Account.load();
  if (Account.hasPassword()) await Account.lock();

  // A board with nothing installed walks the user through joining Wi-Fi and
  // picking apps, rather than shipping a fixed set inside the firmware.
  if (Setup.needed()) {
    await new Promise(r => setTimeout(r, 700));
    await Setup.run();
  }

  // Reopen whatever was on screen before the page was reloaded. A refresh is
  // not a shutdown, so windows come back where they were.
  const session = await Session.restore();
  Session.start();

  localStorage.setItem('dsp32.booted', '1');
  if (session.restored) {
    Shell.toast('Session restored',
      `${session.restored} window${session.restored > 1 ? 's' : ''} reopened`, I.logo);
  } else {
    Shell.toast('Welcome to Dsp32',
      `${sys.chip} · ${fmtBytes(sys.heapFree)} free` +
      (userApps.loaded ? ` · ${userApps.loaded} app(s)` : ''), I.logo);
  }

  if (userApps.loaded < userApps.total) {
    Shell.toast('App Store',
      `${userApps.total - userApps.loaded} app(s) failed to load — open App Store for details`,
      I.appbox);
  }

  // Telemetry the tray and any open Task Manager share.
  setInterval(async () => {
    try { Shell.setSystem(await API.system()); } catch (e) {}
  }, 15000);
})();
