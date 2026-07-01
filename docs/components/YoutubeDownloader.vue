<script setup>
import { ref, computed } from 'vue'

const videoUrl = ref('')
const loading = ref(false)
const error = ref(null)
const videoData = ref(null)
const currentStep = ref('')

const customInstance = ref('')
const showAdvanced = ref(false)

// Ordered by recent observed health
const PIPED_API_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.orangenet.cc',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://piped-api.privacy.com.de',
  'https://api.piped.yt',
  'https://pipedapi.drgns.space',
  'https://pipedapi.owo.si',
  'https://pipedapi.ducks.party',
  'https://piped-api.codespace.cz',
  'https://pipedapi.darkness.services',
  'https://pipedapi.astast.xyz',
  'https://pipedapi.fedi.lat',
  'https://pipedapi.mha.fi',
  'https://pipedapi.sync.nexus',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.privacydev.net'
]

const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regex)
  return match ? match[1] : null
}

const fetchWithFallback = async (videoId) => {
  const instances = customInstance.value
    ? [customInstance.value.replace(/\/$/, ''), ...PIPED_API_INSTANCES]
    : PIPED_API_INSTANCES

  let lastError = ''
  let attempt = 0

  for (const instance of instances) {
    attempt++
    currentStep.value = `Trying instance ${attempt}/${instances.length}...`
    try {
      const response = await fetch(`${instance}/streams/${videoId}`)

      if (response.status === 403 || response.status === 429) {
          console.warn(`${instance} is rate limited or blocked.`)
          continue
      }

      const data = await response.json()

      if (response.ok && data.title && (data.videoStreams?.length || data.audioStreams?.length)) {
          return data
      }

      if (data.error || data.message) {
        lastError = data.message || data.error
      }
    } catch (e) {
      console.warn(`Failed to fetch from ${instance}:`, e)
      lastError = "Network error or instance is down."
    }
  }
  throw new Error('All public instances failed to fetch this video. YouTube is likely blocking these servers right now. Please try a different video or try again later.')
}

const handleSubmit = async () => {
  if (!videoUrl.value.trim()) return

  error.value = null
  videoData.value = null
  const videoId = extractVideoId(videoUrl.value)

  if (!videoId) {
    error.value = 'Invalid YouTube URL. Please paste a valid link.'
    return
  }

  loading.value = true
  try {
    videoData.value = await fetchWithFallback(videoId)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
    currentStep.value = ''
  }
}

const videoStreams = computed(() => {
  if (!videoData.value?.videoStreams) return []
  return videoData.value.videoStreams
    .filter(s => s.videoOnly === false)
    .sort((a, b) => {
      const qA = parseInt(a.quality) || 0
      const qB = parseInt(b.quality) || 0
      return qB - qA
    })
})

const audioStreams = computed(() => {
  if (!videoData.value?.audioStreams) return []
  return videoData.value.audioStreams
    .sort((a, b) => b.bitrate - a.bitrate)
})
</script>

