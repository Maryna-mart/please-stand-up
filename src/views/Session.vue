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
            v-if="sessionId && userId && userName"
            :duration="120"
            :session-id="sessionId"
            :user-id="userId"
            :user-name="userName"
            :summarizing="isSummarizingInProgress"
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

      <!-- Right Column: Summaries -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Summaries Section -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Summaries</h2>
          <TranscriptView :transcripts="transcripts" />
        </div>
      </div>
    </div>

    <!-- Completion Message -->
    <div v-if="sessionFinished" class="max-w-7xl mx-auto mt-6">
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-green-800 text-sm font-semibold">
          ✓ Standup completed! Summary email sent.
        </p>
      </div>
    </div>

    <!-- Session Error -->
    <div v-if="finishError" class="max-w-7xl mx-auto mt-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800 text-sm">{{ finishError }}</p>
      </div>
    </div>

    <!-- Session Controls -->
    <div class="max-w-7xl mx-auto mt-8 flex justify-end gap-4">
      <button
        :disabled="!canFinishSession || isFinishing || sessionFinished"
        class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition"
        @click="finishSession"
      >
        {{ isFinishing ? 'Finishing...' : 'Standup is Finished' }}
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
import {
  finishSession as finishSessionAPI,
  summarizeTranscript,
  parseAPIError,
} from '../lib/ai-api'
import { parseSummary } from '../lib/summary-parser'
import TalkSession from '../components/TalkSession.vue'
import ParticipantsList from '../components/ParticipantsList.vue'
import TranscriptView from '../components/TranscriptView.vue'

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
const {
  leaveSession: performLeaveSession,
  session: sessionData,
  userId,
  userName,
} = useSession()
const { subscribeToSession, unsubscribeFromSession } = usePusher()

const sessionId = computed(() => route.params.id as string)
const participants = ref<Participant[]>([])
const transcripts = ref<Transcript[]>([])
const linkCopied = ref(false)
const isFinishing = ref(false)
const finishError = ref('')
const sessionFinished = ref(false)
const isSummarizingInProgress = ref(false)

const canFinishSession = computed(() => transcripts.value.length > 0)

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

const onTranscriptReady = async (data: { text: string; language: string }) => {
  isSummarizingInProgress.value = true

  try {
    // Immediately summarize the transcript to show structured sections
    const sections = await summarizeTranscript(
      userName.value || 'Anonymous',
      data.text,
      data.language as any
    )

    // Format the sections as structured text for display
    const formattedText = formatSummaryAsText(sections)

    // Add the summarized transcript to the list
    transcripts.value.push({
      participantName: userName.value || 'Anonymous',
      text: formattedText,
    })
  } catch {
    // If summarization fails, fall back to raw text
    transcripts.value.push({
      participantName: userName.value || 'Anonymous',
      text: data.text,
    })
  } finally {
    isSummarizingInProgress.value = false
  }
}

const copySessionLink = () => {
  const link = `${window.location.origin}/session/${sessionId.value}`
  navigator.clipboard.writeText(link)
  linkCopied.value = true
  setTimeout(() => {
    linkCopied.value = false
  }, 2000)
}

const finishSession = async () => {
  if (transcripts.value.length === 0) {
    return
  }

  try {
    isFinishing.value = true
    finishError.value = ''

    // Call finish-session API to generate summary from transcripts
    const rawText = await finishSessionAPI(
      sessionId.value,
      transcripts.value as Array<{
        participantName: string
        text: string
      }>
    )

    // Parse the raw summary text into structured sections
    const parsed = parseSummary(rawText)

    // Replace raw transcripts with structured summary
    // so TranscriptView displays the formatted sections immediately
    transcripts.value = parsed.participants.map(p => ({
      participantName: p.name,
      text: formatSummaryAsText(p.sections),
    }))

    // Summary generated and session updated
    sessionFinished.value = true

    // Redirect to home after 2 seconds
    setTimeout(() => {
      void router.push('/')
    }, 2000)
  } catch (error) {
    const apiError = parseAPIError(error)
    finishError.value = apiError.message
  } finally {
    isFinishing.value = false
  }
}

// Format structured sections into text format for summary parser
const formatSummaryAsText = (sections: {
  yesterday?: string
  today?: string
  blockers?: string
  actionItems?: string
  other?: string
}): string => {
  const parts: string[] = []

  if (sections.yesterday) {
    parts.push(`\n✅ Yesterday: ${sections.yesterday}`)
  }
  if (sections.today) {
    parts.push(`\n🎯 Today: ${sections.today}`)
  }
  if (sections.blockers) {
    parts.push(`\n🚫 Blockers: ${sections.blockers}`)
  }
  if (sections.actionItems) {
    parts.push(`\n📌 Team Action Items: ${sections.actionItems}`)
  }
  if (sections.other) {
    parts.push(`\n📝 Other: ${sections.other}`)
  }

  return parts.join('\n')
}

const leaveSession = async () => {
  unsubscribeFromSession()
  await performLeaveSession()
  await router.push('/')
}

// Subscribe to Pusher channel on mount
onMounted(() => {
  // Initialize participants from session data
  if (sessionData.value?.participants) {
    participants.value = sessionData.value.participants.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status as 'waiting' | 'recording' | 'done',
      transcriptReady: p.status === 'done',
    }))
  }

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
