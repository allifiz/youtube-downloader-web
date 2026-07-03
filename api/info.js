import { getVideoInfo } from '../lib/youtube.js'

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_MINUTE || 30)
const rateBuckets = new Map()

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
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

export const config = {
  maxDuration: 30
}

export default async function handler(req, res) {
  setCors(res)
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method tidak didukung.' })
    return
  }

  if (isRateLimited(req)) {
    res.status(429).json({ error: 'Terlalu banyak request. Coba lagi sebentar.' })
    return
  }

  try {
    const data = await getVideoInfo(req.query.url)
    res.status(200).json(data)
  } catch (error) {
    res.status(400).json({ error: error.message || 'Gagal mengambil data video.' })
  }
}
