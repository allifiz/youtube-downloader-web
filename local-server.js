import http from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDownloadTarget, getVideoInfo } from './lib/youtube.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'docs', '.vitepress', 'dist')
const PORT = Number(process.env.PORT || 3000)

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
      const data = await getVideoInfo(requestUrl.searchParams.get('url'))
      sendJson(res, 200, data)
      return
    }

    if (requestUrl.pathname === '/api/download') {
      const target = await getDownloadTarget(
        requestUrl.searchParams.get('url'),
        requestUrl.searchParams.get('itag')
      )

      res.writeHead(302, {
        Location: target.url,
        'Content-Type': target.contentType,
        'Content-Disposition': `attachment; filename="${target.filename}.${target.extension}"`,
        'Cache-Control': 'no-store'
      })
      res.end()
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
