<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watchEffect, watch } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import OperationDocItems from "./OperationDocItems.vue";

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    stockID: { type:Number, required: true },
    operationID: { type: Number, required: true },
    docID: { type: Number, required: true }
});

interface docItemsData {
  material: string,
  tare_id: number,
  gross_weight: number,
  tare_type: string,
  tare_weight: number
};


const doc_number = ref('');
const doc_date = ref('');
const doc_materials = ref(['']);
const doc_operation = ref('');
const doc_items = ref([<docItemsData>{}]);
const tare_default = ref('');
let doc_id = 0;
let operation_id = 0;   

const add_items_num = ref(1);
const start_items_num = ref(0);
let min_start_items_num = 0;
let doc_changed: boolean;

 onMounted(async () => {

    if (!props.docID) {

      let dnm_doc_number = "";

      if (store.operations) {
        dnm_doc_number = await store.fetchDNMDocNumber(props.operationID);
        };
      

      const docParams = {
        stockID: props.stockID,
        operationID: props.operationID,
        userID: Number(store.currentUser?.id),
        docNumber: dnm_doc_number
      };

      doc_id = await store.createArrival(docParams);
      if (!doc_id) {
        return;
      };
    }  
    else {
      doc_id = props.docID;
    };


    operation_id = props.operationID;

    await store.fetchArrival(props.stockID, operation_id, doc_id);  

    if (store.arrival) {
        console.log(store.arrival);
        doc_number.value = store.arrival.doc_number;
        doc_date.value = store.arrival.doc_date;
        doc_materials.value = store.arrival.materials;
        doc_operation.value = store.arrival.operation;
        doc_items.value = store.arrival.items;

    }

    doc_changed = false

     watch(doc_number, () => {doc_changed = true});
     watch(doc_date, () => {doc_changed = true});
     watch(doc_items, () => {doc_changed = true}, {deep: true});
});

function getFixedLengthNumber(value: number): string {
  if (value) {
    return value.toString().padStart(4, '_');
  }
  return '';
};

const deleteDoc = async () =>  {
    try {
        await ElMessageBox.confirm(
            "Документ будет удален",
            {
                message: "Удалить документ?",
                cancelButtonText: "Нет",
                confirmButtonText: "Да",
                type: "warning"
            }
        );
    } catch (error) {
        return;
    }

    await store.deleteArrival(doc_id);
    router.push(`/stock/${props.stockID}/operation/${operation_id}`);
};

const closeDoc = async () =>  {
  if (doc_changed) {
    ElMessageBox.confirm('Сохранить изменения?', 'Документ был изменен', {
      confirmButtonText: 'Да',
      cancelButtonText: 'Нет',
      type: 'warning',
      distinguishCancelAndClose: true,
      callback: (action) => {
        if (action === 'confirm') {
          saveDoc();
          router.push(`/stock/${props.stockID}/operation/${operation_id}`);
        } 
        else if (action === 'cancel') {
          router.push(`/stock/${props.stockID}/operation/${operation_id}`);
        } 
        else if (action === 'close') {
          return;
        }
      },
    })
  }
  else {
    router.push(`/stock/${props.stockID}/operation/${operation_id}`);
  }
};

const saveDoc = async () =>  {
  if (doc_number.value == '' ||  doc_date.value == '') {
    return
  };
  

  const docParams = {
      stockID: props.stockID,
      docID: doc_id,
      docNumber: doc_number.value.trim(),
      docDate: doc_date.value,
      arrival_items: doc_items.value.filter(item => item.gross_weight > 0 && item.tare_type != '')
  };

  let success = await store.updateArrival(docParams);
  if (success) {
    doc_changed = false
  };

  
};


</script>

<template v-if="store.isAuth">
    <el-row :gutter="20">
      <el-col :span="8"><div class="grid-content ep-bg-purple" />

        <div class="common-layout">
          <el-container>
            <el-header height="120px">
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
              </div>  
              <div>
                <el-input 
                  v-model="doc_operation"
                  style="max-width: 300px"
                  placeholder="Операция"
                >
                </el-input>
              </div>  
            </el-header>
            <el-main>
              <div class="button-row">
                <el-button type="success" plain @click="saveDoc()">Сохранить</el-button>
                <el-button type="success" plain @click="closeDoc()">Закрыть</el-button>
                <el-button type="danger" plain @click="deleteDoc()">Удалить</el-button>
              </div>
            </el-main>
          </el-container>
        </div>
      </el-col>
      <el-col :span="8"><div class="grid-content ep-bg-purple" />
        {{ doc_materials }}
        <div v-for="material in doc_materials" :key="material" >
          {{ material }}
          <!-- <OperationDocItems :material="material"></OperationDocItems> -->
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
