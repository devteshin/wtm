<template>
  <div class="chart-root">
    <div class="chart-toolbar">
      <el-select
        v-model="selectedMeasurementId"
        class="chart-measurement"
        placeholder="Измерение"
        filterable
      >
        <el-option
          v-for="m in measurementsList"
          :key="m.id"
          :label="m.name"
          :value="m.id"
        />
      </el-select>

      <el-date-picker
        v-model="period"
        type="daterange"
        range-separator="—"
        start-placeholder=""
        end-placeholder=""
        :shortcuts="shortcuts"
        clearable
        format="DD.MM.YYYY"
        value-format="YYYY-MM-DD"
        class="chart-period"
      />

      <el-button
        type="primary"
        :disabled="!selectedMeasurementId || !period"
        @click="build"
      >Сформировать</el-button>
    </div>

    <div ref="chartEl" class="chart-canvas"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import useApplicationStore from '@/store';

const store = useApplicationStore();

const measurementsList = computed(() => store.measurements_meta?.measurement_list ?? []);

const selectedMeasurementId = ref<number | null>(null);
const period = ref<[string, string] | null>(null);

const chartEl = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;

const fmt = (v: string): string => v.slice(0, 16).replace('T', ' ');

const build = async (): Promise<void> => {
  if (!selectedMeasurementId.value || !period.value) return;
  try {
    await store.fetchMeasurementsChart({
      meas_id: selectedMeasurementId.value,
      meas_date_start: period.value[0],
      meas_date_end: period.value[1],
    });
    await nextTick();
    render();
  } catch (e) {
    console.error('Ошибка загрузки данных графика:', e);
    ElMessage.error('Не удалось построить график');
  }
};

const render = (): void => {
  const rows = store.measurements_chart;
  if (!chart || !rows.length) return;

  // ось X: уникальные отсортированные моменты измерений
  const xData = [...new Set(rows.map(r => r.measured_at))].sort();

  // серии по показателям: code → значения по каждому моменту
const byCode = new Map<string, { name: string; orderNum: number; values: (number | null)[] }>();
for (const r of rows) {
  if (!byCode.has(r.code)) {
    byCode.set(r.code, {
      name: `${r.code}, ${r.measurement_unit}`,
      orderNum: r.order_num ?? 0,
      values: xData.map(() => null),
    });
  }
  byCode.get(r.code)!.values[xData.indexOf(r.measured_at)] = Number(r.value);
}

const series = [...byCode.values()]
  .sort((a, b) => a.orderNum - b.orderNum)
  .map(s => ({ name: s.name, type: 'bar', data: s.values }));

chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: xData.map(v => rows.find(r => r.measured_at === v)?.measured_at_fmt ?? v),
      axisLabel: {
        show: true,
        interval: Math.ceil(xData.length / 6),   // ~6 подписей на всю ширину
        rotate: 0,
      },
    },
    yAxis: { type: 'value' },
    series: series,
  }, true);
};

onMounted(async () => {
  chart = echarts.init(chartEl.value!);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(chartEl.value!);

  try {
    await store.fetchMeasurementsMeta({ meas_id: 0 });
  } catch (e) {
    console.error('Ошибка загрузки справочника:', e);
  }
});

onUnmounted(() => {
  observer?.disconnect();
  chart?.dispose();
});

const shortcuts = [
  {
    text: 'Сегодня',
    value: () => {
      const end = new Date()
      const start = new Date()
      return [start, end]
    },
  },
  {
    text: 'Неделя',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    },
  },
  {
    text: 'Месяц',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      return [start, end]
    },
  },
  {
    text: '3 месяца',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 3)
      return [start, end]
    },
  },
]
</script>

<style scoped>
.chart-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.chart-toolbar :deep(.chart-period) {
  width: 280px;
  max-width: 280px;
  flex: 0 0 auto;   /* не даём flex-потоку растягивать пикер */
}

.chart-measurement { width: 280px; }

.chart-canvas {
  flex: 1;
  min-height: 240px;
}
</style>
