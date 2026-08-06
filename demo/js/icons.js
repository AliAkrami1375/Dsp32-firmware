// Dsp32 icon library — inline SVG, fluent-inspired
(function () {
  const S = (inner, vb = '0 0 24 24') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none">${inner}</svg>`;
  const st = 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

  window.I = {
    logo: S(`<rect x="2" y="2" width="9.5" height="9.5" rx="1.5" fill="#4cc2ff"/><rect x="12.5" y="2" width="9.5" height="9.5" rx="1.5" fill="#0078d4"/><rect x="2" y="12.5" width="9.5" height="9.5" rx="1.5" fill="#0078d4"/><rect x="12.5" y="12.5" width="9.5" height="9.5" rx="1.5" fill="#4cc2ff"/>`),
    start: S(`<rect x="3" y="3" width="8.2" height="8.2" rx="1.2" fill="#4cc2ff"/><rect x="12.8" y="3" width="8.2" height="8.2" rx="1.2" fill="#2196f3"/><rect x="3" y="12.8" width="8.2" height="8.2" rx="1.2" fill="#2196f3"/><rect x="12.8" y="12.8" width="8.2" height="8.2" rx="1.2" fill="#4cc2ff"/>`),
    search: S(`<circle cx="10.5" cy="10.5" r="6.2" ${st}/><path d="M15.3 15.3 20 20" ${st}/>`),

    explorer: S(`<path d="M5 12c0-1.7 1.3-3 3-3h9l3.4 4.2H40c1.7 0 3 1.3 3 3V36c0 1.7-1.3 3-3 3H8c-1.7 0-3-1.3-3-3V12z" fill="#f9a825" transform="translate(-1)"/><path d="M4 18.5h40V36c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V18.5z" fill="#ffd54f"/>`, '0 0 48 48'),
    folder: S(`<path d="M5 12c0-1.7 1.3-3 3-3h9l3.4 4.2H40c1.7 0 3 1.3 3 3V36c0 1.7-1.3 3-3 3H8c-1.7 0-3-1.3-3-3V12z" fill="#f9a825" transform="translate(-1)"/><path d="M4 18.5h40V36c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V18.5z" fill="#ffd54f"/>`, '0 0 48 48'),
    drive: S(`<rect x="4" y="7" width="30" height="21" rx="2.5" fill="#455a64"/><rect x="6.5" y="9.5" width="25" height="16" rx="1" fill="#4cc2ff"/><path d="M15 28h8l1.2 5h-10.4z" fill="#607d8b"/><rect x="11" y="33" width="16" height="3" rx="1.5" fill="#78909c"/><rect x="34" y="14" width="11" height="27" rx="2.5" fill="#37474f"/><circle cx="39.5" cy="19" r="1.6" fill="#4cc2ff"/><path d="M36.5 24h6M36.5 27.5h6M36.5 31h6" stroke="#78909c" stroke-width="1.6" stroke-linecap="round"/>`, '0 0 48 48'),
    hdd: S(`<rect x="4" y="14" width="40" height="9" rx="2.5" fill="#90a4ae"/><rect x="4" y="25" width="40" height="9" rx="2.5" fill="#b0bec5"/><circle cx="38" cy="18.5" r="1.8" fill="#4cc2ff"/><circle cx="38" cy="29.5" r="1.8" fill="#4cc2ff"/>`, '0 0 48 48'),
    sdcard: S(`<path d="M12 8c0-2.2 1.8-4 4-4h12l8 8v28c0 2.2-1.8 4-4 4H16c-2.2 0-4-1.8-4-4V8z" fill="#1976d2"/><path d="M12 22h24v18c0 2.2-1.8 4-4 4H16c-2.2 0-4-1.8-4-4V22z" fill="#2196f3"/><rect x="17" y="7" width="3" height="7" rx="1" fill="#bbdefb"/><rect x="22" y="7" width="3" height="7" rx="1" fill="#bbdefb"/><rect x="27" y="7" width="3" height="7" rx="1" fill="#bbdefb"/>`, '0 0 48 48'),

    notepad: S(`<rect x="9" y="4" width="30" height="40" rx="3" fill="#eceff1"/><rect x="9" y="4" width="30" height="9" rx="3" fill="#42a5f5"/><path d="M15 21h18M15 27h18M15 33h12" stroke="#78909c" stroke-width="2.4" stroke-linecap="round"/>`, '0 0 48 48'),
    fileText: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#eceff1"/><path d="M28 4l10 10H28V4z" fill="#b0bec5"/><path d="M16 24h16M16 30h16M16 36h10" stroke="#78909c" stroke-width="2.4" stroke-linecap="round"/>`, '0 0 48 48'),
    fileCode: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#eceff1"/><path d="M28 4l10 10H28V4z" fill="#b0bec5"/><path d="m20 24-5 5 5 5M28 24l5 5-5 5" stroke="#7e57c2" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 48 48'),
    fileImg: S(`<rect x="6" y="8" width="36" height="32" rx="3" fill="#c8e6c9"/><circle cx="17" cy="19" r="4" fill="#ffd54f"/><path d="M6 34l11-9 8 7 8-6 9 8v2c0 2.2-1.8 3-4 3H10c-2.2 0-4-.8-4-3v-2z" fill="#66bb6a"/>`, '0 0 48 48'),
    fileAudio: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#eceff1"/><path d="M28 4l10 10H28V4z" fill="#b0bec5"/><path d="M30 22v10.5a4 4 0 1 1-2-3.4V24l-8 2v8.5a4 4 0 1 1-2-3.4V24l12-3v1z" fill="#ec407a"/>`, '0 0 48 48'),
    fileVideo: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#eceff1"/><path d="M28 4l10 10H28V4z" fill="#b0bec5"/><path d="M20 24l12 7-12 7V24z" fill="#ef5350"/>`, '0 0 48 48'),
    fileZip: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#fff8e1"/><path d="M28 4l10 10H28V4z" fill="#ffe082"/><path d="M22 6h4v4h-4zM22 14h4v4h-4zM22 22h4v4h-4zM22 30h4v4h-4z" fill="#ff9800"/>`, '0 0 48 48'),
    file: S(`<path d="M10 8c0-2.2 1.8-4 4-4h14l10 10v26c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4V8z" fill="#eceff1"/><path d="M28 4l10 10H28V4z" fill="#b0bec5"/>`, '0 0 48 48'),

    camera: S(`<rect x="4" y="12" width="40" height="28" rx="5" fill="#546e7a"/><path d="M16 12l3-5h10l3 5" fill="#546e7a"/><circle cx="24" cy="26" r="9.5" fill="#263238"/><circle cx="24" cy="26" r="6.5" fill="#4cc2ff"/><circle cx="21.5" cy="23.5" r="2" fill="#e1f5fe"/>`, '0 0 48 48'),
    monitor: S(`<rect x="4" y="5" width="40" height="38" rx="5" fill="#1e3a5f"/><rect x="10" y="26" width="6" height="12" rx="1.5" fill="#4cc2ff"/><rect x="20" y="18" width="6" height="20" rx="1.5" fill="#4cc2ff"/><rect x="30" y="10" width="6" height="28" rx="1.5" fill="#8ad6ff"/><path d="M9 20l8-8 6 6 11-11" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>`, '0 0 48 48'),
    terminal: S(`<rect x="4" y="7" width="40" height="34" rx="4" fill="#263238"/><path d="m12 18 6 6-6 6" stroke="#4cc2ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 32h12" stroke="#b0bec5" stroke-width="3" stroke-linecap="round"/>`, '0 0 48 48'),
    settings: S(`<path d="M24 4l4.5 3.2 5.5-.7 2.6 4.9 5.2 2-.3 5.5L45 24l-3.5 5.1.3 5.5-5.2 2-2.6 4.9-5.5-.7L24 44l-4.5-3.2-5.5.7-2.6-4.9-5.2-2 .3-5.5L3 24l3.5-5.1-.3-5.5 5.2-2 2.6-4.9 5.5.7L24 4z" fill="#78909c"/><circle cx="24" cy="24" r="8" fill="#eceff1"/>`, '0 0 48 48'),
    photos: S(`<rect x="5" y="7" width="38" height="34" rx="4" fill="#e3f2fd"/><circle cx="17" cy="18" r="4.5" fill="#ffd54f"/><path d="M5 33l12-10 9 8 8-6 9 8v4c0 2.2-1.8 4-4 4H9c-2.2 0-4-1.8-4-4v-4z" fill="#42a5f5"/>`, '0 0 48 48'),
    info: S(`<circle cx="24" cy="24" r="20" fill="#2196f3"/><path d="M24 21v13" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="14.5" r="2.4" fill="#fff"/>`, '0 0 48 48'),
    calc: S(`<rect x="8" y="4" width="32" height="40" rx="4" fill="#37474f"/><rect x="12" y="8" width="24" height="9" rx="2" fill="#a5d6a7"/><g fill="#eceff1"><rect x="12" y="21" width="6" height="5" rx="1.5"/><rect x="21" y="21" width="6" height="5" rx="1.5"/><rect x="30" y="21" width="6" height="5" rx="1.5"/><rect x="12" y="29" width="6" height="5" rx="1.5"/><rect x="21" y="29" width="6" height="5" rx="1.5"/><rect x="12" y="37" width="6" height="4" rx="1.5"/><rect x="21" y="37" width="6" height="4" rx="1.5"/></g><rect x="30" y="29" width="6" height="12" rx="1.5" fill="#4cc2ff"/>`, '0 0 48 48'),
    shield: S(`<path d="M24 4l16 6v12c0 10.5-6.8 18.6-16 22-9.2-3.4-16-11.5-16-22V10l16-6z" fill="#0078d4"/><path d="M24 4l16 6v12c0 10.5-6.8 18.6-16 22V4z" fill="#4cc2ff"/><path d="m16.5 23.5 5 5 10-10" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, '0 0 48 48'),
    serial: S(`<rect x="4" y="9" width="40" height="30" rx="4" fill="#37474f"/><rect x="7" y="12" width="34" height="18" rx="2" fill="#0b1220"/><path d="M11 17h7M11 22h12M11 27h9" stroke="#4cc2ff" stroke-width="2.2" stroke-linecap="round"/><circle cx="34" cy="34" r="2" fill="#4cd964"/><circle cx="27" cy="34" r="2" fill="#ffb900"/><path d="M14 39v3M34 39v3" stroke="#78909c" stroke-width="2.4" stroke-linecap="round"/>`, '0 0 48 48'),
    appbox: S(`<rect x="5" y="5" width="17" height="17" rx="3" fill="#4cc2ff"/><rect x="26" y="5" width="17" height="17" rx="3" fill="#0078d4"/><rect x="5" y="26" width="17" height="17" rx="3" fill="#0078d4"/><path d="M34.5 27v13M28 33.5h13" stroke="#4cc2ff" stroke-width="3.4" stroke-linecap="round"/>`, '0 0 48 48'),

    wifi: S(`<path d="M2.5 8.5a14 14 0 0 1 19 0" ${st}/><path d="M5.8 12a9.4 9.4 0 0 1 12.4 0" ${st}/><path d="M9 15.4a5 5 0 0 1 6 0" ${st}/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>`),
    wifiOff: S(`<path d="M3 3l18 18" ${st}/><path d="M5.8 12a9.4 9.4 0 0 1 6.6-2.7M15.6 10.8c.9.4 1.8 1 2.6 1.7" ${st}/><circle cx="12" cy="19" r="1.6" fill="currentColor"/>`),
    sdTray: S(`<path d="M7 3h8l4 4v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 21V5a2 2 0 0 1 2-2z" ${st}/><path d="M9 7.5h1.6M12.2 7.5h1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`),
    camTray: S(`<rect x="2.5" y="7" width="14" height="11" rx="2.5" ${st}/><path d="m16.5 11 5-2.8v8.6l-5-2.8" ${st}/>`),

    power: S(`<path d="M12 3v8" ${st}/><path d="M6.3 6.5a8 8 0 1 0 11.4 0" ${st}/>`),
    refresh: S(`<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6" ${st}/><path d="M20 4v4.8h-4.8" ${st}/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.4" ${st}/><path d="M4 20v-4.8h4.8" ${st}/>`),
    back: S(`<path d="M19 12H5M11 6l-6 6 6 6" ${st}/>`),
    up: S(`<path d="M12 19V5M6 11l6-6 6 6" ${st}/>`),
    plus: S(`<path d="M12 5v14M5 12h14" ${st}/>`),
    // The shell fills the level itself, so the body is drawn empty here.
    battery: S(`<rect x="2" y="8" width="17" height="9" rx="2.4" ${st}/><path d="M21 11.2v2.6" ${st} stroke-linecap="round"/>`),
    batteryBolt: S(`<path d="M12.6 7.5 8.4 13h3.2l-.6 4 4.2-5.5h-3.2z" fill="currentColor" stroke="none"/>`),
    lock: S(`<rect x="4.5" y="10.5" width="15" height="9.5" rx="2" ${st}/><path d="M8 10.5V7.6a4 4 0 018 0v2.9" ${st}/>`),
    user: S(`<circle cx="12" cy="8.4" r="3.7" ${st}/><path d="M4.6 20a7.4 7.4 0 0114.8 0" ${st}/>`),
    check: S(`<path d="M4.5 12.5 10 18 19.5 6.5" ${st}/>`),
    x: S(`<path d="M5 5l14 14M19 5 5 19" ${st}/>`),
    upload: S(`<path d="M12 16V4M7 8.5 12 3.5l5 5" ${st}/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" ${st}/>`),
    download: S(`<path d="M12 4v12M7 11.5l5 5 5-5" ${st}/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" ${st}/>`),
    trash: S(`<path d="M4.5 6.5h15M9.5 3.5h5M6.5 6.5 7.5 20a1.8 1.8 0 0 0 1.8 1.5h5.4a1.8 1.8 0 0 0 1.8-1.5l1-13.5" ${st}/><path d="M10 10.5v7M14 10.5v7" ${st}/>`),
    rename: S(`<path d="M14.5 5.5 18.5 9.5 8.5 19.5l-4.8 1 1-4.8 9.8-10.2z" ${st}/><path d="M12.5 7.5l4 4" ${st}/>`),
    newFolder: S(`<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H4.5A1.5 1.5 0 0 1 3 18V6.5z" ${st}/><path d="M12 11v5M9.5 13.5h5" ${st}/>`),
    newFile: S(`<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h6L18 7.5V19.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5v-15z" ${st}/><path d="M12 10.5v6M9 13.5h6" ${st}/>`),
    save: S(`<path d="M5 4.5h11L19.5 8v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 6 4.5z" ${st}/><path d="M8 4.5V9h7V4.5M8 20v-6h8v6" ${st}/>`),
    openFile: S(`<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8.5" ${st}/><path d="M3.5 7v11A1.5 1.5 0 0 0 5 19.5h13a2 2 0 0 0 1.9-1.4L22 11.5H7.2a2 2 0 0 0-1.9 1.4L3.5 18" ${st}/>`),
    zoomIn: S(`<circle cx="10.5" cy="10.5" r="6.2" ${st}/><path d="M15.3 15.3 20 20M8 10.5h5M10.5 8v5" ${st}/>`),
    zoomOut: S(`<circle cx="10.5" cy="10.5" r="6.2" ${st}/><path d="M15.3 15.3 20 20M8 10.5h5" ${st}/>`),
    fit: S(`<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" ${st}/>`),
    sun: S(`<circle cx="12" cy="12" r="4.2" ${st}/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" ${st}/>`),
    moon: S(`<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" ${st}/>`),
    brightness: S(`<circle cx="12" cy="12" r="4.2" ${st}/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" ${st}/>`),
    cpu: S(`<rect x="6" y="6" width="12" height="12" rx="2" ${st}/><rect x="9.5" y="9.5" width="5" height="5" rx="1" ${st}/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" ${st}/>`),
    palette: S(`<path d="M12 3a9 9 0 0 0 0 18h1.8a2 2 0 0 0 1.5-3.3 2 2 0 0 1 1.5-3.3H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3z" ${st}/><circle cx="8" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="16" cy="10" r="1.3" fill="currentColor"/>`),
    network: S(`<rect x="9" y="3" width="6" height="5" rx="1" ${st}/><rect x="3" y="16" width="6" height="5" rx="1" ${st}/><rect x="15" y="16" width="6" height="5" rx="1" ${st}/><path d="M12 8v4M6 16v-2.5h12V16" ${st}/>`),
    storage: S(`<rect x="3.5" y="5" width="17" height="6" rx="1.5" ${st}/><rect x="3.5" y="13" width="17" height="6" rx="1.5" ${st}/><circle cx="7" cy="8" r="1" fill="currentColor"/><circle cx="7" cy="16" r="1" fill="currentColor"/>`),
    winMin: S(`<path d="M2 10.5h17" stroke="currentColor" stroke-width="1.4"/>`, '0 0 21 21'),
    winMax: S(`<rect x="3" y="3" width="15" height="15" rx="2.5" stroke="currentColor" stroke-width="1.4" fill="none"/>`, '0 0 21 21'),
    winRestore: S(`<rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M7 3.5h8A2.5 2.5 0 0 1 17.5 6v8" stroke="currentColor" stroke-width="1.4" fill="none"/>`, '0 0 21 21'),
    winClose: S(`<path d="M3.5 3.5l14 14M17.5 3.5l-14 14" stroke="currentColor" stroke-width="1.4"/>`, '0 0 21 21'),
    chevR: S(`<path d="m9 6 6 6-6 6" ${st}/>`),
    chevL: S(`<path d="m15 6-6 6 6 6" ${st}/>`),
    dot: S(`<circle cx="12" cy="12" r="4" fill="currentColor"/>`),
  };

  // file extension -> icon
  window.extIcon = function (name, isDir) {
    if (isDir) return I.folder;
    const e = (name.split('.').pop() || '').toLowerCase();
    if (['txt', 'md', 'log', 'csv', 'ini', 'conf'].includes(e)) return I.fileText;
    if (['js', 'c', 'h', 'cpp', 'py', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sh'].includes(e)) return I.fileCode;
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(e)) return I.fileImg;
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(e)) return I.fileAudio;
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(e)) return I.fileVideo;
    if (['zip', 'gz', 'tar', '7z', 'rar'].includes(e)) return I.fileZip;
    return I.file;
  };
})();
