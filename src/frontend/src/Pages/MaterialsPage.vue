<template>
  <el-container class="page-container">
    <!-- Левый блок: панель с формой -->
    <el-aside width="400px" class="sidebar">
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
              v-for="item in store.materials_meta?.material_group_list.filter(item => item.type != 0)"
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
          <el-form-item>
            <div class="switch-container">
              <el-switch 
                v-model="isDetailedMode"
                :disabled="isDetailedModeDisabled"
                active-color="#13ce66"
                inactive-color="#ff4949"
                @change="handleSwitchDetailedMode"
              />
              <span class="switch-description">
                {{ isDetailedMode ? 'развернуть материалы' : 'группировать материалы' }}
              </span>
            </div>
          </el-form-item>
          <el-form-item>
            <div class="switch-container">
              <el-switch 
                v-model="isOnlyNonZeroMode"
                active-color="#13ce66"
                inactive-color="#ff4949"
              />
              <span class="switch-description">
                {{ isOnlyNonZeroMode ? 'только ненулевые остатки' : 'выводить нулевые остатки' }}
              </span>
            </div>
          </el-form-item>
          <el-form-item label="Показатели">
            <el-table :data="tableCondition" style="width: 100%" max-height="250">

              <el-table-column prop="element" label="">
                <template #default="scope">
                  <el-select v-model="scope.row.element"  style="width: 90px"
                  >
                    <el-option
                      v-for="item in store.materials_meta?.material_group_list
                          .filter(item => (item.type == 0 || item.type == 1))"
                      :key="item.code"
                      :label="item.code"
                      :value="item.code"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="min" label="min">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.min" placeholder=""
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column prop="max" label="max">
                <template #default="scope">
                  <el-input type="number" v-model.number="scope.row.max" placeholder=""
                  ></el-input>
                </template>
              </el-table-column>
              <el-table-column fixed="right" label="" width="40">
                <template #default="scope">
                  <el-button
                    link
                    type="danger"
                    size="small"
                    @click.prevent="deleteRow(scope.$index)"
                  >
                    <Delete style="width: 14px; height: 14px;" />
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button class="mt-4" style="width: 100%" @click="onAddItem">
              Добавить
            </el-button>            
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
        <el-table v-loading="isLoading" v-if="tableData" :data="tableData" style="width: 100%" stripe border show-overflow-tooltip height="85vh"
         >
          <el-table-column
            v-for="column in visibleColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.width"
            :fixed="column.isFixed"
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
import { Delete } from '@element-plus/icons-vue';

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
});


const router = useRouter();
const store = useApplicationStore();

onMounted(async () => {
    await store.fetchMaterialsMeta(props.stockID);
    onAddItem();
});


// Выбранные значения селектов
const selectedStore = ref([]);
const selectedMaterialGroup = ref([]);
const selectedMaterial = ref([]);

const isDetailedMode = ref(false);
const isOnlyNonZeroMode = ref(false);
const isLoading = ref(false);

let tableData = ref([{}]);
let tableCondition = ref([{}]);


const basicColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', isFixed: true },
  { prop: 'material', label: 'Материал', width: '300', isFixed: true },
  { prop: 'tare_type', label: 'Тара', width: '80', isFixed: false },
  { prop: 'material_mark', label: 'Вид', width: '100', isFixed: false },
  { prop: 'material_group', label: 'Группа', width: '100', isFixed: false },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100', isFixed: false },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100', isFixed: false },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100', isFixed: false }
]);

const detailedColumns = ref([
  { prop: 'stock_name', label: 'Склад', width: '80', isFixed: true },
  { prop: 'material', label: 'Материал', width: '300', isFixed: true },
  { prop: 'tare_type', label: 'Тара', width: '80', isFixed: false },
  { prop: 'tare_id', label: 'Номер', width: '80', isFixed: false },
  { prop: 'tare_mark', label: 'Маркировка', width: '120', isFixed: false },
  { prop: 'material_mark', label: 'Вид', width: '100', isFixed: false },
  { prop: 'material_group', label: 'Группа', width: '100', isFixed: false },
  { prop: 'rest_tare_amount', label: 'Кол-во', width: '100', isFixed: false },
  { prop: 'rest_net_weight', label: 'Нетто', width: '100', isFixed: false },
  { prop: 'rest_gross_weight', label: 'Брутто', width: '100', isFixed: false }
]);

const isDetailedModeDisabled = computed(() => {
  if (selectedMaterial.value && selectedMaterial.value.length > 0) {
    return false;
  };
  isDetailedMode.value = false;
  return true;
});

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
      detailed_mode: isDetailedMode.value ? "detailed" : "summary",
      only_non_zero_mode: isOnlyNonZeroMode.value
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

const handleSwitchDetailedMode = (value) => {
  tableData.value = [];
};

const deleteRow = (index: number) => {
  tableCondition.value.splice(index, 1)
}

const onAddItem = () => {
  tableCondition.value.push({
    element: '',
    min: '',
    max: ''
  })

  console.log(tableCondition.value);
}

</script>

<style scoped>
.page-container {
  height: 85vh; 
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