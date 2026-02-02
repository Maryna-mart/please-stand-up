<template>
  <div class="space-y-6">
    <!-- Parsed Summary Sections -->
    <div v-if="summary && parsedSummary" class="space-y-6">
      <!-- Per-Participant Cards -->
      <div
        v-for="participant in parsedSummary.participants"
        :key="participant.name"
        class="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      >
        <!-- Participant Header -->
        <div
          class="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b"
        >
          <h3 class="text-lg font-semibold text-gray-900">
            {{ participant.name }}
          </h3>
        </div>

        <!-- Participant Sections -->
        <div class="divide-y">
          <!-- Yesterday -->
          <div
            v-if="participant.sections.yesterday"
            class="px-6 py-4 hover:bg-gray-50 transition"
          >
            <h4
              class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span>✅</span>
              <span>Yesterday</span>
            </h4>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ participant.sections.yesterday }}
            </p>
          </div>

          <!-- Today -->
          <div
            v-if="participant.sections.today"
            class="px-6 py-4 hover:bg-gray-50 transition"
          >
            <h4
              class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span>🎯</span>
              <span>Today</span>
            </h4>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ participant.sections.today }}
            </p>
          </div>

          <!-- Blockers -->
          <div
            v-if="participant.sections.blockers"
            class="px-6 py-4 bg-red-50 hover:bg-red-100 transition"
          >
            <h4
              class="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2"
            >
              <span>🚫</span>
              <span>Blockers</span>
            </h4>
            <p class="text-sm text-red-800 leading-relaxed">
              {{ participant.sections.blockers }}
            </p>
          </div>

          <!-- Team Action Items -->
          <div
            v-if="participant.sections.actionItems"
            class="px-6 py-4 bg-yellow-50 hover:bg-yellow-100 transition"
          >
            <h4
              class="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2"
            >
              <span>📌</span>
              <span>Team Action Items</span>
            </h4>
            <p class="text-sm text-yellow-800 leading-relaxed">
              {{ participant.sections.actionItems }}
            </p>
          </div>

          <!-- Other -->
          <div
            v-if="participant.sections.other"
            class="px-6 py-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <h4
              class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span>📝</span>
              <span>Other</span>
            </h4>
            <p class="text-sm text-gray-700 leading-relaxed">
              {{ participant.sections.other }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Raw Summary View (fallback if parsing fails) -->
    <div v-else-if="summary" class="prose prose-sm max-w-none">
      <div
        class="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed overflow-x-auto"
      >
        {{ summary }}
      </div>
    </div>

    <!-- Email Section -->
    <div class="border-t pt-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Send Summary via Email
      </h3>
      <form @submit.prevent="handleSendEmail">
        <div class="mb-4">
          <label
            for="emails"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Addresses (comma-separated)
          </label>
          <textarea
            id="emails"
            v-model="emailForm.emails"
            placeholder="alice@example.com, bob@example.com"
            rows="3"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            Separate multiple emails with commas
          </p>
        </div>

        <div class="mb-6">
          <label
            for="subject"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Subject
          </label>
          <input
            id="subject"
            v-model="emailForm.subject"
            type="text"
            placeholder="Standup Summary - 2026-01-20"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="isSendingEmail"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {{ isSendingEmail ? 'Sending...' : 'Send Summary' }}
        </button>
      </form>

      <!-- Email Success Message -->
      <div
        v-if="emailSuccess"
        class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <p class="text-green-800 text-sm">✓ Summary sent successfully!</p>
      </div>

      <!-- Email Error Message -->
      <div
        v-if="emailError"
        class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-red-800 text-sm">{{ emailError }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="border-t pt-6 flex gap-3">
      <button
        class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="copySummary"
      >
        {{ copySuccess ? '✓ Copied' : 'Copy Summary' }}
      </button>
      <button
        class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        @click="downloadSummary"
      >
        Download as TXT
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { parseSummary, type ParsedSummary } from '../lib/summary-parser'

interface Props {
  summary: string
  sessionId: string
}

const props = defineProps<Props>()

const emailForm = ref({
  emails: '',
  subject: `Standup Summary - ${new Date().toISOString().split('T')[0]}`,
})

const isSendingEmail = ref(false)
const emailSuccess = ref(false)
const emailError = ref('')
const copySuccess = ref(false)

// Parse summary into structured sections
const parsedSummary = computed((): ParsedSummary | null => {
  if (!props.summary) return null
  try {
    return parseSummary(props.summary)
  } catch {
    // If parsing fails, fall back to raw text display
    return null
  }
})

const handleSendEmail = async () => {
  try {
    isSendingEmail.value = true
    emailError.value = ''
    emailSuccess.value = false

    // Parse emails
    const emails = emailForm.value.emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e)
    if (emails.length === 0) {
      throw new Error('Please enter at least one email address')
    }

    // TODO: Call API to send email
    // await api.sendSummary(props.sessionId, {
    //   emails,
    //   subject: emailForm.value.subject,
    //   summary: props.summary
    // })

    emailSuccess.value = true
    emailForm.value.emails = ''
    setTimeout(() => {
      emailSuccess.value = false
    }, 3000)
  } catch (error) {
    emailError.value =
      error instanceof Error ? error.message : 'Failed to send email'
  } finally {
    isSendingEmail.value = false
  }
}

const copySummary = () => {
  navigator.clipboard.writeText(props.summary)
  copySuccess.value = true
  setTimeout(() => {
    copySuccess.value = false
  }, 2000)
}

const downloadSummary = () => {
  const element = document.createElement('a')
  const file = new Blob([props.summary], { type: 'text/plain' })
  element.href = URL.createObjectURL(file)
  element.download = `standup-summary-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}
</script>
