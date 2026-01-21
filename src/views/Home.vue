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

      <!-- Main Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Create Session Card -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Create Session</h2>
          <form @submit.prevent="handleCreateSession">
            <div class="mb-6">
              <label
                for="leaderName"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                id="leaderName"
                v-model="createForm.name"
                type="text"
                placeholder="e.g., Sarah"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div class="mb-6">
              <label
                for="createPassword"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Password (Optional)
              </label>
              <input
                id="createPassword"
                v-model="createForm.password"
                type="password"
                placeholder="Protect your session (optional)"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="mt-2 text-xs text-gray-500">
                Password protects the session from unauthorized joins
              </p>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {{ isLoading ? 'Creating...' : 'Create Session' }}
            </button>
          </form>
        </div>

        <!-- Join Session Card -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Join Session</h2>
          <form @submit.prevent="handleJoinSession">
            <div class="mb-6">
              <label
                for="participantName"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                id="participantName"
                v-model="joinForm.name"
                type="text"
                placeholder="e.g., Alex"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div class="mb-6">
              <label
                for="sessionId"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Session ID
              </label>
              <input
                id="sessionId"
                v-model="joinForm.sessionId"
                type="text"
                placeholder="Paste the session ID from the link"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div class="mb-6">
              <label
                for="joinPassword"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Password (if required)
              </label>
              <input
                id="joinPassword"
                v-model="joinForm.password"
                type="password"
                placeholder="Enter session password (if any)"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {{ isLoading ? 'Joining...' : 'Join Session' }}
            </button>
          </form>
        </div>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'

const router = useRouter()
const { createSession, joinSession } = useSession()

const isLoading = ref(false)
const errorMessage = ref('')

const createForm = ref({
  name: '',
  password: '',
})

const joinForm = ref({
  name: '',
  sessionId: '',
  password: '',
})

const handleCreateSession = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    if (!createForm.value.name.trim()) {
      throw new Error('Name is required')
    }

    const session = await createSession(
      createForm.value.name.trim(),
      createForm.value.password || undefined
    )
    await router.push(`/session/${session.id}`)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create session'
  } finally {
    isLoading.value = false
  }
}

const handleJoinSession = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    await joinSession(
      joinForm.value.sessionId,
      joinForm.value.name,
      joinForm.value.password || undefined
    )
    await router.push(`/session/${joinForm.value.sessionId}`)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to join session'
  } finally {
    isLoading.value = false
  }
}
</script>
