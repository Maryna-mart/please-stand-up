<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div
          class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Standup Session</h1>
            <p class="text-gray-600 mt-1">Session ID: {{ sessionId }}</p>
          </div>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            @click="copySessionLink"
          >
            {{ linkCopied ? '✓ Copied' : 'Copy Link' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Timer & Audio Controls -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Timer Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Timer</h2>
          <Timer
            :duration="120"
            @timer-started="onTimerStarted"
            @timer-stopped="onTimerStopped"
            @timer-ended="onTimerEnded"
          />
        </div>

        <!-- Audio Recorder Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Your Audio</h2>
          <AudioRecorder @transcript-ready="onTranscriptReady" />
        </div>
      </div>

      <!-- Middle Column: Participants & Status -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-6 h-full">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Participants</h2>
          <ParticipantsList :participants="participants" />
        </div>
      </div>

      <!-- Right Column: Transcripts & Summary -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Transcripts Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Transcripts</h2>
          <TranscriptView :transcripts="transcripts" />
        </div>
      </div>
    </div>

    <!-- Full-Width Summary Section (shown when ready) -->
    <div v-if="showSummary" class="max-w-7xl mx-auto mt-6">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Standup Summary</h2>
        <SummaryView :summary="summary" :session-id="sessionId" />
      </div>
    </div>

    <!-- Session Controls -->
    <div class="max-w-7xl mx-auto mt-8 flex justify-end gap-4">
      <button
        v-if="isLeader"
        :disabled="!canGenerateSummary || isGeneratingSummary"
        class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition"
        @click="generateSummary"
      >
        {{ isGeneratingSummary ? 'Generating...' : 'Generate Summary' }}
      </button>
      <button
        class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        @click="leaveSession"
      >
        Leave Session
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSession } from '../composables/useSession'
import Timer from '../components/Timer.vue'
import AudioRecorder from '../components/AudioRecorder.vue'
import ParticipantsList from '../components/ParticipantsList.vue'
import TranscriptView from '../components/TranscriptView.vue'
import SummaryView from '../components/SummaryView.vue'

interface Participant {
  id: string
  name: string
  status: 'waiting' | 'recording' | 'done'
  transcriptReady?: boolean
}

interface Transcript {
  participantName?: string
  text: string
  duration?: number
}

const route = useRoute()
const router = useRouter()
const { leaveSession: performLeaveSession } = useSession()

const sessionId = computed(() => route.params.id as string)
const isLeader = ref(false)
const participants = ref<Participant[]>([])
const transcripts = ref<Transcript[]>([])
const summary = ref('')
const showSummary = ref(false)
const linkCopied = ref(false)
const isGeneratingSummary = ref(false)

const canGenerateSummary = computed(() => transcripts.value.length > 0)

const onTimerStarted = () => {
  // Timer started event handler
}

const onTimerStopped = () => {
  // Timer stopped event handler
}

const onTimerEnded = () => {
  // Timer ended event handler
}

const onTranscriptReady = (transcriptText: string) => {
  transcripts.value.push({
    text: transcriptText,
  })
}

const copySessionLink = () => {
  const link = `${window.location.origin}/session/${sessionId.value}`
  navigator.clipboard.writeText(link)
  linkCopied.value = true
  setTimeout(() => {
    linkCopied.value = false
  }, 2000)
}

const generateSummary = async () => {
  try {
    isGeneratingSummary.value = true
    // TODO: Call API to generate summary
    summary.value = 'Summary generation not yet implemented'
    showSummary.value = true
  } finally {
    isGeneratingSummary.value = false
  }
}

const leaveSession = async () => {
  await performLeaveSession()
  await router.push('/')
}

onBeforeUnmount(() => {
  performLeaveSession()
})
</script>
