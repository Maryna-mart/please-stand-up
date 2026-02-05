<template>
  <div v-if="message" :class="['rounded-lg p-4 border', variantClasses]">
    <p :class="['text-sm', textClass]">
      <slot>{{ message }}</slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const props = withDefaults(
  defineProps<{
    message?: string
    variant?: AlertVariant
  }>(),
  {
    variant: 'error',
  }
)

const variantClasses = computed(() => {
  const variants: Record<AlertVariant, string> = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }
  return variants[props.variant]
})

const textClass = computed(() => {
  const variants: Record<AlertVariant, string> = {
    error: 'text-red-800',
    success: 'text-green-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }
  return variants[props.variant]
})
</script>
