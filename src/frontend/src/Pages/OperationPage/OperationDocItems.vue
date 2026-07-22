<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, PropType, watch } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import type { TableInstance } from 'element-plus'
import dayjs from "dayjs";
import TextInputDialog from "@/components/TextInputDialog.vue";
import DialogNewMaterial from "./DialogNewMaterial.vue";
import {
  Check,
  Edit
} from '@element-plus/icons-vue';

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    operation: { type: String, required: true },
    operation_material: { type: String, required: true },
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


onMounted(async () => {
  if (props.material) {
    material.value = (props.material);
  } else {
    material.value = (props.operation_material);
  };
  start_items_num.value = await getStartItemsNum(material.value);
});


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

const tareColumnEnabled = ref(false);
const shapeColumnEnabled = ref(false);
const nextOperationColumnEnabled = ref(false);
const insertColumnEnabled = ref(false);
const tableLayout = ref<TableInstance['tableLayout']>('fixed');
//const tableLayout = ref<TableInstance['tableLayout']>('auto');

</script>

<template v-if="store.isAuth">
     <div class="common-layout">
      <el-container>
        <el-header height="10%" >
          <div class="form-row">
            Продукт:
            <el-input disabled
              v-model="material" 
              style="max-width: 345px"
              >
            </el-input>
            <el-button type="primary" :icon="Edit" @click="dialogVisible = true" circle style="margin-left: 10px;" />
            <DialogNewMaterial
              v-model:dialogVisible="dialogVisible"
              :initial-value="operation_material"
              :material_list ="props.material_list"
              @update:dialogVisible="dialogVisible = $event"
              @submit="onMaterialChanged"
            />
          </div>
          <div class="form-row">
            <el-input
              v-model.number="start_items_num" :min=1 :max="99999" :disabled="insertColumnEnabled"
              @change="(value: string) => {
                const numValue = Number(value);
                console.log(value);
                if (numValue < 1) {
                  start_items_num = 1;
                } else if (numValue > 99999) {
                  start_items_num = 99999; 
                }
              }"
              style="max-width: 160px"
              type="number"
              >
              <template #prepend>Номер</template>
            </el-input>          
            <el-input
              v-model.number="add_items_num" :min="1" :max="300"
              @change="(value: string) => {
                const numValue = Number(value);
                if (numValue < 1) {add_items_num = 1} else {if (numValue > 300) {add_items_num = 300}}
                }"
              style="max-width: 160px;"
              type="number"
              >
              <template #prepend>Кол-во</template>
            </el-input>
            <el-select v-model="tare_default" placeholder="Тара" style="width: 100px">
              <el-option
                v-for="item in store.arrival?.tare_options"
                :key="item.tare_type_id"
                :label="item.tare_type"
                :value="item.tare_type"
              />
            </el-select>
            <el-button type="success" :icon="Check" @click="addItems(add_items_num, start_items_num)" circle style="margin-left: 10px;"/>
          </div>
          <el-checkbox v-model="tareColumnEnabled" label="тара" border />
          <el-checkbox v-model="shapeColumnEnabled" label="вид материала" border />
          <el-checkbox v-model="nextOperationColumnEnabled" label="следующая операция" border />            
          <el-checkbox v-model="insertColumnEnabled" label="вставить строки" border />            
        </el-header>
        <el-main>
          <div class="table-wrapper">
            <el-table :data="paginatedItems" :table-layout=tableLayout border>
              <el-table-column prop="tare_id" label="Номер">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.tare_id" placeholder="" disabled
                  ></el-input>
                </template>
              </el-table-column>  
              <el-table-column prop="gross_weight" label="Вес">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.gross_weight" placeholder="Введите вес"
                  ></el-input>
                </template>
              </el-table-column>
  
              <el-table-column prop="tare_type" label="Тара">
                <template #default="scope">
                  <el-select v-model="scope.row.tare_type" :disabled="!tareColumnEnabled" placeholder="Тара" style="width: 100px"
                    @change="onTareChange(scope.row.tare_type, scope.row)" 
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
              <el-table-column prop="shape_ids" label="Вид">
                <template #default="scope">
                  <el-select v-model="scope.row.shape_ids" :disabled="!shapeColumnEnabled" placeholder="Вид"
                  clearable multiple >
                    <el-option
                      v-for="item in store.arrival?.shape_options"
                      :key="item.shape_id"
                      :label="item.shape_name"
                      :value="item.shape_name"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="next_operation_flag" label="След. этап">
                <template #default="scope">
                  <el-select v-model="scope.row.next_operation_flag" :disabled="!nextOperationColumnEnabled" placeholder="" clearable style="width: 100px"
                    @change="onNextOperationFlagChange(scope.row.next_operation_flag, scope.row)" 
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
              <el-table-column label="">
                <template #default="scope">
                  <el-button size="small" @click="handleInsertRow(scope.$index, scope.row)" :disabled="!insertColumnEnabled">
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
              <el-text class="mx-1" type="success" size="large" >Итого вес: {{ totalWeight.toLocaleString('ru-RU') }}</el-text>
            </div>
          </div>
        </el-main>
      </el-container>
    </div>


</template>

<style scoped>
.form-row {
  margin-bottom: 10px;
}

.el-row {
  margin-bottom: 2px;
}
.el-row:last-child {
  margin-bottom: 10;
}
.el-col {
  border-radius: 4px;
}

.grid-content {
  border-radius: 4px;
  min-height: 36px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}


:deep(.el-table .el-input__inner) {
  font-size: 24px;
  font-weight: 500;
  height: 32px;
}

/* Для экранов < 1024px (планшеты/смартфоны) */
@media (max-width: 1024px) {
  :deep(.el-table .el-input__inner) {
    font-size: 18px;
    height: 28px;
  }
}

/* Для очень маленьких экранов (< 480px) */
@media (max-width: 480px) {
  :deep(.el-table .el-input__inner) {
    font-size: 14px;
    height: 24px;
  }
}  

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px; /* отступ между элементами */
}

</style>
