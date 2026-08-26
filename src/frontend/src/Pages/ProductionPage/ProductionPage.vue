<template>
  <el-container class="page-container">
    <el-aside width="400px" class="sidebar">
      <el-form label-position="top" class="filter-form">

        <el-form-item label="Период">
          <el-date-picker
            v-model="selectedPeriod"
            type="daterange"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
            range-separator="–"
            start-placeholder=""
            end-placeholder=""
            clearable
            :default-value="new Date()"
          />
        </el-form-item>        

        <el-form-item label="Склад">
          <el-select
            v-model="selectedStore"
            placeholder="Склад"
            clearable
            multiple
          >
            <el-option
              v-for="item in store.materials_meta?.stock_list"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Схема">
          <el-select
            v-model="selectedSchema"
            placeholder="Выберите схему производства"
            clearable
            multiple
            filterable
            :loading="schemaOptionsLoading"
          >
            <el-option
              v-for="p in store.materials_meta?.processing_schemes"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
            <template v-if="schemaOptionsLoading">
              <el-option :value="0" disabled label="Загрузка..." />
            </template>
          </el-select>
        </el-form-item>

        <el-form-item label="Техпроцесс">
          <el-select
            v-model="selectedProcess"
            placeholder="Выберите техпроцесс"
            clearable
            multiple
            filterable
            :loading="processOptionsLoading"
          >
            <el-option
              v-for="p in store.materials_meta?.process_list"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
            <template v-if="processOptionsLoading">
              <el-option :value="0" disabled label="Загрузка..." />
            </template>
          </el-select>
        </el-form-item>

        <el-form-item label="Операция">
          <div class="item-remote-select-wrapper">
            <el-select
              v-model="selectedOperation"
              placeholder="Начните вводить название операции"
              clearable
              multiple
              filterable
              :remote="isRemoteSearchOperation"
              class="item-remote-select"
              :loading="operationOptionsLoading"
              :remote-method="isRemoteSearchOperation ? handleOperationSearch : undefined"
            >
              <el-option
                v-for="o in operationOptions"
                :key="o.id"
                :label="o.name"
                :value="o.id"
                :disabled="o.id === -1"
              />
              <template v-if="operationOptionsLoading">
                <el-option :value="0" disabled label="Загрузка..." />
              </template>
            </el-select>

            <el-button
              v-if="isRemoteSearchOperation"
              type="info"
              plain
              size="small"
              :loading="operationOptionsLoading"
              :disabled="operationOptionsLoading"
              @click="handleLoadAllOperationOptions"
              title="Загрузить все опции"
            >
              <template #icon>
                <el-icon :size="16">
                  <folder-opened />
                </el-icon>
              </template>
            </el-button>

            <el-button
              type="info"
              plain
              size="small"
              :disabled="selectedOperation.length === 0"
              @click="openGraph('operation', selectedOperation)"
              :title="selectedOperation.length ? 'Показать граф зависимостей' : 'Нет выбранных операций'"
            >
              <template #icon>
                <el-icon :size="16">
                  <Histogram />
                </el-icon>
              </template>
            </el-button>

          </div>
        </el-form-item>


        <el-form-item label="Материал">
          <div class="item-remote-select-wrapper">
            <el-select
              v-model="selectedMaterial"
              placeholder="Начните вводить название материала"
              clearable
              multiple
              filterable
              :remote="isRemoteSearchMaterial"
              class="item-remote-select"
              :loading="materialOptionsLoading"
              :remote-method="isRemoteSearchMaterial ? handleMaterialSearch : undefined"
            >
              <el-option
                v-for="m in materialOptions"
                :key="m.id"
                :label="m.name"
                :value="m.id"
                :disabled="m.id === -1"
              />
              <template v-if="materialOptionsLoading">
                <el-option :value="0" disabled label="Загрузка..." />
              </template>
            </el-select>

            <el-button
              v-if="isRemoteSearchMaterial"
              type="info"
              plain
              size="small"
              :loading="materialOptionsLoading"
              :disabled="materialOptionsLoading"
              @click="handleLoadAllMaterialOptions"
              title="Загрузить все опции"
            >
              <template #icon>
                <el-icon :size="16">
                  <folder-opened />
                </el-icon>
              </template>
            </el-button>

            <el-button
              type="info"
              plain
              size="small"
              :disabled="selectedMaterial.length === 0"
              @click="openGraph('material', selectedMaterial)"
              :title="selectedMaterial.length ? 'Показать граф зависимостей' : 'Нет выбранных материалов'"
            >
              <template #icon>
                <el-icon :size="16">
                  <Histogram />
                </el-icon>
              </template>
            </el-button>

          </div>
        </el-form-item>

        <el-form-item label="Продукт">
          <div class="item-remote-select-wrapper">
            <el-select
              v-model="selectedProduct"
              placeholder="Начните вводить название продукта"
              clearable
              multiple
              filterable
              :remote="isRemoteSearchProduct"
              class="item-remote-select"
              :loading="productOptionsLoading"
              :remote-method="isRemoteSearchProduct ? handleProductSearch : undefined"
            >
              <el-option
                v-for="p in productOptions"
                :key="p.id"
                :label="p.name"
                :value="p.id"
                :disabled="p.id === -1"
              />
              <template v-if="productOptionsLoading">
                <el-option :value="0" disabled label="Загрузка..." />
              </template>
            </el-select>

            <el-button
              v-if="isRemoteSearchProduct"
              type="info"
              plain
              size="small"
              :loading="productOptionsLoading"
              :disabled="productOptionsLoading"
              @click="handleLoadAllProductOptions"
              title="Загрузить все опции"
            >
              <template #icon>
                <el-icon :size="16">
                  <folder-opened />
                </el-icon>
              </template>
            </el-button>

            <el-button
              type="info"
              plain
              size="small"
              :disabled="selectedProduct.length === 0"
              @click="openGraph('product', selectedProduct)"
              :title="selectedProduct.length ? 'Показать граф зависимостей' : 'Нет выбранных продуктов'"
            >
              <template #icon>
                <el-icon :size="16">
                  <Histogram />
                </el-icon>
              </template>
            </el-button>
            <el-button
              type="info"
              plain
              size="small"
              :disabled="selectedProduct.length === 0"
              @click="openCoeffTables(selectedProduct)"
              :title="selectedProduct.length ? 'Показать таблицы списания материалов' : 'Нет выбранных продуктов'"
            >
              <template #icon>
                <el-icon :size="16">
                  <Grid />
                </el-icon>
              </template>
            </el-button>

          </div>
        </el-form-item>

        <div style="margin-top: 24px;">
          <el-button
            type="primary"
            @click="handleMakeReport"
            class="apply-button"
            style="width: 100%"
          >
            Сформировать
          </el-button>
        </div>
      </el-form>
    </el-aside>

    <el-container class="right-container">
      <el-main class="content-area">

        <!-- Зона графа -->
        <div v-if="isGraphVisible" class="graph-wrapper">
          <div class="graph-header">
            <h3>Граф зависимостей</h3>
            <el-button link size="small" @click="closeGraph">
              Закрыть
            </el-button>
          </div>
           <ProductionGraphView
            :type="graphType!"
            :ids="graphIds"
            @close="closeGraph"
          />
        </div>
        <!-- Зона таблиц списания материалов -->
        <div v-else-if="isCoeffTablesVisible" class="graph-wrapper">
          <div class="graph-header">
            <h3>Списание материалов на производство продуктов</h3>
            <el-button link size="small" @click="closeCoeffTables">
              Закрыть
            </el-button>
          </div>
           <ProductionCoeffTablesView
            :ids="coeffTablesIds"
            @close="closeCoeffTables"
            />
        </div>

        <!-- Таблица отчёта (показывается, когда граф закрыт) -->
        <div class="report-table-wrapper" v-else>

