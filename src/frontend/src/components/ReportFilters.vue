<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import useApplicationStore from '@/store'
import { FolderOpened, Histogram, Grid } from '@element-plus/icons-vue'

// ── Props ──

const props = withDefaults(defineProps<{
  // v-model bindings
  dateFilter?: string | null
  period?: [string, string] | null
  storeFilter?: number[]
  schema?: number[]
  process?: number[]
  operation?: number[]
  material?: number[]
  product?: number[]

  // Видимость полей
  showDate?: boolean
  showPeriod?: boolean
  showStore?: boolean
  showSchema?: boolean
  showProcess?: boolean
  showOperation?: boolean
  showMaterial?: boolean
  showProduct?: boolean

  // Встроенные кнопки-действия
  showOperationGraph?: boolean
  showMaterialGraph?: boolean
  showProductGraph?: boolean
  showProductCoeffTables?: boolean
}>(), {
  dateFilter: null,
  period: null,
  storeFilter: () => [],
  schema: () => [],
  process: () => [],
  operation: () => [],
  material: () => [],
  product: () => [],
  showDate: true,
  showPeriod: true,
  showStore: true,
  showSchema: true,
  showProcess: true,
  showOperation: true,
  showMaterial: true,
  showProduct: true,
  showOperationGraph: false,
  showMaterialGraph: false,
  showProductGraph: false,
  showProductCoeffTables: false,
})

const emit = defineEmits<{
  'update:dateFilter': [value: string | null]
  'update:period': [value: [string, string] | null]
  'update:storeFilter': [value: number[]]
  'update:schema': [value: number[]]
  'update:process': [value: number[]]
  'update:operation': [value: number[]]
  'update:material': [value: number[]]
  'update:product': [value: number[]]
  'open-graph': [type: 'operation' | 'material' | 'product', ids: number[]]
  'open-coeff-tables': [ids: number[]]
}>()

// ── App store (meta data, search) ──

const appStore = useApplicationStore()

// ── v-model прокси ──

const dateModel = computed({
  get: () => props.dateFilter,
  set: (val) => emit('update:dateFilter', val),
})
const periodModel = computed({
  get: () => props.period,
  set: (val) => emit('update:period', val),
})
const storeModel = computed({
  get: () => props.storeFilter,
  set: (val) => emit('update:storeFilter', val),
})
const schemaModel = computed({
  get: () => props.schema,
  set: (val) => emit('update:schema', val),
})
const processModel = computed({
  get: () => props.process,
  set: (val) => emit('update:process', val),
})
const operationModel = computed({
  get: () => props.operation,
  set: (val) => emit('update:operation', val),
})
const materialModel = computed({
  get: () => props.material,
  set: (val) => emit('update:material', val),
})
const productModel = computed({
  get: () => props.product,
  set: (val) => emit('update:product', val),
})

// ── Remote: Operation ──

const isRemoteSearchOperation = ref(true)
const operationOptions = ref<{ id: number; name: string }[]>([])
const operationOptionsLoading = ref(false)

async function loadOperationOptions(substring: string = '', limit: number = 100) {
  operationOptionsLoading.value = true
  try {
    operationOptions.value = await appStore.searchOperations(substring, limit)
  } catch (e) {
    console.error(e)
  } finally {
    operationOptionsLoading.value = false
  }
}

async function handleOperationSearch(substring: string) {
  if (substring.length < 2) {
    operationOptions.value = []
    return
  }
  await loadOperationOptions(substring, 100)
}

async function handleLoadAllOperationOptions() {
  isRemoteSearchOperation.value = false
  await loadOperationOptions('', 500)
}

// ── Remote: Material ──

const isRemoteSearchMaterial = ref(true)
const materialOptions = ref<{ id: number; name: string }[]>([])
const materialOptionsLoading = ref(false)

async function loadMaterialOptions(substring: string = '', limit: number = 100) {
  materialOptionsLoading.value = true
  try {
    materialOptions.value = await appStore.searchMaterials(substring, limit)
  } catch (e) {
    console.error(e)
  } finally {
    materialOptionsLoading.value = false
  }
}

