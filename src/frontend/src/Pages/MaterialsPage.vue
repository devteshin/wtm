<template>
  <el-container class="page-container">
    <!-- Левый блок: панель с формой -->
    <el-aside width="400px" class="sidebar">
      <el-form label-position="top" class="filter-form">
        <el-form-item label="Склад">
          <el-select v-model="selectedStore" placeholder="Склад" clearable multiple>
            <el-option
              v-for="item in store.materials_meta?.stock_list"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Сырьевая группа">
          <el-select v-model="selectedMaterialGroup" placeholder="Сырьевая группа" clearable multiple>
            <el-option
              v-for="item in store.materials_meta?.material_group_list.filter(item => item.type != 0)"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Материал">
          <el-select v-model="selectedMaterial" placeholder="Материал" clearable multiple filterable>
             <el-option
              v-for="item in materialOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
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
                {{ isDetailedMode ? 'развернуть материалы' : 'группировать материалы' }}
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
          <el-form-item label="Показатели">
            <el-table :data="tableCondition" style="width: 100%" max-height="250">

              <el-table-column prop="element" label="">
                <template #default="scope">
                  <el-select v-model="scope.row.element"  style="width: 90px"
                  >
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
                  <el-input type="number" v-model.number="scope.row.min" placeholder=""
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column prop="max" label="max">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.max" placeholder=""
                  ></el-input>
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
      </el-form>
    </el-aside>

    <!-- Правый блок: контейнер с таблицей -->
    <el-container  class="right-container" :class="{ 'has-footer': hasFooter }" direction="vertical">
      <el-main class="table-container">
        <!-- Скелетон при инициализации и формировании отчёта -->
        <el-skeleton v-if="isSkeletonLoading" animated />

        <!-- Таблица с данными -->
        <template v-else>
          <div class="table-wrapper">
            <div v-if="!reportStore.tableData?.length">Нет данных для отображения</div>
            <el-table
              v-else
              ref="tableRef"
              :data="formattedTableData"
              reserve-selection
              :row-key="getRowKey"
              style="width: 100%; height: 100%;"
              stripe
              border
              show-overflow-tooltip
              virtual-scroll
              :row-class-name="getRowClassName"
              @cell-dblclick="handleTableCellDblClick"
              @selection-change="handleSelectionChange"
            >
            <!-- Колонка выбора (если включена) -->
            <el-table-column
              v-for="column in selectionColumn"
              :key="column.type"
              :type="column.type"
              :width="column.width"
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
            />
            </el-table>
          </div>
        </template>
      </el-main>
      <el-footer v-if="isSelectionControlEnabled" class="footer-container">
          <el-container class="footer-layout">
            <el-aside width="15%" class="footer-block footer-block-1">
              <div class="table-wrapper">
                <el-table
                  :data="reportStore.selectionIndTableData"
                  style="width: 100%; height: 100%;"
                  stripe
                  border
                  show-overflow-tooltip
                >
                <el-table-column
                  v-for="column in selectionIndColumns"
                  :key="column.prop"
                  :prop="column.prop"
                  :label="column.label"
                  :width="column.width"
                />
                </el-table>
              </div>
            </el-aside>
            <el-main class="footer-block footer-block-2">
              <div class="table-wrapper">
                <el-table
                  :data="reportStore.selectionTableData"
                  style="width: 100%; height: 100%;"
                  stripe
                  border
                  show-overflow-tooltip
                >
                  <el-table-column
                    v-for="column in selectionDataColumns"
                    :key="column.prop"
                    :prop="column.prop"
                    :label="column.label"
                    :width="column.width"
                    :fixed="column.fixed"
                  />
                  <el-table-column
                    label=""
                    width="50"
                    fixed="right"
                  >
                    <template #default="scope">
                      <el-button
                        link
                        type="danger"
                        size="small"
                        @click="handleDeleteSelectionTableRow(scope.row)"
                      >
                        <Delete style="width: 14px; height: 14px;" />
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-main>
            <el-aside width="30%" class="footer-block footer-block-3">
              <el-form label-position="top" class="filter-form">
                <el-form-item>
                  <div class="switch-container">
                    <el-switch 
                      v-model="isSelectionDetailedMode"
                      active-color="#13ce66"
                      inactive-color="#ff4949"
                      @change="handleSwitchSelectionDetailedMode"
                    />
                    <span class="switch-description">
                      {{ isSelectionDetailedMode ? 'развернуть подбор' : 'группировать подбор' }}
                    </span>
                  </div>
                </el-form-item>
                <el-form-item v-if="isSelectionDetailedMode && isOperationDocMode" style="margin-top: 16px;">
                  <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <el-button @click="handleDrawerClose">Отмена</el-button>
                    <el-button type="primary" @click="handleApplySelection">Применить выбор</el-button>
                  </div>
                </el-form-item>                 
              </el-form>
            </el-aside>
          </el-container>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, Ref } from "vue";
