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
          <el-button
            type="primary"
            @click="handleApplyFilters"
            class="apply-button"
          >
            Применить фильтры
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

// Данные для селектов
const optionsStore = [
  { value: 'option1-1', label: 'Вариант 1-1' },
  { value: 'option1-2', label: 'Вариант 1-2' },
  { value: 'option1-3', label: 'Вариант 1-3' }
];

const optionsMaterialGroup = [
  { value: 'option2-1', label: 'Вариант 2-1' },
  { value: 'option2-2', label: 'Вариант 2-2' },
  { value: 'option2-3', label: 'Вариант 2-3' }
];

const optionsMaterial = [
  { value: 'option3-1', label: 'Вариант 3-1' },
  { value: 'option3-2', label: 'Вариант 3-2' },
  { value: 'option3-3', label: 'Вариант 3-3' }
];

// Выбранные значения селектов
const selectedStore = ref([]);
const selectedMaterialGroup = ref([]);
const selectedMaterial = ref([]);

// Данные таблицы
const tableData = ref([
  { id: 1, name: 'Элемент 1', category: 'Категория A', status: 'Активен', date: '2023-10-01' },
  { id: 2, name: 'Элемент 2', category: 'Категория B', status: 'Неактивен', date: '2023-10-02' },
  { id: 3, name: 'Элемент 3', category: 'Категория C', status: 'Активен', date: '2023-10-03' },
  { id: 4, name: 'Элемент 4', category: 'Категория A', status: 'Ожидает', date: '2023-10-04' }
]);

const handleApplyFilters = () => {
  console.log('Выбранные фильтры:', {
    option1: selectedStore.value,
    option2: selectedMaterialGroup.value,
    option3: selectedMaterial.value
  });
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

:deep(.el-table) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>