<template>
  <div class="space-y-3">
    <div
      v-if="participants.length === 0"
      class="text-gray-500 text-center py-8"
    >
      <p>No participants yet. Share the session link to invite others.</p>
    </div>

    <div
      v-for="participant in participants"
      :key="participant.id"
      class="border rounded-lg p-4"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900">{{ participant.name }}</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ getStatusDisplay(participant.status) }}
          </p>
        </div>
        <div class="flex gap-2 ml-2">
          <!-- Recording Indicator -->
          <div
            v-if="participant.status === 'recording'"
            class="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold"
          >
            <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            Recording
          </div>

          <!-- Done Indicator -->
          <div
            v-if="participant.status === 'done'"
            class="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold"
          >
            ✓ Done
          </div>

          <!-- Waiting Indicator -->
          <div
            v-if="participant.status === 'waiting'"
            class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold"
          >
            Waiting
          </div>
        </div>
      </div>

      <!-- Transcript Ready Badge -->
      <div v-if="participant.transcriptReady" class="mt-2">
        <span
          class="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
        >
          ✓ Transcript ready
        </span>
      </div>
    </div>

    <!-- Session Stats -->
    <div v-if="participants.length > 0" class="border-t pt-4 mt-4">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div>
          <p class="text-2xl font-bold text-gray-900">
            {{ participants.length }}
          </p>
          <p class="text-xs text-gray-500">Total</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-green-600">{{ doneCount }}</p>
          <p class="text-xs text-gray-500">Done</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-red-600">{{ recordingCount }}</p>
          <p class="text-xs text-gray-500">Recording</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Participant {
  id: string
  name: string
  status: 'waiting' | 'recording' | 'done'
  transcriptReady?: boolean
}

interface Props {
  participants?: Participant[]
}

const props = withDefaults(defineProps<Props>(), {
  participants: () => [],
})

const doneCount = computed(
  () => props.participants.filter(p => p.status === 'done').length
)
const recordingCount = computed(
  () => props.participants.filter(p => p.status === 'recording').length
)

const getStatusDisplay = (status: string): string => {
  switch (status) {
    case 'recording':
      return 'Currently recording...'
    case 'done':
      return 'Finished recording'
    case 'waiting':
      return 'Waiting to record'
    default:
      return 'Unknown status'
  }
}
</script>
