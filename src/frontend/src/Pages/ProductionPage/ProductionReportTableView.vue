<template>
    <div class="tables-wrapper">
      <!-- Панель управления -->
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

      <!-- Скроллируемая область с таблицами -->
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
            style="width: 100%; height: 100%;"
            border
            stripe
          >
            <el-table-column prop="operation_date_in" label="Дата переработки" width="120" />
            
            <!-- Техпроцесс -->
            <el-table-column prop="process" label="Техпроцесс" min-width="140">
              <template #default="scope">
                <span class="dbl-click-cell" @dblclick.stop="emitCellDblClick ('process', scope.row.process)">
                  {{ scope.row.process ?? '-' }}
                </span>
              </template>
            </el-table-column>

            <!-- Операция -->
            <el-table-column prop="operation" label="Операция" min-width="160">
              <template #default="scope">
                <span class="dbl-click-cell" @dblclick.stop="emitCellDblClick ('operation', scope.row.operation)">
                  {{ scope.row.operation ?? '-' }}
                </span>
              </template>
            </el-table-column>

            <!-- Материал -->
            <el-table-column prop="material" label="Материал" min-width="180">
              <template #default="scope">
                <span class="dbl-click-cell" @dblclick.stop="emitCellDblClick('material', scope.row.material)">
                  {{ scope.row.material ?? '-' }}
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="weight_in" label="Списано" width="90" align="right">
              <template #default="scope">
                {{ formatWeight(scope.row.weight_in) }}
              </template>
            </el-table-column>

            <!-- Продукт -->
            <el-table-column prop="product" label="Продукт" min-width="160">
              <template #default="scope">
                <span class="dbl-click-cell" @dblclick.stop="emitCellDblClick('product', scope.row.product)">
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
    </div>

    <!-- Состояние загрузки -->
    <div v-if="loading" class="overlay-loader">Загрузка данных...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { exportToExcel } from '@/utils/excelExport'
import { useProductionReportStore } from '@/storeProductionReport'
import useApplicationStore from '@/store'

const loading = ref(false)
const error = ref<string | null>(null)
const exportLoading = ref(false)

const reportStore = useProductionReportStore()
const store = useApplicationStore()

const data = ref<any[]>([])
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
    await store.fetchProductionReportData({
      stock_ids: reportStore.selectedStore?.toString() ?? '',
      material_ids: reportStore.selectedMaterial?.toString() ?? '',
      product_ids: reportStore.selectedProduct?.toString() ?? '',
      process_ids: reportStore.selectedProcess?.toString() ?? '',
      operation_ids: reportStore.selectedOperation?.toString() ?? '',
      schema_ids: reportStore.selectedSchema?.toString() ?? '',
      date_start: reportStore.selectedPeriod?.[0] ?? '',
      date_end: reportStore.selectedPeriod?.[1] ?? '',
    })
  } catch (error) {
    console.error('fetchProductionReportData error:', error)
    data.value = []
  } finally {
    isLoading.value = false
  }
}

defineExpose({ refresh })

const formatWeight = (value: number | null | undefined): string => {
  if (value == null) return '-'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const exportToExcelClick = () => {
  const sheets = [
    {
      name: 'Операции и коэффициенты',
      columns: [
        { key: 'operation_sequence', header: 'Операция' },
        { key: 'koeff', header: 'Коэффициент' },
        { key: 'next_operation', header: 'Следующая операция' },
      ],
      data: store.production_graph_data_product?.operation_sequences || [],
    },
    {
      name: 'Материалы (вес списания)',
      columns: [
        { key: 'material', header: 'Материал' },
        { key: 'adjusted_weight_out', header: 'Скорректированный вес (кг)' },
      ],
      data: store.production_graph_data_product?.raw_material_node || [],
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
  height: calc(100vh - 120px); /* Подстраивается под экран, включая планшеты */
  max-height: calc(100vh - 20px);
  overflow: hidden; /* Важно: родитель не скроллится, скролл только внутри */
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

/* Область со скроллом: занимает всё оставшееся место */
.tables-scroll-area {
  flex: 1;
  min-height: 0; /* Критично для flex-скролла внутри flex-контейнера */
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px; /* Небольшой отступ, чтобы скроллбар не прилипал к контенту */
}

.table-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

/* Стили для состояний загрузки и ошибки */
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

/* Кастомизация скроллбара (для Chrome/Edge/Safari) */
.tables-scroll-area::-webkit-scrollbar {
  width: 8px;
}
.tables-scroll-area::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.tables-scroll-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.dbl-click-cell {
  cursor: pointer;
  /* опционально: можно добавить лёгкое выделение при наведении */
  user-select: none; /* чтобы не выделялся текст при быстрых кликах */
}

</style>
