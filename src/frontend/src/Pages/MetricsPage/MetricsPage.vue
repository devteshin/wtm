<template>
  <el-container class="page-container">
    <el-aside width="400px" class="sidebar">

      <el-form label-position="top" class="filter-form">

        <!-- Селект вида метрик — в самом верху -->
        <el-form-item label="Вид отчёта">
          <el-select
            v-model="selectedMetricType"
            placeholder="Выберите вид отчёта"
            style="width: 100%"
            @change="handleMetricTypeChange"
          >
            <el-option
              v-for="opt in metricTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item  v-if="selectedMetricType = 'storage_lifetime'" label="Вид материалов">
          <el-checkbox-group v-model="checkedArrivalDocType" :min="1">
            <el-checkbox v-for="arrival_type in arrivalDocTypes" :key="arrival_type" :label="arrival_type" :value="arrival_type">
              {{ arrival_type }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- Общие фильтры -->
        <ReportFilters
          ref="filtersRef"
          v-model:date-filter="selectedDate"
          v-model:period="selectedPeriod"
          v-model:store-filter="selectedStore"
          v-model:schema="selectedSchema"
          v-model:supplier="selectedSupplier"
          v-model:process="selectedProcess"
          v-model:operation="selectedOperation"
          v-model:material="selectedMaterial"
          v-model:product="selectedProduct"
          :show-date="metricConfig.showDate"
          :show-period="metricConfig.showPeriod"
          :show-store="metricConfig.showStore"
          :show-schema="metricConfig.showSchema"
          :show-supplier="metricConfig.showSupplier"
          :show-process="metricConfig.showProcess"
          :show-operation="metricConfig.showOperation"
          :show-material="metricConfig.showMaterial"
          :show-product="metricConfig.showProduct"
          :show-operation-graph="metricConfig.showOperationGraph"
          :show-material-graph="metricConfig.showMaterialGraph"
          :show-product-graph="metricConfig.showProductGraph"
          :show-product-coeff-tables="metricConfig.showProductCoeffTables"
        >
          <template #actions>
            <div style="margin-top: 24px;">
              <el-button
                type="primary"
                @click="handleMakeReport"
                class="apply-button"
                style="width: 100%"
                :disabled="!selectedMetricType"
              >
                Сформировать
              </el-button>
            </div>
          </template>
        </ReportFilters>

      </el-form>

    </el-aside>

    <el-container class="right-container">
      <el-main class="content-area">

        <!-- Динамический компонент отчёта -->
        <component
          :is="currentReportComponent"
          v-if="currentReportComponent && isReportVisible"
          :key="selectedMetricType"
          ref="reportComponentRef"
        />

        <!-- Заглушка, пока не выбрана метрика -->
        <div v-else class="skeleton-placeholder">
          Выберите вид отчёта и нажмите «Сформировать»
        </div>

      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, type Component, nextTick } from 'vue'
import useApplicationStore from '@/store'
import { useMetricsReportStore } from '@/storeMetricsReport'
import ReportFilters from '@/components/ReportFilters.vue'
import { metricTypeOptions, getMetricConfig, type MetricType } from '@/components/metricsConfig'

// Импорт компонентов отчётов
import StorageLifetimeReport from './StorageLifetimeReport.vue'
import TurnoverReport from './TurnoverReport.vue'
import DeficitReport from './DeficitReport.vue'

const checkedArrivalDocType = ref(['сырье', 'продукты'])
const arrivalDocTypes = ['сырье', 'продукты']

const reportComponents: Record<string, Component> = {
  StorageLifetimeReport,
  TurnoverReport,
  DeficitReport,
}

const filtersRef = ref<InstanceType<typeof ReportFilters> | null>(null)
const reportComponentRef = ref<any>(null)

const reportStore = useMetricsReportStore()

// ── Метрика ──

const selectedMetricType = computed({
  get: () => reportStore.selectedMetricType,
  set: (value) => reportStore.setFilters({ selectedMetricType: value }),
})

const metricConfig = computed(() => getMetricConfig(selectedMetricType.value))

const currentReportComponent = computed(() => {
  const name = metricConfig.value.component
  return reportComponents[name] ?? null
})

// Показывать отчёт только после нажатия «Сформировать»
const isReportVisible = ref(false)

const handleMetricTypeChange = () => {
  // При смене метрики скрываем текущий отчёт
  isReportVisible.value = false
}

// ── v-model прокси ──

const selectedStore = computed({
  get: () => reportStore.selectedStore,
  set: (value) => reportStore.setFilters({ selectedStore: value }),
})
const selectedMaterial = computed({
  get: () => reportStore.selectedMaterial,
  set: (value) => reportStore.setFilters({ selectedMaterial: value }),
})
const selectedProduct = computed({
  get: () => reportStore.selectedProduct,
  set: (value) => reportStore.setFilters({ selectedProduct: value }),
})
const selectedSupplier = computed({
  get: () => reportStore.selectedSupplier,
  set: (value) => reportStore.setFilters({ selectedSupplier: value }),
})
const selectedProcess = computed({
  get: () => reportStore.selectedProcess,
  set: (value) => reportStore.setFilters({ selectedProcess: value }),
})
const selectedOperation = computed({
  get: () => reportStore.selectedOperation,
  set: (value) => reportStore.setFilters({ selectedOperation: value }),
})
const selectedSchema = computed({
  get: () => reportStore.selectedSchema,
  set: (value) => reportStore.setFilters({ selectedSchema: value }),
})
const selectedPeriod = computed({
  get: () => reportStore.selectedPeriod,
  set: (value) => reportStore.setFilters({ selectedPeriod: value }),
})
const selectedDate = computed({
  get: () => reportStore.selectedDate,
  set: (value) => reportStore.setFilters({ selectedDate: value }),
})


// ── Восстановление из storage ──

reportStore.loadFromStorage()

// ── Кнопка «Сформировать» ──

const handleMakeReport = async () => {
  reportStore.saveToStorage()
  isReportVisible.value = true
  await nextTick()
  reportComponentRef.value?.fetchData()
}

</script>

<style scoped>
.page-container {
  height: calc(100vh - 120px);
  display: flex;
  width: 100%;
  box-sizing: border-box;
  gap: 10px;
}

.sidebar {
  background-color: #f5f7fa;
  padding: 20px;
  border-right: 1px solid #e6e9ef;
  flex-shrink: 0;
  width: 400px;
  overflow: auto;
}

.right-container {
  flex: 1;
  display: flex;
}

.content-area {
  padding: 0px;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-placeholder, .future-components-slot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.apply-button {
  margin-top: 16px;
}


</style>
