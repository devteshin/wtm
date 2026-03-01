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
          <div v-if="isLoading" class="loading-indicator">
            <el-spin
              size="large"
              tip="Загрузка данных..."
            />
          </div>
          <el-table v-else-if="tableData && tableData.length > 0" :data="tableData" style="width: 100%">
          <el-table-column prop="stock_name" label="Склад" width="80" />
          <el-table-column prop="material" label="Материал" width="200" />
          <el-table-column prop="tare_type" label="Тара" width="150" />
          <el-table-column prop="material_mark" label="Вид материала" width="120" />
          <el-table-column prop="material_group" label="Группа материала" width="180" />
          <el-table-column prop="rest_tare_amount" label="Количество" width="180" />
          <el-table-column prop="rest_net_weight" label="Нетто" width="180" />
          <el-table-column prop="rest_gross_weight" label="Брутто" width="180" />
        </el-table>
        <div v-else class="no-data-message">
          <p>Нет данных.</p>
        </div>        
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
const isLoading = ref(false);

// Данные таблицы
/* const tableData = ref([
  { id: 1, name: 'Элемент 1', category: 'Категория A', status: 'Активен', date: '2023-10-01' },
  { id: 2, name: 'Элемент 2', category: 'Категория B', status: 'Неактивен', date: '2023-10-02' },
  { id: 3, name: 'Элемент 3', category: 'Категория C', status: 'Активен', date: '2023-10-03' },
  { id: 4, name: 'Элемент 4', category: 'Категория A', status: 'Ожидает', date: '2023-10-04' }
]);
 */
let tableData = ref([{}]);


const handleMakeReport = async () => {
  isLoading.value = true;
  console.log('Выбранные фильтры:', {
    option1: selectedStore.value,
    option2: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
    option3: selectedMaterial.value,
    isAdvancedMode: isAdvancedMode.value
  });
/*   await store.fetchMaterialsData(props.stockID, {
    materials: selectedMaterial.value.toString(),
    stocks: selectedStore.value.toString(),
    material_groups: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
    indicators: "",
    indicator_conditions: ""
  });
  if (store.materials_data && Array.isArray(store.materials_data)) {
    tableData.value = store.materials_data;
  } 
 */  
  try {
    await store.fetchMaterialsData(props.stockID, {
      materials: selectedMaterial.value.toString(),
      stocks: selectedStore.value.toString(),
      material_groups: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
      indicators: "",
      indicator_conditions: ""
    });

    if (store.materials_data && Array.isArray(store.materials_data)) {
      tableData.value = store.materials_data;
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    // Здесь можно добавить уведомление об ошибке для пользователя
  } finally {
    isLoading.value = false; // Завершаем загрузку в любом случае
  }


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

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px; /* Гарантирует видимую область */
  color: #606266;
  font-size: 16px;
  text-align: center;
}

.no-data-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-style: italic;
}
</style>