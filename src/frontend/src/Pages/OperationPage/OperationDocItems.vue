<script setup lang="ts">
import { onMounted, computed, ref, PropType, nextTick, watch, onBeforeUnmount  } from "vue";
import useApplicationStore from "@/store";
import { ElMessageBox } from "element-plus";
import type { TableInstance } from 'element-plus'
import DialogNewMaterial from "./DialogNewMaterial.vue";
import { Check, Edit } from '@element-plus/icons-vue';
import { ArrowRight, CaretBottom } from '@element-plus/icons-vue';
import { formatTwoDecimal } from '@/utils/numberFormat';

const store = useApplicationStore();

const tableRef = ref<TableInstance>();
const relayout = () => tableRef.value?.doLayout();

const props = defineProps({
    operation: { type: String, required: true },
    operation_material: { type: String, required: true },
    operation_product_list: { type: Array as PropType<string[]>, required: true },
    material: { type: String, required: true },
    material_list: { type: Array as PropType<string[]>, required: true },
    items: { type: Array as PropType<frontend.IArrivalItems[]>, required: true },
    tableWidth: {type: String, default: '100%'}
});

const tare_default = ref('');

const add_items_num = ref(1);
const start_items_num = ref(0);
const material = ref('')
const operation_material = ref(props.operation_material);

const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

const tareColumnEnabled = ref(false);
const shapeColumnEnabled = ref(false);
const nextOperationColumnEnabled = ref(false);
const insertColumnEnabled = ref(false);
const tableLayout = ref<TableInstance['tableLayout']>('fixed');

const asItem = (row: unknown) => row as frontend.IArrivalItems;

onMounted(async () => {
  if (props.material) {
    material.value = (props.material);
  } else {
    material.value = (props.operation_material);
  };
  start_items_num.value = await getStartItemsNum(material.value);
  await nextTick();
  relayout();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  clearTimeout(resizeTimer);
});

// пересчёт при изменении набора колонок
watch([tareColumnEnabled, shapeColumnEnabled, nextOperationColumnEnabled, insertColumnEnabled],
  () => nextTick(relayout));

// пересчёт при изменении окна — тот же триггер, что даёт devtools
let resizeTimer: ReturnType<typeof setTimeout>;
const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 150); };
window.addEventListener('resize', onResize);

async function getStartItemsNum(material: string) {
  if (material === '') {
    return 0;
  };
  if (props.items.filter(item => item.material === material).length == 0) {
    return await store.fetchMaxTareID(material) + 1;
  }
  return (props.items.filter(item => item.material === material).map(item => item.tare_id)).reduce((max, currentValue) => Math.max(max, currentValue), 0) + 1;
};

const totalWeight = computed(() => {
  return getItemsWeightTotal(material.value);
});

const paginatedItems = computed(() => {
  const filtered = props.items.filter(item => item.material === material.value);
  totalItems.value = filtered.length;

  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;

  return filtered.slice(startIndex, endIndex);
});

function handleCurrentChange(newPage: number) {
  currentPage.value = newPage;
}

function handleSizeChange(newSize: number) {
  pageSize.value = newSize;
  currentPage.value = 1;
}

function getItemsWeightTotal(material: string) {
  return (props.items.filter(item => item.material === material).map(item => item.gross_weight)).reduce((sum, currentValue) => sum + currentValue, 0);
}

async function addItems(position_num: number, start_num: number) {

  if (position_num == 0 || tare_default.value == '') {
    return;
  }

  const newItems: frontend.IArrivalItems[] = [];
  for (let i = 0; i < position_num; i++) {
    if (props.items.some(item => item.material === material.value && item.tare_id === start_num + i)) {
      break;
    }
    
    const item: frontend.IArrivalItems = {
      tare_id: start_num + i,
      gross_weight: 0,
      tare_type: tare_default.value,
      tare_weight: getTareWeight(tare_default.value),
      material: material.value,
      key_material_str: material.value + '_' + (start_num + i),
      next_operation_flag: '',
      shape_ids: []
      };
    newItems.push(item);
  }

  if (newItems.length > 0) {
    props.items.push(...newItems);
    props.items.sort((a, b) => a.tare_id - b.tare_id);
  };
  
  start_items_num.value = await getStartItemsNum(material.value);
};


function getTareWeight(value: string) {
  let weight = store.arrival?.tare_options.find(t => t.tare_type == value)?.tare_weight;
  if (!weight) {
    weight = 0
  }
  return weight;
};

function onTareChange(value: string, item: frontend.IArrivalItems) {
  item.tare_weight = getTareWeight(value);
  onWeightChange(item.gross_weight, item);
};


function onWeightChange(value: number, item: frontend.IArrivalItems) {
  if (value < item.tare_weight && value != 0) {
    item.gross_weight = item.tare_weight
  };
};  


const dialogVisible = ref(false);

