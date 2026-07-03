import ytdl from '@distube/ytdl-core'

const MAX_URL_LENGTH = 2048
const allowedHosts = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

export function normalizeYoutubeUrl(rawUrl) {
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    throw new Error('URL YouTube tidak valid.')
  }

  const parsed = new URL(rawUrl)
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  if (!allowedHosts.has(hostname)) {
    throw new Error('Hanya link YouTube yang didukung.')
  }

  parsed.hash = ''

  if (!ytdl.validateURL(parsed.toString())) {
    throw new Error('URL YouTube tidak valid atau tidak didukung.')
  }

  return parsed.toString()
}

export function sanitizeFilename(name) {
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

export async function getVideoInfo(rawUrl) {
  const url = normalizeYoutubeUrl(rawUrl)
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

  return {
    title: details.title,
    author: details.author?.name || details.ownerChannelName || 'Unknown',
    thumbnail: details.thumbnails?.at(-1)?.url || null,
    durationSeconds: Number(details.lengthSeconds || 0),
    formats: {
      video: videoFormats,
      audio: audioFormats
    }
  }
}

export async function getDownloadTarget(rawUrl, itag) {
  const url = normalizeYoutubeUrl(rawUrl)

  if (!/^\d+$/.test(String(itag || ''))) {
    throw new Error('Format download tidak valid.')
  }

  const info = await ytdl.getInfo(url)
  const selectedFormat = info.formats.find((format) => String(format.itag) === String(itag))

  if (!selectedFormat || !selectedFormat.url || !selectedFormat.hasAudio) {
    throw new Error('Format tidak tersedia atau tidak didukung.')
  }

  return {
    url: selectedFormat.url,
    filename: sanitizeFilename(info.videoDetails.title),
    extension: selectedFormat.container || (selectedFormat.hasVideo ? 'mp4' : 'm4a'),
    contentType: selectedFormat.mimeType?.split(';')[0] || 'application/octet-stream'
  }
}