import { ref, computed } from "vue";
import useApplicationStore from "@/store";
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import { Delete } from '@element-plus/icons-vue';
import { watch } from 'vue';
import { ElMessageBox } from "element-plus";

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
});

interface Column {
  prop: string;
  label: string;
  width: string;
  fixed?: string;
};

interface MaterialOption {
  id: number;
  name: string;
};

interface SelectionIndicator {
  ind: string;
  percent: number;
};

const store = useApplicationStore()
const reportStore = useMaterialsReportStore()

const isAutoSelectionUpdate = ref(false);
const hasFooter = computed(() => isSelectionControlEnabled.value);
const isOperationDocMode =ref(false);

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

const materialOptions = ref<MaterialOption[]>([]);
const isOptionsLoaded = ref(false);

const prepareSelectionToAdd = (selectionToAdd: typeof reportStore.tableData[number][]) => {
  const elements: string[] = reportStore.tableCondition.map(item => item.element);

  return selectionToAdd.map((row) => {
    const newRow = { ...row }; // Клонируем строку


    elements.forEach((element) => {
      const percentFieldName = `${element}_percent`;
      const weightFieldName = `${element}_weight`;

      const percent = Number(row[percentFieldName]) ?? 0;
      const restWeight = Number(row.rest_net_weight) ?? 0;

      if (!isNaN(percent) && !isNaN(restWeight) && restWeight !== 0) {
        newRow[weightFieldName] = percent * restWeight / 100;
      } else {
        newRow[weightFieldName] = 0;
      }
    });
    newRow['key_material'] = `${findMaterialIdByName(newRow.material)}_${newRow.tare_id}`;
    newRow['stock_id'] = findStockIdByName(newRow.stock_name);

    return newRow;
  });
};

