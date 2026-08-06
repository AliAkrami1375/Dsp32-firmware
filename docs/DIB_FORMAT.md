# The `.dib` package format

[English](DIB_FORMAT.md) · [فارسی](DIB_FORMAT.fa.md)

A `.dib` file is one installable Dsp32 application: manifest, code, icon and
assets in a single file that can be shared, downloaded and installed.

## Design constraints

Two facts shaped this format.

**The device is small.** An ESP32 has ~100 KB of free heap. So the firmware
never parses a package — it only stores bytes. Unpacking happens in the
browser, where the desktop already runs and JSON, `TextDecoder` and
`DecompressionStream` are free.

**`http://10.3.2.1` is not a secure context.** Browsers reserve
`crypto.subtle` for HTTPS and localhost, so WebCrypto is unavailable to us.
Integrity is therefore checked with a small pure-JS SHA-256 rather than the
platform one. This detects corruption and mismatched downloads; it is not a
signature and does not prove authorship.

## Layout

```
┌────────────┬──────────────┬───────────────────┬──────────────────────────┐
│  "DIB1"    │ manifestLen  │  manifest (JSON)  │  payload                 │
│  4 bytes   │ 4 bytes LE   │  manifestLen B    │  concatenated files      │
└────────────┴──────────────┴───────────────────┴──────────────────────────┘
                                                 └── optionally gzipped ────┘
```

Little-endian, no padding, no alignment requirements. A parser needs 12 bytes
before it knows everything about the rest of the file.

## Manifest

```json
{
  "format": 1,
  "id": "ir.dsp32.hello",
  "name": "Hello",
  "version": "1.0.0",
  "author": "Ali",
  "description": "A first Dsp32 app.",
  "entry": "main.js",
  "styles": ["style.css"],
  "icon": "icon.svg",
  "permissions": ["storage", "notify"],
  "compression": "gzip",
  "payloadSha256": "9f2c…",
  "payloadSize": 4096,
  "files": [
    { "path": "main.js", "offset": 0,    "size": 2310 },
    { "path": "icon.svg", "offset": 2310, "size": 640 }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `format` | ✅ | Format revision. Currently `1`. |
| `id` | ✅ | Reverse-DNS identifier. Also the install directory name, so it must be filesystem-safe: `[a-z0-9._-]`, max 48 chars. |
| `name` | ✅ | Shown on the desktop and in the start menu. |
| `version` | ✅ | Semver-ish string. Compared when upgrading. |
| `entry` | ✅ | The JS file to execute, relative to the package root. |
| `styles` | | CSS files inside the package, injected into the page before the entry runs. |
| `author`, `description` | | Shown in the App Store before installing. |
| `icon` | | SVG inside the package. Falls back to a generic icon. |
| `permissions` | | What the app declares it needs — see below. |
| `compression` | | `"none"` or `"gzip"`, applied to the whole payload. |
| `payloadSha256` | | Hex digest of the payload **after** decompression. |
| `payloadSize` | | Decompressed payload length, for a cheap sanity check. |
| `files` | ✅ | Offsets are into the decompressed payload. |
| `minFirmware` | | Refuses to install on older firmware. |

`offset`/`size` describe the decompressed payload, so a reader decompresses
once and then slices — it never has to decompress per file.

## Stylesheets

An app with more than a little styling should not be building a string of CSS
in JavaScript. List the files under `styles` and the loader reads each one,
wraps it in a `<style>` tag keyed by app id and path, and appends it to the
document head before the entry file runs — so the first frame the app paints
is already styled. Injecting the same file twice is a no-op, which is what
makes relaunching an app cheap.

The stylesheets are global, exactly like the desktop's own. There is no
scoping, so prefix your selectors: a class named `.row` will collide with
someone else's. The convention across the bundled apps is a short prefix per
app — `.sr-*` for Soroush, `.dm-*` for Diba Manager.

## Permissions

Declared in the manifest and shown to the user before install. They scope
what the runtime hands the app, and they exist so the user can make an
informed decision.

| Permission | Grants |
|---|---|
| `storage` | `App.storage` — a private key/value store, persisted on the device |
| `fs` | `App.fs` — read and write anywhere under `/flash` and `/sd` |
| `net` | `App.net.fetch()` — HTTP(S) requests proxied through the device |
| `notify` | `App.notify()` — desktop toast notifications |
| `system` | `App.system()` — chip, memory and peripheral telemetry |
| `camera` | `App.camera` — snapshot and capture-to-storage |

**These are not a security sandbox.** An installed app runs as JavaScript on
the same page as the desktop, so a hostile app can reach anything the desktop
can, permissions or not. Real isolation would need each app in its own
sandboxed iframe, which v1 does not do. Install packages you trust — the
permission list tells you what an honest app intends to use, nothing more.

## Installed layout

The installer writes the package into its own directory:

```
/flash/Apps/
  ir.dsp32.hello/
    .dib.json      ← manifest, as installed
    main.js
    icon.svg
    assets/…
