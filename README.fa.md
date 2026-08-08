# ‏Dsp32 — انتشار 1.1.0

*[English](README.md)*

<div dir="rtl">

فرمویر آماده برای خانواده‌ی ESP32، ایمیج نود Di8266، و همه‌ی اپ‌های نصب‌شدنی.

### ◂ [در مرورگر امتحانش کنید](demo/)

دسکتاپ همان دسکتاپ واقعی است. دستگاهِ پشتش داخل خود صفحه شبیه‌سازی می‌شود، پس
نه چیزی برای فلش کردن هست نه برای نصب — فایل‌ها و تنظیمات در مرورگر شما می‌مانند
و بعد از رفرش هم هستند.

</div>

<p align="center">
  <img src="docs/img/02-desktop.png" width="820" alt="The Dsp32 desktop">
</p>

<table>
<tr>
<td width="50%"><img src="docs/img/01-boot.png" alt="Boot"><br>
  <sub><b>Boot</b> — the firmware probes and reports every peripheral it finds</sub></td>
<td width="50%"><img src="docs/img/03-start-menu.png" alt="Start menu"><br>
  <sub><b>Start menu</b> — searchable, with everything installed</sub></td>
</tr>
<tr>
<td><img src="docs/img/04-explorer.png" alt="File Explorer"><br>
  <sub><b>File Explorer</b> — flash and SD, upload by drag-and-drop</sub></td>
<td><img src="docs/img/05-task-manager.png" alt="Task Manager"><br>
  <sub><b>Task Manager</b> — live heap chart, temperature, storage</sub></td>
</tr>
<tr>
<td><img src="docs/img/06-terminal.png" alt="Terminal"><br>
  <sub><b>Terminal</b> — the device REST API from a command line</sub></td>
<td><img src="docs/img/07-settings-network.png" alt="Network settings"><br>
  <sub><b>Network</b> — hotspot credentials, scan and join an uplink</sub></td>
</tr>
<tr>
<td><img src="docs/img/08-camera.png" alt="Camera"><br>
  <sub><b>Camera</b> — live view and capture, on boards that have one</sub></td>
<td><img src="docs/img/11-app-store.png" alt="App Store"><br>
  <sub><b>App Store</b> — install from the registry, an SD card or a file</sub></td>
</tr>
<tr>
<td><img src="docs/img/09-snap.png" alt="Snapped windows"><br>
  <sub><b>Window snapping</b> — drag to an edge or press <code>Win</code>+<code>←</code>/<code>→</code></sub></td>
<td><img src="docs/img/10-light-theme.png" alt="Light theme"><br>
  <sub><b>Light theme</b> — eight accents, five wallpapers</sub></td>
</tr>
</table>

<p align="center">
  <img src="docs/img/12-mobile.png" width="260" alt="Mobile view"><br>
  <sub>A phone is the most likely thing connected to an ESP32 hotspot, so it is
  built for one.</sub>
</p>

<div dir="rtl">

**اینجا سورسی نیست.** این مخزن فقط چیزهایی را دارد که یک برد برای اجرا لازم
دارد: ایمیج برای فلش، بسته برای نصب، و مستندات. عمومی است چون برد رجیستری
اپ‌ها و فرمویر نود را روی HTTPS ساده و بدون اعتبارنامه می‌گیرد، و آن فایل‌ها
باید بدون توکن خواندنی باشند.

---

## فلش کردن یک برد

هر برد یک ایمیج **merged** دارد که با یک دستور روی آفست ۰ می‌رود — مگر دلیلی
خلافش داشته باشید، همان را استفاده کنید.

</div>

```bash
pip install esptool
esptool.py --chip auto -p /dev/ttyUSB0 -b 460800 write_flash 0x0 \
    firmware/<board>/dsp32-<board>-merged.bin
```

<div dir="rtl">

یا از اسکریپت استفاده کنید که پورت و چیپ را خودش پیدا می‌کند:

</div>

```bash
./flash.sh <board>
```

<div dir="ltr">

