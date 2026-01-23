<template>
  <div
    class="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-5xl font-bold text-gray-900 mb-4">
          AI-Powered Standup Assistant
        </h1>
        <p class="text-xl text-gray-600">
          Synchronized timer, audio transcription, and AI-powered summaries for
          your team
        </p>
      </div>

      <!-- Main Content - Show one card at a time -->
      <div class="mb-8">
        <CreateSessionCard
          v-if="!hasSessionId"
          ref="createCardRef"
          @error="handleError"
        />
        <JoinSessionCard
          v-else
          ref="joinCardRef"
          :initial-session-id="sessionId"
          @error="handleError"
        />
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="mt-8 bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-red-800">{{ errorMessage }}</p>
      </div>

      <!-- Privacy Notice -->
      <div class="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-yellow-900 mb-2">
          Privacy Notice
        </h3>
        <p class="text-yellow-800 text-sm mb-2">
          Audio recordings are sent to Portkey/OpenAI for transcription. Please
          review their
          <a
            href="https://openai.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-yellow-900"
          >
            privacy policy
          </a>
          before proceeding.
        </p>
        <p class="text-yellow-800 text-sm">
          Sessions expire after 4 hours. No session data is permanently stored.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CreateSessionCard from '../components/CreateSessionCard.vue'
import JoinSessionCard from '../components/JoinSessionCard.vue'

const route = useRoute()
const errorMessage = ref('')

const sessionId = computed(() => (route.query.sessionId as string) || '')
const hasSessionId = computed(() => !!sessionId.value)

onMounted(() => {
  // Clear error message on mount
  errorMessage.value = ''
})

const handleError = (message: string) => {
  errorMessage.value = message
}
</script>
