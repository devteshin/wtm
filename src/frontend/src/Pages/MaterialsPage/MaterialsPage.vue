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
          v-model:store-filter="selectedStore"
          v-model:material="selectedMaterial"
          v-model:material-group="selectedMaterialGroup"
          :show-date="false"
          :show-period="false"
          show-store
          :show-schema="false"
          :show-supplier="false"
          :show-process="false"
          :show-operation="false"
          show-material-group
          :show-material-zone="false"
          show-material
          :show-product="false"
          :show-operation-graph="false"
          :show-material-graph="false"
          :show-product-graph="false"
          :show-product-coeff-tables="false"
          @make-report="handleMakeReport"
        >
          <template #after-material>
            <el-form-item>
              <div class="switch-container">
                <el-switch
                  v-model="isDetailedMode"
                  :disabled="isDetailedModeDisabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                  @change="handleSwitchDetailedMode"
                />
                <span class="switch-description">
                  развернуть материалы
                </span>
              </div>
            </el-form-item>
            <el-form-item>
              <div class="switch-container">
                <el-switch
                  v-model="isOnlyNonZeroMode"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                />
                <span class="switch-description">
                  {{ isOnlyNonZeroMode ? 'только материалы в наличие на складе' : 'все материалы (включая отсутствующие)' }}
                </span>
              </div>
            </el-form-item>
          </template>
          <template #actions>

            <el-form-item label="Показатели">
              <IndicatorsTable v-model="tableCondition" />
            </el-form-item>

            <el-form-item>
              <div class="switch-container">
                <el-switch
                  v-model="isElementOrderMode"
                  :disabled="isElementOrderModeDisabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                />
                <span class="switch-description">
                  {{ isElementOrderMode ? 'сортировка по первому показателю' : 'сортировка по материалам' }}
                </span>
              </div>
            </el-form-item>

            <el-button
              type="primary"
              @click="handleMakeReport"
              class="apply-button"
            >
              Сформировать
            </el-button>

            <el-form-item>
              <div class="switch-container">
                <el-switch
                  v-model="isSelectionEnabled"
                  :disabled="isSelectionModeDisabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                />
                <span class="switch-description">
                  {{ isSelectionEnabled ? 'выбор материалов доступен' : 'выбор материалов отключен' }}
                </span>
              </div>
            </el-form-item>
            <el-form-item>
              <div class="switch-container">
                <el-switch
                  v-model="isSelectionControlEnabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                />
                <span class="switch-description">
                  {{ isSelectionControlEnabled ? 'подбор материалов открыт' : 'подбор материалов скрыт' }}
                </span>
              </div>
            </el-form-item>
          </template>
        </ReportFilters>

      </div>
    </el-splitter-panel>

    <el-splitter-panel>
      <div class="panel-inner">

        <el-container
          class="right-container"
          direction="vertical"
        >
          <el-main class="table-container">
            <MaterialsTable ref="tableRef" @cell-dblclick="onCellDblClick" class="materials-table"/>
            <SelectionPanel
              ref="selectionPanelRef"
              v-if="reportStore.isSelectionControlEnabled"
              class="selection-footer"
              @remove-material="onRemoveMaterial"
              @confirm-selection="onConfirmSelection"
              @cancel="onCancelSelection"              
            />
          </el-main>

        </el-container>

      </div>
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup lang="ts">
import { onMounted, Ref } from "vue";
import { ref, computed } from "vue";
import useApplicationStore from "@/store";
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import ReportFilters from '@/components/ReportFilters.vue'
import IndicatorsTable from './IndicatorsTable.vue'
import MaterialsTable from './MaterialsTable.vue'
import SelectionPanel from './SelectionPanel.vue'
import { watch } from 'vue';
import { addUniqueIdsByValue } from '@/utils/tableCellDoubleClick'

const filtersRef = ref<InstanceType<typeof ReportFilters> | null>(null)
const tableRef = ref<InstanceType<typeof MaterialsTable> | null>(null);
const selectionPanelRef = ref<InstanceType<typeof SelectionPanel> | null>(null);

const sidebarSize = ref(400) // стартовая ширина панели фильтров, px  

const store = useApplicationStore()
const reportStore = useMaterialsReportStore()

const isOperationDocMode =ref(false);
const isOperationListMode =ref(false);