const updateSelectionData = () => {
  const selectionToAdd: typeof reportStore.tableData[number][] = [];
  const selectionToRemove: typeof reportStore.tableData[number][] = [];
  let rowInSelection = false;
  let rowInSelected = false;

  const selectedKeys = new Set(
    reportStore.selectedTableData.map(row => getRowKey(row))
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
    const processedSelection = prepareSelectionToAdd(selectionToAdd); // Подготовка данных для добавления
    const currentSelection = reportStore.selectionData;
    reportStore.setSelectionData([
      ...currentSelection,
      ...processedSelection
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

const handleDeleteSelectionTableRow = async (row: any) => {
  if (reportStore.selectionData.length === 0) {  
    return;
  }

  try {
    if (row.material === '') {
      await ElMessageBox.confirm(
        "Подбор будет очищен",
        {
          message: "Удалить все материалы из подбора?",
          cancelButtonText: "Нет",
          confirmButtonText: "Да",
          type: "warning"
        }
      );
      reportStore.setSelectionData([]);
    } else {
      reportStore.selectionData = reportStore.selectionData.filter(
        (item) => item.material !== row.material
      );
    }

    restoreSelection();

    try {
      await makeSelectionReport();
    } catch (error) {
      console.error('Ошибка при формировании подбора:', error);
    }

    try {
      await makeSelectionIndReport();
    } catch (error) {
      console.error('Ошибка при формировании показателей подбора:', error);
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Неожиданная ошибка:', error);
    }
  }
};

const handleSelectionChange = async (selection: any[]) => {
  reportStore.setSelectedTableData(selection.map(row => ({ ...row })));
    if (!isAutoSelectionUpdate.value) {
      updateSelectionData();
      try {
          await makeSelectionReport();
        } catch (error) {
          console.error('Ошибка при формировании подбора:', error);
        }

      try {
          await makeSelectionIndReport();
        } catch (error) {
          console.error('Ошибка при формировании показателей подбора:', error);
        }
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
    selectionColumns: reportStore.selectionColumns
  }),
  (newValues) => {
    reportStore.setFilters(newValues);
    reportStore.saveToStorage();
  },
  { deep: true }
);

const basicColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', fixed: 'left' },
  { prop: 'material', label: 'Материал', width: '300', fixed: 'left' },
  { prop: 'tare_type', label: 'Тара', width: '80' },
  { prop: 'material_mark', label: 'Вид', width: '100' },
  { prop: 'material_group', label: 'Группа', width: '100' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100' }
]);

const detailedColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', fixed: 'left' },
  { prop: 'material', label: 'Материал', width: '300', fixed: 'left' },
  { prop: 'tare_type', label: 'Тара', width: '80' },
  { prop: 'tare_id', label: 'Номер', width: '80' },
  { prop: 'tare_mark', label: 'Маркировка', width: '120' },
  { prop: 'material_mark', label: 'Вид', width: '100' },
  { prop: 'material_group', label: 'Группа', width: '100' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100' }
]);

const selectionColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80' },
  { prop: 'material', label: 'Материал', width: '300' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' }
]);

const detailedSelectionColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80' },
  { prop: 'material', label: 'Материал', width: '300' },
  { prop: 'tare_id', label: 'Номер', width: '80' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' }
]);

const selectionIndColumns = [
  { prop: 'ind', label: 'Ind', width: '80', },
  { prop: 'percent', label: '%', width: '80' },
];


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
    if (!store.materials_meta) {
      await store.fetchMaterialsMeta(props.stockID);
    }
    reportStore.loadFromStorage();

    // Инициализируем колонки, если они не загружены
    if (!reportStore.basicColumns.length) {
      reportStore.basicColumns = [...basicColumns.value];
    }
    if (!reportStore.detailedColumns.length) {
      reportStore.detailedColumns = [...detailedColumns.value];
    }
    if (!reportStore.selectionColumns.length) {
      reportStore.selectionColumns = [...selectionColumns.value];
    }
    if (!reportStore.detailedSelectionColumns.length) {
      reportStore.detailedSelectionColumns = [...detailedSelectionColumns.value];
    }
    isOperationDocMode.value = reportStore.isOperationDocAutoGenerateReport;
  } finally {
    store.loading = false;
  }

  nextTick(() => {
    setTimeout(() => {
      if (store.materials_meta?.material_list && !isOptionsLoaded.value) {
        materialOptions.value = [...store.materials_meta.material_list];
        isOptionsLoaded.value = true;
      }
    }, 500);
  });

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
  const stockName = row.stock_name || 'unknown';
  const material = row.material || 'unknown';
  const tareId = row.tare_id || 'unknown';

  return `${stockName}_${material}_${tareId}`;
};

const isRowSelectable = (row: any): boolean => {
  return row.stock_name !== 'Итого';
};

const tableRef = ref<any>(null);

const restoreSelection = () => {
    // Проверка доступности выбора
  if (!isSelectionEnabled.value) {
    //console.log('Selection is disabled, skipping restore');
    return;
  }

  // Полная проверка готовности
  if (!tableRef.value) {
    console.warn('Table not mounted yet, skipping restoreSelection');
    return;
  }
  if (!formattedTableData.value || formattedTableData.value.length === 0) {
    console.warn('No table data available, skipping restoreSelection');
    return;
  }
  if (!reportStore.selectedTableData?.length) {
    console.log('No selected data to restore');
    return;
  }

  isAutoSelectionUpdate.value = true; // Блокируем обновление

  //console.log('Proceeding with selection restoration...');
  tableRef.value.clearSelection();

  const selectionKeys = new Set(
    reportStore.selectionData.map(row => getRowKey(row))
    );

  formattedTableData.value.forEach((row) => {
    if (row.stock_name !== 'Итого' && selectionKeys.has(getRowKey(row))) {
      tableRef.value.toggleRowSelection(row, true);
    }
  });

  nextTick(() => {
    isAutoSelectionUpdate.value = false; // Снимаем блокировку после завершения
  });

  //console.log('Selection restored successfully');
  //console.log(reportStore.selectedTableData);  
};

