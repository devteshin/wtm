<template>
  <div class="parent-container">
    <SvgZoneMap
      src="/test_plan.svg"
      @zone-click="onZoneClick"
    />
  </div>
</template>

<script setup>
import SvgZoneMap from '@/components/SvgZoneMap.vue';

const onZoneClick = (zoneId) => {
  console.log('Клик по зоне:', zoneId);
};
</script>

<style scoped>
.parent-container {
  height: 600px;  /* родитель задаёт размер */
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}
</style>
