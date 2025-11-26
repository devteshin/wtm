<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    stockID: { type: Number, required: true },
    operationID: { type: Number, required: true },
    docID: { type: Number, required: true },
    materialID: { type: Number, required: true },
});

interface docItemsData {
  key_material: string,
  tare_id: number,
  gross_weight: number,
  tare_type: string,
  tare_weight: number
};

interface tareOptions {
  tare_type: string,
  tare_weight: number,
  tare_type_id: number
};


const tare_type_options = [
  {
    value: 'б/м 15',
    label: 'б/м 15',
  },
  {
    value: 'б/м 16',
    label: 'б/м 16',
  },
  {
    value: 'мкр',
    label: 'мкр',
  },
];


const doc_number = ref('');
const doc_date = ref('');
const doc_material = ref('');
const doc_operation = ref('');
const doc_items = ref([<docItemsData>{}]);
let tare_options = [<tareOptions>{}]; 

const add_items_num = ref(1);
const start_items_num = ref(0);
let min_start_items_num = 0;

 onMounted(async () => {
     await store.fetchArrival(props.stockID, props.operationID, props.docID, props.materialID);
     if (store.arrival) {
        doc_number.value = store.arrival.doc_number;
        doc_date.value = store.arrival.doc_date;
        doc_material.value = store.arrival.material;
        doc_operation.value = store.arrival.operation;
        doc_items.value = store.arrival.items;
        tare_options = store.arrival.tare_options;

        console.log(tare_options);

        start_items_num.value = getStartItemsNum();
        min_start_items_num = start_items_num.value

     }
    
     

});

function getFixedLengthNumber(value: number): string {
  if (value) {
    return value.toString().padStart(4, '_');
  }
  return '';
};

const saveDoc = async () =>  {
  if (doc_number.value == '' ||  doc_date.value == '' ||  doc_material.value == '') {
    return
  };
  
  const docParams = {
      docID: props.docID,
      docNumber: doc_number.value,
      docDate: doc_date.value,
      materialID: props.materialID,
      arrival_items: doc_items.value.filter(item => item.gross_weight > 0)
  };

  await store.updateArrival(docParams);
};

function getStartItemsNum() {
  if (!doc_items) {
    return 0;
  }
  return (doc_items.value.map(item => item.tare_id)).reduce((max, currentValue) => Math.max(max, currentValue), 0) + 1;
};

function addItems(position_num: number) {

  if (position_num == 0) {
    return;
  }

  const next_tare_id = start_items_num.value;

  for (let i = 0; i < position_num; i++) {
    const item = <docItemsData>{};
    item.tare_id = next_tare_id + i;
    item.key_material =  props.materialID.toString() + '_' + item.tare_id.toString() ;
    item.gross_weight = 0;
    item.tare_type = 'б/м 16';
    item.tare_weight = 16;
    doc_items.value.push(item)
  }

  start_items_num.value = getStartItemsNum();
  min_start_items_num = start_items_num.value;
};

</script>

<template v-if="store.isAuth">
    <el-row :gutter="20">
      <el-col :span="8"><div class="grid-content ep-bg-purple" />
        <div>
          <el-input clearable
            v-model="doc_number"
            style="max-width: 300px"
            placeholder="Номер документа"
          >
          </el-input>
          <el-input
            type="date"
            v-model="doc_date"
            style="max-width: 150px"
          >
          </el-input>
        </div>  
        <div>
          <el-input clearable
            v-model="doc_material"
            style="max-width: 300px"
            placeholder="Материал"
          >
          </el-input>
        </div>  
        <div>
          <el-input 
            v-model="doc_operation"
            style="max-width: 300px"
            placeholder="Операция"
          >
          </el-input>
        </div>  
        <div class="button-row">
          <el-button type="success" plain @click="saveDoc()">Сохранить</el-button>
        </div>
      </el-col>
      <el-col :span="6"><div class="grid-content ep-bg-purple" />
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
        <!-- <div class="button-row"> -->
          <el-button type="success" plain @click="addItems(add_items_num)">Добавить</el-button>
        <!-- </div> -->
        <div v-for="item in doc_items" :key="item.key_material">
          <el-input
            v-model.number="item.gross_weight" :min="item.tare_weight" 
            @change="(value: number) => {if (value < item.tare_weight && value != 0) {item.gross_weight = item.tare_weight}}"
            style="max-width: 200px"
            type="number"
            >
            <template #prepend>Номер {{ getFixedLengthNumber(item.tare_id)}}</template>
          </el-input>          
          <el-select v-model="item.tare_type" placeholder="Тара" style="width: 100px">
            <el-option
              v-for="item in tare_type_options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </el-col>
    </el-row>


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
