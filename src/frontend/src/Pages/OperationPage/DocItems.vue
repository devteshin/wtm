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
  tare_type: string
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

 onMounted(async () => {
     await store.fetchArrival(props.stockID, props.operationID, props.docID, props.materialID);
     if (store.arrival) {
        doc_number.value = store.arrival.doc_number;
        doc_date.value = store.arrival.doc_date;
        doc_material.value = store.arrival.material;
        doc_operation.value = store.arrival.operation;
        doc_items.value = store.arrival.items;
        console.log(doc_items)
     }
     
});

function getFixedLengthNumber(value: number): string {
  if (value) {
    return value.toString().padStart(4, '_');
  }
  return '';
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
          <el-input clearable
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
          <el-input clearable
            v-model="doc_operation"
            style="max-width: 300px"
            placeholder="Операция"
          >
          </el-input>
        </div>  
      </el-col>
      <el-col :span="6"><div class="grid-content ep-bg-purple" />
        <div v-for="item in doc_items" :key="item.key_material">
          <el-input
            v-model="item.gross_weight"
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
