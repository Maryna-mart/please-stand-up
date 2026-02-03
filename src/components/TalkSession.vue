<template>
  <div class="space-y-6">
    <!-- Time Display -->
    <div class="text-center">
      <div class="text-6xl font-bold text-blue-600 font-mono">
        {{ formatTime(remaining) }}
      </div>
      <p class="text-sm text-gray-500 mt-2">
        {{ timerStatus }}
      </p>
    </div>

    <!-- Progress Bar -->
    <div class="bg-gray-200 h-2 rounded-full overflow-hidden">
      <div
        class="bg-blue-600 h-full transition-all duration-100"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Microphone Permission Status -->
    <div
      v-if="microphoneError"
      class="bg-red-50 border border-red-200 rounded p-3 space-y-3"
    >
      <p class="text-red-800 text-sm">{{ microphoneError }}</p>
      <button
        v-if="microphoneError.includes('permission denied')"
        class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition text-sm"
        @click="initializeMicrophone"
      >
        🎤 Allow Microphone
      </button>
    </div>

    <!-- Main Action Button (One at a time) -->
    <div>
      <!-- Talk Button - shown when ready to record -->
      <button
        v-if="canStartRecording"
        class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-4 rounded-lg transition text-lg"
        :disabled="!microphoneReady"
        @click="startTalk"
      >
        🎤 Talk ({{ formatTime(duration) }})
      </button>

      <!-- Stop Button - shown while recording -->
      <button
        v-if="isRecording"
        class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-4 rounded-lg transition text-lg"
        @click="stopTalk"
      >
        ⏹️ Stop
      </button>

      <!-- Re-record Button - shown when transcript is ready -->
      <button
        v-if="hasTranscript && !isTranscribing && !props.summarizing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-lg transition text-lg"
        @click="rerecord"
      >
        🔄 Re-record
      </button>

      <!-- Transcribing State - shown while transcription in progress -->
      <button
        v-if="isTranscribing"
        disabled
        class="w-full bg-gray-400 text-white font-semibold py-4 px-4 rounded-lg transition text-lg cursor-not-allowed"
      >
        ⏳ Transcribing your status...
      </button>

      <!-- Summarizing State - shown while summarization in progress -->
      <button
        v-if="props.summarizing && hasTranscript"
        disabled
        class="w-full bg-gray-400 text-white font-semibold py-4 px-4 rounded-lg transition text-lg cursor-not-allowed"
      >
        ⏳ Summarizing your status...
      </button>
    </div>

    <!-- Transcription Error -->
    <div
      v-if="transcriptionError"
      class="bg-red-50 border border-red-200 rounded p-3 space-y-3"
    >
      <div class="flex justify-between items-start">
        <p class="text-red-800 text-sm flex-1">{{ transcriptionError }}</p>
        <button
          class="text-red-600 hover:text-red-800 font-bold text-lg leading-none ml-2"
          @click="clearError"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { uploadAudio as uploadAudioAPI, getErrorMessage } from '../lib/ai-api'

interface Props {
  duration?: number
  sessionId: string
  userId: string
  userName: string
  summarizing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 120,
  summarizing: false,
})

const emit = defineEmits<{
  'transcript-ready': [data: { text: string; language: string }]
  'talk-started': []
  'talk-stopped': []
  'talk-ended': []
}>()

// Timer state
const remaining = ref(props.duration)
const isRunning = ref(false)
let timerInterval: number | null = null

// Recording state
const isRecording = ref(false)
const recordingTime = ref(0)
const audioBlob = ref<Blob | null>(null)
const audioUrl = ref('')
const microphoneReady = ref(false)
const microphoneError = ref('')
const isTranscribing = ref(false)
const transcriptionError = ref('')
const hasTranscript = ref(false)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordingInterval: number | null = null

const timerStatus = computed(() => {
  if (isRunning.value) return 'Recording...'
  if (remaining.value === props.duration) return 'Ready to talk'
  return 'Paused'
})

const progressPercent = computed(() => {
  return ((props.duration - remaining.value) / props.duration) * 100
})

const canStartRecording = computed(() => {
  return (
    !isRunning.value &&
    !isRecording.value &&
    !hasTranscript.value &&
    !isTranscribing.value &&
    !props.summarizing
  )
})

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const initializeMicrophone = async () => {
  try {
    microphoneError.value = ''
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // Check for browser support
    const AudioContext =
      window.AudioContext ||
      (window as unknown as Record<string, unknown>).webkitAudioContext
    if (!AudioContext) {
      microphoneError.value = 'Audio recording not supported in this browser'
      return
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    })

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' })
      audioBlob.value = blob
      audioUrl.value = URL.createObjectURL(blob)
      audioChunks = []
    }

    microphoneReady.value = true
  } catch (error) {
    const err = error as Error
    if (err.name === 'NotAllowedError') {
      microphoneError.value =
        'Microphone permission denied. Please enable it in your browser settings.'
    } else if (err.name === 'NotFoundError') {
      microphoneError.value = 'No microphone found. Please check your device.'
    } else {
      microphoneError.value = getErrorMessage(err)
    }
  }
}

const startTalk = async () => {
  if (isRunning.value || isRecording.value) return

  // Initialize microphone if needed
  if (!mediaRecorder) {
    await initializeMicrophone()
    if (!mediaRecorder) return
  }

  // Start recording
  audioChunks = []
  recordingTime.value = 0
  isRecording.value = true
  transcriptionError.value = ''
  mediaRecorder.start()

  recordingInterval = window.setInterval(() => {
    recordingTime.value++
  }, 1000)

  // Start timer
  isRunning.value = true
  remaining.value = props.duration
  emit('talk-started')

  timerInterval = window.setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      stopTalk()
      emit('talk-ended')
    }
  }, 1000)
}

const stopTalk = async () => {
  if (!isRunning.value && !isRecording.value) return

  // Stop timer
  isRunning.value = false
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  // Stop recording
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false

    if (recordingInterval !== null) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
  }

  emit('talk-stopped')

  // Auto-transcribe after recording stops
  // Show transcribing state immediately, give MediaRecorder time to process
  isTranscribing.value = true
  setTimeout(async () => {
    if (audioBlob.value) {
      await uploadAudioToAPI()
    }
  }, 500)
}

const rerecord = () => {
  // Clear transcript and audio, reset to ready state
  hasTranscript.value = false
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
  transcriptionError.value = ''
  remaining.value = props.duration
}

const uploadAudioToAPI = async () => {
  if (!audioBlob.value) return

  try {
    transcriptionError.value = ''

    // Upload audio to Portkey Whisper API via Netlify function
    const result = await uploadAudioAPI(
      props.sessionId,
      props.userId,
      props.userName,
      audioBlob.value,
      'webm'
    )

    hasTranscript.value = true
    emit('transcript-ready', { text: result.text, language: result.language })
  } catch (error) {
    // For API errors, show generic message since retries will happen
    transcriptionError.value = getErrorMessage(error, true)
  } finally {
    isTranscribing.value = false
  }
}

const clearError = () => {
  transcriptionError.value = ''
}

onBeforeUnmount(() => {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
  }
  if (recordingInterval !== null) {
    clearInterval(recordingInterval)
  }
})

// Initialize microphone on component mount
initializeMicrophone()
</script>
