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

    <!-- Recording Status -->
    <div
      v-if="isRecording"
      class="flex items-center gap-2 text-red-600 font-semibold justify-center"
    >
      <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
      Recording... {{ formatTime(recordingTime) }}
    </div>
    <div v-else-if="audioBlob" class="text-green-600 font-semibold text-center">
      ✓ Audio recorded ({{ formatFileSize(audioBlob.size) }})
    </div>

    <!-- Microphone Permission Status -->
    <div
      v-if="microphoneError"
      class="bg-red-50 border border-red-200 rounded p-3"
    >
      <p class="text-red-800 text-sm">{{ microphoneError }}</p>
    </div>

    <!-- Main Talk Button -->
    <div class="flex gap-2">
      <button
        v-if="!isRunning && !isRecording"
        class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-4 rounded-lg transition text-lg"
        @click="startTalk"
        :disabled="!microphoneReady"
      >
        🎤 Talk ({{ formatTime(duration) }})
      </button>
      <button
        v-if="isRunning || isRecording"
        class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-4 rounded-lg transition text-lg"
        @click="stopTalk"
      >
        ⏹️ Stop
      </button>
      <button
        v-if="!isRunning && !isRecording"
        class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <!-- Audio Playback & Upload -->
    <div v-if="audioBlob" class="space-y-3">
      <audio :src="audioUrl" controls class="w-full" />
      <button
        :disabled="isTranscribing"
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="uploadAudio"
      >
        {{ isTranscribing ? 'Transcribing...' : 'Transcribe' }}
      </button>
      <button
        class="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="discardAudio"
      >
        Discard
      </button>
    </div>

    <!-- Transcription Error -->
    <div
      v-if="transcriptionError"
      class="bg-red-50 border border-red-200 rounded p-3"
    >
      <p class="text-red-800 text-sm">{{ transcriptionError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

interface Props {
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  duration: 120,
})

const emit = defineEmits<{
  'transcript-ready': [transcript: string]
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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
      microphoneError.value = 'Failed to access microphone: ' + err.message
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

const stopTalk = () => {
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
}

const reset = () => {
  stopTalk()
  remaining.value = props.duration
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
  transcriptionError.value = ''
}

const uploadAudio = async () => {
  if (!audioBlob.value) return

  try {
    isTranscribing.value = true
    transcriptionError.value = ''

    // TODO: Implement API call to transcribe
    // For now, emit a mock transcript
    const mockTranscript =
      'Transcription will be implemented with Portkey Whisper API'
    emit('transcript-ready', mockTranscript)
  } catch (error) {
    transcriptionError.value =
      error instanceof Error ? error.message : 'Failed to transcribe audio'
  } finally {
    isTranscribing.value = false
  }
}

const discardAudio = () => {
  audioBlob.value = null
  audioUrl.value = ''
  recordingTime.value = 0
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