const onMaterialChanged = (value: string) => {
  props.items.forEach(item => {
    if (item.material === material.value) {
      item.material = value;
      item.key_material_str = value + "_" + item.tare_id;
    };
  });
  var index = props.material_list.indexOf(material.value);
  if (index >= 0) {
    props.material_list.splice( index, 1 );
  };
  props.material_list.push(value);
  material.value = value;
};

const flag_options = [
  {
    value: '0',
    label: '-',
  },
  {
    value: '1',
    label: '+',
  }
];

function onNextOperationFlagChange(value: string, item: frontend.IArrivalItems) {
  if (value === undefined) {
    item.next_operation_flag = ''  
  }
  else {
    item.next_operation_flag = value;
  };
};

function handleInsertRow(index: number, item: frontend.IArrivalItems) {
  let tableIndex = (currentPage.value - 1) * pageSize.value + index + 1;
  if (props.items.filter(item => item.material === material.value).length == tableIndex) {
    addItems(add_items_num.value, item.tare_id + 1);
    return;
  };
  if (props.items.filter(item => item.material === material.value)[tableIndex].tare_id > item.tare_id + 1) {
    addItems(add_items_num.value, item.tare_id + 1);
  }
};

function fillDownShapeIds(index: number, sourceRow: frontend.IArrivalItems) {
  const pageRows = paginatedItems.value;

  for (let i = index + 1; i < pageRows.length; i++) {
    pageRows[i].shape_ids = [...sourceRow.shape_ids];
  }
}

function hasNextRow(index: number) {
  const rows = paginatedItems.value;
  return index + 1 < rows.length;
}

function hasMoreRows(index: number) {
  const rows = paginatedItems.value;
  // «до конца страницы» имеет смысл, если после текущей есть хотя бы одна строка
  return index + 1 < rows.length;
}

async function fillDownShapeIdsSingle(index: number, sourceRow: frontend.IArrivalItems) {
  const pageRows = paginatedItems.value;

  if (index + 1 >= pageRows.length) {
    return; // следующей строки нет
  }

  pageRows[index + 1].shape_ids = [...sourceRow.shape_ids];
}

async function handleFillDownWithConfirm(index: number, sourceRow: frontend.IArrivalItems) {
  const pageRows = paginatedItems.value;
  const rowsBelowCount = pageRows.length - (index + 1);

  if (rowsBelowCount <= 0) {
    return;
  }

  const confirmText = `Заполнить значения во всех строках ниже?`;

  try {
    const action = await ElMessageBox.confirm(confirmText, 'Подтверждение', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Отмена',
      type: 'warning',
    });

    if (action === 'confirm') {
      fillDownShapeIds(index, sourceRow); // твой существующий метод
    }
  } catch (err) {
    // пользователь нажал «Отмена» или закрыл окно — ничего не делаем
    return;
  }
}


</script>

