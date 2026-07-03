# YouTube Downloader Web

Web downloader sederhana berbasis VitePress + Node API route yang kompatibel dengan Vercel.

> Gunakan hanya untuk video milik sendiri, public domain, Creative Commons, atau konten yang memang kamu punya izin untuk simpan. Jangan gunakan untuk melanggar hak cipta atau aturan layanan platform.

## Kenapa perlu Node API?

Frontend statis saja tidak cukup stabil untuk mengambil stream YouTube karena request dari browser sering terkena CORS, signature berubah, dan link stream cepat kedaluwarsa. Project ini memakai API backend kecil, lalu frontend memanggil endpoint `/api/info` dan `/api/download`.

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

## Deploy ke Vercel

Project ini sudah punya `vercel.json`, jadi Vercel akan:

- menjalankan build command `npm run docs:build`
- memakai output static dari `docs/.vitepress/dist`
- menjalankan endpoint Node di folder `/api`

Langkah dashboard Vercel:

1. Buka Vercel Dashboard.
2. Klik **Add New Project**.
3. Import repo `allifiz/youtube-downloader-web`.
4. Framework preset boleh pilih **Other** atau biarkan auto-detect.
5. Pastikan Build Command: `npm run docs:build`.
6. Pastikan Output Directory: `docs/.vitepress/dist`.
7. Klik **Deploy**.

Environment variable opsional:

```txt
RATE_LIMIT_PER_MINUTE=30
CORS_ORIGIN=https://domain-kamu.com
```

Untuk Vercel, endpoint `/api/download` memakai redirect ke URL stream yang sudah valid. Ini lebih cocok untuk serverless daripada mem-proxy file video besar melalui Vercel Function.

## Deploy selain Vercel

Deploy ke hosting yang bisa menjalankan Node.js, misalnya VPS, Render, Railway, atau layanan sejenis.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Catatan: GitHub Pages hanya hosting statis, jadi tidak bisa menjalankan `/api/info` dan `/api/download`. Kalau tetap memakai GitHub Pages, frontend bisa tampil, tapi fitur download tidak akan aktif tanpa backend terpisah.
