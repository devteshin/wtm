<template>
  <el-container v-if="store.isAuth" class="operations-layout">
    <!-- Левая панель: % -->
    <el-aside width="20%" class="left-panel">
        <el-form label-position="top" class="filter-form">
            <el-form-item>
                <el-button type="primary" @click="openDrawer(0)" class="btn-new-operation">
                  Новая операция
                </el-button>
            </el-form-item>
            <el-form-item>
                <div class="switch-container">
                <el-switch 
                    v-model="isActiveOperationMode"
                    active-color="#13ce66"
                    inactive-color="#ff4949"
                />
                <span class="switch-description">
                    {{ isActiveOperationMode ? 'активные операции' : 'выполненные операции' }}
                </span>
                </div>
            </el-form-item>
        </el-form>
    </el-aside>

    <!-- Правая панель: остальное пространство -->
    <el-main class="right-panel">
      <!-- Контейнер для скролла таблицы -->
      <div class="table-scroll-container">
        <el-table
          v-loading="store.loading"
          :data="store.operations"
          :row-style="{ cursor: 'pointer' }"
          :border="true"
          style="width: 100%"
          table-layout="fixed"
          @row-click="handleRowClick"
        >
          <!-- Колонки данных -->
          <el-table-column
            v-for="col in columns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
          />

          <!-- Колонка с иконкой действия -->
          <el-table-column width="60" align="center">
            <template #default="{ row }">
              <el-button
                link
                :icon="Edit"
                @click.stop="openDrawer(row.id)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-main>
  </el-container>

  <el-drawer
    v-model="drawerVisible"
    title="Операция"
    :before-close="handleCloseDrawer"
    @close="onFormClose"
    size="60%"
  >
    <OperationItems
      v-if="currentOperationID !== null && store.currentUser?.id !== undefined"
      :key="currentOperationID + '_' + drawerVisible"
      :operationID="currentOperationID"
      :stockID="props.stockID"
      :userID="Number(store.currentUser?.id)"
      @close="drawerVisible = false"
      @open-material-selection="openSelectionDrawer"
    />
    <div v-else class="empty-state">
      Недостаточно данных для отображения формы
    </div>
  </el-drawer>

  <el-drawer
    v-model="selectionDrawerVisible"
    title="Подбор материалов"
    direction="rtl"
    :size="drawerSize"
    @close="onSelectionFormClose"
  >
       <MaterialPage
      :stockID="props.stockID"
      @selection-confirmed="onSelectionConfirmed"
      @close="selectionDrawerVisible = false"
    />
  </el-drawer>    


</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onMounted } from "vue";
import useApplicationStore from "@/store";
import { useMaterialsReportStore } from '@/storeMaterialsReport';
import { useRouter } from "vue-router";
import OperationItems from "../Pages/OperationPage/OperationItems.vue";
import MaterialPage from '../Pages/MaterialsPage.vue';

import { Plus, Edit } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  /** ID склада */
  stockID: { type: Number, required: true },
});

const router = useRouter();
const store = useApplicationStore();
const reportStore = useMaterialsReportStore()

// Состояние drawer
const drawerVisible = ref(false);
const selectionDrawerVisible = ref(false);
const currentOperationID = ref<number | null>(null);

const isActiveOperationMode = ref(true);

/** Открытие drawer с нужным operationID */
const openDrawer = (operationID: number) => {
  currentOperationID.value = operationID;
  drawerVisible.value = true;
};

/** Закрытие drawer */
const handleCloseDrawer = (done: (flag?: boolean) => void) => {
  done();
};

/** Обработчик нажатия строки таблицы — переход на операцию */
const handleRowClick = (row: frontend.IOperations) => {
  router.push(`/stock/${props.stockID}/operation/${row.id}`);
};

onMounted(async () => {
  await fetchOperations();
});

/** Перезагрузка данных при смене фильтра */
watch(isActiveOperationMode, async () => {
  await fetchOperations();
}, { immediate: false });

/** Получение данных от API со списком операций */
const fetchOperations = async () => {
  await store.fetchOperations(props.stockID, isActiveOperationMode.value);
};

const onFormClose = async () => {
  drawerVisible.value = false 
  await store.fetchOperations(props.stockID, isActiveOperationMode.value);
}

const onSelectionFormClose = async () => {
  selectionDrawerVisible.value = false;
  drawerVisible.value = true 
}


/** Список столбцов для таблицы */
const columns = [
  {
    label: "Операция",
    prop: "operation",
    width: "400",
  },
  {
    label: "Кол-во циклов (смен)",
    prop: "doc_count",
    width: "200",
  },
];

const drawerSize = computed<number>(() => {
  const w = window.innerWidth;
  console.log(w);
  if (w <= 768) {
    return Math.floor(0.98 * w);       
  }
  if (w <= 1280) {
    return Math.floor(0.95 * w);
  }
  return Math.floor(0.9 * w);
});

function setContextMaterialsSelection() {
  if (props.stockID != null) {
    reportStore.selectedStore = [props.stockID];
  };
  reportStore.isSelectionDetailedMode = true;
  reportStore.isDetailedMode = true;
  reportStore.isSelectionEnabled = true;
  reportStore.isSelectionControlEnabled = true;
  reportStore.isOnlyNonZeroMode = true;
}; 

const openSelectionDrawer = () => {
  drawerVisible.value = false
  reportStore.isOperationListAutoGenerateReport = true;
  setContextMaterialsSelection();
  selectionDrawerVisible.value = true 
};

const onSelectionConfirmed = (items: frontend.IRawMaterial[]) => {
  if (!items.length) {
    ElMessage.warning('Ничего не выбрано');
    return;
  }

  console.log('Items:', items);

  selectionDrawerVisible.value = false;
  drawerVisible.value = true 


/*   const existingIds = new Set(
    doc_raw_materials.value.map(i => `${i.material_id}_${i.tare_id}`)
  );

  const newItems = items.filter(
    item => !existingIds.has(`${item.material_id}_${item.tare_id}`)
  );

  if (newItems.length === 0) {
    ElMessage.info('Все выбранные позиции уже есть в документе');
    drawerVisible.value = false;
    return;
  }

  doc_raw_materials.value = [...doc_raw_materials.value, ...newItems];
  ElMessage.success(`Добавлено ${newItems.length} позиций`);
  drawerVisible.value = false;
 */
};


</script>

<style scoped>
.operations-layout {
  height: calc(100vh - 120px);
}

.left-panel {
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-new-operation {
  width: 100%;
  justify-content: center;
}

.status-filter {
  flex: 1;
  align-items: center;
}

.right-panel {
  padding: 0 16px 16px 16px;
  overflow: hidden;
}

.table-scroll-container {
  /* Высота подстраивается под доступное место в el-main */
  height: 100%;
  overflow: auto;
}

.table-scroll-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.table-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.table-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-description {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

</style>