<!--            <ProductionReportTable
            ref="reportTableRef"
            @cell-dblclick="onCellDblClick"
          />
 -->          
          <ProductionReportTableView
            ref="reportTableRef"
            @cell-dblclick="onCellDblClick"
          />
        </div>        
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, Ref } from 'vue'
import useApplicationStore from '@/store'
import { useProductionReportStore } from '@/storeProductionReport'
import ProductionReportTable from './ProductionReportTable.vue'
import ProductionReportTableView from './ProductionReportTableView.vue'
import ProductionGraphView from './ProductionGraphView.vue'
import ProductionCoeffTablesView from './ProductionCoeffTablesView.vue'
import { ElMessageBox } from 'element-plus'
import { FolderOpened, Histogram, Grid } from '@element-plus/icons-vue'
import { addUniqueIdsByValue } from '@/utils/tableCellDoubleClick'

const reportTableRef = ref<typeof ProductionReportTable | null>(null)

const props = defineProps({
  stockID: { type: Number, required: true },
})

const store = useApplicationStore()
const reportStore = useProductionReportStore()

const isSkeletonLoading = ref(true)

// --- Состояния для селекта Материал ---
const isRemoteSearchMaterial = ref(true)
const materialOptions = ref<{ id: number; name: string }[]>([])
const materialOptionsLoading = ref(false)

// --- Состояния для селекта Продукт ---
const isRemoteSearchProduct = ref(true)
const productOptions = ref<{ id: number; name: string }[]>([])
const productOptionsLoading = ref(false)

