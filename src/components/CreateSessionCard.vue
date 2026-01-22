<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Create Session</h2>
    <form @submit.prevent="handleSubmit">
      <div class="mb-6">
        <label
          for="leaderName"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Your Name
        </label>
        <input
          id="leaderName"
          v-model="form.name"
          type="text"
          placeholder="e.g., Sarah"
          :class="[
            'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2',
            form.name && !isNameValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
          required
        />
        <p
          v-if="form.name && !isNameValid"
          class="mt-2 text-xs text-red-600"
        >
          Name must be 1-50 characters with no HTML or control characters
        </p>
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
          v-model="form.password"
          type="password"
          placeholder="Protect your session (optional)"
          :class="[
            'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2',
            form.password && !isPasswordValid
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]"
        />
        <p class="mt-2 text-xs text-gray-500">
          Password protects the session from unauthorized joins
        </p>
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
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        {{ isLoading ? 'Creating...' : 'Create Session' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'
import {
  validateUserName,
  validatePasswordStrength,
} from '../lib/sanitize'

const router = useRouter()
const { createSession } = useSession()
const emit = defineEmits<{ error: [message: string] }>()

const isLoading = ref(false)

const form = ref({
  name: '',
  password: '',
})

const isNameValid = computed(() =>
  form.value.name ? validateUserName(form.value.name) : true
)

const isPasswordValid = computed(() =>
  form.value.password
    ? validatePasswordStrength(form.value.password)
    : true
)

const formValid = computed(
  () =>
    form.value.name.trim().length > 0 &&
    isNameValid.value &&
    isPasswordValid.value
)

const handleSubmit = async () => {
  try {
    isLoading.value = true

    if (!form.value.name.trim()) {
      throw new Error('Name is required')
    }

    const session = await createSession(
      form.value.name.trim(),
      form.value.password || undefined
    )
    await router.push(`/session/${session.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session'
    emit('error', message)
  } finally {
    isLoading.value = false
  }
}

defineExpose({ isLoading })
</script>
