<template>
  <el-container class="page-container">
    <el-aside width="400px" class="sidebar">
      <el-form label-position="top" class="filter-form">
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

        <el-form-item label="Техпроцесс" prop="processId">
          <el-select
            v-model="selectedProcess"
            placeholder="Выберите техпроцесс"
            clearable
            :loading="processOptionsLoading"
          >
            <el-option
              v-for="p in processOptions"
              :key="p.id"
              :label="p.process_name"
              :value="p.id"
            />
            <template v-if="processOptionsLoading">
              <el-option :value="0" disabled label="Загрузка..." />
            </template>
          </el-select>
        </el-form-item>

        <el-form-item label="Материал">
          <div class="product-select-wrapper">
            <el-select
              v-model="selectedMaterial"
              placeholder="Начните вводить название материала"
              clearable
              multiple
              filterable
              :remote="isRemoteSearchMaterial"
              class="product-select"
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
            >
              <template #icon>
                <el-icon :size="16">
                  <folder-opened />
                </el-icon>
              </template>
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="Продукт">
          <div class="product-select-wrapper">
            <el-select
              v-model="selectedProduct"
              placeholder="Начните вводить название продукта"
              clearable
              multiple
              filterable
              :remote="isRemoteSearchProduct"
              class="product-select"
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
            >
              <template #icon>
                <el-icon :size="16">
                  <folder-opened />
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
        <div v-if="isSkeletonLoading" class="skeleton-placeholder">
          <el-skeleton animated />
        </div>
        <div v-else class="future-components-slot">
          <p class="text-muted">Место для будущих компонентов</p>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import useApplicationStore from '@/store'
import { useProductionReportStore } from '@/storeProductionReport'
import { ElMessageBox } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'

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

onMounted(async () => {
  isSkeletonLoading.value = true
  store.loading = true

  try {
//     if (!store.materials_meta) {
//      await store.fetchMaterialsMeta(props.stockID)
//    }

    await store.fetchMaterialsMeta(props.stockID)
 
    reportStore.loadFromStorage()
    if (selectedProduct.value.length) {
      productOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedProduct.value.includes(item.id)) || [];
    }
    if (selectedMaterial.value.length) {
      materialOptions.value = store.materials_meta?.material_list.filter((item: any)=> selectedMaterial.value.includes(item.id)) || [];
    }

  } finally {
    store.loading = false
    isSkeletonLoading.value = false
  }
})

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
  try {
    reportStore.saveToStorage()

    console.log('Формируем отчёт:', {
      stockIDs: selectedStore.value,
      materialIDs: selectedMaterial.value,
      productIDs: selectedProduct.value,
    })

    // TODO: вызов API / логика формирования отчёта
  } catch (error) {
    console.error('Ошибка при формировании отчёта:', error)
    ElMessageBox.alert('Произошла ошибка при формировании отчёта', 'Ошибка', { type: 'error' })
  }
}
</script>

<style scoped>
.page-container {
  height: calc(100vh - 120px);
  display: flex;
  width: 100%;
  box-sizing: border-box;
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
  padding: 20px;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.skeleton-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.future-components-slot {
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
.text-muted {
  color: #888;
}
/* Стили для селекта и кнопки */
.product-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.product-select {
  flex: 1;
}
</style>