async function handleMaterialSearch(substring: string) {
  if (substring.length < 2) {
    materialOptions.value = []
    return
  }
  await loadMaterialOptions(substring, 100)
}

async function handleLoadAllMaterialOptions() {
  isRemoteSearchMaterial.value = false
  await loadMaterialOptions('', 500)
}

// ── Remote: Product ──

const isRemoteSearchProduct = ref(true)
const productOptions = ref<{ id: number; name: string }[]>([])
const productOptionsLoading = ref(false)

async function loadProductOptions(substring: string = '', limit: number = 100) {
  productOptionsLoading.value = true
  try {
    productOptions.value = await appStore.searchMaterials(substring, limit)
  } catch (e) {
    console.error(e)
  } finally {
    productOptionsLoading.value = false
  }
}

async function handleProductSearch(substring: string) {
  if (substring.length < 2) {
    productOptions.value = []
    return
  }
  await loadProductOptions(substring, 100)
}

async function handleLoadAllProductOptions() {
  isRemoteSearchProduct.value = false
  await loadProductOptions('', 500)
}

// ── Static loading (schema, process — ждут fetchMaterialsMeta) ──

const schemaOptionsLoading = ref(false)
const processOptionsLoading = ref(false)

// ── Инициализация ──

onMounted(async () => {
  schemaOptionsLoading.value = true
  processOptionsLoading.value = true
  productOptionsLoading.value = true
  materialOptionsLoading.value = true
  operationOptionsLoading.value = true

  try {
    await appStore.fetchMaterialsMeta()

    if (props.product?.length) {
      productOptions.value = appStore.materials_meta?.material_list.filter(
        (item: any) => props.product!.includes(item.id),
      ) || []
    }
    if (props.material?.length) {
      materialOptions.value = appStore.materials_meta?.material_list.filter(
        (item: any) => props.material!.includes(item.id),
      ) || []
    }
    if (props.operation?.length) {
      operationOptions.value = appStore.materials_meta?.operation_list.filter(
        (item: any) => props.operation!.includes(item.id),
      ) || []
    }
  } finally {
    schemaOptionsLoading.value = false
    processOptionsLoading.value = false
    productOptionsLoading.value = false
    materialOptionsLoading.value = false
    operationOptionsLoading.value = false
  }
})

// ── Expose: обновление опций извне (для onCellDblClick в родителе) ──

function refreshOptions(field: 'operation' | 'material' | 'product', selectedIds: number[]) {
  const metaList = field === 'operation'
    ? appStore.materials_meta?.operation_list
    : appStore.materials_meta?.material_list
  if (!metaList) return
  const filtered = metaList.filter((item: any) => selectedIds.includes(item.id))
  if (field === 'operation') operationOptions.value = filtered
  else if (field === 'material') materialOptions.value = filtered
  else if (field === 'product') productOptions.value = filtered
}

defineExpose({ refreshOptions })
</script>

