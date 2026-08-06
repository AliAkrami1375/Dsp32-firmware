# Building apps for Dsp32

[English](APP_DEVELOPMENT.md) · [فارسی](APP_DEVELOPMENT.fa.md)

Everything you need to write, package, install and publish software for a
Dsp32 device.

---

## 1. What Dsp32 is

Dsp32 is firmware that turns an ESP32 into a self-contained computer. The board
raises its own Wi-Fi hotspot and serves a full desktop over HTTP to any device
that connects — phone, tablet or laptop. There is nothing to install on the
client and no internet is required.

Three facts shape everything about writing apps for it.

**The desktop runs in the browser; the device is the backend.** Your app is
JavaScript executing on the client's browser. When it needs the hardware — a
file, a pin, the camera, the network — it calls the device over REST. That
split is why an app can be a few kilobytes and still do real work.

**The device is small.** An ESP32 has roughly 100 KB of free heap while
serving the desktop. The firmware never parses a package; it stores bytes. All
unpacking happens in the browser.

**Apps are not in the firmware.** The image embeds the OS itself — 92 KB
gzipped, of which 40 KB is the built-in apps — and nothing else. Everything
installable lives in a registry and is downloaded on demand.

```
Firmware image (ESP32, gzipped)
  OS core        36 KB   shell, window manager, platform, session, installer
  Built-in apps  40 KB   Explorer, Terminal, Settings, Task Manager, …
  Theme + HTML   11 KB
  Logo            4 KB
  ─────────────────────
  total          92 KB   embedded

Installable apps  0 KB   downloaded from a registry when the user asks
```

---

## 2. The toolchain

`tools/dsp32` is the only tool you need. It has no dependencies beyond Python
3.8 and is a single file, so it can be copied anywhere.

```bash
# Optional: put it on PATH
export PATH="$PATH:/path/to/Dsp32/tools"

dsp32 --help
```

| Command | What it does |
|---|---|
| `dsp32 new <name>` | Scaffolds an app that builds and runs as-is |
| `dsp32 build [dir]` | Validates and compiles into a `.dib` package |
| `dsp32 check [dir\|file]` | Lints a source tree, or inspects a built package |
| `dsp32 watch [dir]` | Rebuilds on every save, optionally pushing to a device |
| `dsp32 install [dir] --to <host>` | Builds and pushes straight onto a board |
| `dsp32 registry <dirs…> --base <url>` | Regenerates a registry index |
| `dsp32 doctor` | Checks the toolchain and whether a device answers |

### Sixty seconds, end to end

```bash
dsp32 new weather --author "Your Name"
dsp32 install weather --to 10.3.2.1
```

Reload the desktop and the app is on it. While iterating:

```bash
dsp32 watch weather --to 10.3.2.1
```

Every save rebuilds and pushes; reload the browser to see the change.

---

## 3. Anatomy of an app

```
weather/
  src/
    dib.json     the manifest
    main.js      the entry file
    style.css    optional stylesheet
    icon.svg     optional icon
    assets/      anything else you ship
  weather.dib    the built package
```

### The manifest

