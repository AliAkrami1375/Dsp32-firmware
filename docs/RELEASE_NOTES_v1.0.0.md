<div align="center">

<img src="https://raw.githubusercontent.com/AliAkrami1375/Dsp32/main/hero.svg" width="100" alt="Dsp32">

# Dsp32 v1.0.0

**A full desktop operating environment for the ESP32 — served over its own Wi-Fi hotspot.**

</div>

<div align="center">

<img src="https://raw.githubusercontent.com/AliAkrami1375/Dsp32/main/docs/img/02-desktop.png" width="760" alt="Dsp32 desktop">

</div>

---

Flash Dsp32 onto any ESP32 and it becomes a self-contained computer. It raises
its own Wi-Fi hotspot, runs a captive portal, and serves a complete Windows
11-style desktop to any phone or laptop that connects — windows, taskbar, start
menu, file manager, terminal, network manager, firewall, camera app and task
manager, all backed by real hardware on the device.

The entire desktop is baked into the firmware image (48 KB gzipped), so there is
nothing to install on the client and nothing to fetch from the internet.

## What's in this release

- **Native ESP-IDF firmware** — no Arduino layer. SoftAP + station + mDNS,
  hand-written captive-portal DNS responder, FAT on internal flash and SD card,
  OV2640 camera with a dedicated MJPEG stream server, and a MAC firewall that
  deauths blocked clients and survives reboots.
- **Twelve desktop apps** — File Explorer, This PC, Terminal, Notepad, Camera,
  Task Manager, Calculator, Firewall, Network Manager, App Studio, Settings and
  Photos.
- **Real window management** — drag, resize from any edge, snap to half-screen,
  maximize, minimize, z-order focus, taskbar grouping, context menus, toasts,
  light/dark themes with eight accent colors.
- **User-installable apps** — drop a `.js` file in `/flash/Apps` or `/sd/Apps`
  and it loads as a first-class desktop app at startup, with full access to the
  platform API.
- **Prebuilt binaries for seven board variants** — see the table below.
- **A full device simulator** — run the entire desktop on your machine before
  touching hardware.

## Downloads

Pick the image that matches your board. The `-merged.bin` files contain
bootloader + partition table + application in one piece — flash at offset `0x0`
and you are done.

| Board | Merged image (flash at `0x0`) | Separate files |
|---|---|---|
| Generic ESP32 (DevKit, WROOM, WROVER) | `dsp32-esp32-merged.bin` | `dsp32-esp32-separate.zip` |
| AI-Thinker ESP32-CAM (camera + SD) | `dsp32-esp32cam-merged.bin` | `dsp32-esp32cam-separate.zip` |
| ESP32-S2 | `dsp32-esp32s2-merged.bin` | `dsp32-esp32s2-separate.zip` |
| ESP32-S3 | `dsp32-esp32s3-merged.bin` | `dsp32-esp32s3-separate.zip` |
| Seeed XIAO ESP32S3 Sense (camera + SD) | `dsp32-xiao_s3_sense-merged.bin` | `dsp32-xiao_s3_sense-separate.zip` |
| ESP32-C3 | `dsp32-esp32c3-merged.bin` | `dsp32-esp32c3-separate.zip` |
| ESP32-C6 | `dsp32-esp32c6-merged.bin` | `dsp32-esp32c6-separate.zip` |

Verify your download against `SHA256SUMS.txt`.

## Flashing

```bash
pip install esptool
esptool.py -p /dev/ttyUSB0 -b 460800 write_flash 0x0 dsp32-esp32-merged.bin
```

