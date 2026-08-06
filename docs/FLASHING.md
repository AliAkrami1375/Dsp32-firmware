# Flashing Dsp32

Everything you need to get Dsp32 onto a board, whichever tool you prefer.

[فارسی](FLASHING.fa.md)

---

## Which file do I need?

Every release ships two kinds of image per variant:

| File | Use it when |
|---|---|
| `dsp32-<variant>-merged.bin` | **Recommended.** Bootloader + partition table + app in one file. Flash it at offset `0x0` and you are done — no offsets to remember. |
| `bootloader.bin`, `partition-table.bin`, `dsp32-<variant>.bin` | You want the three parts separately, or your tool needs them that way (ESP Flash Download Tool, OTA workflows). |

Pick the variant that matches your board:

| Your board | Variant to download |
|---|---|
| Generic ESP32 DevKit / WROOM / WROVER | `esp32` |
| AI-Thinker ESP32-CAM | `esp32cam` |
| ESP32-S2 boards | `esp32s2` |
| Generic ESP32-S3 DevKit | `esp32s3` |
| Seeed XIAO ESP32S3 Sense | `xiao_s3_sense` |
| ESP32-C3 boards | `esp32c3` |
| ESP32-C6 boards | `esp32c6` |

---

## Flash settings

These are the settings Dsp32 is built with. Any tool that asks you for them
wants exactly these values:

| Setting | Value |
|---|---|
| SPI mode | **DIO** |
| SPI speed | **40 MHz** |
| Flash size | **4 MB** (32 Mbit) |
| Baud rate | **460800** (drop to 115200 if the upload fails) |

> On boards with 8 MB or 16 MB flash the image still works — Dsp32 only uses
> the first 4 MB. Do not select a size *smaller* than 4 MB.

### Memory offsets

Only needed if you flash the three files separately. **The bootloader offset
differs between chips** — this is the single most common mistake:

| Chip | bootloader.bin | partition-table.bin | dsp32-\<variant\>.bin |
|---|---|---|---|
| ESP32 | `0x1000` | `0x8000` | `0x10000` |
| ESP32-S2 | `0x1000` | `0x8000` | `0x10000` |
| ESP32-S3 | `0x0` | `0x8000` | `0x10000` |
| ESP32-C3 | `0x0` | `0x8000` | `0x10000` |
| ESP32-C6 | `0x0` | `0x8000` | `0x10000` |

The merged image already has all of this baked in, which is why it goes at `0x0`
on every chip.

---

## Method 1 — esptool (any OS, recommended)

The official Espressif command-line flasher. Works on Windows, macOS and Linux.

```bash
pip install esptool
```

**Single merged file — the easy path:**

```bash
esptool.py -p /dev/ttyUSB0 -b 460800 write_flash 0x0 dsp32-esp32-merged.bin
```

On Windows the port looks like `COM5`; on macOS like `/dev/cu.usbserial-0001`.

**Three separate files** (note the chip-specific bootloader offset):

```bash
# ESP32 / ESP32-S2
esptool.py -p /dev/ttyUSB0 -b 460800 --chip esp32 write_flash \
  --flash_mode dio --flash_freq 40m --flash_size 4MB \
  0x1000  bootloader.bin \
  0x8000  partition-table.bin \
  0x10000 dsp32-esp32.bin

# ESP32-S3 / C3 / C6 — bootloader moves to 0x0
esptool.py -p /dev/ttyUSB0 -b 460800 --chip esp32s3 write_flash \
  --flash_mode dio --flash_freq 40m --flash_size 4MB \
  0x0     bootloader.bin \
  0x8000  partition-table.bin \
  0x10000 dsp32-esp32s3.bin
```

**Wipe the chip first** if you are replacing other firmware, or if the board
behaves strangely after flashing:

```bash
esptool.py -p /dev/ttyUSB0 erase_flash
```

This also clears the saved Wi-Fi settings, so the hotspot returns to the
factory `Dibachain` / `dsp32pass`.

---

## Method 2 — ESP Flash Download Tool (Windows GUI)

