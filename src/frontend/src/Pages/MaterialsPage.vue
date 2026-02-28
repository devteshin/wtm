<template>
  <el-container class="page-container">
    <!-- Левый блок: панель с формой -->
    <el-aside width="300px" class="sidebar">
      <el-form label-position="top" class="filter-form">
        <el-form-item label="Склад">
          <el-select v-model="selectedStore" placeholder="Склад" clearable multiple>
            <el-option
              v-for="item in store.materials_meta?.stock_list"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Сырьевая группа">
          <el-select v-model="selectedMaterialGroup" placeholder="Сырьевая группа" clearable multiple>
            <el-option
              v-for="item in store.materials_meta?.material_group_list"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Материал">
          <el-select v-model="selectedMaterial" placeholder="Материал" clearable multiple filterable>
            <el-option
              v-for="item in store.materials_meta?.material_list"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
          <el-form-item label="Расширенный режим">
            <div class="switch-container">
              <el-switch
                v-model="isAdvancedMode"
                active-color="#13ce66"
                inactive-color="#ff4949"
                @change="handleSwitchChange"
              />
              <span class="switch-description">
                {{ isAdvancedMode ? 'развернуть материалы' : 'группировать материалы' }}
              </span>
            </div>
          </el-form-item>
          <el-button
            type="primary"
            @click="handleMakeReport"
            class="apply-button"
          >
            Сформировать
          </el-button>        
      </el-form>
    </el-aside>

    <!-- Правый блок: контейнер с таблицей -->
    <el-container>
      <el-main class="table-container">
        <el-table :data="tableData" style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="Название" width="200" />
          <el-table-column prop="category" label="Категория" width="150" />
          <el-table-column prop="status" label="Статус" width="120" />
          <el-table-column prop="date" label="Дата" width="180" />
        </el-table>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { ref } from "vue";
import useApplicationStore from "@/store";
import { useRouter } from "vue-router";

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
});


const router = useRouter();
const store = useApplicationStore();

onMounted(async () => {
//    await store.fetchOperations(props.stockID);
//    console.log(store.operations);
    await store.fetchMaterialsMeta(props.stockID);
    console.log(store.materials_meta)

});


// Выбранные значения селектов
const selectedStore = ref([]);
const selectedMaterialGroup = ref([]);
const selectedMaterial = ref([]);

const isAdvancedMode = ref(false);

// Данные таблицы
const tableData = ref([
  { id: 1, name: 'Элемент 1', category: 'Категория A', status: 'Активен', date: '2023-10-01' },
  { id: 2, name: 'Элемент 2', category: 'Категория B', status: 'Неактивен', date: '2023-10-02' },
  { id: 3, name: 'Элемент 3', category: 'Категория C', status: 'Активен', date: '2023-10-03' },
  { id: 4, name: 'Элемент 4', category: 'Категория A', status: 'Ожидает', date: '2023-10-04' }
]);

const handleMakeReport = async () => {
  console.log('Выбранные фильтры:', {
    option1: selectedStore.value,
    option2: selectedMaterialGroup.value,
    option3: selectedMaterial.value,
    isAdvancedMode: isAdvancedMode.value
  });
  await store.fetchMaterialsData(1, {
    materials: "4356, 3322, 567",
    stocks: "1, 11",
    material_groups: "'Mo', 'Al', 'Zn'",
    indicators: "C, S",
    indicator_conditions: "0, 100, 2, 5"
  });
};

const handleSwitchChange = (value) => {
  console.log('Режим расширенного фильтра:', value ? 'включён' : 'выключен');

  // Здесь можно добавить логику, которая будет выполняться при переключении режима
  if (value) {
    // Действия при включении расширенного режима
    console.log('Активированы дополнительные функции фильтрации');
  } else {
    // Действия при выключении расширенного режима
    console.log('Дополнительные функции фильтрации отключены');
  }
};
</script>

<style scoped>
.page-container {
  height: 100vh; /* Занимает всю высоту экрана */
}

.sidebar {
  background-color: #f5f7fa;
  padding: 20px;
  border-right: 1px solid #e6e9ef;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.table-container {
  padding: 20px;
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

:deep(.el-table) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>