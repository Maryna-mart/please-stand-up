<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Verify Your Email</h2>
    <form @submit.prevent="handleSubmit">
      <div class="mb-6">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="your.email@example.com"
          :disabled="isLoading || codeRequested"
          :class="[
            'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-100',
            form.email && !isEmailValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
          required
        />
        <p class="mt-2 text-xs text-gray-500">
          We'll send a 6-digit verification code to this email
        </p>
        <p v-if="form.email && !isEmailValid" class="mt-1 text-xs text-red-600">
          Please enter a valid email address
        </p>
      </div>

      <!-- Alerts -->
      <div class="mb-6 space-y-3">
        <Alert v-if="errorMessage" :message="errorMessage" variant="error" />
        <Alert
          v-if="showRateLimitWarning"
          message="You've sent multiple codes. Please wait before requesting another one."
          variant="warning"
        />
        <Alert v-if="codeRequested && !codeExpired" :variant="'info'">
          Code expires in
          <strong
            >{{ countdownSeconds }}:{{
              String(countdownMilliseconds).padStart(2, '0')
            }}</strong
          >
        </Alert>
        <Alert
          v-if="codeExpired"
          message="Your verification code has expired. Please request a new one."
          variant="error"
        />
      </div>

      <!-- Buttons -->
      <div v-if="!codeRequested || codeExpired" class="flex gap-3">
        <button
          type="submit"
          :disabled="isLoading || !isEmailValid"
          class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          {{ isLoading ? 'Sending...' : 'Send Verification Code' }}
        </button>
      </div>

      <!-- Proceed button when code is requested -->
      <div v-else class="flex gap-3">
        <button
          type="button"
          :disabled="isLoading"
          class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
          @click="proceedToCodeEntry"
        >
          Enter Verification Code
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { validateEmail } from '../lib/sanitize'
import Alert from './Alert.vue'

const emit = defineEmits<{
  success: [email: string]
  error: [message: string]
}>()

const form = ref({
  email: '',
})

const isLoading = ref(false)
const codeRequested = ref(false)
const codeExpired = ref(false)
const errorMessage = ref('')
const showRateLimitWarning = ref(false)
const countdownSeconds = ref(0)
const countdownMilliseconds = ref(0)
let countdownInterval: number | null = null
const codeRequestTime = ref<number | null>(null)
const CODE_EXPIRATION_MS = 5 * 60 * 1000 // 5 minutes

const isEmailValid = computed(() =>
  form.value.email ? validateEmail(form.value.email) : true
)

const startCountdown = () => {
  codeRequestTime.value = Date.now()

  const updateCountdown = () => {
    if (!codeRequestTime.value) return

    const elapsed = Date.now() - codeRequestTime.value
    const remaining = Math.max(0, CODE_EXPIRATION_MS - elapsed)

    countdownSeconds.value = Math.floor(remaining / 1000)
    countdownMilliseconds.value = Math.floor((remaining % 1000) / 10)

    if (remaining <= 0) {
      codeExpired.value = true
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }
  }

  updateCountdown()
  countdownInterval = window.setInterval(updateCountdown, 50)
}

const handleSubmit = async () => {
  if (!form.value.email.trim()) {
    errorMessage.value = 'Email is required'
    return
  }

  if (!isEmailValid.value) {
    errorMessage.value = 'Invalid email address'
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''
    showRateLimitWarning.value = false

    const response = await fetch('/.netlify/functions/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.value.email.trim(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Check for rate limit error
      if (response.status === 429) {
        showRateLimitWarning.value = true
        errorMessage.value =
          'Too many requests. Please try again in a few minutes.'
      } else {
        errorMessage.value = data.message || 'Failed to send verification code'
      }
      return
    }

    codeRequested.value = true
    codeExpired.value = false
    errorMessage.value = ''
    startCountdown()
    emit('success', form.value.email.trim())
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Failed to send verification code'
  } finally {
    isLoading.value = false
  }
}

const proceedToCodeEntry = () => {
  emit('success', form.value.email.trim())
}

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>