// --- Состояния для селекта Операция ---
const isRemoteSearchOperation = ref(true)
const operationOptions = ref<{ id: number; name: string }[]>([])
const operationOptionsLoading = ref(false)

const processOptionsLoading = ref(false)
const schemaOptionsLoading = ref(false)

// --- Computed для фильтров ---
const selectedStore = computed({
  get: () => reportStore.selectedStore,
  set: (value) => reportStore.setFilters({ selectedStore: value }),
})

const selectedMaterial = computed({
  get: () => reportStore.selectedMaterial,
  set: (value) => reportStore.setFilters({ selectedMaterial: value }),
})

const selectedProduct = computed({
  get: () => reportStore.selectedProduct,
  set: (value) => reportStore.setFilters({ selectedProduct: value }),
})

const selectedProcess = computed({
  get: () => reportStore.selectedProcess,
  set: (value) => reportStore.setFilters({ selectedProcess: value }),
})

const selectedOperation = computed({
  get: () => reportStore.selectedOperation,
  set: (value) => reportStore.setFilters({ selectedOperation: value }),
})

const selectedSchema = computed({
  get: () => reportStore.selectedSchema,
  set: (value) => reportStore.setFilters({ selectedSchema: value }),
})

const selectedPeriod = computed({
  get: () => reportStore.selectedPeriod, // должен быть типа (Date | null)[] | null
  set: (value) => reportStore.setFilters({ selectedPeriod: value }),
})

const isGraphVisible = ref(false)
const isCoeffTablesVisible = ref(false)
const graphType = ref<'material' | 'product' | 'operation' | null>(null)
const graphIds = ref<number[]>([])
const coeffTablesIds = ref<number[]>([])

onMounted(async () => {
  isSkeletonLoading.value = true
  store.loading = true
  processOptionsLoading.value = true
  productOptionsLoading.value = true
  materialOptionsLoading.value = true
  operationOptionsLoading.value = true
  schemaOptionsLoading.value = true

  try {

    await store.fetchMaterialsMeta(props.stockID)
 
    reportStore.loadFromStorage()
    if (selectedProduct.value.length) {
      productOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedProduct.value.includes(item.id)) || [];
    }
    if (selectedMaterial.value.length) {
      materialOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedMaterial.value.includes(item.id)) || [];
    }
    if (selectedOperation.value.length) {
      operationOptions.value = store.materials_meta?.operation_list.filter((item: any)=> selectedOperation.value.includes(item.id)) || [];
    }

  } finally {
    store.loading = false
    isSkeletonLoading.value = false
    processOptionsLoading.value = false
    productOptionsLoading.value = false
    materialOptionsLoading.value = false
    operationOptionsLoading.value = false
    schemaOptionsLoading.value = false
  }
})

const loadOperationOptions = async (operation_substring: string = '', limit: number = 100) => {
  operationOptionsLoading.value = true
  try {
    const result = await store.searchOperations(operation_substring, limit)
    operationOptions.value = result
  } catch (e) {
    console.error(e)
  } finally {
    operationOptionsLoading.value = false
  }
}

const handleOperationSearch = async (operation_substring: string) => {
  if (operation_substring.length < 2) {
    operationOptions.value = []
    return
  }
  await loadOperationOptions(operation_substring, 100)
}

const handleLoadAllOperationOptions = async () => {
  isRemoteSearchOperation.value = false
  await loadOperationOptions('', 500)
}


const loadMaterialOptions = async (material_substring: string = '', limit: number = 100) => {
  materialOptionsLoading.value = true
  try {
    const result = await store.searchMaterials(material_substring, limit)
    materialOptions.value = result
  } catch (e) {
    console.error(e)
  } finally {
    materialOptionsLoading.value = false
  }
}

const handleMaterialSearch = async (material_substring: string) => {
  if (material_substring.length < 2) {
    materialOptions.value = []
    return
  }
  await loadMaterialOptions(material_substring, 100)
}

const handleLoadAllMaterialOptions = async () => {
  isRemoteSearchMaterial.value = false
  await loadMaterialOptions('', 500)
}

const loadProductOptions = async (material_substring: string = '', limit: number = 100) => {
  productOptionsLoading.value = true
  try {
    const result = await store.searchMaterials(material_substring, limit)
    productOptions.value = result
  } catch (e) {
    console.error(e)
  } finally {
    productOptionsLoading.value = false
  }
}

const handleProductSearch = async (material_substring: string) => {
  if (material_substring.length < 2) {
    productOptions.value = []
    return
  }
  await loadProductOptions(material_substring, 100)
}

const handleLoadAllProductOptions = async () => {
  isRemoteSearchProduct.value = false
  await loadProductOptions('', 500)
}

