<template>
  <div class="space-y-6">
    <!-- Time Display -->
    <div class="text-center">
      <div class="text-6xl font-bold text-blue-600 font-mono">
        {{ formatTime(remaining) }}
      </div>
      <p class="text-sm text-gray-500 mt-2">
        {{ status }}
      </p>
    </div>

    <!-- Progress Bar -->
    <div class="bg-gray-200 h-2 rounded-full overflow-hidden">
      <div
        class="bg-blue-600 h-full transition-all duration-100"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Controls -->
    <div class="flex gap-2">
      <button
        v-if="!isRunning"
        class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="start"
      >
        Start
      </button>
      <button
        v-if="isRunning"
        class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="stop"
      >
        Stop
      </button>
      <button
        class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

interface Props {
  duration?: number
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 120,
  autoStart: false,
})

const emit = defineEmits<{
  'timer-started': []
  'timer-stopped': []
  'timer-ended': []
}>()

const remaining = ref(props.duration)
const isRunning = ref(false)
let interval: number | null = null

const status = computed(() => {
  if (isRunning.value) return 'Running...'
  if (remaining.value === props.duration) return 'Ready'
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

const start = () => {
  if (isRunning.value || remaining.value <= 0) return

  isRunning.value = true
  emit('timer-started')

  interval = window.setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      stop()
      emit('timer-ended')
    }
  }, 1000)
}

const stop = () => {
  if (!isRunning.value) return

  isRunning.value = false
  if (interval !== null) {
    clearInterval(interval)
    interval = null
  }
  emit('timer-stopped')
}

const reset = () => {
  stop()
  remaining.value = props.duration
}

onBeforeUnmount(() => {
  if (interval !== null) {
    clearInterval(interval)
  }
})
</script>
