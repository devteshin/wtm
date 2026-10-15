<template>
  <el-splitter class="page-splitter">
    <el-splitter-panel
      v-model:size="sidebarSize"
      :min="280"
      collapsible
    >
      <div class="panel-inner sidebar-inner">

        <ReportFilters
          ref="filtersRef"
          v-model:period="selectedPeriod"
          v-model:store-filter="selectedStore"
          v-model:material="selectedMaterial"
          v-model:material-zone="selectedMaterialZone"
          show-period
          show-store
          show-material-zone
          show-material
          :show-date="false"
          :show-schema="false"
          :show-supplier="false"
          :show-process="false"
          :show-operation="false"
          :show-material-group="false"
          :show-product="false"
          :show-operation-graph="false"
          :show-material-graph="false"
          :show-product-graph="false"
          :show-product-coeff-tables="false"
          @make-report="handleMakeReport"
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
      </div>

    </el-splitter-panel>

    <el-splitter-panel>
      <div class="panel-inner">
        <el-main class="content-area">
          <div class="report-table-wrapper">
            <ZoneDocsTableView
              ref="reportTableRef"
              @cell-dblclick="onCellDblClick"
            />
          </div>
        </el-main>
      </div>
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup lang="ts">
import { ref, computed, Ref } from 'vue'
import useApplicationStore from '@/store'
import { useZoneDocsStore } from '@/storeZoneDocs'
import ReportFilters from '@/components/ReportFilters.vue'
import { ElMessageBox } from 'element-plus'
import { addUniqueIdsByValue } from '@/utils/tableCellDoubleClick'
import ZoneDocsTableView from './ZoneDocsTableView.vue'

const reportTableRef = ref<typeof ZoneDocsTableView | null>(null)
const filtersRef = ref<InstanceType<typeof ReportFilters> | null>(null)

const sidebarSize = ref(400) // стартовая ширина панели фильтров, px

const store = useApplicationStore()
const zoneDocsStore = useZoneDocsStore()

// ── v-model прокси для ReportFilters ──
// (нужны и для onCellDblClick — addUniqueIdsByValue работает с Ref)

const selectedStore = computed({
  get: () => zoneDocsStore.selectedStore,
  set: (value) => zoneDocsStore.setFilters({ selectedStore: value }),
})

const selectedMaterial = computed({
  get: () => zoneDocsStore.selectedMaterial,
  set: (value) => zoneDocsStore.setFilters({ selectedMaterial: value }),
})

const selectedMaterialZone = computed({
  get: () => zoneDocsStore.selectedMaterialZone,
  set: (value) => zoneDocsStore.setFilters({ selectedMaterialZone: value }),
})

const selectedPeriod = computed({
  get: () => zoneDocsStore.selectedPeriod,
  set: (value) => zoneDocsStore.setFilters({ selectedPeriod: value }),
})


zoneDocsStore.loadFromStorage()

// ── Кнопка «Сформировать» ──

const handleMakeReport = () => {
  zoneDocsStore.saveToStorage()
  reportTableRef.value?.refresh()
}

// ── Двойной клик по ячейке таблицы ──

const onCellDblClick = ({ column, value }: { column: string; value: string | null | undefined }) => {
  if (value == null || value === '-' || value === '') return

  const valuesArray = value.split(',').map(item => item.trim()).filter(Boolean)
  if (valuesArray.length === 0) return

  let optionList: Array<{ id: number; name: string }> = []
  let selectedRef: Ref<Array<number>> | undefined

  switch (column) {
    case 'material':
      optionList = store.materials_meta?.material_list ?? []
      selectedRef = selectedMaterial
      break
    case 'zone':
      optionList = store.materials_meta?.zone_list ?? []
      selectedRef = selectedMaterialZone
      break
    default:
      console.warn('Неизвестная колонка для дабл-клика:', column)
      return
  }

  if (!selectedRef) return

  addUniqueIdsByValue(optionList, selectedRef, value)

  // Обновляем опции внутри ReportFilters
  if (column === 'material' || column === 'zone') {
    filtersRef.value?.refreshOptions(column, selectedRef.value)
  }
}

</script>

<style scoped>

.page-splitter {
  height: calc(100vh - 120px);
  width: 100%;
  
}

.panel-inner {
  height: 100%;
  box-sizing: border-box;
  
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.sidebar-inner {
  background-color: #f5f7fa;
  padding: 20px;
  overflow: auto;
}

.content-area {
  padding: 0px;
  margin-left: 20px;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.apply-button {
  margin-top: 16px;
}

.report-table-wrapper {
  flex: 1; /* Растягивается на всё свободное место */
  min-height: 0; /* КРИТИЧНО: позволяет вложенным элементам со скроллом сжиматься */
  width: 100%;
  display: flex;
  flex-direction: column;

}

</style>
