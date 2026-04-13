<script setup lang="ts">
const error = useError()

onMounted(() => {
  navigateTo('/')
})
</script>

<template>
  <VApp>
    <VMain>
      <VContainer class="d-flex align-center justify-center" style="height: 100vh">
        <VCard>
          <VCardText>
            <p class="text-h6 text-error">页面出错，正在跳转首页...</p>
          </VCardText>
        </VCard>
      </VContainer>
    </VMain>
  </VApp>
</template>