```json
{
  "id": "ir.dibachain.weather",
  "name": "Weather",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Shown in the App Store before installing.",
  "entry": "main.js",
  "styles": ["style.css"],
  "icon": "icon.svg",
  "permissions": ["storage", "notify", "system"],
  "minFirmware": "1.0.0"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Becomes a directory name on the device, so `[a-z0-9._-]`, 2–48 chars. Reverse-DNS avoids collisions: `ir.dibachain.weather`. |
| `name` | ✅ | Shown on the desktop, start menu and taskbar. |
| `version` | ✅ | Numeric, e.g. `1.2.3`. The store compares it to offer updates. |
| `entry` | ✅ | The JavaScript file that gets executed. |
| `styles` | | CSS files injected into the page before the entry runs. |
| `icon` | | An SVG inside the package. Without one the app gets a generic tile. |
| `permissions` | | What the app may reach — see below. |
| `description`, `author` | | Shown before installing. Write them. |
| `minFirmware` | | Refuses to install on older firmware. |

`build` fills in `files`, `payloadSha256`, `payloadSize` and `compression`
itself. Do not write those by hand.

### Stylesheets

Anything past a handful of rules belongs in a real `.css` file rather than a
template string in JavaScript. List it under `styles` and the loader injects
it before your entry file runs, so the window paints styled on the first
frame:

```json
"styles": ["style.css", "theme.css"]
```

The rules land in the same global stylesheet as the desktop's, so prefix
every selector with something app-specific. `.wx-row` is safe, `.row` will
eventually fight with another app.

### The entry file

```js
Dsp32.app(function (App) {
  const win = App.window({ title: 'Weather', w: 480, h: 360 });
  win.body.innerHTML = '<div style="padding:20px">Hello</div>';
  return win;
});
```

`Dsp32.app(fn)` registers the app. `fn` runs **each time the app is launched**
and receives an `App` object scoped to the manifest's permissions. Whatever it
returns is treated as the window.

Everything the desktop's own CSS provides is available to you: `.btn`,
`.btn.primary`, `.tinput`, `.switch`, `.meter`, `.empty-state`, and the
variables `--accent`, `--text`, `--text-2`, `--card`, `--stroke`, `--mono`.
Using them means your app follows the user's theme and accent colour for free.

---

## 4. Permissions

An app declares what it needs; the App Store shows that list before installing;
the runtime enforces it. Calling a method the manifest did not declare throws
immediately — so a forgotten permission surfaces while you are developing
rather than silently doing nothing in the field.

| Permission | Grants |
|---|---|
| `storage` | `App.storage` — a private key/value store |
| `fs` | `App.fs` — read and write under `/flash` and `/sd` |
| `net` | `App.net` — HTTP(S) proxied through the device |
| `notify` | `App.notify()` — desktop notifications |
| `system` | `App.system()` — chip, memory, sensors |
| `camera` | `App.camera` — snapshot and capture |

`dsp32 build` cross-checks the manifest against the code both ways: using
something you did not declare is an error, and declaring something you never
use is a warning — because every permission you list is shown to the user, and
an honest list is a shorter one.

> **This is not a security sandbox.** An installed app is JavaScript on the
> same page as the desktop and can reach anything the desktop can, declared or
> not. The permission list tells a user what an *honest* app intends to use.
> Real isolation would need each app in its own sandboxed iframe, which the
> current version does not do. Install packages you trust.

---

## 5. The runtime API

Everything below hangs off the `App` object your function receives.

### Windows

```js
const win = App.window({ title: 'Weather', w: 480, h: 360, onClose: cleanup });
win.body.innerHTML = '…';        // your content
win.setTitle('Weather — Tehran');
win.close();
```

`App.window` returns the same object `WM.open` does: `body`, `setTitle`,
`close`, `min`, `max`, `snapTo('left'|'right')`, `rect`, `setRect`, `focus`.

Set `win.session = () => ({ … })` to survive a browser reload. Whatever you
return comes back as the launch argument next time:

```js
Dsp32.app(function (App) {
  const restored = App.args || {};
  const win = App.window({ title: 'Weather' });
  let city = restored.city || 'Tehran';
  win.session = () => ({ city });
  …
});
```

### Storage — `storage`

Private to your app, persisted on the client.

```js
await App.storage.set('city', 'Tehran');
const city = await App.storage.get('city');    // null when unset
await App.storage.remove('city');
const all = await App.storage.all();
```

### Filesystem — `fs`

```js
const { entries } = await App.fs.list('/flash/Documents');
const text = await App.fs.read('/flash/Documents/notes.txt');
await App.fs.write('/flash/Documents/notes.txt', 'hello');
await App.fs.mkdir('/flash/Documents/Weather');
await App.fs.delete('/flash/Documents/old.txt');
const { flash, sd } = await App.fs.info();
const url = App.fs.readUrl('/flash/DCIM/photo.jpg');   // for <img src>
```

`mkdir` is not recursive — walk the path yourself. After writing, emit
`Platform.emit('fs:changed', '/flash/Documents')` so any open File Explorer
refreshes.

### Network — `net`

The desktop is served from `10.3.2.1`, so the browser cannot fetch other
origins. `App.net` routes through the device, which holds the uplink.

```js
const data = await App.net.json('https://api.example.com/weather?q=Tehran');
const text = await App.net.text('https://example.com/robots.txt');
const res  = await App.net.fetch('https://example.com/file.bin');

