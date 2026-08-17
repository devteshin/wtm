<template>
  <div class="report-table-container">
    <div v-if="isLoading" class="loading-state">
      <el-skeleton animated />
    </div>

    <div v-else-if="!data.length" class="empty-state">
      Нет данных по выбранным фильтрам.
    </div>

    <el-table
      v-else
      :data="data"
      style="width: 100%"
      border
      stripe
      :height="tableHeight"
    >
      <el-table-column prop="processing_date" label="Дата переработки" width="120" />
      <el-table-column prop="process_name" label="Техпроцесс" min-width="140" />
      <el-table-column prop="operation_name" label="Операция" min-width="160" />
      <el-table-column prop="material_name" label="Материал" min-width="180" />

      <el-table-column prop="written_off" label="Списано" width="90" align="right">
        <template #default="scope">
          {{ scope.row.written_off ?? '-' }}
        </template>
      </el-table-column>

      <el-table-column prop="product_name" label="Продукт" min-width="160" />

      <el-table-column prop="accepted" label="Принято" width="90" align="right">
        <template #default="scope">
          {{ scope.row.accepted ?? '-' }}
        </template>
      </el-table-column>

      <el-table-column prop="receipt_date" label="Дата приема" width="120" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductionReportStore } from '@/storeProductionReport'
import useApplicationStore from '@/store'

const reportStore = useProductionReportStore()
const store = useApplicationStore()

const data = ref<any[]>([])
const isLoading = ref(false)

const tableHeight = computed(() => {
  const baseHeight = window.innerHeight - 220
  return baseHeight > 300 ? baseHeight : 300
})

// Публичный метод: вызывается из родителя по кнопке «Сформировать»
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
    });

    console.log('reportData', store.production_report_data);

  } catch (error) {
    console.error('fetchProductionReportData error:', error)
    data.value = []
  } finally {
    isLoading.value = false
  }
}

// Экспортируем метод для вызова из родителя
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
</style>
