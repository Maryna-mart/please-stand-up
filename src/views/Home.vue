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
        <!-- Email Verification Flow -->
        <EmailVerificationCard
          v-if="!isEmailVerified"
          @success="handleEmailVerificationSuccess"
          @error="handleError"
        />
        <VerificationCodeCard
          v-else-if="!codeVerified && emailForVerification"
          :email="emailForVerification"
          :expires-at="codeExpiresAt"
          @verified="handleCodeVerified"
          @back="handleBackToEmailVerification"
          @error="handleError"
        />

        <!-- Create/Join Session (after email verification) -->
        <CreateSessionCard
          v-else-if="!hasSessionId"
          ref="createCardRef"
          @error="handleError"
        />
        <JoinSessionCard
          v-else-if="hasSessionId"
          ref="joinCardRef"
          :initial-session-id="sessionId"
          @error="handleError"
        />
      </div>

      <!-- Error Alert -->
      <Alert v-if="errorMessage" :message="errorMessage" variant="error" />

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
import {
  setEmailVerificationToken,
  getEmailVerificationToken,
} from '../composables/useSession'
import CreateSessionCard from '../components/CreateSessionCard.vue'
import JoinSessionCard from '../components/JoinSessionCard.vue'
import EmailVerificationCard from '../components/EmailVerificationCard.vue'
import VerificationCodeCard from '../components/VerificationCodeCard.vue'
import Alert from '../components/Alert.vue'

const route = useRoute()

const errorMessage = ref('')
const isEmailVerified = ref(false)
const codeVerified = ref(false)
const emailForVerification = ref('')
const codeExpiresAt = ref(0)

const sessionId = computed(() => (route.query.sessionId as string) || '')
const hasSessionId = computed(() => !!sessionId.value)

onMounted(() => {
  // Clear error message on mount
  errorMessage.value = ''

  // Check if user already has a valid email verification token
  const existingToken = getEmailVerificationToken()
  if (existingToken) {
    isEmailVerified.value = true
    codeVerified.value = true
  }
})

const handleEmailVerificationSuccess = (email: string) => {
  emailForVerification.value = email
  codeExpiresAt.value = Date.now() + 5 * 60 * 1000 // 5 minutes from now
  isEmailVerified.value = true
  // Next step: show code verification card
}

const handleCodeVerified = (token: string) => {
  // Store the email verification token
  setEmailVerificationToken(token)
  codeVerified.value = true
  isEmailVerified.value = true
  errorMessage.value = ''
  // User can now create/join sessions
}

const handleBackToEmailVerification = () => {
  emailForVerification.value = ''
  codeExpiresAt.value = 0
}

const handleError = (message: string) => {
  errorMessage.value = message
}
</script>
