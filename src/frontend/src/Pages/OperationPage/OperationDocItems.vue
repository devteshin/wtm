<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, PropType, watch } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import type { TableInstance } from 'element-plus'
import dayjs from "dayjs";
import TextInputDialog from "@/components/TextInputDialog.vue";
import DialogNewMaterial from "./DialogNewMaterial.vue";

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
//const doc_material_list = ref(props.material_list);
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

const checkMaterial = () => {
  //return store.operation.map(item => item.material).includes(props.material);
};



function getFixedLengthNumber(value: number): string {
  if (value) {
    return value.toString().padStart(4, '_');
  }
  return '';
};


async function getStartItemsNum(materail: string) {
  if (!props.items.filter(item => item.material === materail)) {
    return await store.fetchMaxTareID(materail) + 1;
  }
  return (props.items.filter(item => item.material === materail).map(item => item.tare_id)).reduce((max, currentValue) => Math.max(max, currentValue), 0) + 1;

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

const tareColumnEnabled = ref(false);
const tableLayout = ref<TableInstance['tableLayout']>('auto');

const handleSubmit = (row) => {
  console.log('Сохраненное значение:', row.value);
};

</script>

<template v-if="store.isAuth">
     <div class="common-layout">
      <el-container>
        <el-header>
          <div>
            <el-input disabled
              v-model="material" 
              style="max-width: 220px"
              >
            </el-input>
            <el-button type="success" plain @click="dialogVisible = true">Изменить материал</el-button>
             <DialogNewMaterial
              v-model:dialogVisible="dialogVisible"
              :initial-value="operation_material"
              :material_list ="props.material_list"
              @update:dialogVisible="dialogVisible = $event"
              @submit="onMaterialChanged"
            />
            <el-checkbox v-model="tareColumnEnabled" label="тара" border />            
          </div>
          <el-input
            v-model.number="start_items_num" :min="min_start_items_num" :max="10000"
            @change="(value: number) => {if (value < min_start_items_num) {start_items_num = min_start_items_num} else {if (value > 10000) {start_items_num = 10000}}}"
            style="max-width: 220px"
            type="number"
            >
            <template #prepend>Начальный номер</template>
          </el-input>          
          <el-input
            v-model.number="add_items_num" :min="1" :max="100"
            @change="(value: number) => {if (value < 1) {add_items_num = 1} else {if (value > 100) {add_items_num = 100}}}"
            style="max-width: 180px"
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
          <el-button type="success" plain @click="addItems(add_items_num)">Добавить</el-button>
        </el-header>
        <el-main>


          <el-table :data="items.filter(item => item.material === material)" style="width: 100%" :table-layout=tableLayout show-summary sum-text="Итого вес">
            <el-table-column prop="tare_id" label="Номер"></el-table-column>
            <el-table-column prop="gross_weight" label="Вес">
              <template #default="scope">
                <el-input v-model.number="scope.row.gross_weight" placeholder="Введите значение"
                ></el-input>
              </template>
            </el-table-column>

            <el-table-column prop="tare_type" label="Тара">
              <template #default="scope">
                <el-select v-model="scope.row.tare_type" :disabled="!tareColumnEnabled" placeholder="Тара" style="width: 100px" 
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
<!-- 
            <el-table-column label="Действия">
              <template #default="scope">
                <el-button @click="handleSubmit(scope.row)">Сохранить</el-button>
              </template>
            </el-table-column>
             -->
          </el-table>

<!-- 
          <div v-for="item in items.filter(item => item.material === material)" :key="item.tare_id">
            <el-input
              v-model.number="item.gross_weight" :min="item.tare_weight" 
              @change="onWeightChange(item.gross_weight, item)"
              style="max-width: 200px"
              type="number"
              >
              <template #prepend>Номер {{ getFixedLengthNumber(item.tare_id)}}</template>
            </el-input>          
            <el-select v-model="item.tare_type" placeholder="Тара" style="width: 100px" 
            @change="onTareChange(item.tare_type, item)"
            >
              <el-option
                v-for="item in store.arrival?.tare_options"
                :key="item.tare_type_id"
                :label="item.tare_type"
                :value="item.tare_type"
              />
            </el-select>
          </div>
 -->

        </el-main>
      </el-container>
    </div>


</template>

<style scoped>
.el-row {
  margin-bottom: 20px;
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
