<template>
  <el-container class="footer-layout">
    <el-aside v-if="selectionIndRows.length" width="20%">
      <div class="table-wrapper">
        <el-table
          :data="selectionIndRows"
          style="width: 100%; height: 100%;"
          stripe
          border
          empty-text=""
        >
          <el-table-column
            v-for="column in selectionIndColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.minWidth"
            :align="column.align"
            header-align="center"
          >
            <template #default="scope">
              {{ formatCell(scope.row[column.prop], column.formatType) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-aside>

    <el-main>
      <div class="table-wrapper">
        <el-table
          :data="store.selection_data"
          style="width: 100%; height: 100%;"
          stripe
          border
          :show-summary="store.selection_data.length > 1"
          :summary-method="getSummary"
          empty-text=""
        >
          <el-table-column
            v-for="column in reportStore.selectionColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.minWidth"
            :align="column.align"
          >
            <template #default="scope">
              {{ formatCell(scope.row[column.prop], column.formatType) }}
            </template>
          </el-table-column>

          <el-table-column label="" width="50" fixed="right">
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

    <el-aside v-if="reportStore.isExternalSelectionMode" width="20%" class="actions-aside">
      <div class="actions-wrapper">
        <el-button
          type="primary"
          :loading="isApplying"
          :disabled="!store.selection_data.length"
          @click="handleApplySelection"
        >
          Применить выбор
        </el-button>
        <el-button @click="handleCancel">
          Отмена
        </el-button>
      </div>
    </el-aside>

  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import useApplicationStore from '@/store';
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import { formatTwoDecimal, formatInteger } from '@/utils/numberFormat';

interface SelectionIndicator {
  ind: string;
  percent: number;
}

interface Column {
  prop: string;
  label: string;
  minWidth: string;
  fixed?: string;
  align?: string;
  formatType?: string;
}

const isApplying = ref(false);

const selectionIndRows = computed<SelectionIndicator[]>(() => {
  const first = store.selection_ind_data?.[0];
  if (!first) return [];

  return Object.entries(first).map(([key, value]) => ({
    ind: key,
    percent: Number(value),
  }));
});

const emit = defineEmits<{
  'remove-material': [materialId: number];
  'confirm-selection': [items: frontend.IRawMaterial[]];
  'cancel': [];
}>();

const store = useApplicationStore();
const reportStore = useMaterialsReportStore();

const selectionIndColumns = [
  { prop: 'ind', label: 'Показатель', minWidth: '100', align: 'center' },
  { prop: 'percent', label: '%', minWidth: '80', align: 'right', formatType: 'percent' },
];

const getFormatter = (type?: string) => {
  if (!type) return (val: any) => (val == null ? '' : String(val));
  switch (type) {
    case 'weight': return formatTwoDecimal;
    case 'percent': return formatTwoDecimal;
    case 'integer': return formatInteger;
    default: return (val: any) => (val == null ? '-' : String(val));
  }
};

const SUMMARY_PROPS = ['rest_net_weight', 'rest_tare_amount'];

const getSummary = ({ columns }: { columns: any[] }): string[] => {
  return columns.map((column, index) => {
    const prop = column.property;

    if (index === 0) return '';
    if (!prop || !SUMMARY_PROPS.includes(prop)) return '';

    const values = store.selection_data.map((item: any) => Number(item[prop]));
    if (values.some((v: number) => Number.isNaN(v))) return '';

    const total = values.reduce((acc: number, v: number) => acc + v, 0);
    const formatType = reportStore.selectionColumns.find(col => col.prop === prop)?.formatType;
    return formatCell(total, formatType);
  });
};


const formatCell = (value: any, type?: string) => getFormatter(type)(value);

function configuringReportTables() {
  reportStore.selectionColumns = reportStore.selectionColumns.filter(
    col => !col.prop.includes('_percent'))

  const percent_items: Column[] = [];
  for (const item of reportStore.tableCondition) {
    if (item.element !== '') {
      const meta = store.materials_meta?.material_group_list
        .find(group => group.code === item.element);
      percent_items.push({
        prop: item.element + '_percent',
        label: item.element + ', ' + (meta?.umi ?? ''),
        minWidth: '100',
        align: 'right',
        formatType: 'percent',
      });
    }
  }

  reportStore.selectionColumns.push(...percent_items);
}


const elementOrder = (): string => {
  if (reportStore.tableCondition.length > 0 && reportStore.isElementOrderMode) {
    return reportStore.tableCondition[0].element;
  }
  return '';
};

let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const loadSelectionData = async () => {

  try {
    configuringReportTables();
  } catch (error) {
    console.error('Ошибка при настройке колонок:', error);
    return;
  }

  const keyList = reportStore.selectionData.map(item => item.key);

  if (!keyList.length) {
    store.selection_data = [];
    store.selection_ind_data = [];
    return;
  }

  const indicators_list = reportStore.tableCondition
    .map(item => item.element)
    .filter(element => element !== '')
    .join('|');

  try {

    await store.fetchSelectionPair({
        stock_list: reportStore.selectedStore.toString(),
        indicators: indicators_list,
        key_material_list: keyList.join('|'),
        element_order: elementOrder(),
      });

  } catch (error) {
    console.error('Ошибка при загрузке данных подбора:', error);
  }
};

watch(
  () => reportStore.selectionData,
  () => {
    // дебаунс: restore расставляет чекбоксы построчно, каждое событие
    // selection-change перезаписывает selectionData — fetch на каждый не нужен
    if (fetchTimer) clearTimeout(fetchTimer);
    fetchTimer = setTimeout(loadSelectionData, 200);
  },
  { immediate: true }
);

const handleDeleteSelectionTableRow = (row: any) => {
  emit('remove-material', row.material_id);
};

const refresh = async () => {
  // гасим отложенный fetch, чтобы не было двойного вызова:
  // явный refresh идёт сразу, а не через 200 мс после него
  if (fetchTimer) {
    clearTimeout(fetchTimer);
    fetchTimer = null;
  }
  await loadSelectionData();
};

const handleApplySelection = async () => {
  const keyList = reportStore.selectionData.map(item => item.key);
  if (!keyList.length) return;

  isApplying.value = true;
  try {
    await store.fetchSelectionData({
      stock_list: reportStore.selectedStore.toString(),
      indicators: '',
      key_material_list: keyList.join('|'),
      query_type: 'raw_materials',
      element_order: '',
    });

    // снимок: наверх уходит копия, а не живая ссылка на стор
    emit('confirm-selection', [...(store.raw_materials_data ?? [])]);
  } catch (error) {
    console.error('Ошибка при получении данных выбранных материалов:', error);
  } finally {
    isApplying.value = false;
  }
};

const handleCancel = () => emit('cancel');

defineExpose({ refresh });

</script>

<style scoped>
.footer-layout {
  height: 100%;
}

.table-wrapper {
  height: 100%;
  overflow: auto;
}

.footer-layout :deep(.el-main) {
  padding: 0;
}

.actions-aside {
  padding: 8px;
}

.actions-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.actions-wrapper .el-button {
  width: 100%;
  margin-left: 0; /* el-button тянется к соседу, в колонке не нужно */
}

</style>