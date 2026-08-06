// Dsp32 REST client — same API on real hardware and the simulator
// Enough for a browser to render it; everything else is a download.
function guessType(path) {
  const e = String(path).split('.').pop().toLowerCase();
  return e === 'svg' ? 'image/svg+xml'
       : ['png', 'gif', 'webp', 'bmp'].includes(e) ? 'image/' + e
       : ['jpg', 'jpeg'].includes(e) ? 'image/jpeg'
       : 'application/octet-stream';
}

(function () {
  async function json(url, opts) {
    const r = await fetch(url, opts);
    let body = null;
    try { body = await r.json(); } catch (e) { /* non-json */ }
    if (!r.ok) throw new Error((body && body.error) || `HTTP ${r.status}`);
    return body;
  }
  const enc = encodeURIComponent;

  window.API = {
    system: () => json('/api/system'),
    probe: () => json('/api/probe'),
    reboot: () => json('/api/system/reboot', { method: 'POST' }),

    fsInfo: () => json('/api/fs/info'),
    fsList: (path) => json(`/api/fs/list?path=${enc(path)}`),
    // Relative, not absolute: a URL the browser resolves itself never
    // reaches any interception, and the static simulator is served from a
    // subdirectory. On a device the page is at / and the two are the same.
    fsReadUrl: (path) => `api/fs/read?path=${enc(path)}`,
    fsDownloadUrl: (path) => `api/fs/read?path=${enc(path)}&dl=1`,
    fsReadText: (path) => fetch(`/api/fs/read?path=${enc(path)}`).then(r => {
      if (!r.ok) throw new Error('read failed'); return r.text();
    }),
    fsWrite: (path, data) => json(`/api/fs/write?path=${enc(path)}`, {
      method: 'POST', body: data,
      headers: { 'Content-Type': 'application/octet-stream' },
    }),
    // Bytes, not text — a copy that round-trips through a string mangles
    // anything that is not UTF-8, which includes every .dib and every photo.
    fsReadBytes: (path) => fetch(`/api/fs/read?path=${enc(path)}`).then(r => {
      if (!r.ok) throw new Error('read failed'); return r.arrayBuffer();
    }),
    // A URL for an <img> or a download link, produced by reading the bytes
    // rather than pointing the browser at the API. Two reasons: the board
    // saves an HTTP round trip per icon, and an <img src> is fetched by the
    // browser directly — nothing can intercept it, which is what the static
    // simulator needs to do.
    async fsObjectUrl(path, type) {
      const bytes = await this.fsReadBytes(path);
      return URL.createObjectURL(new Blob([bytes], { type: type || guessType(path) }));
    },
    fsMkdir: (path) => json(`/api/fs/mkdir?path=${enc(path)}`, { method: 'POST' }),
    fsDelete: (path) => json(`/api/fs/delete?path=${enc(path)}`, { method: 'POST' }),
    fsRename: (from, to) => json(`/api/fs/rename?from=${enc(from)}&to=${enc(to)}`, { method: 'POST' }),
    fsFormat: () => json('/api/fs/format', { method: 'POST' }),

    wifiStatus: () => json('/api/wifi/status'),
    wifiScan: () => json('/api/wifi/scan'),
    wifiClients: () => json('/api/wifi/clients'),
    wifiSta: (ssid, pass) => json(`/api/wifi/sta?ssid=${enc(ssid)}&pass=${enc(pass)}`, { method: 'POST' }),
    wifiForget: () => json('/api/wifi/forget', { method: 'POST' }),
    wifiAp: (ssid, pass) => json(`/api/wifi/ap?ssid=${enc(ssid)}&pass=${enc(pass)}`, { method: 'POST' }),

    sdConfig: () => json('/api/sd/config'),
    sdSet: (c) => json(`/api/sd/config?mode=${enc(c.mode)}&cs=${c.cs}&clk=${c.clk}` +
                       `&miso=${c.miso}&mosi=${c.mosi}&freqKhz=${c.freqKhz}`,
                       { method: 'POST' }),
    sdDetect: () => json('/api/sd/detect', { method: 'POST' }),

    fwAllowlist: (on) => json(`/api/fw/allowlist?on=${on ? 1 : 0}`, { method: 'POST' }),
    fwAllow: (mac, allow) =>
      json(`/api/fw/allow?mac=${enc(mac)}&allow=${allow ? 1 : 0}`, { method: 'POST' }),
    fwForget: (mac) => json(`/api/fw/forget?mac=${enc(mac)}`, { method: 'POST' }),

    tasks: () => json('/api/sys/tasks'),
    power: () => json('/api/sys/power'),
    setPower: (max, min, lightSleep) => json(
      `/api/sys/power?max=${max}&min=${min}&lightSleep=${lightSleep ? 1 : 0}`,
      { method: 'POST' }),
    deepSleep: (seconds) => json(`/api/sys/sleep?seconds=${seconds}`, { method: 'POST' }),

    serialStatus: () => json('/api/serial/status'),
    serialOpen: (baud, tx, rx) =>
      json(`/api/serial/open?baud=${baud}&tx=${tx}&rx=${rx}`, { method: 'POST' }),
    serialClose: () => json('/api/serial/close', { method: 'POST' }),
    serialRead: () => fetch('/api/serial/read').then(r => {
      if (!r.ok) throw new Error('port is not open');
      return r.arrayBuffer();
    }),
    serialWrite: (data) => json('/api/serial/write', {
      method: 'POST', body: data,
      headers: { 'Content-Type': 'application/octet-stream' },
    }),

    gpioPins: () => json('/api/gpio/pins'),
    gpioSnapshot: () => json('/api/gpio/snapshot'),
    gpioConfig: (pin, mode, freq) => json(
      `/api/gpio/config?pin=${pin}&mode=${enc(mode)}${freq ? `&freq=${freq}` : ''}`,
      { method: 'POST' }),
    gpioWrite: (pin, value) =>
      json(`/api/gpio/write?pin=${pin}&value=${value}`, { method: 'POST' }),
    gpioReset: () => json('/api/gpio/reset', { method: 'POST' }),

    fwList: () => json('/api/fw/list'),
    fwBlock: (mac) => json(`/api/fw/block?mac=${enc(mac)}`, { method: 'POST' }),
    fwUnblock: (mac) => json(`/api/fw/unblock?mac=${enc(mac)}`, { method: 'POST' }),

    camStatus: () => json('/api/camera/status'),
    camConfig: (framesize, quality) =>
      json(`/api/camera/config?framesize=${framesize}&quality=${quality}`, { method: 'POST' }),
    camSnapshotUrl: () => `api/camera/snapshot?t=${Date.now()}`,
    camSave: (path) => json(`/api/camera/save?path=${enc(path)}`, { method: 'POST' }),
    // Forgets the remembered wiring so the next probe searches from scratch.
    camDetect: () => json('/api/camera/detect', { method: 'POST' }),
    batStatus: () => json('/api/battery/status'),
    batConfig: (cfg) => json('/api/battery/config?' +
      Object.entries(cfg).map(([k, v]) => `${k}=${enc(v)}`).join('&'),
      { method: 'POST' }),
    camPins: (pins) => json('/api/camera/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pins }),
    }),
  };

  window.fmtBytes = function (n) {
    if (n == null || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  };

  window.fmtUptime = function (ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
      m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  };

  window.escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
})();
