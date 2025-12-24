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
  Delete,
  Edit,
  Message,
  Search,
  Star,
} from '@element-plus/icons-vue'
import { Row } from "element-plus/es/components/table-v2/src/components";


const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    operation: { type: String, required: true },
    operation_material: { type: String, required: true },
    material: { type: String, required: true },
    material_list: { type: Array as PropType<string[]>, required: true },
    items: { type: Array as PropType<frontend.IArrivalItems[]>, required: true }
});

const tare_default = ref('');

const add_items_num = ref(1);
const start_items_num = ref(0);
const material = ref('')
const operation_material = ref(props.operation_material);
let min_start_items_num = 0;

onMounted(async () => {
  if (props.material) {
    material.value = (props.material);
  } else {
    material.value = (props.operation_material);
  };
  start_items_num.value = await getStartItemsNum(material.value);
  min_start_items_num = start_items_num.value;
  
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

async function addItems(position_num: number) {

  if (position_num == 0 || tare_default.value == '') {
    return;
  }

  const next_tare_id = start_items_num.value;
  
  for (let i = 0; i < position_num; i++) {
    const item = <frontend.IArrivalItems>{};  
    item.tare_id = next_tare_id + i;
    item.gross_weight = 0;
    item.tare_type = tare_default.value;
    item.tare_weight = getTareWeight(tare_default.value);
    item.material = material.value;
    item.key_material = item.material + '_' + item.tare_id;
    item.next_operation_flag = '';
    props.items.push(item);
  }

  start_items_num.value = await getStartItemsNum(material.value);
  min_start_items_num = start_items_num.value;
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
      item.key_material = value + "_" + item.tare_id;
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

const tareColumnEnabled = ref(false);
const tableLayout = ref<TableInstance['tableLayout']>('auto');

</script>

<template v-if="store.isAuth">
     <div class="common-layout">
      <el-container>
        <el-header height="10%" >
          <div class="form-row">
            Материал:
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
              v-model.number="start_items_num" :min="min_start_items_num" :max="10000"
              @change="(value: string) => {
                const numValue = Number(value);
                if (numValue < 1) {
                  add_items_num = 1;
                } else if (numValue > 100) {
                  add_items_num = 100; 
                }
              }"
              style="max-width: 160px"
              type="number"
              >
              <template #prepend>Номер</template>
            </el-input>          
            <el-input
              v-model.number="add_items_num" :min="1" :max="100"
              @change="(value: string) => {
                const numValue = Number(value);
                if (numValue < 1) {add_items_num = 1} else {if (numValue > 100) {add_items_num = 100}}
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
            <el-button type="success" :icon="Check" @click="addItems(add_items_num)" circle style="margin-left: 10px;"/>
          </div>
          <el-checkbox v-model="tareColumnEnabled" label="тара" border />            
        </el-header>
        <el-main>
          <el-table :data="items.filter(item => item.material === material)" style="width: 100%; max-width: 500px;" :table-layout=tableLayout show-summary sum-text="Итого" border>
            <el-table-column prop="tare_id" label="Номер"></el-table-column>
            <el-table-column prop="gross_weight" label="Вес">
              <template #default="scope">
                <el-input v-model.number="scope.row.gross_weight" placeholder="Введите значение"
                  @change="onWeightChange(scope.row.gross_weight, scope.row)"
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
            <el-table-column prop="next_operation_flag" label="След. этап">
              <template #default="scope">
                <el-select v-model="scope.row.next_operation_flag" :disabled="!tareColumnEnabled" placeholder="" clearable style="width: 100px"
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
          </el-table>
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
  margin-bottom: 0;
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

</style>
