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

      <el-select
        v-if="!isProbeKind"
        v-model="selectedOperationId"
        class="chart-operation"
        placeholder="Операция"
        filterable
        clearable
        :disabled="!selectedMeasurementId"
      >
        <el-option v-for="op in operationsList" :key="op.id" :label="op.name" :value="op.id" />
      </el-select>

      <el-select
        v-if="isProbeKind"
        v-model="selectedMaterialId"
        class="chart-operation"
        placeholder="Материал"
        filterable
        clearable
        :disabled="!selectedMeasurementId"
      >
        <el-option v-for="mat in materialsList" :key="mat.id" :label="mat.name" :value="mat.id" />
      </el-select>

      <el-date-picker v-if="!isProbeKind"
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
        :disabled="!canBuild"
        @click="build"
      >Сформировать</el-button>
    </div>

    <div ref="chartEl" class="chart-canvas"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import useApplicationStore from '@/store';
import { storeToRefs } from 'pinia';
import { useMeasurementsChartStore } from '@/storeMeasurementChart';

const chartStore = useMeasurementsChartStore();
const { selectedMeasurementId, selectedOperationId, selectedMaterialId, period } = storeToRefs(chartStore);

const store = useApplicationStore();

const measurementsList = computed(() => store.measurements_meta?.measurement_list ?? []);

const operationsList = computed(() => store.measurements_meta?.operation_list ?? []);
const materialsList = computed(() => store.measurements_meta?.material_list ?? []);

const isProbeKind = computed(() => {
  const m = measurementsList.value.find(m => m.id === selectedMeasurementId.value);
  return m?.measure_kind === 2;
});

const chartEl = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;

const clearChart = (): void => {
  chart?.clear();
};

const canBuild = computed(() => {
  if (!selectedMeasurementId.value) return false;
  return isProbeKind.value
    ? selectedMaterialId.value !== null
    : !!period.value;
});


const build = async (): Promise<void> => {
  clearChart();
  if (!canBuild.value) return;
  console.log('isProbeKind.value',isProbeKind.value)
  try {
    await store.fetchMeasurementsChart({
      meas_id: selectedMeasurementId.value!,
      ...(isProbeKind.value
        ? { material_id: selectedMaterialId.value! }
        : {
            meas_date_start: period.value![0],
            meas_date_end: period.value![1],
            ...(selectedOperationId.value !== null
              ? { operation_id: selectedOperationId.value }
              : {}),
          }),
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

  const isProbe = isProbeKind.value;

  let xData: string[];
  let xLabels: string[];

  if (isProbe) {
    const seen = new Set<string>();
    const probes: number[] = [];
    for (const r of rows) {
      const n = r.probe_num ?? 0;
      if (!seen.has(String(n))) { seen.add(String(n)); probes.push(n); }
    }
    probes.sort((a, b) => a - b);
    xData = probes.map(String);
    xLabels = probes.map(p => `№${p}`);
  } else {
    xData = [...new Set(rows.map(r => r.measured_at))].sort();
    xLabels = xData.map(v => rows.find(r => r.measured_at === v)?.measured_at_fmt ?? v);
  }

  // ключ точки на оси: для проб — номер, для повременных — момент измерения
  const xKeyOf = (r: frontend.IMeasurementChart): string =>
    isProbe ? String(r.probe_num) : r.measured_at;
  const indexOfX = new Map<string, number>();
  xData.forEach((k, i) => indexOfX.set(k, i));

  // серии по показателям: code → значения по каждой точке оси
  const byCode = new Map<string, { name: string; orderNum: number; values: (number | null)[] }>();
  for (const r of rows) {
    if (!byCode.has(r.code)) {
      byCode.set(r.code, {
        name: `${r.code}, ${r.measurement_unit}`,
        orderNum: r.order_num ?? 0,
        values: xData.map(() => null),
      });
    }
    const idx = indexOfX.get(xKeyOf(r));
    if (idx !== undefined) byCode.get(r.code)!.values[idx] = Number(r.value);
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
      data: xLabels,
      axisLabel: {
        show: true,
        interval: Math.ceil(xLabels.length / 6),
        rotate: 0,
      },
    },
    yAxis: { type: 'value' },
    series,
  }, true);
};

// ---------- восстановление состояния ----------
let restoring = false;

onMounted(async () => {
  chart = echarts.init(chartEl.value!);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(chartEl.value!);

  try {
    await store.fetchMeasurementsMeta({ meas_id: 0 });
  } catch (e) {
    console.error('Ошибка загрузки справочника:', e);
  }

  restoring = true;

  // Восстанавливаем селекты из localStorage
  chartStore.loadFromStorage();

  // Измерение могло исчезнуть из справочника — тогда операция тоже не имеет смысла
  const restoredId = chartStore.selectedMeasurementId;
  if (restoredId !== null && !measurementsList.value.some(m => m.id === restoredId)) {
    chartStore.setSelection({ measId: null, opId: null });
    chartStore.saveToStorage();
  }

  if (selectedMeasurementId.value) {
    try {
      await store.fetchMeasurementsMeta({ meas_id: selectedMeasurementId.value });
    } catch (e) {
      console.error('Ошибка загрузки справочника измерения:', e);
    }

    if (isProbeKind.value) {
      // материал валидируем только теперь — список заполнен
      const restoredMat = chartStore.selectedMaterialId;
      if (restoredMat !== null && !materialsList.value.some(m => m.id === restoredMat)) {
        chartStore.setSelection({ materialId: null });
        chartStore.saveToStorage();
      }
      // операция не принадлежит probe-режиму — на всякий случай
      if (chartStore.selectedOperationId !== null) {
        chartStore.setSelection({ opId: null });
        chartStore.saveToStorage();
      }
    } else {
      const restoredOp = chartStore.selectedOperationId;
      if (restoredOp !== null && !operationsList.value.some(op => op.id === restoredOp)) {
        chartStore.setSelection({ opId: null });
        chartStore.saveToStorage();
      }
      if (chartStore.selectedMaterialId !== null) {
        chartStore.setSelection({ materialId: null });
        chartStore.saveToStorage();
      }
    }
  }

  restoring = false;
  await build();
});

// ---------- реакция на селекты ----------

watch(
  [selectedMeasurementId, selectedOperationId, selectedMaterialId, period],
  ([measId], [prevMeasId]) => {
    if (measId !== prevMeasId && !restoring) {
      selectedOperationId.value = null;
      selectedMaterialId.value = null;   // оба фильтра принадлежат режиму измерения
    }
    if (measId && measId !== prevMeasId) {
      void store.fetchMeasurementsMeta({ meas_id: measId });
    }

    if (!canBuild.value) clearChart();
    chartStore.saveToStorage();
  },
);

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

.chart-measurement { width: 320px; }
.chart-operation { width: 320px; }

.chart-canvas {
  flex: 1;
  min-height: 240px;
}
</style>
