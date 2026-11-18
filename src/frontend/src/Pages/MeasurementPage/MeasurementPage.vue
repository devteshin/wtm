<template>
  <div class="panel-layout">
    <el-card class="card">
      <MeasurementTable
        :editable="editable"
        @changed="somethingChanged"
      />
    </el-card>
    <el-card class="card-side">
      <MeasurementsLastPanel ref="lastPanel" :auto-refresh="false" />
    </el-card>
    <el-card class="card-chart">
      <MeasurementChartPanel />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import MeasurementsLastPanel from './MeasurementsLastPanel.vue'
import MeasurementChartPanel from './MeasurementChartPanel.vue'
import MeasurementTable from './MeasurementTable.vue'
import { useMeasurementsPanelStore } from '@/storeMeasurementPanel.js';

const measurementsStore = useMeasurementsPanelStore();

const props = withDefaults(
  defineProps<{ editable?: boolean }>(),
  { editable: true },
);

const lastPanel = ref<InstanceType<typeof MeasurementsLastPanel>>();

const somethingChanged = (): void => {
  lastPanel.value?.refresh();
};

const editable = computed(() => props.editable);
</script>

<style scoped>
.panel-layout {
  --top-menu: 120px;        /* верхнее меню */
  --chart-h: 380px;         /* высота карточки графика */
  --row-gap: 16px;          /* совпадает с gap */

  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;

  max-width: 1440px;
  margin: 0 auto;
}

.card,
.card-side {
  height: calc(100vh - var(--top-menu) - var(--chart-h) - var(--row-gap));
  min-height: 320px;        /* чтобы на низких окнах ряд не схлопнулся */
  transition: height 0.25s ease;
}

.card {
  flex: 1 1 640px;
  min-width: 640px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* панель последних измерений */
.card-side {
  flex: 0 1 460px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
}

.card-side :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-side :deep(.el-table) {
  flex: 1;
  overflow: auto;         /* скролл внутри панели, если измерений много */
}

.card-chart {
  flex: 1 1 100%;
  height: var(--chart-h);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.card-chart :deep(.el-card__body) {
  flex: 1 1 100%;      /* график всегда занимает весь ряд */
  height: 380px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

</style>
