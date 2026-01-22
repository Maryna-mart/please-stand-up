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
      <!-- Left Column: Talk Session -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Your Turn</h2>
          <TalkSession
            :duration="120"
            @talk-started="onTalkStarted"
            @talk-stopped="onTalkStopped"
            @talk-ended="onTalkEnded"
            @transcript-ready="onTranscriptReady"
          />
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
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSession } from '../composables/useSession'
import { usePusher } from '../composables/usePusher'
import TalkSession from '../components/TalkSession.vue'
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
const { subscribeToSession, unsubscribeFromSession } = usePusher()

const sessionId = computed(() => route.params.id as string)
const isLeader = ref(false)
const participants = ref<Participant[]>([])
const transcripts = ref<Transcript[]>([])
const summary = ref('')
const showSummary = ref(false)
const linkCopied = ref(false)
const isGeneratingSummary = ref(false)

const canGenerateSummary = computed(() => transcripts.value.length > 0)

// Pusher event handlers
const handleUserJoined = (data: Record<string, unknown>) => {
  const newParticipant: Participant = {
    id: data.userId as string,
    name: data.userName as string,
    status: 'waiting',
  }
  // Add if not already present
  if (!participants.value.find(p => p.id === data.userId)) {
    participants.value.push(newParticipant)
  }
}

const handleUserLeft = (data: Record<string, unknown>) => {
  participants.value = participants.value.filter(p => p.id !== data.userId)
}

const handleTimerStarted = (data: Record<string, unknown>) => {
  void data
  // Update all participants to 'recording' status
  participants.value.forEach(p => {
    if (p.status === 'waiting') {
      p.status = 'recording'
    }
  })
}

const handleTimerStopped = (data: Record<string, unknown>) => {
  void data
  // Timer stopped - participants can now finish recording
}

const handleStatusChanged = (data: Record<string, unknown>) => {
  const participant = participants.value.find(p => p.id === data.userId)
  if (participant) {
    participant.status = data.status as Participant['status']
    if (data.status === 'done') {
      participant.transcriptReady = true
    }
  }
}

const onTalkStarted = () => {
  // Broadcast timer started event
}

const onTalkStopped = () => {
  // Broadcast timer stopped event
}

const onTalkEnded = () => {
  // Talk ended event handler
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
  unsubscribeFromSession()
  await performLeaveSession()
  await router.push('/')
}

// Subscribe to Pusher channel on mount
onMounted(() => {
  subscribeToSession(sessionId.value, {
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onTimerStarted: handleTimerStarted,
    onTimerStopped: handleTimerStopped,
    onStatusChanged: handleStatusChanged,
  })
})

onBeforeUnmount(() => {
  unsubscribeFromSession()
  performLeaveSession()
})
</script>
