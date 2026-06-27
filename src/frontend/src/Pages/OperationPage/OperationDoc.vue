<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watchEffect, watch } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import OperationDocItems from "./OperationDocItems.vue";
import { Delete } from '@element-plus/icons-vue';

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

// Колонки таблицы сырья
const RawMaterialsColumns = [
    { prop: 'material', label: 'Материал', width: '200' },
    { prop: 'tare_id', label: 'Номер', width: '100' },
    { prop: 'net_weight', label: 'Нетто', width: '100' },
] as const;

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

const handleDeleteRow = (row: frontend.IRawMaterial) => {
    ElMessageBox.confirm(`Удалить материал: ${row.material} , номер: ${row.tare_id}?`, 'Подтверждение', {
        confirmButtonText: 'Да',
        cancelButtonText: 'Нет',
        type: 'warning'
    }).then(() => {
        doc_raw_materials.value = doc_raw_materials.value.filter(r => r !== row);
        // Если нужно удаление на бэкенд — запрос здесь
    });
};

</script>

<template v-if="store.isAuth">
    <el-container class="page-container">
        <!-- Левый блок -->
        <el-aside width="600px" class="sidebar">
            <div class="left-content">
                <!-- Форма и кнопки (не растягиваются на весь блок) -->
                <div class="form-area">
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

                    <div class="button-row">
                        <el-button type="success" plain @click="saveDoc">Сохранить</el-button>
                        <el-button type="success" plain @click="closeDoc">Закрыть</el-button>
                        <el-button type="danger" plain @click="deleteDoc">Удалить</el-button>
                        <el-button type="success" plain @click="addMaterial">Добавить продукт</el-button>
                    </div>
                </div>

                <!-- Отступ после кнопок -->
                <div class="buttons-spacer"></div>

                <!-- Разделитель -->
                <div class="divider"></div>

                <!-- Текст заголовка таблицы -->
                <div class="table-title-wrapper">
                    <el-text class="table-title">Материалы списанные на операцию</el-text>
                </div>

                <!-- Таблица (занимает всё оставшееся место) -->
                <div class="table-area">
                    <div class="table-wrapper">
                        <el-table
                            :data="doc_raw_materials"
                            style="width: 100%"
                            border
                        >
                            <el-table-column
                                v-for="col in RawMaterialsColumns"
                                :key="col.prop"
                                :prop="col.prop"
                                :label="col.label"
                                :width="col.width"
                            />

                            <el-table-column label="" width="50" fixed="right">
                                <template #default="scope">
                                    <el-button
                                        link
                                        type="danger"
                                        size="small"
                                        @click="handleDeleteRow(scope.row)"
                                    >
                                        <Delete style="width: 14px; height: 14px;" />
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                </div>
            </div>
        </el-aside>

        <!-- Правый блок -->
        <el-main class="right-block">
            <div class="table-wrapper right-wrapper">
                <div v-for="material in doc_material_list" :key="material" class="material-item">
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
        </el-main>
    </el-container>
</template>

<style scoped>
.page-container {
    height: calc(100vh - 120px);
    display: flex;
    box-sizing: border-box;
}

.sidebar {
    background-color: #f5f7fa;
    padding: 20px;
    border-right: 1px solid #e6e9ef;
    flex-shrink: 0;
    width: 600px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.left-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    /* Важно: здесь flex-элементы будут идти по порядку, без лишнего растяжения */
}

/* Форма и кнопки: НЕ растягиваются на всё место */
.form-area {
    /* flex: 1 убран — теперь блок занимает только свой контент */
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
    margin-top: 16px;
}

/* Отступ между кнопками и таблицей — ровно 12px */
.buttons-spacer {
    height: 12px;
    flex-shrink: 0;
}

/* Разделитель */
.divider {
    height: 1px;
    background-color: #e4e7ed;
    margin: 0; /* margin лучше убрать, чтобы он не добавлял лишнего */
    flex-shrink: 0;
}

.table-title-wrapper {
    width: 100%;
    margin-top: 12px;
    flex-shrink: 0; /* чтобы не сжимался */
}

/* Сам текст — выравнивание по левому краю */
.table-title {
    display: inline-block;
    font-weight: 500;
    color: #333;
}

/* Таблица: занимает всё оставшееся место */
.table-area {
    flex: 1;
    min-height: 0;
    position: relative;
    height: 100%;
    margin-top: 16px;
}

.right-block {
    padding: 0 20px 20px;
    box-sizing: border-box;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

/* Универсальная обёртка для скролла */
.table-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: auto;
    border-radius: 4px;
}

.right-wrapper {
    padding: 16px 0;
}

@media (max-width: 768px) {
    .page-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
        min-height: 300px;
        border-right: none;
        border-bottom: 1px solid #e6e9ef;
    }

    .right-block {
        height: calc(100vh - 120px - 300px);
        min-height: 200px;
    }
}
</style>