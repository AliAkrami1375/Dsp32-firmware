// .dib package format — parse, verify and install Dsp32 applications.
// Format:  "DIB1" | manifestLen (u32 LE) | manifest JSON | payload
// See docs/DIB_FORMAT.md.
window.DIB = (function () {
  const MAGIC = 0x31424944;             // "DIB1" read as LE u32
  const APP_DIRS = ['/flash/Apps', '/sd/Apps'];
  const MAX_PKG = 2 * 1024 * 1024;
  const ID_RE = /^[a-z0-9][a-z0-9._-]{1,47}$/;
  const KNOWN_PERMS = ['storage', 'fs', 'net', 'notify', 'system', 'camera'];

  // ---- SHA-256 -----------------------------------------------------------
  // crypto.subtle is only exposed in secure contexts and the desktop is served
  // over plain http on a LAN address, so it is unavailable to us. This is a
  // compact standalone implementation used for the package integrity check.
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

  function sha256(bytes) {
    const H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);

    const bitLen = bytes.length * 8;
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 4, bitLen >>> 0, false);
    dv.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296), false);

    const w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));

    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return [...H].map(x => x.toString(16).padStart(8, '0')).join('');
  }

  // ---- parsing -----------------------------------------------------------
  async function gunzip(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This package is gzipped and your browser cannot ' +
        'decompress it. Repack it with --no-gzip, or use a newer browser.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Reads a .dib into { manifest, files: Map<path, Uint8Array> }.
  async function parse(buffer) {
    const raw = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (raw.length > MAX_PKG) {
      throw new Error(`Package is ${fmtBytes(raw.length)} — the limit is ${fmtBytes(MAX_PKG)}`);
    }
    if (raw.length < 12) throw new Error('Not a .dib package (too short)');

    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    if (dv.getUint32(0, true) !== MAGIC) {
      throw new Error('Not a .dib package (bad magic bytes)');
    }

    const hlen = dv.getUint32(4, true);
    if (8 + hlen > raw.length) throw new Error('Package is truncated');

    let manifest;
    try {
      manifest = JSON.parse(new TextDecoder().decode(raw.subarray(8, 8 + hlen)));
    } catch (e) {
      throw new Error('Package manifest is not valid JSON');
    }

    validateManifest(manifest);

    let payload = raw.subarray(8 + hlen);
    if (manifest.compression === 'gzip') payload = await gunzip(payload);

    if (manifest.payloadSize != null && payload.length !== manifest.payloadSize) {
      throw new Error(`Payload is ${payload.length} bytes, manifest says ${manifest.payloadSize}`);
    }
    if (manifest.payloadSha256) {
      const got = sha256(payload);
      if (got !== manifest.payloadSha256) {
        throw new Error('Package failed its integrity check — the download is corrupt or was modified');
      }
    }

    const files = new Map();
    for (const e of manifest.files) {
      const end = e.offset + e.size;
      if (end > payload.length) {
        throw new Error(`File "${e.path}" runs past the end of the payload`);
      }
      files.set(e.path, payload.subarray(e.offset, end));
    }
    if (!files.has(manifest.entry)) {
      throw new Error(`Entry file "${manifest.entry}" is missing from the package`);
    }

    return { manifest, files, packageSha256: sha256(raw), packageSize: raw.length };
  }

  function validateManifest(m) {
    if (m.format !== 1) throw new Error(`Unsupported package format ${m.format}`);
    for (const f of ['id', 'name', 'version', 'entry']) {
      if (!m[f]) throw new Error(`Manifest is missing "${f}"`);
    }
    if (!ID_RE.test(m.id)) throw new Error(`Invalid app id "${m.id}"`);
    if (!Array.isArray(m.files)) throw new Error('Manifest has no file table');
    // Paths become device paths — keep them inside the app directory.
    for (const e of m.files) {
      if (typeof e.path !== 'string' || e.path.startsWith('/') ||
          e.path.split('/').includes('..')) {
        throw new Error(`Unsafe path in package: "${e.path}"`);
      }
    }
    if (m.styles && !Array.isArray(m.styles)) {
      throw new Error('Manifest "styles" must be a list of file paths');
    }
    const unknown = (m.permissions || []).filter(p => !KNOWN_PERMS.includes(p));
    if (unknown.length) throw new Error(`Unknown permission(s): ${unknown.join(', ')}`);
    if (m.minFirmware && Shell.sys &&
        cmpVersion(Shell.sys.version, m.minFirmware) < 0) {
      throw new Error(`Needs firmware ${m.minFirmware} or newer (this device runs ${Shell.sys.version})`);
    }
  }

  function cmpVersion(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }

  // ---- install / uninstall ----------------------------------------------
  function baseDir(root) { return root || '/flash/Apps'; }

  async function install(pkg, opts) {
    opts = opts || {};
    const dir = `${baseDir(opts.root)}/${pkg.manifest.id}`;
    const onProgress = opts.onProgress || (() => {});

    // A reinstall replaces the app rather than merging into stale files.
    try { await API.fsDelete(dir); } catch (e) { /* not installed yet */ }

    await API.fsMkdir(baseDir(opts.root)).catch(() => {});
    await API.fsMkdir(dir);

    const entries = [...pkg.files.entries()];
    let done = 0;
    for (const [path, bytes] of entries) {
      const parts = path.split('/');
      // Recreate any nested directories the package uses.
      for (let i = 1; i < parts.length; i++) {
        await API.fsMkdir(`${dir}/${parts.slice(0, i).join('/')}`).catch(() => {});
      }
      await API.fsWrite(`${dir}/${path}`, new Blob([bytes]));
      onProgress(++done, entries.length, path);
    }

    const installed = Object.assign({}, pkg.manifest, {
      installedAt: new Date().toISOString(),
      packageSha256: pkg.packageSha256,
      source: opts.source || 'file',
    });
    delete installed.files;   // offsets mean nothing once unpacked
    await API.fsWrite(`${dir}/.dib.json`, JSON.stringify(installed, null, 2));

    return { dir, manifest: installed };
  }

  async function uninstall(dir) { await API.fsDelete(dir); }

  // ---- discovery ---------------------------------------------------------
  // Returns every installed app: packaged ones (a directory with .dib.json)
  // and loose single .js files, which predate this format and still work.
  async function listInstalled() {
    const out = [];
    for (const root of APP_DIRS) {
      let listing;
      try { listing = await API.fsList(root); } catch (e) { continue; }

      for (const en of listing.entries) {
        const path = `${root}/${en.name}`;
        if (en.dir) {
          try {
            const manifest = JSON.parse(await API.fsReadText(`${path}/.dib.json`));
            const entry = { kind: 'package', dir: path, root, manifest };
            // The store draws these before anything has run the app, so the
            // icon is read here rather than left to the loader.
            if (manifest.icon) {
              try { entry.iconUrl = await API.fsObjectUrl(`${path}/${manifest.icon}`); }
              catch (e) { /* generic tile */ }
            }
            out.push(entry);
          } catch (e) { /* a directory that is not a package */ }
        } else if (en.name.endsWith('.js')) {
          out.push({
            kind: 'script', dir: root, root, path, size: en.size,
            manifest: { id: en.name, name: en.name.replace(/\.js$/, ''), version: '—' },
          });
        }
      }
    }
    return out;
  }

  // ---- loading -----------------------------------------------------------
  async function loadOne(app) {
    if (app.kind === 'script') {
      new Function(await API.fsReadText(app.path))();
      return;
    }
    // A package cannot add a stylesheet the way a page can, so the manifest
    // declares them and they are injected once, here, before the entry runs.
    // Keeping them out of the entry file lets an app separate presentation
    // from behaviour the way any other project would.
    for (const rel of app.manifest.styles || []) {
      const id = `dib-style-${app.manifest.id}-${rel.replace(/[^\w]/g, '-')}`;
      if (document.getElementById(id)) continue;
      try {
        const css = await API.fsReadText(`${app.dir}/${rel}`);
        const el = document.createElement('style');
        el.id = id;
        el.textContent = css;
        document.head.appendChild(el);
      } catch (e) {
        console.warn(`${app.manifest.id}: could not load style ${rel}`, e);
      }
    }

    // Fetched before the entry runs, because registering the app is
    // synchronous and the icon has to be ready by then.
    if (app.manifest.icon && !app.iconUrl) {
      try { app.iconUrl = await API.fsObjectUrl(`${app.dir}/${app.manifest.icon}`); }
      catch (e) { /* the generic tile will do */ }
    }

    const src = await API.fsReadText(`${app.dir}/${app.manifest.entry}`);
    // Dsp32.app(fn) is how a packaged app registers itself; AppRuntime binds
    // that callback to this app's manifest and permission set.
    AppRuntime.runPackage(app, src);
  }

  // Brings an app to life on a running desktop: read it back off the device,
  // run its entry file, and put it on the desktop and in the start menu. An
  // install used to end with "reload to start it", which is not what an
  // operating system does — installing something is not a reason to close
  // everything the user had open.
  //
  // Reinstalling one that is already registered is the interesting case. The
  // registry keeps the first registration, and re-running the entry file
  // would register a second app object that nothing points at. So the old one
  // is unregistered and its windows closed first, which is also what makes an
  // update take effect without a reload.
  async function activate(id) {
    const installed = await listInstalled();
    const app = installed.find(a =>
      (a.manifest && a.manifest.id === id) || a.path === id);
    if (!app) throw new Error('that app is not on the device');

    const already = window.Shell && Shell.registry[id];
    if (already) {
      WM.allByApp(id).forEach(w => w.close());
      Shell.unregisterApp(id);
      // A stylesheet from the previous version would otherwise win by having
      // been there first.
      document.querySelectorAll(`style[id^="dib-style-${id}-"]`)
        .forEach(el => el.remove());
    }

    await loadOne(app);

    if (window.Shell) {
      Shell.buildDesktopIcons();
      Shell.buildStartMenu();
      Shell.renderTaskbarApps();
    }
    Platform.emit('apps:changed', id);
    return app;
  }

  // The other direction, so removing an app does not need a reload either.
  function deactivate(id) {
    if (!window.Shell || !Shell.registry[id]) return false;
    WM.allByApp(id).forEach(w => w.close());
    Shell.unregisterApp(id);
    document.querySelectorAll(`style[id^="dib-style-${id}-"]`)
      .forEach(el => el.remove());
    Shell.buildDesktopIcons();
    Shell.buildStartMenu();
    Shell.renderTaskbarApps();
    Platform.emit('apps:changed', id);
    return true;
  }

  async function loadAll() {
    const apps = await listInstalled();
    let ok = 0;
    for (const app of apps) {
      try { await loadOne(app); ok++; }
      catch (e) {
        console.error('app failed to load:', app.manifest.id, e);
        pendingErrors.push({ id: app.manifest.id, error: e.message });
      }
    }
    return { total: apps.length, loaded: ok };
  }

  const pendingErrors = [];

  // ---- where packages come from ------------------------------------------
  // The simulator serves this repo's apps/ directory, so it can browse and
  // install with no uplink at all; hardware goes to the published registry.
  // One definition, because the store and the setup wizard both need it and
  // they must not drift apart.
  //
  // That registry lives in the *release* repository, not the source one. A
  // board has no business needing read access to source, and raw file URLs on
  // a private repository are not readable without a token — which a board
  // does not have and should not be given.
  const OFFICIAL_REGISTRY =
    'https://raw.githubusercontent.com/AliAkrami1375/Dsp32-firmware/main/apps/registry.json';

  function defaultRegistry() {
    return (window.Shell && Shell.sys && Shell.sys.simulated)
      ? '/apps/registry.json'
      : OFFICIAL_REGISTRY;
  }

  // ---- fetching over the network ----------------------------------------
  // Goes through the device: a page served from 10.3.2.1 cannot fetch other
  // origins directly, and the device has the uplink anyway.
  async function download(url, opts) {
    opts = opts || {};
    // A same-origin path is already reachable — going through the device
    // proxy would just make it fetch itself.
    const proxied = !url.startsWith('/');
    const target = proxied
      ? `/api/net/fetch?url=${encodeURIComponent(url)}`
      : url;

    const r = await fetch(target);
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { msg = (await r.json()).error || msg; } catch (e) {}
      throw new Error(`Download failed: ${msg}`);
    }

    // The proxy streams, so it has already answered 200 by the time the
    // remote's status is known — that status comes back in a header. Without
    // this check a GitHub 404 page downloads as if it were a package and
    // fails later with a puzzling "not a .dib file".
    if (proxied) {
      const upstream = Number(r.headers.get('X-Dsp32-Status')) || 200;
      if (upstream >= 400) {
        throw new Error(upstream === 404
          ? `Not found at ${url} (HTTP 404)`
          : `Download failed: the server answered HTTP ${upstream}`);
      }
    }

    const bytes = new Uint8Array(await r.arrayBuffer());
    if (opts.sha256) {
      const got = sha256(bytes);
      if (got !== opts.sha256.toLowerCase()) {
        throw new Error('Downloaded file does not match the registry checksum');
      }
    }
    return bytes;
  }

  // A package URL in a registry is resolved against the registry's own
  // location, exactly like a relative link on a page. That is what lets one
  // registry.json work both served off the device — where the packages sit
  // next to it — and fetched from a release over the network. An absolute URL
  // in an entry still points wherever it says.
  function resolveUrl(base, url) {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return url;
    const cut = base.lastIndexOf('/');
    const dir = cut >= 0 ? base.slice(0, cut + 1) : '';
    return dir + url;
  }

  async function fetchRegistry(url) {
    const bytes = await download(url);
    let reg;
    try { reg = JSON.parse(new TextDecoder().decode(bytes)); }
    catch (e) { throw new Error('Registry is not valid JSON'); }
    if (!Array.isArray(reg.apps)) throw new Error('Registry has no "apps" list');
    reg.source = url;
    reg.apps.forEach(a => { if (a.url) a.url = resolveUrl(url, a.url); });
    return reg;
  }

  return {
    parse, install, uninstall, listInstalled, loadOne, loadAll,
    activate, deactivate,
    download, fetchRegistry, resolveUrl, sha256, cmpVersion,
    defaultRegistry, OFFICIAL_REGISTRY,
    KNOWN_PERMS, APP_DIRS,
    get errors() { return pendingErrors; },
  };
})();
