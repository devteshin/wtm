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
              <el-table :data="tableCondition" style="width: 100%" max-height="250">
                <el-table-column prop="element" label="">
                  <template #default="scope">
                    <el-select v-model="scope.row.element" style="width: 90px">
                      <el-option
                        v-for="item in store.materials_meta?.material_group_list
                            .filter(item => (item.type == 0 || item.type == 1) && !tableCondition.map(item => item.element).includes(item.code))"
                        :key="item.code"
                        :label="item.code"
                        :value="item.code"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column prop="min" label="min">
                  <template #default="scope">
                    <el-input type="number" v-model.number="scope.row.min" placeholder=""></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="max" label="max">
                  <template #default="scope">
                    <el-input type="number" v-model.number="scope.row.max" placeholder=""></el-input>
                  </template>
                </el-table-column>
                <el-table-column fixed="right" label="" width="40">
                  <template #default="scope">
                    <el-button
                      link
                      type="danger"
                      size="small"
                      @click.prevent="deleteRow(scope.$index)"
                    >
                      <Delete style="width: 16px; height: 16px;" />
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button class="mt-4" style="width: 100%" @click="onAddItem">
                Добавить
              </el-button>
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
            <!-- Скелетон при инициализации и формировании отчёта -->
            <el-skeleton v-if="isSkeletonLoading" animated />

            <!-- Таблица с данными -->
            <template v-else>
              <div class="table-wrapper">
                <div v-if="!reportStore.tableData?.length" class="no-data-message">
                  Нет данных для отображения
                </div>
                <el-table
                  v-else
                  ref="tableRef"
                  :data="reportStore.tableData"
                  reserve-selection
                  :row-key="getRowKey"
                  style="width: 100%; height: 100%;"
                  stripe
                  border
                  show-overflow-tooltip
                  virtual-scroll
                  :row-class-name="getRowClassName"
                  @cell-dblclick="(row, column, cell, event) => onCellDblClick(row, column, cell, event)"
                  @selection-change="handleSelectionChange"
                  @row-click="onRowClick"
                >
                  <!-- Колонка выбора (если включена) -->
                  <el-table-column
                    v-for="column in selectionColumn"
                    :key="column.type"
                    :type="column.type"
                    :width="column.width"
                    :align="column.align"
                    :selectable="column.selectable"
                  />

                  <!-- Остальные колонки -->
                  <el-table-column
                    v-for="column in dataColumns"
                    :key="column.prop"
                    :prop="column.prop"
                    :label="column.label"
                    :width="column.width"
                    :fixed="column.fixed"
                    :align="column.align"
                  >
                    <template #default="scope">
                      {{ formatCell(scope.row[column.prop], column.formatType) }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </el-main>

        </el-container>

      </div>
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, Ref } from "vue";
import { ref, computed } from "vue";
import useApplicationStore from "@/store";
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import ReportFilters from '@/components/ReportFilters.vue'
import { Delete, FolderOpened } from '@element-plus/icons-vue';
import { watch } from 'vue';
import { ElMessageBox } from "element-plus";
import { addUniqueIdsByValue } from '@/utils/tableCellDoubleClick'
import { formatTwoDecimal, formatHighPrecision, formatInteger } from '@/utils/numberFormat';

const filtersRef = ref<InstanceType<typeof ReportFilters> | null>(null)

const sidebarSize = ref(400) // стартовая ширина панели фильтров, px  

interface Column {
  prop: string;
  label: string;
  width: string;
  fixed?: string;
  align?: string;
  formatType?: string;
};


const getFormatter = (type?: string) => {
  // Если тип не задан или невалиден — возвращаем «как есть»
  if (!type) {
    return (val: any) => (val == null ? '' : String(val));
  }

  switch (type) {
    case 'weight': return formatTwoDecimal;
    case 'percent': return formatTwoDecimal;
    case 'high': return formatHighPrecision;
    case 'integer': return formatInteger;
    default:
      // Неизвестный тип → тоже «как есть», чтобы не ломать отображение
      return (val: any) => (val == null ? '-' : String(val));
  }
};

const formatCell = (value: any, type?: string) => {
  const formatter = getFormatter(type);
  return formatter(value);
};

const store = useApplicationStore()
const reportStore = useMaterialsReportStore()

