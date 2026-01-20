<template>
  <div class="space-y-4">
    <div v-if="transcripts.length === 0" class="text-gray-500 text-center py-8">
      <p>No transcripts yet. Recording and transcription will appear here.</p>
    </div>

    <div
      v-for="(transcript, index) in transcripts"
      :key="index"
      class="border rounded-lg p-4 bg-gray-50"
    >
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-semibold text-gray-900">
          {{ transcript.participantName || `Participant ${index + 1}` }}
        </h3>
        <button
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          @click="copyTranscript(index)"
        >
          {{ copiedIndex === index ? '✓ Copied' : 'Copy' }}
        </button>
      </div>
      <p class="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
        {{ transcript.text }}
      </p>
      <p v-if="transcript.duration" class="text-xs text-gray-500 mt-2">
        Duration: {{ formatDuration(transcript.duration) }}
      </p>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="border rounded-lg p-4 bg-blue-50 flex items-center gap-2"
    >
      <div class="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
      <p class="text-blue-700 text-sm">Transcribing...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="border rounded-lg p-4 bg-red-50">
      <p class="text-red-800 text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Transcript {
  participantName?: string
  text: string
  duration?: number
}

interface Props {
  transcripts?: Transcript[]
  isLoading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  transcripts: () => [],
  isLoading: false,
  error: '',
})

const copiedIndex = ref<number | null>(null)

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

const copyTranscript = (index: number) => {
  const transcript = props.transcripts[index]
  navigator.clipboard.writeText(transcript.text)
  copiedIndex.value = index
  setTimeout(() => {
    copiedIndex.value = null
  }, 2000)
}
</script>
