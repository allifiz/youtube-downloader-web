<script setup>
import { ref } from 'vue'

const videoUrl = ref('')
const loading = ref(false)
const result = ref(null)

const handleSubmit = async () => {
  if (!videoUrl.value) return

  loading.value = true
  // Mocking the download logic as this is a static site
  // In a real scenario, you'd call an API here.
  setTimeout(() => {
    result.value = {
      title: "Sample Video Title",
      thumbnail: "https://via.placeholder.com/150",
      downloadUrl: "#"
    }
    loading.value = false
  }, 1500)
}
</script>

<template>
  <div class="downloader-container">
    <div class="input-group">
      <input
        v-model="videoUrl"
        type="text"
        placeholder="Paste YouTube link here..."
        class="url-input"
      />
      <button @click="handleSubmit" :disabled="loading" class="download-button">
        {{ loading ? 'Processing...' : 'Download' }}
      </button>
    </div>

    <div v-if="result" class="result-card">
      <img :src="result.thumbnail" alt="Thumbnail" class="thumbnail" />
      <div class="info">
        <h3>{{ result.title }}</h3>
        <p>Ready to download!</p>
        <a :href="result.downloadUrl" class="final-download">Download MP4</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.downloader-container {
  margin: 2rem 0;
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  text-align: center;
}

.input-group {
  display: flex;
  gap: 10px;
  max-width: 600px;
  margin: 0 auto;
}

.url-input {
  flex: 1;
  padding: 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.download-button {
  padding: 0.8rem 1.5rem;
  background-color: var(--vp-c-brand);
  color: white;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.download-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-card {
  margin-top: 2rem;
  display: flex;
  gap: 20px;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-align: left;
  align-items: center;
}

.thumbnail {
  width: 150px;
  border-radius: 4px;
}

.final-download {
  display: inline-block;
  margin-top: 10px;
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}
</style>