```

At startup the desktop scans `/flash/Apps` and `/sd/Apps`, reads each
`.dib.json`, and executes the entry file. Uninstalling removes the directory.

Loose `.js` files directly in `/flash/Apps` still work — they are treated as
a single-file app with no manifest, which keeps the App Studio scaffold and
anything written before this format.

## Building a package

```bash
python3 tools/dibpack.py myapp/ -o myapp.dib
```

The source directory needs a `dib.json` with the manifest fields you author —
`id`, `name`, `version`, `entry` and friends. The packer fills in `files`,
`payloadSha256`, `payloadSize` and `compression` itself.

```
myapp/
  dib.json
  main.js
  icon.svg
```

Inspect a built package without installing it:

```bash
python3 tools/dibpack.py --info myapp.dib
```

## Installing

Three routes, all in the **App Store** app:

- **From a file** — pick a `.dib` from your computer; the browser unpacks and
  writes it to the device.
- **From a URL** — the device downloads it. The browser cannot fetch arbitrary
  URLs (CORS), so this goes through `/api/net/fetch` on the firmware, which
  does the TLS itself and streams the bytes back.
- **From a registry** — a JSON index of packages. The default registry ships
  with the firmware; you can point it at your own.

## Registry format

```json
{
  "name": "Dsp32 Official",
  "updated": "2026-08-06",
  "apps": [
    {
      "id": "ir.dsp32.hello",
      "name": "Hello",
      "version": "1.0.0",
      "author": "Dsp32",
      "description": "A first Dsp32 app.",
      "size": 3200,
      "url": "https://example.com/apps/hello.dib",
      "sha256": "9f2c…"
    }
  ]
}
```

The `sha256` here covers the whole `.dib` file, so the App Store can verify a
download before unpacking it. Any static host works — a GitHub raw URL, an S3
bucket, or a file on the device's own SD card.

## Writing an app

```js
// main.js — receives the runtime API as `App`
Dsp32.app(function (App) {
  const win = App.window({ title: 'Hello', w: 420, h: 300 });
  win.body.innerHTML = `
    <div style="padding:20px">
      <button class="btn primary" id="go">Read chip</button>
      <pre id="out"></pre>
    </div>`;

  win.body.querySelector('#go').onclick = async () => {
    const s = await App.system();                    // needs "system"
    win.body.querySelector('#out').textContent = `${s.chip} @ ${s.cpuMhz} MHz`;
    await App.storage.set('lastChip', s.chip);       // needs "storage"
    App.notify('Hello', 'Read the chip info');       // needs "notify"
  };
});
```

`Dsp32.app(fn)` registers the app; `fn` runs each time it is launched and
receives an `App` object scoped to the permissions in the manifest. Calling a
method the manifest did not declare throws, so missing permissions surface
during development rather than silently doing nothing.

Full runtime API:

| | |
|---|---|
| `App.window(opts)` | Opens a desktop window; returns the same object `WM.open` does |
| `App.manifest` | The manifest, as installed |
| `App.dir` | The app's directory on the device |
| `App.asset(path)` | URL for a file inside the package |
| `App.storage.get/set/remove/all()` | Private key/value store |
| `App.fs.list/read/write/mkdir/delete()` | Device filesystem |
| `App.net.fetch(url, opts)` | HTTP(S) through the device |
| `App.notify(title, body)` | Desktop toast |
| `App.system()` | Device telemetry |
| `App.camera.snapshotUrl/save()` | Camera |
| `App.bus.on/emit()` | Messages between running apps |
