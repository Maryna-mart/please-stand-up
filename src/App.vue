<template>
  <div class="min-h-screen bg-gray-100">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useSession } from '@/composables/useSession'

const { initializeSessionFromCache } = useSession()

// Initialize cached session on app startup
onMounted(() => {
  initializeSessionFromCache()
})
</script>
