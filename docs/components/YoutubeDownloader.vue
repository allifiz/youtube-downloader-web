<script setup>
import { ref, computed } from 'vue'

const videoUrl = ref('')
const loading = ref(false)
const error = ref(null)
const videoData = ref(null)

const PIPED_API_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.drgns.space',
  'https://pipedapi.reallyaweso.me'
]

const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regex)
  return match ? match[1] : null
}

const fetchWithFallback = async (videoId) => {
  for (const instance of PIPED_API_INSTANCES) {
    try {
      const response = await fetch(`${instance}/streams/${videoId}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (e) {
      console.warn(`Failed to fetch from ${instance}:`, e)
    }
  }
  throw new Error('All API instances failed. Please try again later.')
}

const handleSubmit = async () => {
  error.value = null
  videoData.value = null
  const videoId = extractVideoId(videoUrl.value)

  if (!videoId) {
    error.value = 'Invalid YouTube URL'
    return
  }

  loading.value = true
  try {
    videoData.value = await fetchWithFallback(videoId)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const videoStreams = computed(() => {
  if (!videoData.value) return []
  // Filter for video+audio streams, usually they have a 'url' and 'quality'
  return videoData.value.videoStreams
    .filter(s => s.videoOnly === false)
    .sort((a, b) => {
      const qA = parseInt(a.quality) || 0
      const qB = parseInt(b.quality) || 0
      return qB - qA
    })
})

const audioStreams = computed(() => {
  if (!videoData.value) return []
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
        <img :src="videoData.thumbnailUrl" alt="Thumbnail" class="thumbnail" />
        <div class="details">
          <h3>{{ videoData.title }}</h3>
          <p>By {{ videoData.uploader }}</p>
        </div>
      </div>

      <div class="download-options">
        <div class="option-section">
          <h4>Video</h4>
          <div class="links-grid">
            <a v-for="stream in videoStreams"
               :key="stream.url"
               :href="stream.url"
               target="_blank"
               download
               class="dl-link video">
              {{ stream.quality }} ({{ stream.format }})
            </a>
          </div>
        </div>

        <div class="option-section" v-if="audioStreams.length > 0">
          <h4>Audio</h4>
          <div class="links-grid">
            <a v-for="stream in audioStreams"
               :key="stream.url"
               :href="stream.url"
               target="_blank"
               download
               class="dl-link audio">
              {{ Math.round(stream.bitrate / 1000) }}kbps ({{ stream.format }})
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

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.dl-link {
  display: block;
  padding: 0.6rem;
  text-align: center;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color 0.2s;
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
  .video-info {
    flex-direction: column;
  }
  .thumbnail {
    width: 100%;
  }
}
</style>