const formattedTableData = computed(() => {
  if (!reportStore.tableData || !Array.isArray(reportStore.tableData)) {
    return [];
  }

  return reportStore.tableData.map(row => {
    const formattedRow = { ...row };

    const numericFields = [
      'rest_tare_amount',
      'rest_net_weight',
      'rest_gross_weight'
    ];

    const keys = Object.keys(reportStore.tableData[0] || {});
    keys.forEach(key => {
      if (key.includes('_percent')) {
        numericFields.push(key);
      }
    });

    numericFields.forEach(field => {
      if (formattedRow[field] !== undefined) {
        formattedRow[field] = formatNumber(formattedRow[field]);
      }
    });

    return formattedRow;
  });
});

const isTotalRow = (row: any): boolean => {
  return row.stock_name === 'Итого';
};

const getRowClassName = ({ row }: { row: any }): string => {
  if (isTotalRow(row)) {
    return 'total-row';
  }
  return '';
};

function formatNumber(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) {
    return '';
  }
  return new Intl.NumberFormat('ru-RU').format(numValue);
}


const isDetailedModeDisabled = computed(() => {
  if (selectedMaterial.value && selectedMaterial.value.length > 0) {
    return false;
  };
  isDetailedMode.value = false;
  return true;
});

const isSelectionModeDisabled = computed(() => {
  if (isDetailedMode.value) {
    return false;
  };
  isSelectionEnabled.value = false;
  return true;
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
        selectable: isRowSelectable
      }]
    : []
);

const dataColumns = computed(() =>
  isDetailedMode.value ? reportStore.detailedColumns  : reportStore.basicColumns);  

const selectionDataColumns = computed(() =>
  isSelectionDetailedMode.value ? reportStore.detailedSelectionColumns  : reportStore.selectionColumns);  


watch(formattedTableData, (newData) => {
  if (newData && newData.length > 0 && tableRef.value) {
    nextTick(() => {
      restoreSelection();
    });
  }
}, { deep: true });

watch(() => tableRef.value, (tableInstance) => {
  if (tableInstance && formattedTableData.value?.length > 0) {
    nextTick(() => {
      restoreSelection();
    });
  }
});


function configuringReportTables() {
  // Удаляем старые колонки с процентами перед добавлением новых
  if (isDetailedMode.value) {
    reportStore.detailedColumns = reportStore.detailedColumns.filter(col => !col.prop.includes('_percent'));
  } else {
    reportStore.basicColumns = reportStore.basicColumns.filter(col => !col.prop.includes('_percent'));
  };
  if (isSelectionDetailedMode.value) {
    reportStore.detailedSelectionColumns = reportStore.detailedSelectionColumns.filter(col => !col.prop.includes('_percent'));
  } else {
    reportStore.selectionColumns = reportStore.selectionColumns.filter(col => !col.prop.includes('_percent'));
  };

  const percent_items: Column[] = [];
  for (const item of tableCondition.value) {
    const item_element = item.element
    if (item_element !== '') {
      percent_items.push(
          { prop: item_element + '_percent', 
            label: item_element + ', ' + store.materials_meta?.material_group_list.find(item => item.code === item_element)?.umi ,
            width: '100'
          }
        );
    }
  }

  if (isDetailedMode.value) {
    reportStore.detailedColumns.push(...percent_items);
  } else {
    reportStore.basicColumns.push(...percent_items);
  }
  if (isSelectionDetailedMode.value) {
    reportStore.detailedSelectionColumns.push(...percent_items);
  } else {
    reportStore.selectionColumns.push(...percent_items);
  }

};

