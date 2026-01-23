<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Join Session</h2>

    <div
      v-if="isReauth"
      class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <p class="text-sm text-blue-800">
        <strong>Session reload detected.</strong> Please re-enter your password
        to continue.
      </p>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="mb-6">
        <label
          for="participantName"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Your Name
        </label>
        <input
          id="participantName"
          v-model="form.name"
          type="text"
          placeholder="e.g., Alex"
          :class="[
            'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2',
            form.name && !isNameValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
          required
        />
        <p v-if="form.name && !isNameValid" class="mt-2 text-xs text-red-600">
          Name must be 1-50 characters with no HTML or control characters
        </p>
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
          v-model="form.password"
          type="password"
          placeholder="Enter session password (if any)"
          :class="[
            'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2',
            form.password && !isPasswordValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
        />
        <p
          v-if="form.password && !isPasswordValid"
          class="mt-1 text-xs text-red-600"
        >
          Password must be at least 8 characters
        </p>
      </div>

      <button
        type="submit"
        :disabled="isLoading || !formValid"
        class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        {{ isLoading ? 'Joining...' : 'Join Session' }}
      </button>
    </form>

    <button
      class="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 py-2 px-4"
      @click="goBack"
    >
      ← Back to Create
    </button>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable no-undef */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'
import {
  validateUserName,
  validatePasswordStrength,
  validateSessionId,
} from '../lib/sanitize'

interface Props {
  initialSessionId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ error: [message: string] }>()

const router = useRouter()
const { joinSession } = useSession()

const isLoading = ref(false)

const form = ref({
  name: '',
  sessionId: props.initialSessionId,
  password: '',
})

// Detect if this is a password re-auth scenario (session reload)
// Only true if:
// 1. The URL has ?requirePassword=true
// 2. The sessionId in URL matches the cached session (not stale)
// 3. There's a valid cached session (not empty)
const isReauth = computed(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const hasRequirePasswordFlag = urlParams.get('requirePassword') === 'true'

  // Check if cache is empty - if so, this is a stale requirePassword param
  const cachedSession = localStorage.getItem('standup_session')
  const cachedUserId = localStorage.getItem('standup_user_id')

  // Parse the cached session to get the session ID
  let cachedSessionId: string | null = null
  if (cachedSession) {
    try {
      const parsed = JSON.parse(cachedSession)
      cachedSessionId = parsed.id
    } catch {
      // Invalid JSON, treat as no cache
      return false
    }
  }

  // Only show re-auth if we have the flag AND a valid cached session
  // AND the session IDs match (not a different session)
  return (
    hasRequirePasswordFlag &&
    !!cachedSession &&
    !!cachedUserId &&
    cachedSessionId === props.initialSessionId
  )
})

// Pre-fill name and focus password field on re-auth
onMounted(() => {
  if (isReauth.value) {
    const storedName = localStorage.getItem('standup_user_name')
    if (storedName) {
      form.value.name = storedName
    }
    // Focus password input instead of name input
    const passwordInput = document.getElementById('joinPassword')
    passwordInput?.focus()
  }
})

const isNameValid = computed(() =>
  form.value.name ? validateUserName(form.value.name) : true
)

const isSessionIdValid = computed(() =>
  form.value.sessionId ? validateSessionId(form.value.sessionId) : true
)

const isPasswordValid = computed(() =>
  form.value.password ? validatePasswordStrength(form.value.password) : true
)

const formValid = computed(
  () =>
    form.value.name.trim().length > 0 &&
    isNameValid.value &&
    form.value.sessionId.trim().length > 0 &&
    isSessionIdValid.value &&
    isPasswordValid.value
)

const handleSubmit = async () => {
  try {
    isLoading.value = true

    await joinSession(
      form.value.sessionId,
      form.value.name,
      form.value.password || undefined
    )
    await router.push(`/session/${form.value.sessionId}`)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to join session'
    emit('error', message)
  } finally {
    isLoading.value = false
  }
}

const goBack = async () => {
  await router.push({ name: 'Home' })
}

defineExpose({ isLoading })
</script>
