<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">
      Enter Verification Code
    </h2>
    <p class="text-gray-600 text-sm mb-6">
      We sent a 6-digit code to <strong>{{ email }}</strong>
    </p>

    <form @submit.prevent="handleSubmit">
      <div class="mb-6">
        <label for="code" class="block text-sm font-medium text-gray-700 mb-2">
          Verification Code
        </label>
        <input
          id="code"
          v-model="form.code"
          type="text"
          placeholder="000000"
          inputmode="numeric"
          maxlength="6"
          :disabled="isLoading"
          :class="[
            'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-center text-2xl font-bold tracking-widest disabled:bg-gray-100',
            form.code && !isCodeValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
          required
        />
        <p class="mt-2 text-xs text-gray-500">
          Enter the 6-digit code from your email
        </p>
        <p v-if="form.code && !isCodeValid" class="mt-1 text-xs text-red-600">
          Code must be exactly 6 digits
        </p>
      </div>

      <!-- Alerts -->
      <div class="mb-6 space-y-3">
        <Alert v-if="errorMessage" :message="errorMessage" variant="error" />
        <Alert
          v-if="verificationSuccess"
          message="✓ Email verified successfully!"
          variant="success"
        />
        <Alert
          v-if="showRateLimitWarning"
          message="Too many failed attempts. Please try again later."
          variant="warning"
        />
        <Alert v-if="!codeExpired && !verificationSuccess" :variant="'info'">
          Code expires in
          <strong
            >{{ countdownSeconds }}:{{
              String(countdownMilliseconds).padStart(2, '0')
            }}</strong
          >
        </Alert>
        <Alert
          v-if="codeExpired"
          message="Your verification code has expired."
          variant="error"
        />
      </div>

      <!-- Buttons -->
      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="isLoading || !isCodeValid || codeExpired"
          class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          {{ isLoading ? 'Verifying...' : 'Verify Email' }}
        </button>
        <button
          type="button"
          :disabled="isLoading || !canResend"
          class="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition"
          @click="handleResend"
        >
          {{
            resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend Code'
          }}
        </button>
      </div>

      <!-- Back button -->
      <button
        type="button"
        :disabled="isLoading"
        class="w-full mt-4 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg transition"
        @click="handleBack"
      >
        Back
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Alert from './Alert.vue'

const props = defineProps<{
  email: string
  expiresAt: number
}>()

const emit = defineEmits<{
  verified: [token: string]
  error: [message: string]
  back: []
}>()

const form = ref({
  code: '',
})

const isLoading = ref(false)
const errorMessage = ref('')
const showRateLimitWarning = ref(false)
const verificationSuccess = ref(false)
const codeExpired = ref(false)
const countdownSeconds = ref(0)
const countdownMilliseconds = ref(0)
const resendCountdown = ref(0)
let countdownInterval: number | null = null
let resendInterval: number | null = null

const isCodeValid = computed(() => {
  const code = form.value.code.trim()
  return code.length === 6 && /^\d{6}$/.test(code)
})

const canResend = computed(() => resendCountdown.value === 0)

const startCountdown = (expiresAt: number) => {
  const updateCountdown = () => {
    const now = Date.now()
    const remaining = Math.max(0, expiresAt - now)

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

const startResendCountdown = () => {
  resendCountdown.value = 30

  resendInterval = window.setInterval(() => {
    resendCountdown.value = Math.max(0, resendCountdown.value - 1)
    if (resendCountdown.value === 0 && resendInterval) {
      clearInterval(resendInterval)
      resendInterval = null
    }
  }, 1000)
}

const handleSubmit = async () => {
  if (!form.value.code.trim()) {
    errorMessage.value = 'Code is required'
    return
  }

  if (!isCodeValid.value) {
    errorMessage.value = 'Code must be exactly 6 digits'
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''
    showRateLimitWarning.value = false

    const response = await fetch('/.netlify/functions/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: props.email,
        code: form.value.code.trim(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 429) {
        showRateLimitWarning.value = true
        errorMessage.value = 'Too many failed attempts. Please try again later.'
      } else if (data.error === 'Invalid or expired code') {
        errorMessage.value = 'Invalid or expired verification code'
      } else if (data.error === 'Code expired') {
        codeExpired.value = true
        errorMessage.value = 'Verification code has expired'
      } else {
        errorMessage.value = data.error || 'Verification failed'
      }
      return
    }

    verificationSuccess.value = true
    emit('verified', data.token)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to verify email'
  } finally {
    isLoading.value = false
  }
}

const handleResend = async () => {
  if (!canResend.value) return

  try {
    isLoading.value = true
    errorMessage.value = ''

    const response = await fetch('/.netlify/functions/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: props.email,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 429) {
        showRateLimitWarning.value = true
        errorMessage.value =
          'Too many requests. Please try again in a few minutes.'
      } else {
        errorMessage.value = data.message || 'Failed to resend code'
      }
      return
    }

    form.value.code = ''
    errorMessage.value = ''
    verificationSuccess.value = false
    codeExpired.value = false
    startCountdown(Date.now() + 5 * 60 * 1000)
    startResendCountdown()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to resend code'
  } finally {
    isLoading.value = false
  }
}

const handleBack = () => {
  emit('back')
}

onMounted(() => {
  startCountdown(props.expiresAt)
  startResendCountdown()
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  if (resendInterval) {
    clearInterval(resendInterval)
  }
})
</script>