<template>
  <div class="downloader-container">
    <div class="input-group">
      <input
        v-model="videoUrl"
        type="text"
        placeholder="Paste YouTube link here (e.g., https://www.youtube.com/watch?v=...)"
        class="url-input"
        @keyup.enter="handleSubmit"
        :disabled="loading"
      />
      <button @click="handleSubmit" :disabled="loading" class="download-button">
        <span v-if="loading">Processing...</span>
        <span v-else>Download</span>
      </button>
    </div>

    <div v-if="loading" class="status-indicator">
      <div class="spinner"></div>
      <p>{{ currentStep }}</p>
    </div>

    <p v-if="error" class="error-msg">
      <strong>Oops!</strong> {{ error }}
      <br />
      <span class="error-hint">
        Tip: YouTube frequently blocks public downloaders. You can try searching for a "Piped Instance" on Google and pasting its API URL in Advanced Settings.
      </span>
    </p>

    <div class="advanced-toggle">
      <button @click="showAdvanced = !showAdvanced" class="text-button">
        {{ showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings (Custom API)' }}
      </button>
    </div>

    <div v-if="showAdvanced" class="advanced-panel">
      <label>Custom Piped API Instance:</label>
      <input
        v-model="customInstance"
        type="text"
        placeholder="https://api.piped.private.coffee"
        class="url-input small"
      />
      <p class="hint">Check <a href="https://github.com/TeamPiped/Piped/wiki/Instances" target="_blank">Instance List</a> for working ones.</p>
    </div>

    <div v-if="videoData" class="result-container">
      <div class="video-info">
        <div class="thumbnail-wrapper">
           <img :src="videoData.thumbnailUrl" alt="Thumbnail" class="thumbnail" />
           <span class="duration">{{ videoData.duration ? Math.floor(videoData.duration / 60) + ':' + (videoData.duration % 60).toString().padStart(2, '0') : '' }}</span>
        </div>
        <div class="details">
          <h3>{{ videoData.title }}</h3>
          <p class="uploader">Channel: <strong>{{ videoData.uploader }}</strong></p>
          <p class="views">{{ videoData.views?.toLocaleString() }} views</p>
        </div>
      </div>

      <div class="download-options">
        <div class="option-section" v-if="videoStreams.length > 0">
          <h4><span class="icon">🎥</span> Video + Audio</h4>
          <div class="links-grid">
            <a v-for="stream in videoStreams"
               :key="stream.url"
               :href="stream.url"
               target="_blank"
               rel="noopener noreferrer"
               class="dl-link video">
              <span class="q-label">{{ stream.quality }}</span>
              <span class="f-label">{{ stream.format }}</span>
            </a>
          </div>
        </div>

        <div class="option-section" v-if="audioStreams.length > 0">
          <h4><span class="icon">🎵</span> Audio Only</h4>
          <div class="links-grid">
            <a v-for="stream in audioStreams"
               :key="stream.url"
               :href="stream.url"
               target="_blank"
               rel="noopener noreferrer"
               class="dl-link audio">
              <span class="q-label">{{ Math.round(stream.bitrate / 1000) }}kbps</span>
              <span class="f-label">{{ stream.format }}</span>
            </a>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        * Right-click and "Save link as..." if the download doesn't start automatically.
      </div>
    </div>
  </div>
</template>

<style scoped>
.downloader-container {
  margin: 2rem 0;
  padding: 2.5rem;
  border-radius: 16px;
  background-color: var(--vp-c-bg-soft);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--vp-c-divider);
}

.input-group {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

.url-input {
  flex: 1;
  padding: 1rem 1.5rem;
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.url-input:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 4px var(--vp-c-brand-soft);
  outline: none;
}

.download-button {
  padding: 0 2.5rem;
  background-color: var(--vp-c-brand);
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.download-button:hover:not(:disabled) {
  background-color: var(--vp-c-brand-dark);
  transform: translateY(-1px);
}

.download-button:active:not(:disabled) {
  transform: translateY(1px);
}

.download-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.status-indicator {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--vp-c-brand-soft);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-msg {
  color: #e11d48;
  margin-top: 2rem;
  font-weight: 500;
  line-height: 1.6;
  padding: 1.2rem;
  background-color: #fff1f2;
  border-radius: 12px;
  border: 1px solid #fda4af;
  text-align: left;
}

.error-hint {
  display: block;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

.advanced-toggle {
  margin-top: 1.5rem;
}

.text-button {
  background: none;
  border: none;
  color: var(--vp-c-brand);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.text-button:hover {
  opacity: 1;
  text-decoration: underline;
}

.advanced-panel {
  margin-top: 1rem;
  padding: 1.5rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  text-align: left;
  background-color: var(--vp-c-bg);
}

.advanced-panel label {
  display: block;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.url-input.small {
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  width: 100%;
}

.hint {
  font-size: 0.85rem;
  margin-top: 0.8rem;
  color: var(--vp-c-text-2);
}

.result-container {
  margin-top: 3rem;
  text-align: left;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.video-info {
  display: flex;
  gap: 24px;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.thumbnail-wrapper {
  position: relative;
  flex-shrink: 0;
}

.thumbnail {
  width: 280px;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.details h3 {
  margin: 0 0 0.8rem 0;
  font-size: 1.4rem;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.uploader {
  color: var(--vp-c-text-2);
  margin-bottom: 0.4rem;
}

.views {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
}

.option-section {
  margin-bottom: 2rem;
}

.option-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1.2rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.icon { font-size: 1.2rem; }

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.dl-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.8rem;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.q-label {
  font-weight: 700;
  font-size: 1rem;
}

.f-label {
  font-size: 0.8rem;
  opacity: 0.8;
  text-transform: uppercase;
}

.dl-link.video {
  background-color: var(--vp-c-brand);
  color: white;
}

.dl-link.video:hover {
  background-color: var(--vp-c-brand-dark);
  transform: scale(1.03);
}

.dl-link.audio {
  background-color: #10b981;
  color: white;
}

.dl-link.audio:hover {
  background-color: #059669;
  transform: scale(1.03);
}

.disclaimer {
  margin-top: 2rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  text-align: center;
}

@media (max-width: 768px) {
  .video-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .thumbnail {
    width: 100%;
    max-width: 400px;
  }
  .input-group {
    flex-direction: column;
  }
  .download-button {
    padding: 1rem;
  }
}
</style>
