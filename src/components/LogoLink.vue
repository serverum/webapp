<template>
  <a
    :href="link"
    class="md-nls-pl-25 logo-float p-4 lg:p-8"
  >
  </a>
</template>
<script setup lang="ts">
defineProps({
  link: {
    type: String,
    default: "/",
  },
});
</script>
<style scoped>
img {
  height: 32px;
  width: 125px;
}
</style>