| برد | فایل‌ها | ایمیج merged |
|---|---|---|
| **ESP32** | `firmware/esp32/` | 1.4 MB |
| **ESP32-C3** | `firmware/esp32c3/` | 1.4 MB |
| **ESP32-C6** | `firmware/esp32c6/` | 1.4 MB |
| **AI-Thinker ESP32-CAM** | `firmware/esp32cam/` | 1.4 MB |
| **ESP32-S2** | `firmware/esp32s2/` | 1.4 MB |
| **ESP32-S3** | `firmware/esp32s3/` | 1.4 MB |
| **Seeed XIAO ESP32S3 Sense** | `firmware/xiao_s3_sense/` | 1.4 MB |

</div>

<div dir="rtl">

فایل‌های جدا‌گانه‌ی `bootloader.bin`، `partition-table.bin` و ایمیج اپ کنار هر
merged هستند، برای کسی که بخواهد جدا بنویسدشان.

راهنمای کامل با همه‌ی ابزارهای فلش و آفست‌هایی که هرکدام می‌خواهند در
**[docs/FLASHING.fa.md](docs/FLASHING.fa.md)** است.

### بعد از فلش

برد یک شبکه‌ی وای‌فای به نام **Dibachain** بالا می‌آورد. به آن وصل شوید و
**http://10.3.2.1** را باز کنید — پورتال کپتیو باید خودش پیشنهادش بدهد.

---

## اپ‌ها

هیچ‌کدام داخل فرمویر نیستند. برد هر چه بخواهید را دانلود می‌کند، و همین است که
یک ایمیج ۱٫۴ مگابایتی می‌تواند اصلاً یک دسکتاپ داشته باشد.

App Store روی برد فایل `apps/registry.json` همین مخزن را می‌خواند، پس هر چه
اینجا منتشر شود از روی خود دستگاه نصب‌شدنی است.

</div>

<div dir="ltr">

| اپ | نسخه |
|---|---|
| **Clock** | 1.0.0 |
| **Code** | 1.0.0 |
| **Diba Manager** | 2.0.0 |
| **Dmesh** | 2.2.0 |
| **Media Server** | 1.0.0 |
| **Notes** | 1.0.0 |
| **Snake** | 1.0.0 |
| **Soroush** | 1.0.0 |

</div>

<div dir="rtl">

یک `.dib` بسته‌ی نصب است. می‌توانید دستی هم نصبش کنید: روی کارت SD بگذارید یا
در **App Store ← Install** آپلودش کنید.

---

## نود Di8266

یک کلاینت ESP8266 که Dsp32 کشفش می‌کند، تصاحبش می‌کند و می‌رانَدش — با کلید خودش، قوانین خودش، و پین‌هایی که برد از طریق پروتکل Dmesh می‌خواند و می‌نویسد.

</div>

<div dir="ltr">

| | |
|---|---|
| **Image** | `node/di8266.bin` |
| **Version** | 2.0 |
| **Protocol** | Dmesh v2 |
| **SHA-256** | `3e84d1033aefe761781c071db4766a14…` |

</div>

<div dir="rtl">

یک ESP8266 خام را می‌شود مستقیم از اپ **Dmesh** با چهار سیم فلش کرد — بدون
هیچ کامپیوتری. بعد از آن همه چیز از راه دور است. ببینید
**[docs/DMESH.fa.md](docs/DMESH.fa.md)**.

</div>

<div dir="rtl">

---

## مستندات

</div>

<div dir="ltr">

| | |
|---|---|
| [فلش کردن](docs/FLASHING.fa.md) | هر ابزار، هر برد، هر آفست |
| [Dmesh](docs/DMESH.fa.md) | راندن نودهای ESP8266 و پروتکلش |
| [سرور رسانه](docs/MEDIA_SERVER.fa.md) | سرو کردن یک پوشه‌ی کارت |
| [توسعه‌ی اپ](docs/APP_DEVELOPMENT.fa.md) | نوشتن اپ خودتان |
| [فرمت dib.](docs/DIB_FORMAT.fa.md) | بسته‌ی اپ چیست |

</div>

<div dir="rtl">

---

## چک‌سام

فایل `SHA256SUMS.txt` همه‌ی ایمیج‌ها و بسته‌های این انتشار را پوشش می‌دهد.

</div>

```bash
sha256sum -c SHA256SUMS.txt
```
