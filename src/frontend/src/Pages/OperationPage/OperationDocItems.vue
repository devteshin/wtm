<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, PropType, watch } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import TextInputDialog from "@/components/TextInputDialog.vue";

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    material: { type: String, required: true },
    items: { type: Array as PropType<frontend.IArrivalItems[]>, required: true }
});

const tare_default = ref('');

const add_items_num = ref(1);
const start_items_num = ref(0);
let min_start_items_num = 0;

onMounted(() => {
  console.log(props.material);
  console.log(props.items);
  start_items_num.value = getStartItemsNum();
  min_start_items_num = start_items_num.value
});

const checkMaterial = () => {
  return store.operation.map(item => item.material).includes(props.material);
};



function getFixedLengthNumber(value: number): string {
  if (value) {
    return value.toString().padStart(4, '_');
  }
  return '';
};


function getStartItemsNum() {
  if (!props.items) {
    return 0;
  }
  return (props.items.map(item => item.tare_id)).reduce((max, currentValue) => Math.max(max, currentValue), 0) + 1;
};

function addItems(position_num: number) {

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
    item.material = props.material
    item.key_material = item.material + '_' + item.tare_id
    props.items.push(item);
  }

  start_items_num.value = getStartItemsNum();
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
  console.log(store.arrival);
};  

const dialogVisible = ref(false); // Управление видимостью диалога

const handleSubmit = (value) => {
  console.log("Введенное значение:", value);
  // Дополнительная логика обработки значения
};

</script>

<template v-if="store.isAuth">
     <div class="common-layout">
      <el-container>
        <el-header>
          <div>
            <el-input disabled
              v-model="props.material" 
              style="max-width: 220px"
              >
            </el-input>
            <el-button type="success" plain @click="dialogVisible = true">Изменить материал</el-button>
             <TextInputDialog 
              v-model:dialogVisible="dialogVisible"
              @update:dialogVisible="dialogVisible = $event"
              @submit="handleSubmit"
            />            
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
