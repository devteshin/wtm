<template>
  <div class="report-table-container">
    <div v-if="isLoading" class="loading-state">
      <el-skeleton animated />
    </div>

    <div v-else-if="!store.production_report_data?.length" class="empty-state">
      Нет данных по выбранным фильтрам.
    </div>

    <el-table
      v-else
      :data="store.production_report_data"
      style="width: 100%"
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
          {{ getFormatter('weight')(scope.row[scope.row.weight_in]) }}
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
          {{ getFormatter('weight')(scope.row[scope.row.weight_out]) }}
        </template>
      </el-table-column>

      <el-table-column prop="operation_date_out" label="Дата приема" width="120" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductionReportStore } from '@/storeProductionReport'
import useApplicationStore from '@/store'
import { formatWeight, formatHighPrecision, formatInteger } from '@/utils/numberFormat';

const reportStore = useProductionReportStore()
const store = useApplicationStore()

const data = ref<any[]>([])
const isLoading = ref(false)

const getFormatter = (type: 'weight' | 'high' | 'integer') => {
  switch (type) {
    case 'weight': return formatWeight;
    case 'high': return formatHighPrecision;
    case 'integer': return formatInteger;
  }
};

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

</script>

<style scoped>
.report-table-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-style: italic;
}

.dbl-click-cell {
  cursor: pointer;
  /* опционально: можно добавить лёгкое выделение при наведении */
  user-select: none; /* чтобы не выделялся текст при быстрых кликах */
}
</style>