const makeSelectionIndReport = async () => {
  reportStore.setSelectionIndTableData([]);

  if (reportStore.selectionData.length == 0) {
    return;
  };

  if (reportStore.tableCondition.length == 0) {
    return;
  };

  const indicators_list = tableCondition.value.map(item => item.element).filter(element => element !== '').join('|');
  const key_material_list = [...new Set(reportStore.selectionData.map(item => item.key_material))].join('|');
  const stock_list = [...new Set(reportStore.selectionData.map(item => item.stock_id))].join('|');

  try {
    await store.fetchSelectionData({
      stock_list: stock_list,
      indicators: indicators_list,
      key_material_list: key_material_list,
      query_type: 'selection_indicators',
      element_order: ''
    });

    if (store.selection_ind_data && Array.isArray(store.selection_ind_data)) {
      const transformed_selection_ind_data: SelectionIndicator[] = Object.entries(store.selection_ind_data[0])
        .map(([key, value]) => ({
          ind: key,
          percent: value as number
        }));
      reportStore.setSelectionIndTableData([ ...transformed_selection_ind_data ]);
    };
  } catch (error) {
    console.error('Ошибка при формировании отчёта:', error);
  } finally {
  }
};


const makeSelectionReport = async () => {
  reportStore.setSelectionTableData([]);

  if (reportStore.selectionData.length == 0) {
    return;
  };
  let total_rest_net_weight = 0;
  let total_rest_tare_amount = 0;

  const indicators_list = tableCondition.value.map(item => item.element).filter(element => element !== '').join('|');
  const key_material_list = [...new Set(reportStore.selectionData.map(item => item.key_material))].join('|');
  const stock_list = [...new Set(reportStore.selectionData.map(item => item.stock_id))].join('|');

  try {
    await store.fetchSelectionData({
      stock_list: stock_list,
      indicators: indicators_list,
      key_material_list: key_material_list,
      query_type: isSelectionDetailedMode.value ? 'detailed' : 'selection',
      element_order: elementOrder()
    });

    console.log(store.selection_data);

    if (store.selection_data && Array.isArray(store.selection_data)) {
      reportStore.selectionTableData = store.selection_data;
      if (reportStore.selectionTableData.length > 1) {
        total_rest_net_weight = reportStore.selectionTableData.map(item => item['rest_net_weight']).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        total_rest_tare_amount = reportStore.selectionTableData.map(item => item['rest_tare_amount']).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        reportStore.setSelectionTableData([
          ...reportStore.selectionTableData,
          {
            stock_name: 'Итого',
            material: '',
            rest_tare_amount: total_rest_tare_amount,
            rest_net_weight: total_rest_net_weight,
          }
        ]);
      };
    };
    console.log(reportStore.selectionTableData);

  } catch (error) {
    console.error('Ошибка при формировании отчёта:', error);
  } finally {
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
    await store.fetchMaterialsData(props.stockID, {
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

  try {
    await makeSelectionReport();
  } catch (error) {
    console.error('Ошибка при формировании подбора:', error);
  }

  try {
    await makeSelectionIndReport();
  } catch (error) {
    console.error('Ошибка при формировании показателей подбора:', error);
  }

  //reportStore.saveToStorage();
};

const handleSwitchDetailedMode = () => {
  reportStore.tableData = [];
  
};

const handleSwitchSelectionDetailedMode = async() => {
  try {
    configuringReportTables();
  } catch (error) {
    console.error('Ошибка при настройке колонок:', error);
    return;
  }

  try {
    await makeSelectionReport();
  } catch (error) {
    console.error('Ошибка при формировании подбора:', error);
  }
  
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

// Функция поиска ID материала по названию
const findMaterialIdByName = (name: string): number | undefined => {
  if (!name) return undefined;

  return store.materials_meta?.material_list?.find(item => item.name === name)?.id;
};

// Функция поиска ID склада по названию
const findStockIdByName = (name: string): number | undefined => {
  if (!name) return undefined;

  return store.materials_meta?.stock_list?.find(item => item.name === name)?.id;
};

// Функция добавления материала в выборку
const addMaterialToselectedMaterial = (materialId: number) => {
  if (!selectedMaterial.value.includes(materialId)) {
    selectedMaterial.value = [...selectedMaterial.value, materialId];
  }
};

const handleTableCellDblClick = (row: any, column: any, cell: HTMLElement, event: MouseEvent) => {
  if (column.property !== 'material') return;

  const materialName = row.material;
  const materialId = findMaterialIdByName(materialName);

  if (materialId) {
    addMaterialToselectedMaterial(materialId);
  }

  
};

const emit = defineEmits<{
  (e: 'selection-confirmed', items: frontend.IRawMaterial[]): void;
  (e: 'close'): void;
}>();

const handleApplySelection = () => {
  const result: frontend.IRawMaterial[] = reportStore.selectionData.map(row => ({
    material: row.material,
    material_id: row.material_id,
    tare_id: row.tare_id,
    net_weight: row.rest_net_weight,
  }));

  emit('selection-confirmed', result);
};

const handleDrawerClose = () => {
  emit('close');
};

watch(
  () => reportStore.isOperationDocAutoGenerateReport,
  async (newValue) => {
    if (!newValue) return;

    if (reportStore.selectedStore.length && reportStore.selectedMaterial.length) {
      await handleMakeReport();
    };  
    reportStore.isOperationDocAutoGenerateReport = false;
  },
  { immediate: true }
);

</script>

<style scoped>
.page-container {
  height: calc(100vh - 120px); /* Занимает всю высоту экрана минус меню */
  display: flex;
  width: 100%;
  box-sizing: border-box;  
}

.sidebar {
  background-color: #f5f7fa;
  padding: 20px;
  border-right: 1px solid #e6e9ef;
  flex-shrink: 0;
  width: 400px;
  overflow: auto;
}

/* Таблица занимает 70% высоты, если футер виден, иначе 100% */
.table-container {
  flex: 0 0 70%; /* flex-grow: 0, flex-shrink: 0, flex-basis: % */
  padding: 0 20px 20px;
  box-sizing: border-box;
  position: relative; /* Для корректной работы абсолютного позиционирования внутри */
}

/* Если футер скрыт, таблица занимает 100% высоты */
.right-container:not(.has-footer) .table-container {
  flex: 0 0 100%;
}

/* Обертка для таблицы с прокруткой */
.table-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto; /* Прокрутка внутри обёртки */
  border-radius: 4px;
}

/* Футер занимает 30% высоты правого контейнера */
.footer-container {
  flex: 0 0 30%; /* flex-grow: 0, flex-shrink: 0, flex-basis: 30% */
  padding: 0px;
  margin-top: 10px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  flex-shrink: 0;
  height: 100%;
}

.footer-layout {
  height: 100%;
  flex: 1;
  border-spacing: 0;
}

.footer-block {
  height: 100%;
  box-sizing: border-box;
  padding: 0px;
  border-right: 1px solid #e9ecef;
  overflow: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
}

.footer-block-1 {
  background-color: #f0f7ff;
}

.footer-block-2 {
  background-color: #fafafa;
}

.footer-block-3 {
  background-color: #fff9f3;
  border-right: none;
  padding: 16px;
}

@media (max-width: 768px) {
  /* На мобильных соотношение 60/40, если футер виден */
  .right-container .table-container {
    flex: 0 0 60%;
  }
  .right-container:not(.has-footer) .table-container {
    flex: 0 0 100%;
  }
  .footer-layout {
    flex-direction: column;
  }
  .el-aside,
  .el-main {
    width: 100% !important;
    border-right: none !important; /* Убираем вертикальные границы */
    border-bottom: 1px solid #e9ecef; /* Добавляем горизонтальные границы */
  }
  /* Убираем нижнюю границу у последнего блока на мобильных */
  .el-aside:last-child,
  .el-main:last-child {
    border-bottom: none;
  }
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
  border-bottom: 2px solid #3b82f6 !important;
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

</style>