// POST with a body
const out = await App.net.fetch(url, {
  method: 'POST',
  body: JSON.stringify({ phone: '+98912…' }),
});
```

The device streams the body through in 2 KB chunks and refuses responses over
1 MB. It needs a Wi-Fi uplink — Settings → Network, or the taskbar Wi-Fi icon.

A 4xx or 5xx from the remote **throws**, and the error message is whatever the
remote's own body said — `error`, `message` or `detail` from a JSON body, or
the raw text when it is short. That is almost always what you want to show:
"the code is wrong" beats "HTTP 400". `err.status` carries the remote's status
code if you need to branch on it.

```js
try {
  await App.net.fetch(bridge + '/auth/verify', { method: 'POST', body });
} catch (e) {
  if (e.status === 400) showError(e.message);   // → "the code is wrong"
}
```

Because the proxy streams, its own status line is committed before the
remote's is known — the remote status comes back in an `X-Dsp32-Status`
header, which `App.net.fetch` reads for you.

### Notifications — `notify`

```js
App.notify('Weather', 'Rain expected this evening');
```

### System — `system`

```js
const s = await App.system();
// chip, revision, cores, cpuMhz, flashSize, heapFree, heapTotal, heapMin,
// psramFree, psramTotal, uptimeMs, mac, tempC, camera, sd, stations
```

### Camera — `camera`

```js
if ((await App.camera.status()).present) {
  img.src = App.camera.snapshotUrl();
  const { path, size } = await App.camera.save('/sd/DCIM/shot.jpg');
}
```

### UI helpers — always available

```js
await App.ui.confirm('Delete', 'Are you sure?', 'Delete');   // → boolean
const name = await App.ui.prompt('Rename', 'New name', 'old.txt',
                                 { selectRange: [0, 3] });  // preselect the stem
const path = await App.ui.pickPath({ mode: 'open' });        // file picker
App.ui.dialog({ title: '…', body: node, buttons: [ … ] });
App.ui.menu(x, y, [                                         // the desktop's menu
  { label: 'Rename', onClick: rename },
  { sep: true },
  { label: 'Delete', danger: true, onClick: remove },
]);
App.ui.fmtBytes(1536);      // "1.5 KB"
App.ui.fmtUptime(90061000); // "1d 01:01:01"
App.ui.escapeHtml(userText);
```

### Messages between apps — always available

```js
const off = App.bus.on('weather:updated', (data, fromAppId) => { … });
App.bus.emit('weather:updated', { tempC: 21 });
off();
```

### Package contents

```js
App.manifest        // the manifest, as installed
App.dir             // '/flash/Apps/ir.dibachain.weather'
App.asset('bg.png') // a URL for a file inside your package
```

### Pins

Pin control is not behind a permission yet, so it goes through the REST API
directly. `Diba Manager` is the worked example.

```js
const map = await (await fetch('/api/gpio/pins')).json();
await fetch('/api/gpio/config?pin=2&mode=out', { method: 'POST' });
await fetch('/api/gpio/write?pin=2&value=1', { method: 'POST' });
const { values } = await (await fetch('/api/gpio/snapshot')).json();
```

The map tells you which pins exist, which are reserved by the firmware
(flash, PSRAM, console UART, camera, SD) and which can do ADC or PWM. Respect
it — the firmware rejects a reserved pin, but a valid-but-wrong pin will
happily take your board down.

---

## 6. The `.dib` package format

A `.dib` is one file containing a manifest and every asset.

```
┌────────┬──────────────┬───────────────────┬──────────────────────┐
│ "DIB1" │ manifestLen  │  manifest (JSON)  │  payload             │
│ 4 B    │ 4 B, u32 LE  │  manifestLen B    │  files, concatenated │
└────────┴──────────────┴───────────────────┴──────────────────────┘
                                             └── optionally gzipped ┘
```

Little-endian, no padding. A reader knows everything about the rest of the
file after 12 bytes.

The manifest's `files` array gives `path`, `offset` and `size` into the
**decompressed** payload, so a reader decompresses once and then slices.
`payloadSha256` covers the decompressed payload and is verified on install.

Integrity is checked with a SHA-256 implemented in plain JavaScript rather
than `crypto.subtle`, because `http://10.3.2.1` is not a secure context and
browsers withhold WebCrypto there. It detects corruption and mismatched
downloads. **It is not a signature** and does not prove who built a package.

