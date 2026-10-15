<template>
  <div class="tables-wrapper">
    <!-- Панель управления -->
    <div class="tables-controls">
      <h3 class="controls-title">Размещение материалов в зонах хранения</h3>
      <span class="separator-line" />

      <!-- Кнопка переключения режима: полный отчёт / пагинация -->
      <el-button
        size="small"
        type="primary"
        @click="toggleMode"
      >
        <template #icon><el-icon :size="14"><List /></el-icon></template>
        {{ isFullMode ? 'постраничный отчет' : 'полный отчёт' }}
      </el-button>

    </div>

    <!-- Область скролла таблицы -->
    <div class="tables-scroll-area">
      <div v-if="isLoading" class="loading-state">
        <el-skeleton animated />
      </div>

      <div
        v-else-if="!store.zone_docs.length"
        class="empty-state"
      >
        {{ total === 0 ? 'Нет данных по выбранным фильтрам.' : 'Загрузка данных...' }}
      </div>

      <el-table
        v-else
        :data="store.zone_docs"
        style="height: 100%"
        border
        stripe
        :table-layout="tableLayout"
      >
        <el-table-column prop="stock_name" label="Склад" min-width="120" />
        <el-table-column prop="doc_number" label="Документ" min-width="120" />
        <el-table-column prop="doc_date" label="Дата" min-width="120" />
        <el-table-column prop="zone_name" label="Зона хранения" min-width="140">
          <template #default="scope">
            <span
              class="dbl-click-cell"
              @dblclick.stop="emitCellDblClick('zone', scope.row.zone_name)"
            >
              {{ scope.row.zone_name ?? '-' }}
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
        <el-table-column prop="employee_name" label="Сотрудник" min-width="120" />
        <el-table-column prop="note" label="Комментарий" min-width="120" />
      </el-table>
    </div>

    <!-- Пагинация: показываем только в режиме пагинации -->
    <div
      v-if="isPaginatedMode && (total > 0 || store.zone_docs.length > 0)"
      class="pagination-area"
    >
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

    <!-- Глобальные лоадер и ошибка (если нужны поверх всего) -->
    <div v-if="loading" class="overlay-loader">Загрузка данных...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Download, Checked, List } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import { useZoneDocsStore } from '@/storeZoneDocs'
import useApplicationStore from '@/store'

const loading = ref(false)
const error = ref<string | null>(null)

const store = useApplicationStore()
const zoneDocsStore = useZoneDocsStore()

const tableLayout = ref<TableInstance['tableLayout']>('auto')

// Режимы отображения
const MODE_PAGINATED = 'paginated' as const
const MODE_FULL = 'full' as const
type Mode = typeof MODE_PAGINATED | typeof MODE_FULL

const mode = ref<Mode>(MODE_PAGINATED)
const isPaginatedMode = computed(() => mode.value === MODE_PAGINATED)
const isFullMode = computed(() => mode.value === MODE_FULL)

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

const toggleMode = () => {
  mode.value = isFullMode.value ? MODE_PAGINATED : MODE_FULL
  // При переключении всегда делаем refresh, чтобы подтянуть нужные данные
  currentPage.value = 1
  pageSize.value = 100
  refresh()
}

const refresh = async () => {
  isLoading.value = true
  try {
    const result = await store.fetchZoneDocs({
      stock_ids: zoneDocsStore.selectedStore?.toString() ?? '',
      material_ids: zoneDocsStore.selectedMaterial?.toString() ?? '',
      zone_ids: zoneDocsStore.selectedMaterialZone?.toString() ?? '',
      date_start: zoneDocsStore.selectedPeriod?.[0] ?? '',
      date_end: zoneDocsStore.selectedPeriod?.[1] ?? '',
      full_mode: isFullMode.value,
      limit: isFullMode.value ? 0 : pageSize.value,
      page: isFullMode.value ? 0 : currentPage.value,
    })

    total.value = Number(result.total) ?? 0
    store.zone_docs = result.data ?? []
    
  } catch (err) {
    console.error('fetchZoneDocs error:', err)
    store.zone_docs = []
    total.value = 0
    error.value = 'Не удалось загрузить данные'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [
    zoneDocsStore.selectedStore,
    zoneDocsStore.selectedMaterial,
    zoneDocsStore.selectedPeriod,
  ],
  () => {
    // При изменении фильтров сбрасываем на первую страницу и режим пагинации
    mode.value = MODE_PAGINATED
    currentPage.value = 1
    pageSize.value = 100
  },
  { deep: true }
)

defineExpose({ refresh })

const onCurrentChange = (page: number) => {
  currentPage.value = page
  refresh()
}

const onSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  refresh()
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
