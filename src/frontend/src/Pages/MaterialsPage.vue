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
          <el-button
            type="primary"
            @click="handleMakeReport"
            class="apply-button"
          >
            Сформировать
          </el-button>        
      </el-form>
    </el-aside>

    <!-- Правый блок: контейнер с таблицей -->
    <el-container>
      <el-main class="table-container">
        <!-- Скелетон при инициализации и формировании отчёта -->
        <el-skeleton v-if="isSkeletonLoading" animated />

        <!-- Таблица с данными -->
        <template v-else>
          <div v-if="!reportStore.tableData?.length">Таблица пуста</div>
          <el-table
            v-else
            ref="tableRef"
            :data="formattedTableData"
            reserve-selection
            :row-key="getRowKey"
            style="width: 100%;"
            stripe
            border
            show-overflow-tooltip
            height="85vh"
            virtual-scroll
            :row-class-name="getRowClassName"
            @cell-dblclick="handleTableCellDblClick"
            @selection-change="handleSelectionChange"
          >
            <el-table-column
              type="selection"
              width="55"
              :selectable="isRowSelectable"
            />
            <el-table-column
              v-for="column in visibleColumns"
              :key="column.prop"
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :fixed="column.fixed"
            />
          </el-table>
        </template>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from "vue";
import { ref, computed } from "vue";
import useApplicationStore from "@/store";
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import { useRouter } from "vue-router";
import { Delete } from '@element-plus/icons-vue';
import { watch } from 'vue';

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

const router = useRouter();
const store = useApplicationStore()
const reportStore = useMaterialsReportStore()

const handleSelectionChange = (selection: any[]) => {
    reportStore.setSelectedTableData(selection.map(row => ({ ...row })));
    console.log('Selected table data:', reportStore.selectedTableData);
};

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

const tableCondition = computed({
  get: () => reportStore.tableCondition,
  set: (value) => reportStore.setFilters({ tableCondition: value })
});


const materialOptions = ref<MaterialOption[]>([]);
const isOptionsLoaded = ref(false);

 // Отслеживаем изменения всех фильтров и сохраняем в стор
watch(
  () => ({
    selectedStore: selectedStore.value,
    selectedMaterialGroup: selectedMaterialGroup.value,
    selectedMaterial: selectedMaterial.value,
    isDetailedMode: isDetailedMode.value,
    isOnlyNonZeroMode: isOnlyNonZeroMode.value,
    tableCondition: tableCondition.value
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

  console.log('Selected table data:', reportStore.selectedTableData);
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
  const tareType = row.tare_type || 'unknown';
  const tareId = row.tare_id || 'unknown';

  return `${stockName}_${material}_${tareType}_${tareId}`;
};

const isRowSelectable = (row: any): boolean => {
  return row.stock_name !== 'Итого';
};

const tableRef = ref<any>(null);

const restoreSelection = () => {
  console.log('Attempting to restore selection...');
  console.log('tableRef mounted:', !!tableRef.value);
  console.log('Table data rows:', formattedTableData.value?.length);
  console.log('Selected data count:', reportStore.selectedTableData?.length);

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

  console.log('Proceeding with selection restoration...');

  tableRef.value.clearSelection();

  const selectedKeys = new Set(
    reportStore.selectedTableData.map(row => getRowKey(row))
  );

  formattedTableData.value.forEach((row) => {
    if (row.stock_name !== 'Итого' && selectedKeys.has(getRowKey(row))) {
      tableRef.value.toggleRowSelection(row, true);
    }
  });

  console.log('Selection restored successfully');
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

const visibleColumns = computed(() => {
  return isDetailedMode.value ? detailedColumns.value : basicColumns.value;
});

watch(formattedTableData, (newData) => {
  console.log('formattedTableData changed, new data length:', newData?.length);
  if (newData && newData.length > 0 && tableRef.value) {
    nextTick(() => {
      restoreSelection();
    });
  }
}, { deep: true });

watch(() => tableRef.value, (tableInstance) => {
  if (tableInstance && formattedTableData.value?.length > 0) {
    console.log('Table mounted, restoring selection...');
    nextTick(() => {
      restoreSelection();
    });
  }
});

const handleMakeReport = async () => {
  isSkeletonLoading.value = true; // Включаем скелетон при формировании отчёта

  store.loading = true;
  reportStore.setTableData([]);
  let total_rest_gross_weight = 0;
  let total_rest_net_weight = 0;
  let total_rest_tare_amount = 0;


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
    detailedColumns.value = [...detailedColumns.value.slice(0, 10)];
    detailedColumns.value = [...detailedColumns.value, ...percent_items];
  } else {
    basicColumns.value = [...basicColumns.value.slice(0, 8)];
    basicColumns.value = [...basicColumns.value, ...percent_items];
  }

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
      only_non_zero_mode: isOnlyNonZeroMode.value
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
      nextTick(() => {
        restoreSelection();
      });
    };
    reportStore.saveToStorage();
  } catch (error) {
    // Здесь можно добавить уведомление об ошибке для пользователя
  } finally {
    store.loading = false;
    isSkeletonLoading.value = false; // Выключаем скелетон после завершения
  }
};

const handleSwitchDetailedMode = (value) => {
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

// Функция поиска ID по названию
const findMaterialIdByName = (name: string): number | undefined => {
  if (!name) return undefined;

  return store.materials_meta?.material_list?.find(item => item.name === name)?.id;
};

// Функция добавления материала в выборку
const addMaterialToSelection = (materialId: number) => {
  if (!selectedMaterial.value.includes(materialId)) {
    selectedMaterial.value = [...selectedMaterial.value, materialId];
  }
};

const handleTableCellDblClick = (row: any, column: any, cell: HTMLElement, event: MouseEvent) => {
  if (column.property !== 'material') return;

  const materialName = row.material;
  const materialId = findMaterialIdByName(materialName);

  if (materialId) {
    addMaterialToSelection(materialId);
  }

  
};


</script>

<style scoped>
.page-container {
  height: 85vh; 
}

.sidebar {
  background-color: #f5f7fa;
  padding: 20px;
  border-right: 1px solid #e6e9ef;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.table-container {
  padding: 0 20px 20px;
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
  width: 100%;
}

</style>