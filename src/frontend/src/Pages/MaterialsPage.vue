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
                v-model="isDetailedMode"
                active-color="#13ce66"
                inactive-color="#ff4949"
                @change="handleSwitchChange"
              />
              <span class="switch-description">
                {{ isDetailedMode ? 'развернуть материалы' : 'группировать материалы' }}
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
        <el-table v-loading="isLoading" v-if="tableData" :data="tableData" style="width: 100%" stripe border show-overflow-tooltip height="85vh">
          <el-table-column
            v-for="column in visibleColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.width"
          />
        </el-table>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { ref, computed } from "vue";
import useApplicationStore from "@/store";
import { useRouter } from "vue-router";

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
});


const router = useRouter();
const store = useApplicationStore();

onMounted(async () => {
    await store.fetchMaterialsMeta(props.stockID);
});


// Выбранные значения селектов
const selectedStore = ref([]);
const selectedMaterialGroup = ref([]);
const selectedMaterial = ref([]);

const isDetailedMode = ref(false);
const isLoading = ref(false);

let tableData = ref([{}]);

const basicColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80' },
  { prop: 'material', label: 'Материал', width: '300' },
  { prop: 'tare_type', label: 'Тара', width: '80' },
  { prop: 'material_mark', label: 'Вид', width: '100' },
  { prop: 'material_group', label: 'Группа', width: '100' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100' }
]);

const detailedColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80' },
  { prop: 'material', label: 'Материал', width: '300' },
  { prop: 'tare_type', label: 'Тара', width: '80' },
  { prop: 'tare_id', label: 'Номер', width: '80' },
  { prop: 'tare_mark', label: 'Маркировка', width: '100' },
  { prop: 'material_mark', label: 'Вид', width: '100' },
  { prop: 'material_group', label: 'Группа', width: '100' },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100' },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100' },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100' }
]);

const visibleColumns = computed(() => {
  return isDetailedMode.value ? detailedColumns.value : basicColumns.value;
});

const handleMakeReport = async () => {
  isLoading.value = true;
  tableData.value = [];
  console.log('Выбранные фильтры:', {
    option1: selectedStore.value,
    option2: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
    option3: selectedMaterial.value,
    isDetailedMode: isDetailedMode.value
  });
  try {
    await store.fetchMaterialsData(props.stockID, {
      materials: selectedMaterial.value.toString(),
      stocks: selectedStore.value.toString(),
      material_groups: selectedMaterialGroup.value.map(item => "'" + item + "'").toString(),
      indicators: "",
      indicator_conditions: "",
      detailed_mode: isDetailedMode.value ? "detailed" : "summary"
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
  height: 90vh; /* Занимает всю высоту экрана */
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

.example-showcase .el-loading-mask {
  z-index: 9;
}
</style>