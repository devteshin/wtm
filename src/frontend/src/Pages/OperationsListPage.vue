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
                type="text"
                :icon="Edit"
                @click.stop="openDrawer(row.id)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-main>
  </el-container>

  <!-- Drawer для редактирования/создания операции -->
  <el-drawer
    v-model="drawerVisible"
    title="Операция"
    :before-close="handleCloseDrawer"
    size="60%"
  >
    <OperationItem :operationID="currentOperationID" @close="drawerVisible = false" />
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { onMounted } from "vue";
import useApplicationStore from "@/store";
import { useRouter } from "vue-router";
import OperationItem from "../Pages/OperationPage/OperationItem.vue";

import { Plus, Edit } from "@element-plus/icons-vue";

const props = defineProps({
  /** ID склада */
  stockID: { type: Number, required: true },
});

const router = useRouter();
const store = useApplicationStore();

// Состояние drawer
const drawerVisible = ref(false);
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
