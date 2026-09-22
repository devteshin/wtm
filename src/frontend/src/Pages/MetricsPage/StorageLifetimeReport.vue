<template>
  <div class="tables-wrapper">
    <!-- Панель управления -->
    <div class="tables-controls">
      <h3 class="controls-title">Сроки хранения материалов</h3>
      <span class="separator-line" />
      <el-button
        size="small"
        type="success"
        :loading="exportLoading"
        @click="exportToExcelClick"
      >
        <template #icon><el-icon :size="14"><Download /></el-icon></template>
        Экспорт в Excel
      </el-button>
    </div>

    <!-- Скроллируемая область -->
    <div class="tables-scroll-area">
      <!-- KPI-карточки -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Общий вес</div>
          <div class="kpi-value">{{ formatNumber(totalWeight) }} кг</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Устаревшие запасы (181+)</div>
          <div class="kpi-value danger">{{ formatNumber(currentDeadWeight) }} кг</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Доля устаревших запасов</div>
          <div class="kpi-value" :class="deadShare > 40 ? 'danger' : 'warning'">
            {{ formatPercent(deadShare) }}
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Тренд 181+ за месяц</div>
          <div class="kpi-value" :class="deadTrend < 0 ? 'success' : 'danger'">
            {{ deadTrend < 0 ? '▼' : '▲' }} {{ formatNumber(Math.abs(deadTrend)) }} кг
          </div>
        </div>
      </div>

      <!-- Таблица текущего среза + График динамики -->
      <div class="content-grid">
        <div class="table-card">
          <h4 class="table-title">Текущий срез — {{ formatMonth(latestDate) }}</h4>
          <el-table :data="currentSnapshotTable" border size="small" style="width: 100%">
            <el-table-column prop="bucket" label="Корзина" width="100">
              <template #default="{ row }">
                <el-tag :type="getTagType(row.bucket)" size="small">{{ row.bucket }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Вес, кг" align="right">
              <template #default="{ row }">{{ formatNumber(row.weight) }}</template>
            </el-table-column>
            <el-table-column label="Доля" align="right" width="80">
              <template #default="{ row }">{{ formatPercent(row.share) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-card">
          <h4 class="table-title">Динамика по корзинам (6 месяцев)</h4>
          <div ref="chartRef" class="chart-container" />
        </div>
      </div>

      <!-- Сводная таблица за 6 месяцев -->
      <div class="table-card">
        <h4 class="table-title">Сводная таблица за 6 месяцев</h4>
        <el-table :data="pivotTableData" border size="small" style="width: 100%">
          <el-table-column prop="bucket" label="Корзина" width="120" fixed>
            <template #default="{ row }">
              <el-tag :type="getTagType(row.bucket)" size="small">{{ row.bucket }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-for="date in sortedDates"
            :key="date"
            :label="formatMonth(date)"
            align="right"
            min-width="120"
          >
            <template #default="{ row }">{{ formatNumber(row[date]) }}</template>
          </el-table-column>
          <el-table-column label="тренд за 6 месяцев" align="right" width="140" fixed="right">
            <template #default="{ row }">
              <span :class="getTrendClass(row)">
                {{ getTrendSymbol(row) }} {{ formatNumber(Math.abs(getTrendValue(row))) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div v-if="loading" class="overlay-loader">Загрузка данных...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { Download } from '@element-plus/icons-vue'
import { exportToExcel } from '@/utils/excelExport'
import { useMetricsReportStore } from '@/storeMetricsReport'
import useApplicationStore from '@/store'

// --- Типы ---
interface SnapshotRow {
  inventory_date: string
  aging_bucket: string
  net_weight: number
}

// --- Стор ---
const store = useApplicationStore()
const reportStore = useMetricsReportStore()

// --- Состояние ---
const loading = ref(false)
const error = ref<string | null>(null)
const exportLoading = ref(false)
const rawData = ref<SnapshotRow[]>([])
const chartRef = ref<HTMLElement | null>(null)
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null

// --- Константы ---
const BUCKETS = ['0-30', '31-90', '91-180', '181+'] as const
const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#91cc75',
  '31-90': '#5470c6',
  '91-180': '#fac858',
  '181+': '#ee6666',
}
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

// --- Computed: данные ---

const sortedDates = computed(() => {
  const dates = [...new Set(rawData.value.map(r => r.inventory_date))]
  return dates.sort()
})

const latestDate = computed(() => sortedDates.value[sortedDates.value.length - 1] || '')

const currentSnapshot = computed(() =>
  rawData.value.filter(r => r.inventory_date === latestDate.value)
)

const totalWeight = computed(() =>
  currentSnapshot.value.reduce((sum, r) => sum + r.net_weight, 0)
)

const currentDeadWeight = computed(() => {
  const row = currentSnapshot.value.find(r => r.aging_bucket === '181+')
  return row?.net_weight || 0
})

const deadShare = computed(() => {
  if (totalWeight.value === 0) return 0
  return (currentDeadWeight.value / totalWeight.value) * 100
})

const deadTrend = computed(() => {
  if (sortedDates.value.length < 2) return 0
  const prevDate = sortedDates.value[sortedDates.value.length - 2]
  const prev = rawData.value.find(r => r.inventory_date === prevDate && r.aging_bucket === '181+')
  return currentDeadWeight.value - (prev?.net_weight || 0)
})

const currentSnapshotTable = computed(() =>
  BUCKETS.map(bucket => {
    const row = currentSnapshot.value.find(r => r.aging_bucket === bucket)
    const weight = row?.net_weight || 0
    const share = totalWeight.value > 0 ? (weight / totalWeight.value) * 100 : 0
    return { bucket, weight, share }
  })
)

const pivotTableData = computed(() =>
  BUCKETS.map(bucket => {
    const row: Record<string, any> = { bucket }
    sortedDates.value.forEach(date => {
      const found = rawData.value.find(r => r.inventory_date === date && r.aging_bucket === bucket)
      row[date] = found?.net_weight || 0
    })
    return row
  })
)

// --- Computed: график ---

const chartOption = computed(() => {
  const dates = sortedDates.value.map(d => formatMonth(d))

  const series = BUCKETS.map(bucket => ({
    name: bucket,
    type: 'line' as const,
    stack: 'total',
    areaStyle: { color: BUCKET_COLORS[bucket], opacity: 0.7 },
    lineStyle: { color: BUCKET_COLORS[bucket], width: 1 },
    itemStyle: { color: BUCKET_COLORS[bucket] },
    data: sortedDates.value.map(date => {
      const row = rawData.value.find(r => r.inventory_date === date && r.aging_bucket === bucket)
      return row?.net_weight || 0
    }),
  }))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#ddd',
      textStyle: { color: '#333' },
      valueFormatter: (val: number) => formatNumber(val) + ' кг',
    },
    legend: { top: 'bottom', data: [...BUCKETS] },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'кг',
      axisLabel: {
        fontSize: 11,
        formatter: (val: number) => formatAxisLabel(val),
      },
    },
    series,
  }
})