const isAutoSelectionUpdate = ref(false);
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

const isSelectionDetailedMode = computed({
  get: () => reportStore.isSelectionDetailedMode,
  set: (value) => reportStore.setFilters({ isSelectionDetailedMode: value })
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

let lastClickedIndex = -1;

const updateSelectionData = (selection: any[]) => {
  const selectionToAdd: typeof reportStore.tableData[number][] = [];
  const selectionToRemove: typeof reportStore.tableData[number][] = [];
  let rowInSelection = false;
  let rowInSelected = false;

  const selectedKeys = new Set(
    selection.map(row => getRowKey(row))
  );
  const selectionKeys = new Set(
    reportStore.selectionData.map(row => getRowKey(row))
  );

  reportStore.tableData.forEach((row) => {
    rowInSelection = selectionKeys.has(getRowKey(row));
    rowInSelected = selectedKeys.has(getRowKey(row));
    if (rowInSelected && !rowInSelection) {
        selectionToAdd.push(row);
      }
      else if (!rowInSelected && rowInSelection) {
        selectionToRemove.push(row);
      }
    });

  // Добавление новых выбранных строк
  if (selectionToAdd.length > 0) {
    const currentSelection = reportStore.selectionData;
    reportStore.setSelectionData([
      ...currentSelection,
      ...selectionToAdd
    ]);
  }

  // Удаление строк, которые больше не выбраны
  if (selectionToRemove.length > 0) {
    const currentSelection = reportStore.selectionData;
    const keysToRemove = new Set(selectionToRemove.map(row => getRowKey(row)));
    const updatedSelectionData = currentSelection.filter(
      row => !keysToRemove.has(getRowKey(row))
    );
    reportStore.setSelectionData(updatedSelectionData);
  }

};  

function onRowClick(row, column, event) {
  if (!isSelectionEnabled.value){
    return;
  }
  const rows = reportStore.tableData
  const currentIndex = rows.indexOf(row)

  if (currentIndex === -1) return

  if (event.shiftKey && lastClickedIndex !== -1) {

    event.preventDefault()
    window.getSelection()?.removeAllRanges()

    const start = Math.min(lastClickedIndex, currentIndex)
    const end = Math.max(lastClickedIndex, currentIndex)

    isAutoSelectionUpdate.value = true
    for (let i = start; i <= end; i++) {
      const r = rows[i]
      if (isRowSelectable(r)) {
        tableRef.value.toggleRowSelection(r, true)
      }
    }
    isAutoSelectionUpdate.value = false
    const selection = tableRef.value.getSelectionRows()
    handleSelectionChange(selection);
  }

  lastClickedIndex = currentIndex
}

const handleSelectionChange = async (selection: any[]) => {
    if (!isAutoSelectionUpdate.value) {
      updateSelectionData(selection);

  };
};


 // Отслеживаем изменения всех фильтров и сохраняем в стор
watch(
  () => ({
    selectedStore: selectedStore.value,
    selectedMaterialGroup: selectedMaterialGroup.value,
    selectedMaterial: selectedMaterial.value,
    isDetailedMode: isDetailedMode.value,
    isSelectionDetailedMode: isSelectionDetailedMode.value,
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


const isSkeletonLoading = ref(true); // Для скелетона при инициализации
let loadingTimeout: NodeJS.Timeout | null = null;
let stopDataWatcher: (() => void) | null = null;

const startLoading = () => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  if (stopDataWatcher) {
    stopDataWatcher();
  }

  isSkeletonLoading.value = true; // Включаем скелетон

  loadingTimeout = setTimeout(() => {
    console.warn('Таймаут загрузки: скрываем скелетон принудительно');
    isSkeletonLoading.value = false;
  }, 5000);

  stopDataWatcher = watch(
    () => reportStore.tableData,
    (data) => {
      if (data && data.length > 0) {
        setTimeout(() => {
          isSkeletonLoading.value = false;
          if (loadingTimeout) clearTimeout(loadingTimeout);
          if (stopDataWatcher) stopDataWatcher();
        }, 200);
      } else if (data && data.length === 0) {
        isSkeletonLoading.value = false;
        if (loadingTimeout) clearTimeout(loadingTimeout);
        if (stopDataWatcher) stopDataWatcher();
      }
    },
    { immediate: true }
  );
};

onMounted(async () => {
  startLoading();

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

    reportStore.basicColumns = [...basicColumns.value, ...existingPercentBasic];
    reportStore.detailedColumns = [...detailedColumns.value, ...existingPercentDetailed];

    // Проверяем флаги и запускаем отчёт
    if (reportStore.isOperationDocAutoGenerateReport) {
      isOperationDocMode.value = true;
      reportStore.isOperationDocAutoGenerateReport = false;

      if (reportStore.selectedStore.length && reportStore.selectedMaterial.length) {
        await handleMakeReport();
      }
    }

    if (reportStore.isOperationListAutoGenerateReport) {
      isOperationListMode.value = true;
      reportStore.isOperationListAutoGenerateReport = false;

      if (reportStore.selectedStore.length && reportStore.selectedMaterial.length) {
        await handleMakeReport();
      }
    }


  } finally {
    store.loading = false;
  }

});



onUnmounted(() => {
  // Очистка ресурсов
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  if (stopDataWatcher) {
    stopDataWatcher();
  }
});


const getRowKey = (row: any): string => {
  const key_material = row.key_material || 'unknown';
  const stock_id = row.stock_id || 'unknown';
  return `${key_material}_${stock_id}`;

  
};

const isRowSelectable = (row: any): boolean => {
  return row.stock_name !== 'Итого';
};

const tableRef = ref<any>(null);

const restoreSelection = () => {
    // Проверка доступности выбора
  if (!isSelectionEnabled.value) {
    return;
  }

  // Полная проверка готовности
  if (!tableRef.value) {
    console.warn('Table not mounted yet, skipping restoreSelection');
    return;
  }
  if (!reportStore.tableData || reportStore.tableData.length === 0) {
    console.warn('No table data available, skipping restoreSelection');
    return;
  }

  isAutoSelectionUpdate.value = true; // Блокируем обновление

  tableRef.value.clearSelection();

  const selectionKeys = new Set(
    reportStore.selectionData.map(row => getRowKey(row))
    );

  reportStore.tableData.forEach((row) => {
    if (row.stock_name !== 'Итого' && selectionKeys.has(getRowKey(row))) {
      tableRef.value.toggleRowSelection(row, true);
    }
  });

  nextTick(() => {
    isAutoSelectionUpdate.value = false; // Снимаем блокировку после завершения
  });

};


const isTotalRow = (row: any): boolean => {
  return row.stock_name === 'Итого';
};

const getRowClassName = ({ row }: { row: any }): string => {
  if (isTotalRow(row)) {
    return 'total-row';
  }
  return '';
};


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

const elementOrder = ():string => {
  if (reportStore.tableCondition.length > 0 && isElementOrderMode.value ) {
    return reportStore.tableCondition[0].element;
  };
  return '';
};  

const selectionColumn = computed(() =>
  isSelectionEnabled.value
    ? [{
        type: 'selection',
        width: '55',
        align: 'center',
        selectable: isRowSelectable
      }]
    : []
);

const dataColumns = computed(() =>
  isDetailedMode.value ? reportStore.detailedColumns  : reportStore.basicColumns
);  


// Watcher 1 — реакция на изменение данных таблицы
watch(
  () => reportStore.tableData,
  (newData) => {
    if (newData && newData.length > 0 && tableRef.value) {
      nextTick(() => {
        restoreSelection();
      });
    }
  },
  { deep: true }
);

// Watcher 2 — реакция на появление инстанса таблицы (после скрытия скелетона)
watch(
  () => tableRef.value,
  (tableInstance) => {
    if (tableInstance && reportStore.tableData?.length > 0) {
      nextTick(() => {
        restoreSelection();
      });
    }
  }
);


function configuringReportTables() {
  // Удаляем старые колонки с процентами перед добавлением новых
  if (isDetailedMode.value) {
    reportStore.detailedColumns = reportStore.detailedColumns.filter(col => !col.prop.includes('_percent'));
  } else {
    reportStore.basicColumns = reportStore.basicColumns.filter(col => !col.prop.includes('_percent'));
  };

  const percent_items: Column[] = [];
  for (const item of tableCondition.value) {
    const item_element = item.element
    if (item_element !== '') {
      percent_items.push(
          { prop: item_element + '_percent', 
            label: item_element + ', ' + store.materials_meta?.material_group_list.find(item => item.code === item_element)?.umi ,
            width: '100',
            align: 'right',
            formatType: 'percent'
          }
        );
    }
  }

  if (isDetailedMode.value) {
    reportStore.detailedColumns.push(...percent_items);
  } else {
    reportStore.basicColumns.push(...percent_items);
  }

};


const makeMaterialReport = async () => {
  isSkeletonLoading.value = true; // Включаем скелетон при формировании отчёта

  store.loading = true;
  reportStore.setTableData([]);
  let total_rest_gross_weight = 0;
  let total_rest_net_weight = 0;
  let total_rest_tare_amount = 0;

  

  const indicators_list = tableCondition.value.map(item => item.element).filter(element => element !== '').join('|');
  const indicator_conditions_list = tableCondition.value.map((item) => {
    if (item.element != '') {
      const item_element = item.element 
      let item_min = item.min;
      if (item_min ==  '') {
        item_min = store.materials_meta?.material_group_list.find(item => item.code === item_element)?.min_value.toString() ?? '0' 
      };
      let item_max = item.max;
      if (item.max ==  '') {
        item_max = store.materials_meta?.material_group_list.find(item => item.code === item_element)?.max_value.toString() ?? '100' 
      };
      return item_min + '|' + item_max;  
    };
    return;
  }).join('|');


  try {
    await store.fetchMaterialsData({
      materials: selectedMaterial.value.toString(),
      stocks: reportStore.selectedStore.toString(),
      material_groups: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
      indicators: indicators_list,
      indicator_conditions: indicator_conditions_list,
      detailed_mode: isDetailedMode.value ? "detailed" : "summary",
      only_non_zero_mode: isOnlyNonZeroMode.value,
      element_order: elementOrder()
    });

    
    if (store.materials_data && Array.isArray(store.materials_data)) {
      reportStore.tableData = store.materials_data;
      if (reportStore.tableData.length > 1) {
        total_rest_gross_weight = reportStore.tableData.map(item => item['rest_gross_weight']).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        total_rest_net_weight = reportStore.tableData.map(item => item['rest_net_weight']).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        total_rest_tare_amount = reportStore.tableData.map(item => item['rest_tare_amount']).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        reportStore.setTableData([
          ...reportStore.tableData,
          {
            stock_name: 'Итого',
            material: '',
            tare_type: '',
            tare_id: '',
            tare_mark: '',
            material_mark: '',
            material_group: '',
            rest_tare_amount: total_rest_tare_amount,
            rest_net_weight: total_rest_net_weight,
            rest_gross_weight: total_rest_gross_weight
          }
        ]);
      };
    };
  } catch (error) {
    console.error('Ошибка при формировании отчёта:', error);
  } finally {
    store.loading = false;
    isSkeletonLoading.value = false; // Выключаем скелетон после завершения
  }
};

const handleMakeReport = async () => {
  try {
    configuringReportTables();
  } catch (error) {
    console.error('Ошибка при настройке колонок:', error);
    return;
  }

  try {
    await makeMaterialReport();
  } catch (error) {
    console.error('Ошибка при формировании таблицы материалов:', error);
    return;
  }


};

const handleSwitchDetailedMode = () => {
  reportStore.tableData = [];
  
};


const deleteRow = (index: number) => {
  tableCondition.value.splice(index, 1)
};

const onAddItem = () => {
  tableCondition.value.push({
    element: '',
    min: '',
    max: ''
  })
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
 
const emit = defineEmits<{
  (e: 'selection-confirmed', items: frontend.IRawMaterial[]): void;
  (e: 'close'): void;
}>();


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

/* Таблица занимает 70% высоты, если футер виден, иначе 100% */
.table-container {
  flex: 0 0 100%;
  padding: 0 20px 20px;
  box-sizing: border-box;
  position: relative;
}


.table-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  border-radius: 4px;
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

:deep(.total-row) {
  background-color: #f0f9ff !important;
  font-weight: bold !important;
  color: #1d4ed8 !important;
}

:deep(.total-row td) {
  background-color: #e0f2fe !important;
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