Espressif's official Windows utility. Download it from
[espressif.com/en/support/download/other-tools](https://www.espressif.com/en/support/download/other-tools).

1. Launch it and choose **ESP32 DownloadTool** (or ESP32-S3 / C3 / C6 to match
   your chip), then **Develop** mode.
2. In the file rows, add the images and their addresses, ticking the checkbox
   on each row:

   | ✓ | File | Address |
   |---|---|---|
   | ☑ | `dsp32-esp32-merged.bin` | `0x0` |

   Or, using the three separate files on an ESP32:

   | ✓ | File | Address |
   |---|---|---|
   | ☑ | `bootloader.bin` | `0x1000` |
   | ☑ | `partition-table.bin` | `0x8000` |
   | ☑ | `dsp32-esp32.bin` | `0x10000` |

3. Set the SPI options at the bottom:
   - **SPI SPEED**: `40MHz`
   - **SPI MODE**: `DIO`
   - **FLASH SIZE**: `32Mbit` (= 4 MB)
   - Leave **DoNotChgBin** unticked
4. Pick your **COM** port, set **BAUD** to `460800`.
5. Press **ERASE** once if the board had other firmware on it, then **START**.
6. Wait for **FINISH**, then press the board's reset button.

---

## Method 3 — Browser (nothing to install)

Open [esp.huhn.me](https://esp.huhn.me/) or
[ESP Web Tools](https://espressif.github.io/esptool-js/) in Chrome or Edge
(Web Serial is not available in Firefox or Safari).

1. Click **Connect** and pick your board's serial port.
2. Add `dsp32-<variant>-merged.bin` at address `0x0`.
3. Click **Program**.

---

## Getting the board into download mode

Most modern dev boards do this automatically over USB. If flashing fails with
*"Failed to connect… Wrong boot mode detected"*, do it by hand:

1. Hold **BOOT** (also labelled **IO0** or **GPIO0**).
2. Tap **RESET** (**EN**) while still holding BOOT.
3. Release BOOT. The board is now waiting for a firmware upload.
4. Start the flash, then press RESET again when it finishes.

**ESP32-CAM** has no USB port and no buttons. You need a USB-to-TTL adapter:

| ESP32-CAM | USB-TTL adapter |
|---|---|
| 5V | 5V |
| GND | GND |
| U0R (GPIO3) | TX |
| U0T (GPIO1) | RX |
| **IO0** | **GND** — only while flashing |

Connect `IO0` to `GND` before powering on, flash, then remove that jumper and
power-cycle the board.

---

## First boot

After flashing, open a serial monitor at **115200 baud** to watch it come up:

```bash
esptool.py -p /dev/ttyUSB0 --after hard_reset chip_id   # just to reset
# or with ESP-IDF installed:
idf.py -p /dev/ttyUSB0 monitor
```

You should see:

```
  ____            _____ ___
 |  _ \  ___ _ __|___ /|_  )
 | | | |/ __| '_ \ |_ \ / /
 | |_| |\__ \ |_) |__) /___|
 |____/ |___/ .__/____/
            |_|  v1.0.0 — web desktop OS

I (612) dsp32_fs: flash=ok sd=-
I (734) dsp32_wifi: hotspot "Dibachain" up at 10.3.2.1
I (741) dsp32_dns: captive DNS on :53 -> 10.3.2.1
I (802) dsp32_http: desktop on http://10.3.2.1/ (20 embedded assets)
I (805) dsp32: ready — connect to the hotspot and open http://10.3.2.1
```

Then, from a phone or laptop:

1. Join the Wi-Fi network **Dibachain**, password **dsp32pass**
2. Most devices open the desktop automatically (captive portal). If not, browse
   to **http://10.3.2.1** or **http://dsp32.local**

The first boot shows a splash that probes the hardware and reports what it
found, then the desktop appears.

---

## Troubleshooting

**"Failed to connect to ESP32: No serial data received"**
The board is not in download mode, or the driver is missing. Try the manual
BOOT/RESET sequence above. On Windows install the
[CP210x](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) or
[CH340](https://www.wch-ic.com/downloads/CH341SER_ZIP.html) driver depending on
your board's USB chip.

**"A fatal error occurred: Timed out waiting for packet header"**
Lower the baud rate to `115200`, and use a shorter or better USB cable. Some
cables are charge-only and carry no data.

**Flashing succeeds but the board reboots in a loop**
You most likely used the wrong bootloader offset — `0x1000` on ESP32/S2, `0x0`
on S3/C3/C6. Run `erase_flash` and flash the merged image at `0x0` instead.

**The hotspot never appears**
Check the serial log. If it stops right after the banner, the board is probably
brown-outing: the Wi-Fi radio draws up to 500 mA in bursts. Use a proper 5 V
supply or a powered USB hub, not a laptop port through a long cable.

**The desktop loads but no SD card shows up**
The prebuilt generic images do not enable SD on every board because the wiring
differs. Build from source with your own pins:
`idf.py menuconfig` → **Dsp32 Configuration** → **SD card interface**.

**I forgot the hotspot password I set**
`esptool.py -p <port> erase_flash` then reflash — this clears NVS and restores
`Dibachain` / `dsp32pass`.