const selectedStore = computed({
  get: () => reportStore.selectedStore,
  set: (value) => reportStore.setFilters({ selectedStore: value })
});
const selectedMaterialGroup = computed({
  get: () => reportStore.selectedMaterialGroup,
  set: (value) => reportStore.setFilters({ selectedMaterialGroup: value })
});
const selectedMaterial = computed({
  get: () => reportStore.selectedMaterial,
  set: (value) => reportStore.setFilters({ selectedMaterial: value })
});

const isDetailedMode = computed({
  get: () => reportStore.isDetailedMode,
  set: (value) => reportStore.setFilters({ isDetailedMode: value })
});


const isOnlyNonZeroMode = computed({
  get: () => reportStore.isOnlyNonZeroMode,
  set: (value) => reportStore.setFilters({ isOnlyNonZeroMode: value })
});

const isElementOrderMode = computed({
  get: () => reportStore.isElementOrderMode,
  set: (value) => reportStore.setFilters({ isElementOrderMode: value })
});


const isSelectionEnabled = computed({
  get: () => reportStore.isSelectionEnabled,
  set: (value) => reportStore.setFilters({ isSelectionEnabled: value })
});

const isSelectionControlEnabled = computed({
  get: () => reportStore.isSelectionControlEnabled,
  set: (value) => reportStore.setFilters({ isSelectionControlEnabled: value })
});

const tableCondition = computed({
  get: () => reportStore.tableCondition,
  set: (value) => reportStore.setFilters({ tableCondition: value })
});


const emit = defineEmits<{
  'selection-confirmed': [items: frontend.IRawMaterial[]];
  'close': [];
}>();

const onConfirmSelection = (items: frontend.IRawMaterial[]) => {
  emit('selection-confirmed', items);
};

const onCancelSelection = () => emit('close');

 // Отслеживаем изменения всех фильтров и сохраняем в стор
watch(
  () => ({
    selectedStore: selectedStore.value,
    selectedMaterialGroup: selectedMaterialGroup.value,
    selectedMaterial: selectedMaterial.value,
    isDetailedMode: isDetailedMode.value,
    isOnlyNonZeroMode: isOnlyNonZeroMode.value,
    isElementOrderMode: isElementOrderMode.value,
    isSelectionEnabled: isSelectionEnabled.value,
    isSelectionControlEnabled: isSelectionControlEnabled.value,
    tableCondition: tableCondition.value,
    basicColumns: reportStore.basicColumns,
    detailedColumns: reportStore.detailedColumns,
  }),
  (newValues) => {
    reportStore.setFilters(newValues);
    reportStore.saveToStorage();
  },
  { deep: true }
);

const basicColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', fixed: 'left', align: 'left' },
  { prop: 'material', label: 'Материал', width: '300', fixed: 'left', align: 'left' },
  { prop: 'tare_type', label: 'Тара', width: '80', align: 'left' },
  { prop: 'material_mark', label: 'Вид', width: '100', align: 'left' },
  { prop: 'material_group', label: 'Группа', width: '100', align: 'left' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100', align: 'right', formatType: 'integer' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100', align: 'right', formatType: 'weight' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100', align: 'right', formatType: 'weight' }
]);

const detailedColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', fixed: 'left', align: 'left' },
  { prop: 'material', label: 'Материал', width: '300', fixed: 'left', align: 'left' },
  { prop: 'tare_type', label: 'Тара', width: '80', align: 'left' },
  { prop: 'tare_id', label: 'Номер', width: '80', align: 'left' },
  { prop: 'tare_mark', label: 'Маркировка', width: '120', align: 'left' },
  { prop: 'material_mark', label: 'Вид', width: '100', align: 'left' },
  { prop: 'material_group', label: 'Группа', width: '100', align: 'left' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100', align: 'right', formatType: 'integer' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100', align: 'right', formatType: 'weight' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100', align: 'right', formatType: 'weight' }
]);

const selectionColumns = ref([
  { prop: 'stock_name', label: 'Склад', minWidth: '80', align: 'left' },
  { prop: 'material', label: 'Материал', minWidth: '300', align: 'left' },
  { prop: 'rest_tare_amount', label: 'Кол-во', minWidth: '100', align: 'right', formatType: 'integer' },
  { prop: 'rest_net_weight', label: 'Нетто', minWidth: '100', align: 'right', formatType: 'weight' },
]);


