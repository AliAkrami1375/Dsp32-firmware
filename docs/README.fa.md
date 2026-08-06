<div align="center">

<img src="../hero.svg" width="120" alt="Dsp32">

# Dsp32

**یک محیط دسکتاپ کامل برای ESP32 — که روی هات‌اسپات وای‌فای خودش سرو می‌شود.**

فرمویر بومی ESP-IDF. بدون لایه‌ی آردوینو. بدون ابر. بدون نیاز به اینترنت.

[![Release](https://img.shields.io/github/v/release/AliAkrami1375/Dsp32?style=flat-square&color=1266ff)](https://github.com/AliAkrami1375/Dsp32/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](../LICENSE)
[![ESP-IDF](https://img.shields.io/badge/ESP--IDF-5.1%2B-red?style=flat-square)](https://docs.espressif.com/projects/esp-idf/)

[English](../README.md) · **فارسی**

<img src="img/02-desktop.png" width="820" alt="دسکتاپ Dsp32">

</div>

---

<div dir="rtl">

Dsp32 را روی هر ESP32 فلش کنید و آن برد تبدیل به یک کامپیوتر مستقل می‌شود.
هات‌اسپات وای‌فای خودش را بالا می‌آورد، یک captive portal اجرا می‌کند، و یک
دسکتاپ کامل به سبک ویندوز ۱۱ را به هر گوشی یا لپ‌تاپی که وصل شود تحویل می‌دهد.
پنجره‌ها، تسک‌بار، منوی استارت، فایل منیجر، ترمینال، مدیر شبکه، فایروال،
اپ دوربین، تسک منیجر — همه در مرورگر رندر می‌شوند و همه به سخت‌افزار واقعی
روی خود دستگاه وصل هستند.

کل دسکتاپ داخل ایمیج فرمویر پخته شده (فشرده‌شده با gzip، حدود ۴۸ کیلوبایت)، پس
هیچ چیزی روی دستگاه کاربر نصب نمی‌شود و هیچ چیزی از اینترنت گرفته نمی‌شود.

## ویژگی‌های اصلی

| | |
|---|---|
| **دسکتاپ روی هات‌اسپات** | به AP وصل شوید و `http://10.3.2.1` (یا `http://dsp32.local`) را باز کنید. یک DNS مخصوص captive portal به هر کوئری جواب می‌دهد، پس بیشتر دستگاه‌ها خودشان دسکتاپ را باز می‌کنند. |
| **شناسایی خودکار سخت‌افزار** | موقع بوت یک اسپلش انیمیشنی برد را بررسی می‌کند — مدل چیپ، تعداد هسته، فرکانس، heap، PSRAM، فایل‌سیستم فلش، کارت SD، دوربین — و قبل از ظاهر شدن دسکتاپ گزارش می‌دهد چه چیزی پیدا کرده. |
| **همه‌ی واریانت‌های ESP32** | ESP32 و S2 و S3 و C3 و C6. جانبی‌ها برای هر برد از طریق Kconfig شناسایی و فعال می‌شوند؛ هیچ چیز هاردکد نشده. |
| **فایل‌سیستم واقعی** | FAT روی فلش داخلی (`/flash`) به‌علاوه‌ی کارت SD (`/sd`، چه SDMMC چه SPI). آپلود، دانلود، تغییر نام، حذف، کشیدن و رها کردن، و نمایشگر زنده‌ی فضای باقی‌مانده. |
| **دوربین** | پشتیبانی OV2640 با استریم زنده‌ی MJPEG روی یک پورت جداگانه، کنترل رزولوشن و کیفیت، و ذخیره‌ی مستقیم عکس روی SD یا فلش. |
| **شبکه و فایروال** | مدیریت مشخصات هات‌اسپات، اسکن و اتصال به روتر بالادست، لیست کلاینت‌های متصل، و بلاک کردن دستگاه‌ها بر اساس MAC (ذخیره‌شونده، و deauth هنگام تلاش برای اتصال). |
| **اپ‌های قابل نصب** | یک بسته‌ی `.dib` — مانیفست و کد و آیکون در یک فایل — از فایل، از URL یا از رجیستری نصب می‌شود، با نمایش مجوزها قبل از اجرا. فایل‌های `.js` تنها هم هنوز کار می‌کنند. |
| **شبیه‌ساز** | کل دسکتاپ روی کامپیوتر خودتان در مقابل یک دستگاه شبیه‌سازی‌شده اجرا می‌شود، پس می‌توانید تمام رابط کاربری را قبل از دست زدن به سخت‌افزار بسازید و تست کنید. |

</div>

## تصاویر

<table>
<tr>
<td width="50%"><img src="img/01-boot.png" alt="اسپلش بوت"><br><sub><b>بوت</b> — فرمویر هر جانبی را شناسایی و گزارش می‌کند</sub></td>
<td width="50%"><img src="img/03-start-menu.png" alt="منوی استارت"><br><sub><b>منوی استارت</b> — قابل جستجو، با همه‌ی اپ‌های نصب‌شده</sub></td>
</tr>
<tr>
<td><img src="img/04-explorer.png" alt="فایل منیجر"><br><sub><b>فایل منیجر</b> — فلش و SD، آپلود با کشیدن و رها کردن</sub></td>
<td><img src="img/05-task-manager.png" alt="تسک منیجر"><br><sub><b>تسک منیجر</b> — نمودار زنده‌ی heap، دما، فضای ذخیره‌سازی</sub></td>
</tr>
<tr>
<td><img src="img/06-terminal.png" alt="ترمینال"><br><sub><b>ترمینال</b> — ۱۹ دستور روی REST API دستگاه</sub></td>
<td><img src="img/07-settings-network.png" alt="تنظیمات شبکه"><br><sub><b>شبکه</b> — مشخصات هات‌اسپات، اسکن و اتصال به روتر</sub></td>
</tr>
<tr>
<td><img src="img/08-camera.png" alt="دوربین"><br><sub><b>دوربین</b> — نمای زنده و ذخیره‌ی عکس</sub></td>
<td><img src="img/11-app-store.png" alt="فروشگاه اپ"><br><sub><b>فروشگاه اپ</b> — نصب بسته‌های dib. و بررسی مجوزها</sub></td>
</tr>
<tr>
<td><img src="img/09-snap.png" alt="پنجره‌های چسبیده"><br><sub><b>چسباندن پنجره</b> — بکشید به لبه یا <code>Win</code>+<code>←</code>/<code>→</code> بزنید</sub></td>
<td><img src="img/10-light-theme.png" alt="تم روشن"><br><sub><b>تم روشن</b> — هشت رنگ accent، پنج والپیپر</sub></td>
</tr>
</table>

<div align="center">
<img src="img/12-mobile.png" width="260" alt="نمای موبایل">
<br><sub>دسکتاپ خودش را با گوشی تطبیق می‌دهد — محتمل‌ترین دستگاهی که به هات‌اسپات ESP32 وصل می‌شود</sub>
</div>

<div dir="rtl">

## شروع سریع

### گزینه‌ی الف — فلش کردن باینری آماده (بدون toolchain)

ایمیج مخصوص برد خود را از
[آخرین ریلیز](https://github.com/AliAkrami1375/Dsp32/releases/latest)
دانلود کنید، سپس:

</div>

```bash
pip install esptool
esptool.py -p /dev/ttyUSB0 -b 460800 write_flash 0x0 dsp32-esp32-merged.bin
```

<div dir="rtl">

فایل `-merged` بوت‌لودر و جدول پارتیشن و اپلیکیشن را یکجا دارد — آن را روی آفست
`0x0` فلش کنید و تمام. یا اگر ترجیح می‌دهید چیزی نصب نکنید از
[ESP Web Tools](https://esp.huhn.me/) داخل مرورگر استفاده کنید.

**📖 راهنمای کامل فلش با تنظیمات دقیق هر ابزار و هر چیپ:
[FLASHING.fa.md](FLASHING.fa.md)**

بعد از فلش، هر دستگاهی را به هات‌اسپات **Dibachain** (رمز `dsp32pass`) وصل کنید
و **http://10.3.2.1** را باز کنید.

### گزینه‌ی ب — امتحان در شبیه‌ساز (اصلاً بدون سخت‌افزار)

</div>

```bash
python3 simulator/dsp32_sim.py
# باز کنید: http://localhost:8000
```

<div dir="rtl">

شبیه‌ساز دقیقاً همان فرانت‌اند را در مقابل یک REST API شبیه‌سازی‌شده سرو
می‌کند، با یک فایل‌سیستم مجازی در `simulator/vfs/`، یک فید دوربین مصنوعی،
نتایج جعلی اسکن وای‌فای و تله‌متری که زنده تغییر می‌کند. هر چیزی که می‌بینید
روی برد واقعی هم دقیقاً همان‌طور کار می‌کند.

### گزینه‌ی ج — بیلد از سورس

نیازمند [ESP-IDF نسخه‌ی ۵.۱ به بالا](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/).

</div>

```bash
idf.py set-target esp32          # یا esp32s2 / esp32s3 / esp32c3 / esp32c6
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

<div dir="rtl">

برای ساختن باینری‌های ریلیز برای همه‌ی واریانت‌ها با یک دستور:

</div>

```bash
./tools/release_build.sh
# -> dist/<variant>/dsp32-<variant>-merged.bin
```

<div dir="rtl">

## بردهای پشتیبانی‌شده

| واریانت | تارگت | دوربین | کارت SD | توضیح |
|---|---|---|---|---|
| `esp32` | ESP32 | — | — | بردهای معمولی |
| `esp32cam` | ESP32 | OV2640 | SDMMC یک‌بیتی | AI-Thinker ESP32-CAM، با PSRAM |
| `esp32s2` | ESP32-S2 | — | — | |
| `esp32s3` | ESP32-S3 | — | — | |
| `xiao_s3_sense` | ESP32-S3 | OV2640 | SPI (پین CS شماره ۲۱) | Seeed XIAO ESP32S3 Sense، ۸ مگابایت |
| `esp32c3` | ESP32-C3 | — | — | RISC-V |
| `esp32c6` | ESP32-C6 | — | — | RISC-V، وای‌فای ۶ |

سیم‌کشی SD در هر برد فرق می‌کند، پس ایمیج‌های عمومی آن را خاموش دارند — فقط
دو برد دوربین‌دار بالا پین‌آوت مشخصی دارند. برای استفاده از کارت روی هر برد
دیگری، از سورس بیلد بگیرید و پین‌هایتان را در
`idf.py menuconfig` ← **Dsp32 Configuration** ← **SD card interface** بگذارید.

سیم‌کشی دوربین و SD در هر برد فرق می‌کند، پس بردهای رایج به شکل قطعه‌کانفیگ
آماده هستند:

</div>

```bash
# AI-Thinker ESP32-CAM — دوربین OV2640 + SD_MMC + PSRAM
idf.py -D SDKCONFIG_DEFAULTS="sdkconfig.defaults;boards/esp32cam.defaults" build

# Seeed XIAO ESP32S3 Sense — دوربین OV2640 + SD روی SPI
idf.py set-target esp32s3
idf.py -D SDKCONFIG_DEFAULTS="sdkconfig.defaults;boards/xiao_s3_sense.defaults" build
```

<div dir="rtl">

هر چیز دیگری را می‌توانید تعاملی با `idf.py menuconfig` بخش
**Dsp32 Configuration** تنظیم کنید — نام و رمز هات‌اسپات، نام mDNS، ماژول
دوربین، و اینترفیس SD (هیچ‌کدام / SDMMC / SPI با پین‌های دلخواه خودتان).

### شبیه‌ساز Wokwi (سیلیکون شبیه‌سازی‌شده)

</div>

```bash
idf.py -D SDKCONFIG_DEFAULTS="sdkconfig.defaults;boards/wokwi.defaults" build
# پروژه را با افزونه‌ی Wokwi در VS Code باز کنید، سپس:
# http://localhost:8180
```

<div dir="rtl">

## دسکتاپ

| اپ | چه کار می‌کند |
|---|---|
| **File Explorer** | مرورگر دوپنلی برای `/flash` و `/sd` با آپلود، دانلود، کشیدن و رها کردن، تغییر نام، حذف، فایل و پوشه‌ی جدید، و نمایشگر زنده‌ی فضای خالی |
| **This PC** | نمای کلی دستگاه — درایوها، چیپ، حافظه، دوربین و شبکه در یک نگاه |
| **Terminal** | `ls` `cd` `cat` `write` `mkdir` `rm` `mv` `df` `free` `uptime` `sysinfo` `wifi` `scan` `clients` `snap` `theme` `reboot` — با تاریخچه |
| **Notepad** | ویرایشگر متن روی فایل‌سیستم دستگاه، ذخیره با Ctrl+S |
| **Camera** | نمای زنده، کنترل رزولوشن و کیفیت، ذخیره‌ی عکس |
| **Task Manager** | نمودار زنده‌ی heap، کارت‌های CPU و PSRAM و دما و uptime، نمایشگر فضا، جدول کامل سیستم |
| **Calculator** | ماشین حساب استاندارد با پشتیبانی کیبورد |
| **Firewall** | کلاینت‌های متصل، بلاک و آنبلاک بر اساس MAC (ذخیره‌شده در NVS) |
| **Network Manager** | مشخصات هات‌اسپات، اسکن وای‌فای و اتصال به روتر |
| **App Store** | نصب بسته‌های `.dib` از فایل، URL یا رجیستری؛ بررسی مجوزها، به‌روزرسانی و حذف |
| **Settings** | سیستم، شخصی‌سازی (تم، رنگ accent، والپیپر)، شبکه، ذخیره‌سازی |
| **Photos** | نمایشگر تصویر با زوم |

مدیریت پنجره واقعی است: کشیدن، تغییر اندازه از هر لبه، چسباندن به نصف صفحه با
کشیدن به لبه (یا `Win`+`←`/`→`)، بیشینه کردن با کشیدن به بالا، کمینه کردن به
تسک‌بار، فوکوس مبتنی بر z-order، گروه‌بندی اپ‌ها در تسک‌بار با نشانگر اجرا،
منوهای راست‌کلیک، اعلان‌های toast، و تم روشن و تیره با هشت رنگ accent.

**میانبرهای کیبورد:** `Win` منوی استارت · `Ctrl+Shift+E` فایل منیجر ·
`Ctrl+Shift+T` ترمینال · `Ctrl+Shift+D` نمایش دسکتاپ · `Win+←/→` چسباندن ·
`Win+↑` بیشینه · `Win+↓` بازگردانی یا کمینه · `Esc` بستن منوها

## اپ‌ها

Dsp32 نرم‌افزار نصب می‌کند. یک اپ به شکل **بسته‌ی `.dib`** منتشر می‌شود —
مانیفست و کد و آیکون و دارایی‌ها در یک فایل — که می‌شود از کامپیوترتان، از یک
URL، یا از رجیستری‌ای که دستگاه از طریق اتصال بالادستش می‌گیرد نصبش کرد.

📖 **[راهنمای کامل توسعه‌ی اپ ←](APP_DEVELOPMENT.fa.md)**
([English](APP_DEVELOPMENT.md)) · [قالب بسته](DIB_FORMAT.fa.md)
- **[Dmesh](DMESH.md)** — راندن نودهای ESP8266 از روی برد، و پل OTA که فلششان می‌کند
- **[سرور رسانه](MEDIA_SERVER.md)** — سرو کردن یک پوشه‌ی کارت به‌صورت کتابخانه‌ی وب روی پورت خودش

</div>

```
myapp/
  dib.json      مانیفست: id، name، version، entry، permissions
  main.js       تابع Dsp32.app(fn) را صدا می‌زند
  icon.svg
```

```bash
python3 tools/dibpack.py myapp/ -o myapp.dib
```

```js
// main.js — رابطی می‌گیرد که به مجوزهای مانیفست محدود شده
Dsp32.app(function (App) {
  const win = App.window({ title: 'Hello', w: 420, h: 300 });
  win.body.innerHTML = '<button class="btn primary" id="go">Read chip</button><pre id="out"></pre>';
  win.body.querySelector('#go').onclick = async () => {
    const s = await App.system();                  // نیاز به "system"
    win.body.querySelector('#out').textContent = `${s.chip} @ ${s.cpuMhz} MHz`;
    await App.storage.set('lastChip', s.chip);     // نیاز به "storage"
  };
});
```

<div dir="rtl">

بعد **App Store ← Install** را باز کنید، فایل `.dib` را انتخاب کنید، ببینید
اپ اجازه‌ی چه کارهایی را می‌خواهد، و نصب کنید. بعد از یک بار رفرش، اپ روی
دسکتاپ ظاهر می‌شود.

هر اپ مجوزهایش را در مانیفست اعلام می‌کند — `storage`، `fs`، `net`، `notify`،
`system`، `camera` — و فروشگاه قبل از نصب نشانشان می‌دهد. صدا زدن متدی که
مانیفست اعلامش نکرده بلافاصله خطا می‌دهد، پس مجوز فراموش‌شده موقع توسعه
معلوم می‌شود.

**اینها sandbox امنیتی نیستند.** اپ نصب‌شده به‌صورت جاوااسکریپت روی همان صفحه‌ی
دسکتاپ اجرا می‌شود و به هر چیزی که دسکتاپ دسترسی دارد می‌رسد. لیست مجوزها
می‌گوید یک اپ صادق قصد دارد از چه چیزی استفاده کند. فقط بسته‌هایی را نصب کنید
که به منبعشان اعتماد دارید.

فایل‌های `.js` تنها که در `/flash/Apps` یا `/sd/Apps` بگذارید هنوز به‌عنوان اپ
تک‌فایلی بدون مانیفست کار می‌کنند — یعنی می‌توانید با نوشتن روی کارت حافظه‌ی
یک برد Dsp32 برایش نرم‌افزار بنویسید. آنها کل پلتفرم را مستقیم می‌گیرند:
`Shell`، `WM`، `API`، `I` و کمکی‌هایی مثل `fmtBytes` و `escapeHtml`.

## REST API

هر کاری که دسکتاپ انجام می‌دهد از طریق HTTP ساده هم در دسترس است، پس دستگاه از
هر جای هات‌اسپات قابل اسکریپت‌نویسی است.

| متد | مسیر | کاربرد |
|---|---|---|
| GET | `/api/system` | چیپ، حافظه، uptime، دما، جانبی‌ها |
| POST | `/api/system/reboot` | ریستارت دستگاه |
| GET | `/api/fs/info` | مجموع فضای `/flash` و `/sd` |
| GET | `/api/fs/list?path=` | لیست دایرکتوری |
| GET | `/api/fs/read?path=[&dl=1]` | خواندن یا دانلود فایل |
| POST | `/api/fs/write?path=` | نوشتن فایل (بدنه‌ی خام) |
| POST | `/api/fs/mkdir?path=` | ساخت دایرکتوری |
| POST | `/api/fs/delete?path=` | حذف بازگشتی |
| POST | `/api/fs/rename?from=&to=` | تغییر نام یا جابه‌جایی |
| POST | `/api/fs/format` | فرمت فلش داخلی |
| GET | `/api/wifi/status` | وضعیت AP و station |
| GET | `/api/wifi/scan` | اسکن شبکه‌های اطراف |
| GET | `/api/wifi/clients` | ایستگاه‌های متصل |
| POST | `/api/wifi/sta?ssid=&pass=` | اتصال به شبکه‌ی بالادست |
| POST | `/api/wifi/forget` | قطع اتصال بالادست |
| POST | `/api/wifi/ap?ssid=&pass=` | تغییر مشخصات هات‌اسپات |
| GET | `/api/fw/list` | کلاینت‌ها و لیست بلاک MAC |
| POST | `/api/fw/block?mac=` | بلاک و deauth کردن کلاینت |
| POST | `/api/fw/unblock?mac=` | حذف از لیست بلاک |
| GET | `/api/camera/status` | قابلیت‌های دوربین |
| POST | `/api/camera/config?framesize=&quality=` | تنظیم سنسور |
| GET | `/api/camera/snapshot` | یک فریم JPEG |
| POST | `/api/camera/save?path=` | ذخیره‌ی مستقیم عکس |
| GET | `/api/net/fetch?url=` | گرفتن یک آدرس از اینترنت از طریق دستگاه |
| GET | `:81/stream` | استریم زنده‌ی MJPEG (سرور جداگانه) |

`/api/net/fetch` برای این وجود دارد که صفحه‌ای که از `10.3.2.1` سرو می‌شود
نمی‌تواند به origin دیگری برسد (CORS جلویش را می‌گیرد) و در ضمن دستگاه است که
اتصال بالادست دارد. بدنه را در قطعات ۲ کیلوبایتی عبور می‌دهد و هرگز کل پاسخ را
در حافظه نگه نمی‌دارد — چیزی که وقتی یک نشست TLS خودش ۴۵ کیلوبایت از ۱۲۰
کیلوبایت heap را می‌خورد اهمیت دارد. پاسخ‌های بزرگ‌تر از ۱ مگابایت رد می‌شوند.

</div>

```bash
curl http://10.3.2.1/api/system
curl -X POST --data-binary @notes.txt "http://10.3.2.1/api/fs/write?path=/flash/notes.txt"
curl -o photo.jpg http://10.3.2.1/api/camera/snapshot
```

<div dir="rtl">

## ساختار پروژه

</div>

```
main/                    فرمویر بومی ESP-IDF
  app_main.c             توالی بوت
  dsp32_wifi.c           SoftAP + station + mDNS + فایروال MAC
  dsp32_dns.c            پاسخگوی DNS برای captive portal
  dsp32_fs.c             FAT روی فلش + SD (چه SDMMC چه SPI)
  dsp32_sysinfo.c        چیپ، heap، PSRAM، دما
  dsp32_camera.c         درایور OV2640 + سرور استریم MJPEG
  dsp32_net.c            پراکسی HTTP(S) خروجی برای نصب اپ
  dsp32_http.c           REST API + سرور فایل‌های جاسازی‌شده
  Kconfig.projbuild      گزینه‌های menuconfig
data/web/                دسکتاپ، جاسازی‌شده داخل فرمویر
  css/desktop.css        تم ویندوز ۱۱ (mica، acrylic، snap، تم‌ها)
  js/wm.js               مدیر پنجره
  js/shell.js            تسک‌بار، منوی استارت، دیالوگ‌ها، رجیستری اپ
  js/dib.js              پارسر و نصب‌کننده‌ی بسته‌ی .dib
  js/appapi.js           رابط runtime که به اپ‌های نصب‌شده داده می‌شود
  js/apps/*.js           دوازده اپ داخلی
apps/                    بسته‌های نمونه و رجیستری اپ
tools/build_web.py       فشرده‌سازی data/web به main/web_assets.c موقع بیلد
tools/dibpack.py         ساخت و بررسی بسته‌های .dib
tools/release_build.sh   بیلد همه‌ی واریانت‌ها در dist/
simulator/dsp32_sim.py   شبیه‌ساز کامل دستگاه برای توسعه
boards/*.defaults        قطعه‌کانفیگ هر برد
```

<div dir="rtl">

فایل‌های وب در هر بیلد به‌طور خودکار بازتولید می‌شوند — هر چیزی زیر
`data/web/` را عوض کنید و دوباره بیلد بگیرید.

## حجم اشغالی

اندازه‌گیری‌شده روی بیلد ESP32 کلاسیک:

</div>

```
باینری اپلیکیشن       ۹۴۲ کیلوبایت    (۶۳٪ پارتیشن اپ هنوز خالی)
دسکتاپ جاسازی‌شده      ۴۸ کیلوبایت     فشرده، ۱۶۲ کیلوبایت خام
DRAM ثابت             ۳۴ کیلوبایت     ۱۹٪ استفاده‌شده
IRAM ثابت             ۸۸ کیلوبایت     ۶۹٪ استفاده‌شده
```

<div dir="rtl">

## پیش‌نیازها

- ESP-IDF نسخه‌ی ۵.۱ یا بالاتر (فقط برای بیلد از سورس)
- هر بردی از خانواده‌ی ESP32، ترجیحاً با ۴ مگابایت فلش
- اختیاری: کارت SD، دوربین OV2640، PSRAM

## مجوز

MIT — فایل [LICENSE](../LICENSE) را ببینید.

</div>
