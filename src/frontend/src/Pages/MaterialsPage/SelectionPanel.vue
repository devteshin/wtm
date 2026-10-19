<template>
  <el-container class="footer-layout">
    <el-aside width="20%">
      <div class="table-wrapper">
        <el-table
          :data="selectionIndRows"
          style="width: 100%; height: 100%;"
          stripe
          border
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
        >
          <el-table-column
            v-for="column in selectionColumns"
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
}>();

const store = useApplicationStore();
const reportStore = useMaterialsReportStore();

const selectionColumns = ref([
  { prop: 'stock_name', label: 'Склад', minWidth: '80', align: 'left' },
  { prop: 'material', label: 'Материал', minWidth: '300', align: 'left' },
  { prop: 'rest_tare_amount', label: 'Кол-во', minWidth: '100', align: 'right', formatType: 'integer' },
  { prop: 'rest_net_weight', label: 'Нетто', minWidth: '100', align: 'right', formatType: 'weight' },
]);

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

const formatCell = (value: any, type?: string) => getFormatter(type)(value);

const elementOrder = (): string => {
  if (reportStore.tableCondition.length > 0 && reportStore.isElementOrderMode) {
    return reportStore.tableCondition[0].element;
  }
  return '';
};

let fetchTimer: ReturnType<typeof setTimeout> | null = null;

const loadSelectionData = async () => {
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
    await Promise.all([
      store.fetchSelectionData({
        stock_list: reportStore.selectedStore.toString(),
        indicators: indicators_list,
        key_material_list: keyList.join('|'),
        query_type: 'selection',
        element_order: elementOrder(),
      }),
      store.fetchSelectionData({
        stock_list: reportStore.selectedStore.toString(),
        indicators: indicators_list,
        key_material_list: keyList.join('|'),
        query_type: 'selection_indicators',
        element_order: '',
      }),
    ]);

  } catch (error) {
    console.error('Ошибка при загрузке данных подбора:', error);
  }
};

// Отслеживаем состав выбора. setSelectionData всегда присваивает новый массив,
// так что shallow watch достаточен.
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
</style>