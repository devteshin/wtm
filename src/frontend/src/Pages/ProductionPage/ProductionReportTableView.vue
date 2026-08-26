<template>
  <div class="tables-wrapper">
    <div class="tables-controls">
      <h3 class="controls-title">Производство</h3>
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

    <div class="tables-scroll-area">
      <div v-if="isLoading" class="loading-state">
        <el-skeleton animated />
      </div>
      <div v-else-if="!store.production_report_data.length" class="empty-state">
        Нет данных по выбранным фильтрам.
      </div>

      <el-table
        v-else
        :data="store.production_report_data"
        style="height: 100%"
        border
        stripe
      >
        <el-table-column prop="operation_date_in" label="Дата переработки" width="120" />

        <el-table-column prop="process" label="Техпроцесс" min-width="140">
          <template #default="scope">
            <span
              class="dbl-click-cell"
              @dblclick.stop="emitCellDblClick('process', scope.row.process)"
            >
              {{ scope.row.process ?? '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="operation" label="Операция" min-width="160">
          <template #default="scope">
            <span
              class="dbl-click-cell"
              @dblclick.stop="emitCellDblClick('operation', scope.row.operation)"
            >
              {{ scope.row.operation ?? '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="material" label="Материал" min-width="180">
          <template #default="scope">
            <span
              class="dbl-click-cell"
              @dblclick.stop="emitCellDblClick('material', scope.row.material)"
            >
              {{ scope.row.material ?? '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="weight_in" label="Списано" width="90" align="right">
          <template #default="scope">
            {{ formatWeight(scope.row.weight_in) }}
          </template>
        </el-table-column>

        <el-table-column prop="product" label="Продукт" min-width="160">
          <template #default="scope">
            <span
              class="dbl-click-cell"
              @dblclick.stop="emitCellDblClick('product', scope.row.product)"
            >
              {{ scope.row.product ?? '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="weight_out" label="Принято" width="90" align="right">
          <template #default="scope">
            {{ formatWeight(scope.row.weight_out) }}
          </template>
        </el-table-column>

        <el-table-column prop="operation_date_out" label="Дата приема" width="120" />
      </el-table>
    </div>

    <!-- Пагинация -->
    <div v-if="total > 0" class="pagination-area">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSize"
        :total="total"
        :page-sizes="[100, 200, 300]"
        layout="total, sizes, prev, pager, next"
        @current-change="onCurrentChange"
        @size-change="onSizeChange"
      />
    </div>
  </div>

  <div v-if="loading" class="overlay-loader">Загрузка данных...</div>
  <div v-else-if="error" class="error-state">{{ error }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { exportToExcel } from '@/utils/excelExport'
import { useProductionReportStore } from '@/storeProductionReport'
import useApplicationStore from '@/store'

const loading = ref(false)
const error = ref<string | null>(null)
const exportLoading = ref(false)

const reportStore = useProductionReportStore()
const store = useApplicationStore()

// Пагинация
const currentPage = ref(1)
const pageSize = ref(100)
const total = ref(0)

const isLoading = ref(false)

const emit = defineEmits<{
  (e: 'cell-dblclick', payload: { column: string; value: string | null | undefined }): void
}>()

const emitCellDblClick = (column: string, value: string | null | undefined) => {
  emit('cell-dblclick', { column, value })
}

const refresh = async () => {
  isLoading.value = true
  try {
    const result = await store.fetchProductionReportData({
      stock_ids: reportStore.selectedStore?.toString() ?? '',
      material_ids: reportStore.selectedMaterial?.toString() ?? '',
      product_ids: reportStore.selectedProduct?.toString() ?? '',
      process_ids: reportStore.selectedProcess?.toString() ?? '',
      operation_ids: reportStore.selectedOperation?.toString() ?? '',
      schema_ids: reportStore.selectedSchema?.toString() ?? '',
      date_start: reportStore.selectedPeriod?.[0] ?? '',
      date_end: reportStore.selectedPeriod?.[1] ?? '',
      page: currentPage.value,
      limit: pageSize.value,      
    })
    total.value = Number(result.total) ?? 0
    store.production_report_data = result.data ?? []
  } catch (error) {
    console.error('fetchProductionReportData error:', error)
    store.production_report_data = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [
    reportStore.selectedStore,
    reportStore.selectedMaterial,
    reportStore.selectedProduct,
    reportStore.selectedProcess,
    reportStore.selectedOperation,
    reportStore.selectedSchema,
    reportStore.selectedPeriod,
  ],
  () => {
    currentPage.value = 1
  },
  { deep: true }
);

defineExpose({ refresh })

const formatWeight = (value: number | null | undefined): string => {
  if (value == null) return '-'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const onCurrentChange = (page: number) => {
  currentPage.value = page
  refresh()
}

const onSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1 // при смене размера страницы сбрасываем на первую
  refresh()
}

const exportToExcelClick = () => {


  const sheets = [
    {
      name: 'Отчет по переработке',
      columns: [
        { key: 'operation_date_in', header: 'Дата переработки' },
        { key: 'process', header: 'Техпроцесс' },
        { key: 'operation', header: 'Операция' },
        { key: 'material', header: 'Материал' },
        { key: 'weight_in', header: 'Списано' },
        { key: 'product', header: 'Продукт' },
        { key: 'weight_out', header: 'Принято' },
        { key: 'operation_date_out', header: 'Дата приема' },
      ],
      data: store.production_report_data || [],
    },
  ]

  exportToExcel(sheets, 'production_report')
}
</script>

<style scoped>
.tables-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: calc(100vh - 120px);
  max-height: calc(100vh - 20px);
  overflow: hidden;
  box-sizing: border-box;
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
  overflow-x: auto;
  overflow-y: auto;
  padding-right: 4px;
  width: 100%;
  box-sizing: border-box;
}
.tables-scroll-area::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.tables-scroll-area::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.tables-scroll-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
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
.dbl-click-cell {
  cursor: pointer;
  user-select: none;
}
.pagination-area {
  padding: 12px 0 8px;
  text-align: right;
}
</style>
