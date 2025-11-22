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

const doc_number = ref('');
const doc_date = ref('');
const doc_material = ref('');

 onMounted(async () => {
     await store.fetchArrival(props.stockID, props.operationID, props.docID, props.materialID);
     if (store.arrival) {
        doc_number.value = store.arrival.doc_number;
        doc_date.value = store.arrival.doc_date;
        doc_material.value = store.arrival.material;
     }
     
});


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
      </el-col>
      <el-col :span="6"><div class="grid-content ep-bg-purple" />
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