// --- Методы форматирования ---

const formatNumber = (n: number): string =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

const formatPercent = (n: number): string => `${n.toFixed(1)}%`

const formatMonth = (dateStr: string): string => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

const formatAxisLabel = (val: number): string => {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  if (val >= 1_000) return Math.round(val / 1_000) + 'K'
  return String(val)
}

const getTagType = (bucket: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (bucket) {
    case '0-30': return 'success'
    case '31-90': return 'info'
    case '91-180': return 'warning'
    case '181+': return 'danger'
    default: return 'info'
  }
}

const getTrendValue = (row: Record<string, any>): number => {
  const dates = sortedDates.value
  if (dates.length < 2) return 0
  return (row[dates[dates.length - 1]] || 0) - (row[dates[0]] || 0)
}

const getTrendClass = (row: Record<string, any>): string => {
  const val = getTrendValue(row)
  if (val < 0) return 'trend-down'
  if (val > 0) return 'trend-up'
  return 'trend-flat'
}

const getTrendSymbol = (row: Record<string, any>): string => {
  const val = getTrendValue(row)
  if (val < 0) return '▼'
  if (val > 0) return '▲'
  return '▬'
}

// --- График ---

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption(chartOption.value)
  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(chartRef.value)
}

// --- Загрузка данных ---

const fetchData = async () => {

  loading.value = true
  error.value = null
  try {
    await store.fetchMetricsInventoryAging({
      slice_date: reportStore.selectedDate ?? '',
      slice_qty: 6,
      stock_ids: reportStore.selectedStore?.toString() ?? '',
    });

    rawData.value = store.metrics_inventory_aging;

  } catch (e) {
    error.value = 'Ошибка загрузки данных: ' + (e as Error).message
  } finally {
    loading.value = false
    await nextTick()
    if (!chart) initChart()
    else chart.setOption(chartOption.value, { notMerge: true })
  }
}

// --- Экспорт ---

const exportToExcelClick = () => {
  exportLoading.value = true
  try {
    const sheets = [
      {
        name: 'Сроки хранения материалов',
        columns: [
          { key: 'bucket', header: 'Корзина' },
          { key: sortedDates.value[0], header: sortedDates.value[0] },
          { key: sortedDates.value[1], header: sortedDates.value[1] },
          { key: sortedDates.value[2], header: sortedDates.value[2] },
          { key: sortedDates.value[3], header: sortedDates.value[3] },
          { key: sortedDates.value[4], header: sortedDates.value[4] },
          { key: sortedDates.value[5], header: sortedDates.value[5] },
        ], 
        data: pivotTableData.value,
      },
    ]

    exportToExcel(sheets, 'storage_liftime')
  } finally {
    exportLoading.value = false
  }
}

// --- Lifecycle ---

onMounted(() => fetchData())

onBeforeUnmount(() => {
  chart?.dispose()
  resizeObserver?.disconnect()
})

// --- Экспорт метода для родителя ---
defineExpose({ fetchData })
</script>

<style scoped>
.tables-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 20px);
  overflow: hidden;
}

.tables-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  z-index: 10;
  position: sticky;
  top: 0;
  margin-bottom: 8px;
}

.controls-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.separator-line {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

.tables-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* --- KPI-карточки --- */
.kpi-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.kpi-card {
  flex: 1;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kpi-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.kpi-value.danger { color: #dc2626; }
.kpi-value.warning { color: #d97706; }
.kpi-value.success { color: #16a34a; }

/* --- Сетка: таблица + график --- */
.content-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.chart-container {
  width: 100%;
  height: 350px;
}

/* --- Карточки таблиц --- */
.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

.table-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

/* --- Тренды --- */
.trend-down { color: #16a34a; font-weight: 500; }
.trend-up { color: #dc2626; font-weight: 500; }
.trend-flat { color: #6b7280; }

/* --- Состояния --- */
.overlay-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  color: #333;
  font-weight: 500;
}

.error-state {
  padding: 24px;
  text-align: center;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  margin-top: 16px;
}

/* --- Скроллбар --- */
.tables-scroll-area::-webkit-scrollbar { width: 8px; }
.tables-scroll-area::-webkit-scrollbar-track { background: #f1f1f1; }
.tables-scroll-area::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }

/* --- Адаптивность --- */
@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .kpi-card {
    min-width: 140px;
  }
}
</style>
