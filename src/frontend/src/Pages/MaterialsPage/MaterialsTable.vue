<template>
  <div class="materials-table">
      <div class="table-wrapper">
        <el-table
          ref="tableRef"
          v-show="!isSkeletonLoading && store.materials_data?.length"
          :data="store.materials_data"
          :show-summary="store.materials_data.length > 1"
          :summary-method="getSummary"
          :row-key="getRowKey"
          style="width: 100%; height: 100%;"
          stripe
          border
          show-overflow-tooltip
          @cell-dblclick="(row, column, cell, event) => emit('cell-dblclick', row, column, cell, event)"
          @selection-change="onSelectionChange"
        >
          <el-table-column
            v-for="column in selectionColumn"
            :key="column.type"
            :type="column.type"
            :width="column.width"
            :align="column.align"
            reserve-selection
          />

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
        <el-skeleton v-if="isSkeletonLoading" animated />
        <div v-if="!store.materials_data?.length" class="no-data-message">
          Нет данных для отображения
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import useApplicationStore from '@/store';
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import { formatTwoDecimal, formatHighPrecision, formatInteger } from '@/utils/numberFormat';

const emit = defineEmits<{
  'cell-dblclick': [row: any, column: any, cell: HTMLElement, event: MouseEvent];
}>();

const store = useApplicationStore();
const reportStore = useMaterialsReportStore();
const tableRef = ref();
const isSkeletonLoading = ref(false);
const isRestoring = ref(false);

interface Column {
  prop: string;
  label: string;
  width: string;
  fixed?: string;
  align?: string;
  formatType?: string;
}

const isSelectionActive = () =>
  reportStore.isSelectionEnabled && reportStore.isDetailedMode;

// --- Форматирование ---
const getFormatter = (type?: string) => {
  if (!type) {
    return (val: any) => (val == null ? '' : String(val));
  }
  switch (type) {
    case 'weight': return formatTwoDecimal;
    case 'percent': return formatTwoDecimal;
    case 'high': return formatHighPrecision;
    case 'integer': return formatInteger;
    default: return (val: any) => (val == null ? '-' : String(val));
  }
};

const formatCell = (value: any, type?: string) => getFormatter(type)(value);

// --- Итоги ---
const SUMMARY_PROPS = ['rest_tare_amount', 'rest_net_weight', 'rest_gross_weight'];

const getSummary = ({ columns }: { columns: any[] }): string[] => {
  return columns.map((column, index) => {
    const prop = column.property;

    if (index === 0) return '';
    if (!prop || !SUMMARY_PROPS.includes(prop)) return '';

    const values = store.materials_data.map((item: any) => Number(item[prop]));
    if (values.some((v: number) => Number.isNaN(v))) return '';

    const total = values.reduce((acc: number, v: number) => acc + v, 0);
    const formatType = dataColumns.value.find(col => col.prop === prop)?.formatType;
    return formatCell(total, formatType);
  });
};

// --- Колонки ---
const dataColumns = computed<Column[]>(() =>
  reportStore.isDetailedMode ? reportStore.detailedColumns : reportStore.basicColumns
);

const selectionColumn = computed(() =>
  reportStore.isSelectionEnabled
    ? [{ type: 'selection', width: '55', align: 'center' }]
    : []
);


const getRowKey = (row: any): string => row.key_material || 'unknown';

const restoreSelection = async () => {
  if (!isSelectionActive() || !reportStore.selectionData.length) return;

  isRestoring.value = true;
  try {
    const savedKeys = new Set(reportStore.selectionData);
    const rowsToSelect = store.materials_data.filter(
      (row: any) => savedKeys.has(getRowKey(row))
    );

    await nextTick();
    rowsToSelect.forEach((row: any) => tableRef.value?.toggleRowSelection(row, true));
    await nextTick(); // дождаться selection-change от toggle, прежде чем снять щит
  } finally {
    isRestoring.value = false;
  }
};

const onSelectionChange = (rows: any[]) => {
  if (isRestoring.value) return; // восстановление само инициирует selection-change — не затираем хранилище
  if (!reportStore.isSelectionEnabled) return;
  reportStore.setSelectionData(rows.map(getRowKey));
};

// --- Формирование отчёта ---
const elementOrder = (): string => {
  if (reportStore.tableCondition.length > 0 && reportStore.isElementOrderMode) {
    return reportStore.tableCondition[0].element;
  }
  return '';
};

function configuringReportTables() {
  if (reportStore.isDetailedMode) {
    reportStore.detailedColumns = reportStore.detailedColumns.filter(
      col => !col.prop.includes('_percent')
    );
  } else {
    reportStore.basicColumns = reportStore.basicColumns.filter(
      col => !col.prop.includes('_percent')
    );
  }

  const percent_items: Column[] = [];
  for (const item of reportStore.tableCondition) {
    if (item.element !== '') {
      const meta = store.materials_meta?.material_group_list
        .find(group => group.code === item.element);
      percent_items.push({
        prop: item.element + '_percent',
        label: item.element + ', ' + (meta?.umi ?? ''),
        width: '100',
        align: 'right',
        formatType: 'percent',
      });
    }
  }

  if (reportStore.isDetailedMode) {
    reportStore.detailedColumns.push(...percent_items);
  } else {
    reportStore.basicColumns.push(...percent_items);
  }
}

const makeMaterialReport = async () => {
  isSkeletonLoading.value = true;
  store.loading = true;

  // фильтруем пустые строки один раз — чтобы indicators и conditions не разъезжались
  const conditionRows = reportStore.tableCondition.filter(item => item.element !== '');
  const indicators_list = conditionRows.map(item => item.element).join('|');
  const indicator_conditions_list = conditionRows.map(item => {
    const meta = store.materials_meta?.material_group_list
      .find(group => group.code === item.element);
    const min = item.min !== '' ? item.min : String(meta?.min_value ?? 0);
    const max = item.max !== '' ? item.max : String(meta?.max_value ?? 100);
    return `${min}|${max}`;
  }).join('|');

  try {
    await store.fetchMaterialsData({
      materials: reportStore.selectedMaterial.toString(),
      stocks: reportStore.selectedStore.toString(),
      material_groups: reportStore.selectedMaterialGroup
        .map(item => "'" + item + "'").toString(),
      indicators: indicators_list,
      indicator_conditions: indicator_conditions_list,
      detailed_mode: reportStore.isDetailedMode ? 'detailed' : 'summary',
      only_non_zero_mode: reportStore.isOnlyNonZeroMode,
      element_order: elementOrder(),
    });
  } catch (error) {
    console.error('Ошибка при формировании отчёта:', error);
  } finally {
    store.loading = false;
    isSkeletonLoading.value = false;
  }
  await restoreSelection();
};

const refresh = async () => {
  try {
    configuringReportTables();
  } catch (error) {
    console.error('Ошибка при настройке колонок:', error);
    return;
  }
  await makeMaterialReport();
};

onMounted(() => {
  restoreSelection();
});

defineExpose({ refresh });
</script>

<style scoped>
.materials-table {
  width: 100%;
  height: 100%;
}

.table-wrapper {
  height: 100%;
  overflow: auto;
  border-radius: 4px;
}

.no-data-message {
  text-align: center;
  color: #999;
  font-size: 14px;
}

:deep(.el-table) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-table__body tr:hover) {
  cursor: pointer;
}
</style>
