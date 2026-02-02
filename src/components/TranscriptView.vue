<template>
  <div class="space-y-4">
    <div v-if="transcripts.length === 0" class="text-gray-500 text-center py-8">
      <p>No transcripts yet. Recording and transcription will appear here.</p>
    </div>

    <div
      v-for="(transcript, index) in transcripts"
      :key="index"
      class="border rounded-lg p-4 bg-white shadow-sm"
    >
      <!-- Participant Header -->
      <div class="flex items-start justify-between mb-4 border-b pb-3">
        <h3 class="font-bold text-lg text-gray-900">
          {{ transcript.participantName || `Participant ${index + 1}` }}
        </h3>
        <button
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          @click="copyTranscript(index)"
        >
          {{ copiedIndex === index ? '✓ Copied' : 'Copy' }}
        </button>
      </div>

      <!-- Structured Sections -->
      <div class="space-y-4">
        <!-- Yesterday Section -->
        <div
          v-if="parsedTranscripts[index]?.sections.yesterday"
          class="space-y-1"
        >
          <h4 class="font-semibold text-gray-900 flex items-center gap-2">
            <span>✅ Yesterday</span>
          </h4>
          <p class="text-gray-700 text-sm leading-relaxed pl-6">
            {{ parsedTranscripts[index]?.sections.yesterday }}
          </p>
        </div>

        <!-- Today Section -->
        <div v-if="parsedTranscripts[index]?.sections.today" class="space-y-1">
          <h4 class="font-semibold text-gray-900 flex items-center gap-2">
            <span>🎯 Today</span>
          </h4>
          <p class="text-gray-700 text-sm leading-relaxed pl-6">
            {{ parsedTranscripts[index]?.sections.today }}
          </p>
        </div>

        <!-- Blockers Section -->
        <div
          v-if="parsedTranscripts[index]?.sections.blockers"
          class="space-y-1"
        >
          <h4 class="font-semibold text-gray-900 flex items-center gap-2">
            <span>🚫 Blockers</span>
          </h4>
          <p class="text-gray-700 text-sm leading-relaxed pl-6">
            {{ parsedTranscripts[index]?.sections.blockers }}
          </p>
        </div>

        <!-- Team Action Items Section -->
        <div
          v-if="parsedTranscripts[index]?.sections.actionItems"
          class="space-y-1"
        >
          <h4 class="font-semibold text-gray-900 flex items-center gap-2">
            <span>📌 Team Action Items</span>
          </h4>
          <p class="text-gray-700 text-sm leading-relaxed pl-6">
            {{ parsedTranscripts[index]?.sections.actionItems }}
          </p>
        </div>

        <!-- Other Section -->
        <div v-if="parsedTranscripts[index]?.sections.other" class="space-y-1">
          <h4 class="font-semibold text-gray-900 flex items-center gap-2">
            <span>📝 Other</span>
          </h4>
          <p class="text-gray-700 text-sm leading-relaxed pl-6">
            {{ parsedTranscripts[index]?.sections.other }}
          </p>
        </div>

        <!-- Fallback to raw text if no sections parsed -->
        <div
          v-if="
            !parsedTranscripts[index] ||
            (!parsedTranscripts[index]?.sections.yesterday &&
              !parsedTranscripts[index]?.sections.today &&
              !parsedTranscripts[index]?.sections.blockers &&
              !parsedTranscripts[index]?.sections.actionItems &&
              !parsedTranscripts[index]?.sections.other)
          "
          class="space-y-1"
        >
          <p class="text-gray-700 text-sm leading-relaxed">
            {{ transcript.text }}
          </p>
        </div>
      </div>

      <!-- Duration -->
      <p
        v-if="transcript.duration"
        class="text-xs text-gray-500 mt-4 pt-3 border-t"
      >
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
import { ref, computed } from 'vue'
import { parseSummary, type SummarySection } from '../lib/summary-parser'

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

const parsedTranscripts = computed(() => {
  return props.transcripts.map(transcript => {
    const parsed = parseSummary(transcript.text)
    // Return the first participant's sections if available
    return (
      parsed.participants[0] || { name: '', sections: {} as SummarySection }
    )
  })
})

const copyTranscript = (index: number) => {
  const transcript = props.transcripts[index]
  navigator.clipboard.writeText(transcript.text)
  copiedIndex.value = index
  setTimeout(() => {
    copiedIndex.value = null
  }, 2000)
}
</script>
