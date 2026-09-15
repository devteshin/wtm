<template>
  <el-container class="page-container">
    <el-aside width="400px" class="sidebar">

      <ReportFilters
        ref="filtersRef"
        v-model:period="selectedPeriod"
        v-model:store-filter="selectedStore"
        v-model:schema="selectedSchema"
        v-model:process="selectedProcess"
        v-model:operation="selectedOperation"
        v-model:material="selectedMaterial"
        v-model:product="selectedProduct"
        show-period
        show-store
        show-schema
        show-process
        show-operation
        show-material
        show-product
        :show-operation-graph = "false"
        :show-material-graph = "false"
        :show-product-graph = "false"
        :show-product-coeff-tables = "false"
        >
          <template #actions>
            <div style="margin-top: 24px;">
              <el-button
                type="primary"
                @click="handleMakeReport"
                class="apply-button"
                style="width: 100%"
              >
                Сформировать
              </el-button>
            </div>
          </template>
        </ReportFilters>
    </el-aside>

    <el-container class="right-container">
      <el-main class="content-area">


      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, Ref } from 'vue'
import useApplicationStore from '@/store'
import { useMetricsReportStore } from '@/storeMetricsReport'
import ReportFilters from '@/components/ReportFilters.vue'
import { ElMessageBox } from 'element-plus'
import { addUniqueIdsByValue } from '@/utils/tableCellDoubleClick'

//const reportTableRef = ref<typeof ProductionReportTableView | null>(null)
const filtersRef = ref<InstanceType<typeof ReportFilters> | null>(null)

const store = useApplicationStore()
const reportStore = useMetricsReportStore()

// ── v-model прокси для ReportFilters ──
// (нужны и для onCellDblClick — addUniqueIdsByValue работает с Ref)

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

// ── Граф / таблицы списания ──

const isGraphVisible = ref(false)
const isCoeffTablesVisible = ref(false)
const graphType = ref<'material' | 'product' | 'operation' | null>(null)
const graphIds = ref<number[]>([])
const coeffTablesIds = ref<number[]>([])

// ── loadFromStorage в setup — до onMounted дочернего компонента ──

reportStore.loadFromStorage()

// ── Кнопка «Сформировать» ──

const handleMakeReport = () => {
  reportStore.saveToStorage()
  //reportTableRef.value?.refresh()
}

// ── Двойной клик по ячейке таблицы ──

const onCellDblClick = ({ column, value }: { column: string; value: string | null | undefined }) => {
  if (value == null || value === '-' || value === '') return

  const valuesArray = value.split(',').map(item => item.trim()).filter(Boolean)
  if (valuesArray.length === 0) return

  let optionList: Array<{ id: number; name: string }> = []
  let selectedRef: Ref<Array<number>> | undefined

  switch (column) {
    case 'process':
      optionList = store.materials_meta?.process_list ?? []
      selectedRef = selectedProcess
      break
    case 'operation':
      optionList = store.materials_meta?.operation_list ?? []
      selectedRef = selectedOperation
      break
    case 'material':
      optionList = store.materials_meta?.material_list ?? []
      selectedRef = selectedMaterial
      break
    case 'product':
      optionList = store.materials_meta?.material_list ?? []
      selectedRef = selectedProduct
      break
    default:
      console.warn('Неизвестная колонка для дабл-клика:', column)
      return
  }

  if (!selectedRef) return

  addUniqueIdsByValue(optionList, selectedRef, value)

  // Обновляем опции внутри ReportFilters
  if (column === 'operation' || column === 'material' || column === 'product') {
    filtersRef.value?.refreshOptions(column, selectedRef.value)
  }
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

.item-remote-select-wrapper {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 2px; /* Расстояние между селектом и кнопками, а также между кнопками */
}

/* Селект: занимает всё свободное место */
.item-remote-select {
  flex: 1;
  height: 100%;
  min-width: 0; /* Позволяет селекту сжиматься при нехватке места */
}

/* Кнопки: убираем все внешние отступы, которые добавляет Element Plus */
.item-remote-select-wrapper .el-button {
  height: 100%;
  margin: 0 !important; /* ГЛАВНОЕ: принудительно убираем margin у кнопок */
  padding: 6px 8px; /* Комфортный внутренний отступ, чтобы иконка не прилипала к краю */
  min-width: auto; /* Отключаем стандартную минимальную ширину кнопки */
  box-sizing: border-box;
}

/* Убираем лишние отступы у контента form-item */
.el-form-item__content {
  margin: 0 !important;
  padding: 0 !important;
  height: 100%;
}

/* Граф */
.graph-wrapper {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.graph-header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e9ef;
  margin-bottom: 12px;
}

.graph-header h3 {
  margin: 0;
  font-size: 16px;
}

.report-table-wrapper {
  flex: 1; /* Растягивается на всё свободное место */
  min-height: 0; /* КРИТИЧНО: позволяет вложенным элементам со скроллом сжиматься */
  width: 100%;
  display: flex;
  flex-direction: column;
  /* Убираем height: 100% отсюда! Это ломает расчет высоты внутри flex-контейнеров */
}

</style>
