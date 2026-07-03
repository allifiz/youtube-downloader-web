import http from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ytdl from '@distube/ytdl-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'docs', '.vitepress', 'dist')
const PORT = Number(process.env.PORT || 3000)
const MAX_URL_LENGTH = 2048
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_MINUTE || 30)

const rateBuckets = new Map()

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
  })
  res.end(JSON.stringify(payload))
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

function isRateLimited(req) {
  const key = getClientIp(req)
  const now = Date.now()
  const current = rateBuckets.get(key)

  if (!current || now - current.startedAt > WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 })
    return false
  }

  current.count += 1
  return current.count > MAX_REQUESTS_PER_WINDOW
}

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now - bucket.startedAt > WINDOW_MS) rateBuckets.delete(key)
  }
}, WINDOW_MS).unref()

function normalizeYoutubeUrl(rawUrl) {
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    throw new Error('URL YouTube tidak valid.')
  }

  const parsed = new URL(rawUrl)
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const allowedHosts = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

  if (!allowedHosts.has(hostname)) {
    throw new Error('Hanya link YouTube yang didukung.')
  }

  parsed.hash = ''

  if (!ytdl.validateURL(parsed.toString())) {
    throw new Error('URL YouTube tidak valid atau tidak didukung.')
  }

  return parsed.toString()
}

function sanitizeFilename(name) {
  return String(name || 'youtube-download')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'youtube-download'
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return null

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function toFormatDto(format) {
  const isAudioOnly = format.hasAudio && !format.hasVideo
  const label = isAudioOnly
    ? `${format.audioBitrate || 'Audio'} kbps`
    : format.qualityLabel || format.quality || `${format.height || ''}p`.trim()

  return {
    itag: String(format.itag),
    label,
    container: format.container || format.mimeType?.split('/')[1]?.split(';')[0] || null,
    mimeType: format.mimeType || null,
    size: formatBytes(format.contentLength),
    audioBitrate: format.audioBitrate || null,
    qualityLabel: format.qualityLabel || null
  }
}

function sortVideoFormats(a, b) {
  const aq = Number.parseInt(a.qualityLabel, 10) || 0
  const bq = Number.parseInt(b.qualityLabel, 10) || 0
  return bq - aq
}

function sortAudioFormats(a, b) {
  return (b.audioBitrate || 0) - (a.audioBitrate || 0)
}

async function handleInfo(req, res, requestUrl) {
  if (isRateLimited(req)) {
    sendJson(res, 429, { error: 'Terlalu banyak request. Coba lagi sebentar.' })
    return
  }

  const url = normalizeYoutubeUrl(requestUrl.searchParams.get('url'))
  const info = await ytdl.getInfo(url)
  const details = info.videoDetails

  const videoFormats = info.formats
    .filter((format) => format.hasVideo && format.hasAudio && format.url)
    .sort(sortVideoFormats)
    .map(toFormatDto)

  const audioFormats = info.formats
    .filter((format) => format.hasAudio && !format.hasVideo && format.url)
    .sort(sortAudioFormats)
    .map(toFormatDto)

  if (videoFormats.length === 0 && audioFormats.length === 0) {
    throw new Error('Format download tidak tersedia untuk video ini.')
  }

  sendJson(res, 200, {
    title: details.title,
    author: details.author?.name || details.ownerChannelName || 'Unknown',
    thumbnail: details.thumbnails?.at(-1)?.url || null,
    durationSeconds: Number(details.lengthSeconds || 0),
    formats: {
      video: videoFormats,
      audio: audioFormats
    }
  })
}

async function handleDownload(req, res, requestUrl) {
  if (isRateLimited(req)) {
    sendJson(res, 429, { error: 'Terlalu banyak request. Coba lagi sebentar.' })
    return
  }

  const url = normalizeYoutubeUrl(requestUrl.searchParams.get('url'))
  const itag = requestUrl.searchParams.get('itag')

  if (!/^\d+$/.test(String(itag || ''))) {
    throw new Error('Format download tidak valid.')
  }

  const info = await ytdl.getInfo(url)
  const selectedFormat = info.formats.find((format) => String(format.itag) === String(itag))

  if (!selectedFormat || !selectedFormat.hasAudio) {
    throw new Error('Format tidak tersedia atau tidak didukung.')
  }

  const title = sanitizeFilename(info.videoDetails.title)
  const extension = selectedFormat.container || (selectedFormat.hasVideo ? 'mp4' : 'm4a')
  const contentType = selectedFormat.mimeType?.split(';')[0] || 'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${title}.${extension}"`,
    'Cache-Control': 'no-store'
  })

  const stream = ytdl.downloadFromInfo(info, {
    quality: Number(itag),
    highWaterMark: 1 << 25
  })

  stream.on('error', (error) => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: error.message || 'Gagal download video.' })
    } else {
      res.destroy(error)
    }
  })

  stream.pipe(res)
}

async function serveStatic(res, requestPathname) {
  if (!existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Frontend belum dibuild. Jalankan: npm run build')
    return
  }

  const safePath = path.normalize(decodeURIComponent(requestPathname)).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST_DIR, safePath)

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html')
  } catch {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  try {
    const ext = path.extname(filePath)
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    })
    createReadStream(filePath).pipe(res)
  } catch {
    const fallback = await readFile(path.join(DIST_DIR, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(fallback)
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
      res.end()
      return
    }

    if (requestUrl.pathname === '/api/health') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (requestUrl.pathname === '/api/info') {
      await handleInfo(req, res, requestUrl)
      return
    }

    if (requestUrl.pathname === '/api/download') {
      await handleDownload(req, res, requestUrl)
      return
    }

    await serveStatic(res, requestUrl.pathname)
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Request gagal.' })
  }
})

server.listen(PORT, () => {
  console.log(`YT Downloader running on http://localhost:${PORT}`)
})
