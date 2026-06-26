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


const doc_number = ref('');
const doc_date = ref('');
const doc_operation = ref('');
const doc_operation_material = ref('');
const doc_material_list = ref(['']);
const doc_items = ref([<frontend.IArrivalItems>{}]);
const doc_base_raw_materials = ref([<frontend.IBaseRawMaterial>{}]);
const doc_raw_materials = ref([<frontend.IRawMaterial>{}]);
let isNewDoc = false;  
let doc_id = 0;
let operation_id = 0;   

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
      isNewDoc = true;
    }  
    else {
      doc_id = props.docID;
      isNewDoc = false;
    };


    operation_id = props.operationID;

    await store.fetchArrival(props.stockID, operation_id, doc_id);  

    if (store.arrival) {
        doc_number.value = store.arrival.doc_number;
        doc_date.value = store.arrival.doc_date;
        doc_operation.value = store.arrival.operation;
        doc_operation_material.value = store.arrival.operation_material;
        doc_raw_materials.value = store.arrival.raw_materials;
        doc_base_raw_materials.value = store.arrival.base_raw_materials;
        doc_items.value = store.arrival.items;
        doc_material_list.value = doc_items.value.map(i => i.material).filter(function(elem, index, self) {return index === self.indexOf(elem);})
    };

    console.log(store.arrival);

    doc_changed = false

     watch(doc_number, () => {doc_changed = true});
     watch(doc_date, () => {doc_changed = true});
     watch(doc_items, () => {doc_changed = true}, {deep: true});
});

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

    let success = await store.deleteArrival(doc_id);
    if (success) {
      router.push(`/stock/${props.stockID}/operation/${operation_id}`);
    };
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
          saveDoc().then(() => {
            router.push(`/stock/${props.stockID}/operation/${operation_id}`);
          }).catch((error) => {
            ElMessage.error('Ошибка сохранения: ' + error.message);
          });        } 
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
    if (isNewDoc) {
      await store.deleteArrival(doc_id);
    }
    router.push(`/stock/${props.stockID}/operation/${operation_id}`);
  }
};

const saveDoc = async () =>  {
  if (doc_number.value == '' ||  doc_date.value == '' || doc_items.value.map(item => item.material).find(item => item === "")) {
    return
  };
   
  const docParams = {
      stockID: props.stockID,
      docID: doc_id,
      docNumber: doc_number.value.trim(),
      docDate: doc_date.value,
      arrival_items: doc_items.value.filter(item => item.gross_weight > 0 && item.tare_type != '')
  };

try {
  let success = await store.updateArrival(docParams);
  if (success) {
    doc_changed = false;
    isNewDoc = false;
  } else {
    console.error('Сохранение не удалось');
  }
} catch (error) {
  console.error('Ошибка API:', error);
};
  
};

function addMaterial() {
  const now = new Date();

  let new_material = doc_operation_material.value || doc_operation.value;
  if (doc_material_list.value.includes(new_material)) {
    new_material = new_material + " - " + now.getHours() +":"+ now.getMinutes().toString().padStart(2, '0') +":"+ now.getSeconds().toString().padStart(2, '0');
  };

  doc_material_list.value.push(new_material);

};


</script>

<template v-if="store.isAuth">
  <div class="main-container">
    <!-- Левый блок -->
    <div class="left-block">
      <div class="left-vertical-splitter">
        <!-- Верхняя часть: текущая форма -->
        <div class="top-form-section">
          <div class="form-wrapper">
            <div class="form-row-doc">
              Документ:
              <el-input
                clearable
                v-model="doc_number"
                style="max-width: 300px"
                placeholder="Номер документа"
              />
              <el-input
                type="date"
                v-model="doc_date"
                style="max-width: 150px"
              />
            </div>
            <div class="form-row-doc">
              Операция:
              <el-input
                disabled
                v-model="doc_operation"
                style="max-width: 300px"
                placeholder="Операция"
              />
            </div>

            <div class="button-row" style="margin-bottom: 20px">
              <el-button type="success" plain @click="saveDoc()">Сохранить</el-button>
              <el-button type="success" plain @click="closeDoc()">Закрыть</el-button>
              <el-button type="danger" plain @click="deleteDoc()">Удалить</el-button>
              <el-button type="success" plain @click="addMaterial()">Добавить продукт</el-button>
            </div>

          </div>
        </div>

        <!-- Нижняя часть:  -->
        <div class="bottom-component-section">
          <MyNewComponent />
        </div>
      </div>
    </div>

    <!-- Правый блок: список материалов -->
    <div class="right-block">
      <div
        v-for="material in doc_material_list"
        :key="material"
        class="material-item"
      >
        <OperationDocItems
          :material="material"
          :operation="doc_operation"
          :operation_material="doc_operation_material"
          v-model:material_list="doc_material_list"
          v-model:items="doc_items"
          :table-width="'100%'"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.left-block {
  flex: 1;
  min-width: 0;
  padding-right: 16px;
  display: flex;
  flex-direction: column;
}

.right-block {
  flex: 2;
  min-width: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
}

.left-vertical-splitter {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Верхняя секция — форма */
.top-form-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e4e7ed; /* визуальное разделение */
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.form-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

/* Нижняя секция — новый компонент */
.bottom-component-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.form-row-doc {
  margin-bottom: 10px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

/* Адаптив: на мобильных — блоки друг под другом */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }

  .left-block,
  .right-block {
    width: 100%;
    padding: 0;
    margin-bottom: 16px;
  }
}
</style>