<template>
  <el-form label-position="top" class="filter-form">

    <!-- Дата -->
    <el-form-item v-if="showDate" label="Дата">
      <el-date-picker
        v-model="dateModel"
        type="date"
        format="DD.MM.YYYY"
        value-format="YYYY-MM-DD"
        clearable
        :default-value="new Date()"
      />
    </el-form-item>
    <slot name="after-date" />

    <!-- Период -->
    <el-form-item v-if="showPeriod" label="Период">
      <el-date-picker
        v-model="periodModel"
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
    <slot name="after-period" />

    <!-- Склад -->
    <el-form-item v-if="showStore" label="Склад">
      <el-select v-model="storeModel" placeholder="Склад" clearable multiple>
        <el-option
          v-for="item in appStore.materials_meta?.stock_list"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>
    </el-form-item>
    <slot name="after-store" />

    <!-- Схема -->
    <el-form-item v-if="showSchema" label="Схема">
      <el-select
        v-model="schemaModel"
        placeholder="Выберите схему производства"
        clearable
        multiple
        filterable
        :loading="schemaOptionsLoading"
      >
        <el-option
          v-for="p in appStore.materials_meta?.processing_schemes"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
        <template v-if="schemaOptionsLoading">
          <el-option :value="0" disabled label="Загрузка..." />
        </template>
      </el-select>
    </el-form-item>
    <slot name="after-schema" />

    <!-- Техпроцесс -->
    <el-form-item v-if="showProcess" label="Техпроцесс">
      <el-select
        v-model="processModel"
        placeholder="Выберите техпроцесс"
        clearable
        multiple
        filterable
        :loading="processOptionsLoading"
      >
        <el-option
          v-for="p in appStore.materials_meta?.process_list"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
        <template v-if="processOptionsLoading">
          <el-option :value="0" disabled label="Загрузка..." />
        </template>
      </el-select>
    </el-form-item>
    <slot name="after-process" />

    <!-- Операция -->
    <el-form-item v-if="showOperation" label="Операция">
      <div class="item-remote-select-wrapper">
        <el-select
          v-model="operationModel"
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
            <el-icon :size="16"><FolderOpened /></el-icon>
          </template>
        </el-button>

        <el-button
          v-if="showOperationGraph"
          type="info"
          plain
          size="small"
          :disabled="operationModel.length === 0"
          @click="$emit('open-graph', 'operation', operationModel)"
          :title="operationModel.length ? 'Показать граф зависимостей' : 'Нет выбранных операций'"
        >
          <template #icon>
            <el-icon :size="16"><Histogram /></el-icon>
          </template>
        </el-button>

        <slot name="operation-actions" />
      </div>
    </el-form-item>
    <slot name="after-operation" />

    <!-- Материал -->
    <el-form-item v-if="showMaterial" label="Материал">
      <div class="item-remote-select-wrapper">
        <el-select
          v-model="materialModel"
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
            <el-icon :size="16"><FolderOpened /></el-icon>
          </template>
        </el-button>

        <el-button
          v-if="showMaterialGraph"
          type="info"
          plain
          size="small"
          :disabled="materialModel.length === 0"
          @click="$emit('open-graph', 'material', materialModel)"
          :title="materialModel.length ? 'Показать граф зависимостей' : 'Нет выбранных материалов'"
        >
          <template #icon>
            <el-icon :size="16"><Histogram /></el-icon>
          </template>
        </el-button>

        <slot name="material-actions" />
      </div>
    </el-form-item>
    <slot name="after-material" />

    <!-- Продукт -->
    <el-form-item v-if="showProduct" label="Продукт">
      <div class="item-remote-select-wrapper">
        <el-select
          v-model="productModel"
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
            <el-icon :size="16"><FolderOpened /></el-icon>
          </template>
        </el-button>

        <el-button
          v-if="showProductGraph"
          type="info"
          plain
          size="small"
          :disabled="productModel.length === 0"
          @click="$emit('open-graph', 'product', productModel)"
          :title="productModel.length ? 'Показать граф зависимостей' : 'Нет выбранных продуктов'"
        >
          <template #icon>
            <el-icon :size="16"><Histogram /></el-icon>
          </template>
        </el-button>

        <el-button
          v-if="showProductCoeffTables"
          type="info"
          plain
          size="small"
          :disabled="productModel.length === 0"
          @click="$emit('open-coeff-tables', productModel)"
          :title="productModel.length ? 'Показать таблицы списания материалов' : 'Нет выбранных продуктов'"
        >
          <template #icon>
            <el-icon :size="16"><Grid /></el-icon>
          </template>
        </el-button>

        <slot name="product-actions" />
      </div>
    </el-form-item>
    <slot name="after-product" />

    <!-- Произвольные поля перед кнопкой -->
    <slot name="extra-fields" />

    <slot name="actions" />

  </el-form>
</template>

<style scoped>
.item-remote-select-wrapper {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 2px;
}

.item-remote-select {
  flex: 1;
  height: 100%;
  min-width: 0;
}

.item-remote-select-wrapper .el-button {
  height: 100%;
  margin: 0 !important;
  padding: 6px 8px;
  min-width: auto;
  box-sizing: border-box;
}

.el-form-item__content {
  margin: 0 !important;
  padding: 0 !important;
  height: 100%;
}

.apply-button {
  margin-top: 16px;
}
</style>
