# Media Server

*[فارسی](MEDIA_SERVER.fa.md)*

Serves a folder on the SD card as a web library on its own port, with
playback, file management and an optional password.

The important word is **service**. This is not a page that lists files — it is
a second web server running in the firmware. Close the app, reload the
desktop, pull the power and put it back: if it was serving, it is still
serving, on the same port, over the same folder, with the same password.

---

## Why it needs an SD card

Not an arbitrary rule. The internal flash is a few megabytes with the firmware
already in it, so a library on it would hold about four songs — and every
upload would be wearing out the same flash the board boots from. Without a
card the app says so and offers nothing else, rather than starting and then
failing obscurely.

---

## Using it

Install **Media Server** from the App Store, open it, and:

1. **Choose a folder.** A browser rather than a text box: typing a path is how
   you end up serving the wrong thing.
2. **Set a port.** 8080 by default. 80 and 81 are refused — they belong to the
   desktop and the camera stream.
3. **Press Start.** The address appears; copy it or open it.

Anyone on the same network can then reach it.

| Setting | Does |
|---|---|
| **Folder** | The root. Nothing above it is reachable, ever. |
| **Name** | Shown at the top of the page people see. |
| **Port** | Anything except 80 and 81. |
| **Allow changes** | Uploads, renames, deletes and new folders. Off makes it read-only, which is what you want if the link leaves the house. |
| **Password** | Optional. See below. |

### What people get

A single page: browse folders, play audio and video in place, view images,
download anything, and — if changes are allowed — upload, rename, delete and
create folders. It works on a phone.

Range requests are implemented properly, which matters more than it sounds:
without them a browser cannot seek in audio or video, and mobile Safari will
not start playback at all.

Files stream in 4 KB chunks straight from the card to the socket, so a
two-gigabyte film costs the board the same memory as a text file.

---

## The password, stated plainly

It is HTTP Basic over plain HTTP. The password is **base64 on the wire, which
is encoding, not encryption** — anyone watching the network can read it. On
the board it is stored salted and iterated so it does not leak from the flash.

That makes it good for keeping people out of each other's folders on a home
network. It is not a defence against somebody listening, and the app says so
on the page rather than implying otherwise.

If the link is going anywhere you do not control, turn **Allow changes** off
as well.

---

## It comes back by itself

Whether it was running is stored in NVS, so the board restarts it on boot.

A card takes a moment to mount, so the very first attempt after a cold start
can be too early. If that happens the app shows *"set to run but not
serving"* and Start fixes it — the flag is not cleared, so this is a
one-button problem rather than a lost configuration.

A service that could not start is never marked as running. One that claims to
be on while it is off is worse than one that is honestly off.

---

## Paths cannot escape

This is the one part of Dsp32 that strangers reach, so every path goes through
one check: anything containing `..` is **rejected outright** rather than
normalised, which is the mistake that keeps getting made. Backslashes and
control characters are refused too. There is no way to address anything above
the folder you chose.

---

## The API

The desktop drives it through the main server; the media server itself is a
separate port with its own routes.

| Route | Method | Does |
|---|---|---|
| `/api/media/status` | GET | Whether a card is present, and the current settings |
| `/api/media/config?…` | POST | Apply settings and start or stop |

`config` takes `enabled`, `port`, `root`, `title`, `user`, `allowWrite`,
`password` and `clearPassword`. An empty `password` **leaves the existing one
alone** — clearing it needs `clearPassword=1`, so saving a settings page
cannot silently open the library to everyone.

---

## Limits worth knowing

- **One folder** per board. A second library means a second board.
- **Four connections** at a time. A phone opens a second one for the media
  element while the page is still loading, so one slot would deadlock.
- **No transcoding.** The board plays what the browser can play. An MKV with
  an exotic codec will download but not stream.
- **Speed is the card and the radio**, not the board — expect a few megabytes
  a second over Wi-Fi, which is comfortable for music and fine for most video.
