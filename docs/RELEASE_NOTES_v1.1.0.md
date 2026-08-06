# Dsp32 v1.1.0

A board that manages other boards, serves media off its card, knows when its
battery is low, and asks who you are before it opens.

---

## Dmesh — the node network

Dsp32 runs on one board. Dmesh is how it drives others.

A **Di8266 node** is an ESP8266 running the client firmware shipped in this
release. It raises its own access point, keeps its own settings, and hands its
pins over to the Dsp32 board.

**The board manages them, not the app.** The registry, the keys, the desired
state and the reconciliation live in the firmware — close every window, reload
the page, walk away for a week, and the network carries on being managed.

**You configure a node, not a connection.** What a node should be is written
down the moment you ask, whether or not it is plugged in. When it next reports
in and its state is not the wanted one, it is corrected. A node that is
switched off is not an error and not a queue of pending commands; it is a node
that is not currently in sync, and the app says so.

**Nodes push; the controller never polls.** A heartbeat every eight seconds
carries a 32-bit hash of the node's own state, so deciding whether a node needs
anything is one integer comparison. There is no per-node timer, no per-node
socket, no scan that walks the list — which is why the node count does not
matter. Adding the hundredth node costs one more heartbeat every eight seconds.

**Rules run on the node.** Threshold, edge, report and blink, eight per node,
kept in its EEPROM. A threshold that has to ask the board before it can act has
the network's reaction time. They keep working with the board switched off and
survive the node rebooting — a task, not a command, until it is disabled or
deleted.

**Every node has its own key.** Sixteen bytes from the hardware random
generator, no two alike. Frames are AES-128-CTR encrypted then authenticated
with HMAC-SHA256, with separate derived subkeys, a counter that is both the
nonce and the replay guard, and a boot id that distinguishes a genuine restart
from a replay. Keys never leave the board. Claiming is trust-on-first-use, and
the node only accepts it in its first two minutes after power-on.

**Flashing a blank ESP8266 needs no computer.** The bootloader is in mask ROM
on every one of them, and the board speaks it: four wires, a minute, done.
Everything after that is over the air.

Nodes appear in **Diba Manager** as flow nodes, so a flow can read a sensor on
one and drive a pin on another.

→ [docs/DMESH.md](DMESH.md)

## Media Server

A folder on the SD card, served as a web library on its own port, with
playback, file management and an optional password.

It is a **service**: a second web server in the firmware, not a page. Closing
the app changes nothing, and the board restarts it after a reboot if it was
running. Files stream in 4 KB chunks straight from the card, so a
two-gigabyte film costs the same memory as a text file. Range requests are
implemented properly, which is what lets a browser seek and what mobile Safari
requires before it will play anything.

Needs an SD card, and says so rather than failing obscurely.

→ [docs/MEDIA_SERVER.md](MEDIA_SERVER.md)

## Battery monitoring

Describe the divider — which ADC pin, the two resistors, the chemistry, the
cutoffs — and the board watches the pack from a task of its own at low
priority, sampling every five seconds. Charge comes from interpolating a real
discharge curve per chemistry, rescaled to your own cutoffs, rather than a
straight line. The divider arithmetic is shown live while you type it, and a
wiring that would clip the ADC is refused with the numbers rather than stored.

At the critical level it can notify, drop to 80 MHz with light sleep, or
deep-sleep to protect the cells.

## An account, and a lock screen

The board gets an owner. The record lives on the board — the SD card when
there is one, the internal flash otherwise — so connecting from a different
phone finds the same account waiting.

Stated plainly in the UI: the board serves plain HTTP over its own hotspot, so
the password crosses the air in the clear and anyone holding the board can read
the flash. It is salted and stretched over sixty thousand rounds so the
password itself does not leak. A lock on a drawer, not a safe.

## Camera detection

No longer a build-time decision. The firmware tries each of the seven wirings
it knows across ESP32, S2 and S3, keeps the first that produces a frame, and
remembers it. A board nobody listed can have its sixteen pins entered in
Settings, applied immediately so a mistake reports itself.

Opening the app on a board without a camera now says which kind of "no" it is:
a C3 has no camera interface and never will; a chip that could have one says
nothing answered and offers to search again.

## Moving onto a card fitted later

Settings measures what is on the internal flash and offers to move it. Copy,
verify the size landed, then delete — so an interruption leaves both copies
rather than neither.

## Smaller things

- **Installing an app no longer reloads the desktop.** It starts in place, and
  reinstalling closes the old one's windows first so an update takes effect
  without a reload.
- **Desktop icons auto-arrange** by default and stop scattering after setup
  installs apps. Dragging one takes over the layout from then on.
- **File Explorer double-click works again** — selecting an item was rebuilding
  the list, so the second click landed on a different element.
- **Rename preselects the stem** and leaves the extension alone.
- **Snake** starts slow and speeds up as it grows; its overlay no longer covers
  the board for the whole game.
- **Diba Manager** shows what an API actually returned and lets you pick a
  field out of it, instead of putting `[object Object]` on the wire.
- **Soroush** signs in with a phone number and a code, and keeps the session on
  the device.
- **The fetch proxy** passes a remote's own error through instead of replacing
  it with a status number.
- **Async dialog buttons** no longer close the dialog regardless of what they
  decided.

---

## Boards

| Board | Notes |
|---|---|
| ESP32 | The original dual-core part |
| AI-Thinker ESP32-CAM | Camera and SD, with PSRAM |
| ESP32-S2 | Single core, native USB |
| ESP32-S3 | Dual core with PSRAM — the most comfortable to run this on |
| Seeed XIAO ESP32S3 Sense | S3 with the Sense camera |
| ESP32-C3 | RISC-V, no camera interface |
| ESP32-C6 | RISC-V with Wi-Fi 6, no camera interface |

Plus **Di8266**, the ESP8266 node image.

## Upgrading from v1.0.0

Flash the merged image as usual. Settings, installed apps and files are kept —
they live in NVS and on the filesystem, not in the app partition.

The app registry moved to this repository, so the App Store works on a board
with an uplink and no further setup.