Full specification: [DIB_FORMAT.md](DIB_FORMAT.md).

---

## 7. Installing

Four routes reach a device:

| Route | Use it when |
|---|---|
| `dsp32 install --to <host>` | Developing. Fastest loop. |
| App Store → Install → from a file | Sharing a `.dib` with someone |
| App Store → Install → from a URL | Hosting the package yourself |
| App Store → Browse | Publishing through a registry |

The desktop unpacks into `/flash/Apps/<id>/` and writes a `.dib.json` beside
your files. At startup the desktop scans `/flash/Apps` and `/sd/Apps`, reads
each manifest and executes each entry file — **so a newly installed app only
appears after a reload.**

Loose `.js` files dropped straight into `/flash/Apps` still work as
single-file apps with no manifest. They get the whole platform directly —
`Shell`, `WM`, `API`, `I` — with no permission scoping. Handy for a quick
experiment; use a package for anything you share.

Because `/sd/Apps` is scanned too, you can develop for a Dsp32 board by
writing files onto its SD card.

---

## 8. Publishing

A registry is a JSON index. Any static host serves one — a GitHub raw URL, an
S3 bucket, a file on the device's own SD card.

```bash
dsp32 build weather
dsp32 registry . --base https://raw.githubusercontent.com/you/apps/main -o registry.json
```

```json
{
  "name": "My apps",
  "apps": [
    {
      "id": "ir.dibachain.weather",
      "name": "Weather",
      "version": "1.0.0",
      "author": "Your Name",
      "description": "…",
      "size": 1665,
      "url": "https://raw.githubusercontent.com/you/apps/main/weather/weather.dib",
      "sha256": "965cc47e…"
    }
  ]
}
```

The `sha256` covers the whole `.dib`, so the store verifies a download before
unpacking it. Users point the App Store at your registry URL under **Browse**.

Rebuild the index whenever a package changes — a stale checksum rejects a
perfectly good download, which is exactly the sort of thing to automate rather
than do by hand.

---

## 9. Conventions

**Keep it small.** The whole desktop is 92 KB gzipped. An app that is larger
than the OS is doing something wrong. No frameworks — the platform gives you
windows, dialogs, a file picker and a theme already.

**Use the theme.** Hard-coded colours look wrong the moment someone switches
to light mode or picks a different accent. Use the CSS variables.

**Scope your CSS.** A package cannot add a stylesheet, so inject a `<style>`
into your window body and scope every rule under one class of your own.
`Diba Manager` does this; copy the pattern.

**Clean up on close.** Set `win.onClose` and clear your intervals. A leaked
timer keeps polling the device after the window is gone.

**Poll gently.** Every request costs the device real time. One combined call a
second beats ten small ones, and nothing should poll while its window is
closed.

**Fail out loud.** If the device says no, show the user what it said. Silent
catch blocks turn a five-second fix into an afternoon.

---

## 10. Troubleshooting

**The app does not appear after installing.** Apps register at startup —
reload the browser. If it is still missing, check App Store → Installed for a
load error.

**"tried to use X but its manifest does not declare that permission".**
Exactly what it says. Add it to `permissions` in `dib.json` and rebuild.
`dsp32 build` catches this before you install.

**`dsp32 install` cannot reach the device.** Confirm you are on the board's
hotspot and run `dsp32 doctor --to <address>`. The default is `10.3.2.1`.

**`App.net` fails with "fetch failed".** The device needs a Wi-Fi uplink of
its own — the hotspot alone is not internet. Connect it under Settings →
Network.

**The package fails its integrity check.** The download is corrupt or was
modified. Rebuild, and if you are publishing, regenerate the registry so the
checksum matches.

**Reserved pin.** The firmware refuses pins it uses for flash, PSRAM, the
console UART, the camera or the SD card. `/api/gpio/pins` says which, and why.

---

## 11. Where to look next

| | |
|---|---|
| [DIB_FORMAT.md](DIB_FORMAT.md) | The package format, byte by byte |
| [`apps/notes/`](../apps/notes/) | A small app: storage, filesystem, notifications |
| [`apps/clock/`](../apps/clock/) | Timers, alarms, driving a GPIO pin |
| [`apps/diba-manager/`](../apps/diba-manager/) | A large app: canvas, scoped CSS, live pin I/O |
| [README](../README.md) | The REST API the device exposes |
