<template>
  <div class="space-y-4">
    <!-- Recording Status -->
    <div
      v-if="isRecording"
      class="flex items-center gap-2 text-red-600 font-semibold"
    >
      <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
      Recording... {{ formatTime(recordingTime) }}
    </div>
    <div v-else-if="audioBlob" class="text-green-600 font-semibold">
      ✓ Audio recorded ({{ formatFileSize(audioBlob.size) }})
    </div>

    <!-- Microphone Permission Status -->
    <div
      v-if="microphoneError"
      class="bg-red-50 border border-red-200 rounded p-3"
    >
      <p class="text-red-800 text-sm">{{ microphoneError }}</p>
    </div>

    <!-- Recording Controls -->
    <div class="flex gap-2">
      <button
        v-if="!isRecording"
        :disabled="!microphoneReady || isRecording"
        class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="startRecording"
      >
        Record
      </button>
      <button
        v-if="isRecording"
        class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="stopRecording"
      >
        Stop
      </button>
    </div>

    <!-- Playback & Upload -->
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
import { ref } from 'vue'

const emit = defineEmits<{
  'transcript-ready': [transcript: string]
}>()

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

const startRecording = async () => {
  if (!mediaRecorder) {
    await initializeMicrophone()
    if (!mediaRecorder) return
  }

  audioChunks = []
  recordingTime.value = 0
  isRecording.value = true
  transcriptionError.value = ''

  mediaRecorder.start()

  recordingInterval = window.setInterval(() => {
    recordingTime.value++
  }, 1000)
}

const stopRecording = () => {
  if (!mediaRecorder || !isRecording.value) return

  mediaRecorder.stop()
  isRecording.value = false

  if (recordingInterval !== null) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }
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

// Initialize microphone on component mount
initializeMicrophone()
</script>