On Windows the port looks like `COM5`; on macOS like `/dev/cu.usbserial-0001`.
Prefer a GUI? Use Espressif's **ESP Flash Download Tool**, or flash straight
from Chrome at [esp.huhn.me](https://esp.huhn.me/) with no install at all.

**Flash settings** (any tool that asks): SPI mode **DIO**, speed **40 MHz**,
flash size **4 MB**, baud **460800**.

**Memory offsets** (only if you flash the three files separately — note that the
bootloader offset differs between chips):

| Chip | bootloader.bin | partition-table.bin | app |
|---|---|---|---|
| ESP32, ESP32-S2 | `0x1000` | `0x8000` | `0x10000` |
| ESP32-S3, C3, C6 | `0x0` | `0x8000` | `0x10000` |

📖 **Complete flashing guide** with per-tool settings, ESP32-CAM wiring,
download-mode instructions and troubleshooting:
**[docs/FLASHING.md](https://github.com/AliAkrami1375/Dsp32/blob/main/docs/FLASHING.md)**

## First boot

1. Join the Wi-Fi network **`Dibachain`**, password **`dsp32pass`**
2. Most devices open the desktop automatically (captive portal). Otherwise
   browse to **http://10.3.2.1** or **http://dsp32.local**

The first boot shows a splash that probes the hardware — chip, cores, clock,
heap, PSRAM, flash filesystem, SD card, camera — and reports what it found
before the desktop appears.

Everything is configurable afterwards from the Settings app: hotspot name and
password, theme, accent color, wallpaper, Wi-Fi uplink, and storage.

## Try it without hardware

```bash
git clone https://github.com/AliAkrami1375/Dsp32.git
cd Dsp32
python3 simulator/dsp32_sim.py
# open http://localhost:8000
```

The simulator serves the identical frontend against a mock REST API with a
virtual filesystem, a synthetic camera feed and live-changing telemetry.

## Footprint

Measured on the classic ESP32 build:

```
Application binary     942 KB      63% of the app partition still free
Embedded desktop        48 KB      gzipped, 162 KB uncompressed
Static DRAM             34 KB      19% used
Static IRAM             88 KB      69% used
```

## Requirements

- Any ESP32-family board, 4 MB flash recommended
- Optional: SD card, OV2640 camera, PSRAM
- ESP-IDF 5.1+ only if you build from source

---

<div dir="rtl">

# نسخه‌ی فارسی

## Dsp32 نسخه‌ی ۱.۰.۰

**یک محیط دسکتاپ کامل برای ESP32 — که روی هات‌اسپات وای‌فای خودش سرو می‌شود.**

Dsp32 را روی هر ESP32 فلش کنید و آن برد تبدیل به یک کامپیوتر مستقل می‌شود.
هات‌اسپات وای‌فای خودش را بالا می‌آورد، یک captive portal اجرا می‌کند، و یک
دسکتاپ کامل به سبک ویندوز ۱۱ به هر گوشی یا لپ‌تاپی که وصل شود تحویل می‌دهد —
پنجره‌ها، تسک‌بار، منوی استارت، فایل منیجر، ترمینال، مدیر شبکه، فایروال، اپ
دوربین و تسک منیجر، که همه به سخت‌افزار واقعی روی خود دستگاه وصل هستند.

کل دسکتاپ داخل ایمیج فرمویر پخته شده (۴۸ کیلوبایت فشرده)، پس هیچ چیزی روی
دستگاه کاربر نصب نمی‌شود و هیچ چیزی از اینترنت گرفته نمی‌شود.

## در این ریلیز چه چیزی هست

- **فرمویر بومی ESP-IDF** — بدون لایه‌ی آردوینو. SoftAP و station و mDNS،
  پاسخگوی DNS دست‌نویس برای captive portal، فایل‌سیستم FAT روی فلش داخلی و
  کارت SD، دوربین OV2640 با سرور استریم MJPEG اختصاصی، و یک فایروال MAC که
  کلاینت بلاک‌شده را deauth می‌کند و بعد از ریست هم باقی می‌ماند.
- **دوازده اپ دسکتاپ** — فایل منیجر، This PC، ترمینال، ویرایشگر متن، دوربین،
  تسک منیجر، ماشین حساب، فایروال، مدیر شبکه، اپ استودیو، تنظیمات و تصاویر.
- **مدیریت پنجره‌ی واقعی** — کشیدن، تغییر اندازه از هر لبه، چسباندن به نصف
  صفحه، بیشینه، کمینه، فوکوس z-order، گروه‌بندی تسک‌بار، منوی راست‌کلیک،
  اعلان‌ها، و تم روشن و تیره با هشت رنگ.
- **اپ‌های قابل نصب توسط کاربر** — یک فایل `.js` در `/flash/Apps` یا
  `/sd/Apps` بگذارید تا موقع راه‌اندازی به‌عنوان یک اپ کامل با دسترسی کامل به
  API پلتفرم لود شود.
- **باینری آماده برای هفت واریانت برد** — جدول پایین را ببینید.
- **یک شبیه‌ساز کامل دستگاه** — کل دسکتاپ را قبل از دست زدن به سخت‌افزار روی
  کامپیوتر خودتان اجرا کنید.

## دانلود

ایمیج متناسب با برد خود را انتخاب کنید. فایل‌های `-merged.bin` بوت‌لودر و جدول
پارتیشن و اپلیکیشن را یکجا دارند — روی آفست `0x0` فلش کنید و تمام.

| برد | ایمیج merged (فلش روی `0x0`) | فایل‌های جداگانه |
|---|---|---|
| ESP32 معمولی (DevKit، WROOM، WROVER) | `dsp32-esp32-merged.bin` | `dsp32-esp32-separate.zip` |
| AI-Thinker ESP32-CAM (دوربین + SD) | `dsp32-esp32cam-merged.bin` | `dsp32-esp32cam-separate.zip` |
| ESP32-S2 | `dsp32-esp32s2-merged.bin` | `dsp32-esp32s2-separate.zip` |
| ESP32-S3 | `dsp32-esp32s3-merged.bin` | `dsp32-esp32s3-separate.zip` |
| Seeed XIAO ESP32S3 Sense (دوربین + SD) | `dsp32-xiao_s3_sense-merged.bin` | `dsp32-xiao_s3_sense-separate.zip` |
| ESP32-C3 | `dsp32-esp32c3-merged.bin` | `dsp32-esp32c3-separate.zip` |
| ESP32-C6 | `dsp32-esp32c6-merged.bin` | `dsp32-esp32c6-separate.zip` |

صحت دانلود را با فایل `SHA256SUMS.txt` بررسی کنید.

## فلش کردن

</div>

```bash
pip install esptool
esptool.py -p /dev/ttyUSB0 -b 460800 write_flash 0x0 dsp32-esp32-merged.bin
```

<div dir="rtl">

روی ویندوز پورت شبیه `COM5` است و روی مک شبیه `/dev/cu.usbserial-0001`.
رابط گرافیکی ترجیح می‌دهید؟ از **ESP Flash Download Tool** رسمی Espressif
استفاده کنید، یا مستقیم از داخل کروم در [esp.huhn.me](https://esp.huhn.me/)
بدون نصب هیچ چیزی فلش کنید.

**تنظیمات فلش** (هر ابزاری که پرسید): SPI mode روی **DIO**، سرعت **۴۰ مگاهرتز**،
اندازه‌ی فلش **۴ مگابایت**، baud برابر **460800**.

**آدرس‌های حافظه** (فقط اگر سه فایل را جداگانه فلش می‌کنید — دقت کنید که آفست
بوت‌لودر بین چیپ‌ها فرق می‌کند):

| چیپ | bootloader.bin | partition-table.bin | اپلیکیشن |
|---|---|---|---|
| ESP32 و ESP32-S2 | `0x1000` | `0x8000` | `0x10000` |
| ESP32-S3 و C3 و C6 | `0x0` | `0x8000` | `0x10000` |

📖 **راهنمای کامل فلش** با تنظیمات هر ابزار، سیم‌کشی ESP32-CAM، نحوه‌ی بردن برد
به حالت دانلود و رفع اشکال:
**[docs/FLASHING.fa.md](https://github.com/AliAkrami1375/Dsp32/blob/main/docs/FLASHING.fa.md)**

## اولین بوت

۱. به شبکه‌ی وای‌فای **`Dibachain`** با رمز **`dsp32pass`** وصل شوید
۲. بیشتر دستگاه‌ها خودشان دسکتاپ را باز می‌کنند (captive portal). در غیر این
   صورت آدرس **http://10.3.2.1** یا **http://dsp32.local** را باز کنید

اولین بوت یک صفحه‌ی اسپلش نشان می‌دهد که سخت‌افزار را بررسی می‌کند — چیپ،
هسته‌ها، فرکانس، heap، PSRAM، فایل‌سیستم فلش، کارت SD، دوربین — و قبل از ظاهر
شدن دسکتاپ گزارش می‌دهد چه چیزی پیدا کرده.

بعد از آن همه چیز از اپ تنظیمات قابل تغییر است: نام و رمز هات‌اسپات، تم، رنگ
accent، والپیپر، اتصال وای‌فای بالادست، و ذخیره‌سازی.

## امتحان بدون سخت‌افزار

</div>

```bash
git clone https://github.com/AliAkrami1375/Dsp32.git
cd Dsp32
python3 simulator/dsp32_sim.py
# باز کنید: http://localhost:8000
```

<div dir="rtl">

شبیه‌ساز دقیقاً همان فرانت‌اند را در مقابل یک REST API شبیه‌سازی‌شده سرو
می‌کند، با فایل‌سیستم مجازی، فید دوربین مصنوعی و تله‌متری زنده.

## حجم اشغالی

اندازه‌گیری‌شده روی بیلد ESP32 کلاسیک:

</div>

```
باینری اپلیکیشن       ۹۴۲ کیلوبایت    ۶۳٪ پارتیشن اپ هنوز خالی
دسکتاپ جاسازی‌شده      ۴۸ کیلوبایت     فشرده، ۱۶۲ کیلوبایت خام
DRAM ثابت             ۳۴ کیلوبایت     ۱۹٪ استفاده‌شده
IRAM ثابت             ۸۸ کیلوبایت     ۶۹٪ استفاده‌شده
```

<div dir="rtl">

## پیش‌نیازها

- هر بردی از خانواده‌ی ESP32، ترجیحاً با ۴ مگابایت فلش
- اختیاری: کارت SD، دوربین OV2640، PSRAM
- ESP-IDF نسخه‌ی ۵.۱ به بالا فقط اگر از سورس بیلد می‌گیرید

</div>
