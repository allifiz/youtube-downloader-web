<script setup>
import { ref, computed } from 'vue'

const videoUrl = ref('')
const loading = ref(false)
const error = ref(null)
const videoData = ref(null)

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?/\s]{11})/i
  const match = url.match(regex)
  return match ? match[1] : null
}

const buildApiUrl = (path, params = {}) => {
  const query = new URLSearchParams(params).toString()
  return `${API_BASE_URL}${path}${query ? `?${query}` : ''}`
}

const getErrorMessage = async (response) => {
  const payload = await response.json().catch(() => null)
  return payload?.error || `Request gagal dengan status ${response.status}`
}

const fetchVideoInfo = async (url) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(buildApiUrl('/api/info', { url }), {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(await getErrorMessage(response))
    }

    return await response.json()
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Request timeout. Coba lagi beberapa saat lagi.')
    }

    if (e instanceof TypeError) {
      throw new Error('Backend API belum aktif. Pastikan project dideploy ke hosting Node seperti Vercel, bukan static-only hosting.')
    }

    throw e
  } finally {
    window.clearTimeout(timeout)
  }
}

const handleSubmit = async () => {
  error.value = null
  videoData.value = null

  const trimmedUrl = videoUrl.value.trim()
  const videoId = extractVideoId(trimmedUrl)

  if (!videoId) {
    error.value = 'Link YouTube tidak valid.'
    return
  }

  loading.value = true
  try {
    videoData.value = await fetchVideoInfo(trimmedUrl)
  } catch (e) {
    error.value = e.message || 'Gagal mengambil data video.'
  } finally {
    loading.value = false
  }
}

const videoStreams = computed(() => videoData.value?.formats?.video || [])
const audioStreams = computed(() => videoData.value?.formats?.audio || [])

const buildDownloadUrl = (itag) => buildApiUrl('/api/download', {
  url: videoUrl.value.trim(),
  itag
})

const formatMeta = (stream) => [
  stream.container?.toUpperCase(),
  stream.size
].filter(Boolean).join(' · ')
</script>

<template>
  <div class="downloader-container">
    <p class="usage-note">
      Gunakan hanya untuk video milik sendiri, public domain, Creative Commons, atau konten yang kamu punya izin untuk simpan.
    </p>

    <div class="input-group">
      <input
        v-model="videoUrl"
        type="text"
        placeholder="Paste YouTube link here..."
        class="url-input"
        @keyup.enter="handleSubmit"
      />
      <button @click="handleSubmit" :disabled="loading" class="download-button">
        {{ loading ? 'Searching...' : 'Go' }}
      </button>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div v-if="videoData" class="result-container">
      <div class="video-info">
        <img v-if="videoData.thumbnail" :src="videoData.thumbnail" alt="Thumbnail" class="thumbnail" />
        <div class="details">
          <h3>{{ videoData.title }}</h3>
          <p>By {{ videoData.author }}</p>
        </div>
      </div>

      <div class="download-options">
        <div class="option-section">
          <h4>Video + Audio</h4>
          <p v-if="videoStreams.length === 0" class="empty-state">
            Tidak ada format video dengan audio yang tersedia.
          </p>
          <div v-else class="links-grid">
            <a v-for="stream in videoStreams"
               :key="stream.itag"
               :href="buildDownloadUrl(stream.itag)"
               class="dl-link video">
              <span>{{ stream.label }}</span>
              <small v-if="formatMeta(stream)" class="format-meta">{{ formatMeta(stream) }}</small>
            </a>
          </div>
        </div>

        <div class="option-section" v-if="audioStreams.length > 0">
          <h4>Audio Only</h4>
          <div class="links-grid">
            <a v-for="stream in audioStreams"
               :key="stream.itag"
               :href="buildDownloadUrl(stream.itag)"
               class="dl-link audio">
              <span>{{ stream.label }}</span>
              <small v-if="formatMeta(stream)" class="format-meta">{{ formatMeta(stream) }}</small>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.downloader-container {
  margin: 2rem 0;
  padding: 2rem;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.usage-note {
  max-width: 700px;
  margin: 0 auto 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.input-group {
  display: flex;
  gap: 12px;
  max-width: 700px;
  margin: 0 auto;
}

.url-input {
  flex: 1;
  padding: 0.8rem 1.2rem;
  border: 2px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.url-input:focus {
  border-color: var(--vp-c-brand);
  outline: none;
}

.download-button {
  padding: 0.8rem 2rem;
  background-color: var(--vp-c-brand);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.download-button:active {
  transform: scale(0.98);
}

.download-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-msg {
  color: #ef4444;
  margin-top: 1rem;
  font-weight: 500;
}

.result-container {
  margin-top: 2.5rem;
  text-align: left;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.video-info {
  display: flex;
  gap: 20px;
  margin-bottom: 2rem;
}

.thumbnail {
  width: 240px;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.details h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  line-height: 1.4;
}

.details p {
  color: var(--vp-c-text-2);
  margin: 0;
}

.option-section {
  margin-bottom: 1.5rem;
}

.option-section h4 {
  margin-bottom: 0.8rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.3rem;
}

.empty-state {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.dl-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0.6rem;
  text-align: center;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.format-meta {
  color: var(--vp-c-text-2);
  font-weight: 400;
  font-size: 0.75rem;
}

.dl-link.video {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.dl-link.video:hover {
  background-color: var(--vp-c-brand-lighter);
}

.dl-link.audio {
  background-color: #10b98120;
  color: #059669;
}

.dl-link.audio:hover {
  background-color: #10b98140;
}

@media (max-width: 640px) {
  .input-group {
    flex-direction: column;
  }

  .video-info {
    flex-direction: column;
  }

  .thumbnail {
    width: 100%;
  }
}
</style>
