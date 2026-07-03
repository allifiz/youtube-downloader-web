# YouTube Downloader Web

Web downloader sederhana berbasis VitePress + Node API.

> Gunakan hanya untuk video milik sendiri, public domain, Creative Commons, atau konten yang memang kamu punya izin untuk simpan. Jangan gunakan untuk melanggar hak cipta atau aturan layanan platform.

## Kenapa perlu Node API?

Frontend statis saja tidak cukup stabil untuk mengambil stream YouTube karena request dari browser sering terkena CORS, signature berubah, dan link stream cepat kedaluwarsa. Project ini sekarang memakai API backend kecil di `server.js`, lalu frontend memanggil endpoint `/api/info` dan `/api/download`.

## Jalankan lokal

```bash
npm install
npm run build
npm start
```

Buka:

```txt
http://localhost:3000
```

Health check API:

```txt
http://localhost:3000/api/health
```

## Development frontend

```bash
npm run dev
```

Mode ini hanya menjalankan VitePress. Fitur download butuh backend Node. Untuk test fitur download penuh, gunakan `npm run build` lalu `npm start`.

## Deploy

Deploy ke hosting yang bisa menjalankan Node.js, misalnya VPS, Render, Railway, atau layanan sejenis.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Environment opsional:

```txt
PORT=3000
RATE_LIMIT_PER_MINUTE=30
CORS_ORIGIN=https://domain-kamu.com
```

Catatan: GitHub Pages hanya hosting statis, jadi tidak bisa menjalankan `/api/info` dan `/api/download`. Kalau tetap memakai GitHub Pages, frontend bisa tampil, tapi fitur download tidak akan aktif tanpa backend terpisah.