<template v-if="store.isAuth">
     <div class="common-layout">
      <el-container class="material-item">

        <el-header height="auto" class="block-header">
          <div class="form-row">
            <el-input disabled v-model="material" class="product-input">
              <template #prepend>Продукт</template>
              <template #append>
                <el-button :icon="Edit" @click="dialogVisible = true" />
              </template>
            </el-input>
            <DialogNewMaterial
              v-model:dialogVisible="dialogVisible"
              :operation_material_list = "props.operation_product_list"
              :initial-value="operation_material"
              :material_list ="props.material_list"
              @update:dialogVisible="dialogVisible = $event"
              @submit="onMaterialChanged"
            />
          </div>

          <div class="form-row">
            <el-input
              v-model.number="start_items_num" :min=1 :max="99999" :disabled="insertColumnEnabled"  class="num-input"
              @change="(value: string) => {
                const numValue = Number(value);
                if (numValue < 1) {
                  start_items_num = 1;
                } else if (numValue > 99999) {
                  start_items_num = 99999; 
                }
              }"
              type="number"
              >
              <template #prepend>Номер</template>
            </el-input>          
            <el-input
              v-model.number="add_items_num" :min="1" :max="300" class="num-input"
              @change="(value: string) => {
                const numValue = Number(value);
                if (numValue < 1) {add_items_num = 1} else {if (numValue > 300) {add_items_num = 300}}
                }"
              type="number"
              >
              <template #prepend>Кол-во</template>
            </el-input>
            <el-select v-model="tare_default" placeholder="Тара" class="tare-select">
              <el-option
                v-for="item in store.arrival?.tare_options"
                :key="item.tare_type_id"
                :label="item.tare_type"
                :value="item.tare_type"
              />
            </el-select>
            <el-tooltip content="Добавить строки">
              <el-button plain :icon="Check" @click="addItems(add_items_num, start_items_num)" style="margin-left: 10px;"/>
            </el-tooltip>
          </div>

          <div class="form-row options-row">
            <el-checkbox v-model="tareColumnEnabled" label="тара" />
            <el-checkbox v-model="shapeColumnEnabled" label="вид материала" />
            <el-checkbox v-model="nextOperationColumnEnabled" label="следующая операция" />
            <el-checkbox v-model="insertColumnEnabled" label="вставить строки" />
          </div>
        </el-header>

        <el-main class="el-main">
          <div class="table-wrapper">
            <el-table ref="tableRef" :data="paginatedItems" :table-layout="tableLayout" scrollbar-always-on>
              <el-table-column prop="tare_id" label="Номер" width="90" align="center">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.tare_id" placeholder="" disabled
                  ></el-input>
                </template>
              </el-table-column>  
              <el-table-column prop="gross_weight" label="Вес" min-width="160">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.gross_weight" placeholder="Введите вес"
                  ></el-input>
                </template>
              </el-table-column>
  
              <el-table-column prop="tare_type" label="Тара" min-width="130">
                <template #default="scope">
                  <el-select v-model="scope.row.tare_type" :disabled="!tareColumnEnabled" placeholder="Тара"
                    @change="onTareChange(scope.row.tare_type, asItem(scope.row))" 
                  >
                    <el-option
                      v-for="item in store.arrival?.tare_options"
                      :key="item.tare_type_id"
                      :label="item.tare_type"
                      :value="item.tare_type"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="shape_ids" label="Вид" min-width="170">
                <template #default="scope">
                  <el-select v-model="scope.row.shape_ids" :disabled="!shapeColumnEnabled" placeholder=""
                  clearable multiple >
                    <el-option
                      v-for="item in store.arrival?.shape_options"
                      :key="item.shape_id"
                      :label="item.shape_name"
                      :value="item.shape_id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column v-if="shapeColumnEnabled" label="" width="120">
                <template #default="scope">
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <!-- Заполнить только следующую строку -->
                     <el-tooltip content="Заполнить следующую строку" placement="top">
                       <el-button
                         size="small"
                         plain
                         :disabled="!hasNextRow(scope.$index)"
                         @click="fillDownShapeIdsSingle(scope.$index, asItem(scope.row))"
                       >
                         <ArrowRight style="width: 14px; height: 14px;" />
                       </el-button>
                     </el-tooltip>

                    <!-- Заполнить до конца видимой страницы -->
                    <el-tooltip content="Заполнить все строки ниже на странице" placement="top">
                      <el-button
                        size="small"
                        :disabled="!hasMoreRows(scope.$index)"
                        @click="handleFillDownWithConfirm(scope.$index, asItem(scope.row))"
                      >
                        <CaretBottom style="width: 14px; height: 14px;" />
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>              
              <el-table-column v-if="nextOperationColumnEnabled" prop="next_operation_flag" label="След. этап" width="100">
                <template #default="scope">
                  <el-select v-model="scope.row.next_operation_flag" :disabled="!nextOperationColumnEnabled" placeholder="" clearable
                    @change="onNextOperationFlagChange(scope.row.next_operation_flag, asItem(scope.row))" 
                  >
                    <el-option
                      v-for="item in flag_options"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column v-if="insertColumnEnabled" label="" width="60">
                <template #default="scope">
                  <el-button size="small" @click="handleInsertRow(scope.$index, asItem(scope.row))" :disabled="!insertColumnEnabled">
                    +
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
  
            <el-pagination
              v-if="totalItems > 0"
              :current-page="currentPage"
              :page-size="pageSize"
              :total="totalItems"
              layout="prev, pager, next, jumper, sizes, total"
              :page-sizes="[10, 20, 50, 100]"
              @current-change="handleCurrentChange"
              @size-change="handleSizeChange"
            />
  
              <div class="form-row">
                <span class="total-label">Итого вес:</span>
                <span class="total-value">{{ formatTwoDecimal(totalWeight) }}</span>
              </div>
          </div>
        </el-main>
      </el-container>
    </div>


</template>

<style scoped>
.block-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-input { flex: 0 1 420px; }
.num-input { width: 160px; flex-shrink: 0; }
.tare-select { width: 140px; flex-shrink: 0; }

.options-row { gap: 20px; }

:deep(.el-table .el-table__cell) {
  padding: 4px 8px;
}

:deep(.el-table .el-input__inner) {
  font-size: 18px;
  font-weight: 500;
}

:deep(.el-table .el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}
:deep(.el-table .el-input:not(.is-disabled) .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  background: #fff;
}
:deep(.el-table .el-input:not(.is-disabled) .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
  background: #fff;
}

:deep(.el-table .el-select__wrapper) {
  box-shadow: none;
  background: transparent;
  min-height: var(--el-input-height, 36px);
}
:deep(.el-table .el-select__wrapper.is-hovering:not(.is-disabled)) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  background: #fff;
}
:deep(.el-table .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
  background: #fff;
}

:deep(.el-table) {
  --el-input-height: 36px;
}

@media (max-width: 1024px) {
  :deep(.el-table) { --el-input-height: 40px; }
}

@media (max-width: 480px) {
  :deep(.el-table) { --el-input-height: 32px; }
  :deep(.el-table .el-input__inner) { font-size: 16px; }
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.table-wrapper > .el-table {
  min-width: 0;
  max-width: 100%;
}

.total-label {
  color: var(--el-text-color-secondary);
  font-size: 15px;
}
.total-value {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.material-item {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