onMounted(async () => {
  store.loading = true;
  try {
    
    reportStore.loadFromStorage();

    // для того чтобы применить возможное изменение свойств basicColumns, detailedColumns, 
    // при воостановлении из localstorage переписываем их
    // необходимо когда добавляем/удаляем или изменяем свойcтва
    const existingPercentBasic = reportStore.basicColumns.filter(
      col => col.prop.includes('_percent')
    );
    const existingPercentDetailed = reportStore.detailedColumns.filter(
      col => col.prop.includes('_percent')
    );
    const existingPercentSelection = reportStore.selectionColumns.filter(
      col => col.prop.includes('_percent')
    );

    reportStore.basicColumns = [...basicColumns.value, ...existingPercentBasic];
    reportStore.detailedColumns = [...detailedColumns.value, ...existingPercentDetailed];
    reportStore.selectionColumns = [...selectionColumns.value, ...existingPercentSelection];

    // Проверяем флаги и запускаем отчёт
    reportStore.isExternalSelectionMode =
      reportStore.isOperationDocAutoGenerateReport ||
      reportStore.isOperationListAutoGenerateReport;

    if (reportStore.isOperationDocAutoGenerateReport) {
      isOperationDocMode.value = true;
      reportStore.isOperationDocAutoGenerateReport = false;

      if (reportStore.selectedStore.length && reportStore.selectedMaterial.length) {
        await tableRef.value?.refresh();
      }
    }

    if (reportStore.isOperationListAutoGenerateReport) {
      isOperationListMode.value = true;
      reportStore.isOperationListAutoGenerateReport = false;

      if (reportStore.selectedStore.length && reportStore.selectedMaterial.length) {
        await tableRef.value?.refresh();
      }
    }


  } finally {
    store.loading = false;
  }

});


const isDetailedModeDisabled = computed(() => {
  return !(selectedMaterial.value && selectedMaterial.value.length > 0);
});

watch(isDetailedModeDisabled, (disabled) => {
  if (disabled) {
    isDetailedMode.value = false;
  }
});

const isSelectionModeDisabled = computed(() => {
  return !isDetailedMode.value;
});

watch(isSelectionModeDisabled, (disabled) => {
  if (disabled) {
    isSelectionEnabled.value = false;
  }
});

const isElementOrderModeDisabled = computed(() => {
  if (reportStore.tableCondition.length > 0 ) {
    return false;
  };
  return true;
});


const handleMakeReport = async () => {
  await tableRef.value?.refresh();
  await selectionPanelRef.value?.refresh();
};

const handleSwitchDetailedMode = () => {
  store.materials_data = [];
  
};

 const onCellDblClick = (row: any, column: any, cell: HTMLElement, event: MouseEvent) => {
  const columnProp = column.property; // именно property, а не prop
  const value = row[columnProp];

  if (value == null || value === '-' || value === '') {
    return;
  }

  const valuesArray = String(value).split(',').map(item => item.trim()).filter(Boolean);
  if (valuesArray.length === 0) {
    return;
  } 

  let optionList: Array<{ id: number; name: string }> = [];
  let selectedRef: Ref<Array<number>> | undefined;

  switch (columnProp) {
    case 'material':
      optionList = store.materials_meta?.material_list ?? [];
      selectedRef = selectedMaterial;
      break;

    default:
      console.warn('Неизвестная колонка для дабл-клика:', columnProp);
      return;
  }

  if (!selectedRef) return;

  addUniqueIdsByValue(optionList, selectedRef, value)

  // Обновляем опции внутри ReportFilters
  if (columnProp === 'material') {
    filtersRef.value?.refreshOptions(columnProp, selectedRef.value)
  }

};

const onRemoveMaterial = async (materialId: number) => {
  await tableRef.value?.unselectByMaterialId(materialId);
};

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

.right-container {
  height: 100%;
  width: 100%;
}

.table-container {
  flex: 0 0 100%;
  padding: 0 20px 20px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden; /* перебить дефолтный overflow: auto у el-main,
                       чтобы скролл крутился внутри таблиц, а не в main */
}

.materials-table {          /* это корневой класс MaterialsTable */
  flex: 1 1 70%;
  min-height: 0;
}

.selection-footer {
  flex: 0 0 30%;
  min-height: 0;
  overflow: hidden;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-description {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

:deep(.el-table) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-table__body tr:hover) {
  cursor: pointer;
}

.apply-button {
  margin-top: 20px;
  margin-bottom: 20px;
  width: 100%;
}

.no-data-message {
  text-align: center;
  color: #999;
  font-size: 14px;
}

</style>