// --- Кнопка «Сформировать» ---
const handleMakeReport = async () => {
  reportStore.saveToStorage()

  // Вызываем refresh() у дочернего компонента
  if (reportTableRef.value) {
    reportTableRef.value.refresh()
  }
}


const onCellDblClick = ({ column, value }: { column: string; value: string | null | undefined }) => {

  if (value == null || value === '-' || value === '') {
    return;
  }

  const valuesArray = value.split(',').map(item => item.trim()).filter(Boolean);
  if (valuesArray.length === 0) {
    return;
  } 

  let optionList: Array<{ id: number; name: string }> = [];
  let selectedRef: Ref<Array<number>> | undefined;

  switch (column) {
    case 'process':
      optionList = store.materials_meta?.process_list ?? [];
      selectedRef = selectedProcess;
      break;

    case 'operation':
      optionList = store.materials_meta?.operation_list ?? [];
      selectedRef = selectedOperation;
      break;

    case 'material':
      optionList = store.materials_meta?.material_list ?? [];
      selectedRef = selectedMaterial;
      break;

    case 'product':
      optionList = store.materials_meta?.material_list ?? [];
      selectedRef = selectedProduct;
      break;

    default:
      console.warn('Неизвестная колонка для дабл-клика:', column);
      return;
  };

   if (!selectedRef) return;

  addUniqueIdsByValue(optionList, selectedRef, value);

  switch (column) {
    case 'operation':
      operationOptions.value = store.materials_meta?.operation_list.filter((item: any)=> selectedOperation.value.includes(item.id)) || [];
      break;

    case 'material':
      materialOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedMaterial.value.includes(item.id)) || [];
      break;

    case 'product':
      productOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedProduct.value.includes(item.id)) || [];
      break;
  };


}

const openGraph = (type: typeof graphType.value, ids: number[]) => {
  if (ids.length === 0) {
    ElMessageBox.alert('Сначала выберите хотя бы один элемент в фильтре.')
    return
  }
  graphType.value = type
  graphIds.value = ids
  isGraphVisible.value = true
  isCoeffTablesVisible.value = false
}

const closeGraph = () => {
  isGraphVisible.value = false
  graphType.value = null
  graphIds.value = []
}

const openCoeffTables = (ids: number[]) => {
  if (ids.length === 0) {
    ElMessageBox.alert('Сначала выберите хотя бы один элемент в фильтре.')
    return
  }
  coeffTablesIds.value = ids
  isCoeffTablesVisible.value = true
  isGraphVisible.value = false
}

const closeCoeffTables = () => {
  isCoeffTablesVisible.value = false
  coeffTablesIds.value = []
}


</script>

<style scoped>
.page-container {
  height: calc(100vh - 120px);
  display: flex;
  width: 100%;
  box-sizing: border-box;
  gap: 10px;
}

.sidebar {
  background-color: #f5f7fa;
  padding: 20px;
  border-right: 1px solid #e6e9ef;
  flex-shrink: 0;
  width: 400px;
  overflow: auto;
}

.right-container {
  flex: 1;
  display: flex;
}

.content-area {
  padding: 0px;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-placeholder, .future-components-slot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.apply-button {
  margin-top: 16px;
}

.item-remote-select-wrapper {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 2px; /* Расстояние между селектом и кнопками, а также между кнопками */
}

/* Селект: занимает всё свободное место */
.item-remote-select {
  flex: 1;
  height: 100%;
  min-width: 0; /* Позволяет селекту сжиматься при нехватке места */
}

/* Кнопки: убираем все внешние отступы, которые добавляет Element Plus */
.item-remote-select-wrapper .el-button {
  height: 100%;
  margin: 0 !important; /* ГЛАВНОЕ: принудительно убираем margin у кнопок */
  padding: 6px 8px; /* Комфортный внутренний отступ, чтобы иконка не прилипала к краю */
  min-width: auto; /* Отключаем стандартную минимальную ширину кнопки */
  box-sizing: border-box;
}

/* Убираем лишние отступы у контента form-item */
.el-form-item__content {
  margin: 0 !important;
  padding: 0 !important;
  height: 100%;
}

/* Граф */
.graph-wrapper {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.graph-header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e9ef;
  margin-bottom: 12px;
}

.graph-header h3 {
  margin: 0;
  font-size: 16px;
}

.report-table-wrapper {
  flex: 1; /* Растягивается на всё свободное место */
  min-height: 0; /* КРИТИЧНО: позволяет вложенным элементам со скроллом сжиматься */
  width: 100%;
  display: flex;
  flex-direction: column;
  /* Убираем height: 100% отсюда! Это ломает расчет высоты внутри flex-контейнеров */
}

</style>
