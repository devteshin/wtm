<template>
  <div class="operation-items-form">
    <!-- Состояние загрузки -->
    <div v-if="loading" class="skeleton-wrapper">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- Реальная форма -->
    <el-form
      v-else
      ref="formRef"
      :model="form"
      label-width="200px"
      status-icon
      :rules="rules"
    >
      <el-form-item label="Наименование операции" prop="operationName">
        <el-input v-model="form.operationName" clearable />
      </el-form-item>

      <el-row>
        <el-col :span="24">
          <el-form-item label="Наименование продукта" prop="productId">
            <div class="product-select-wrapper">

<!--               <el-select
                v-model="form.productId"
                placeholder="Выберите продукт"
                clearable
                filterable
                class="product-select"
                :loading="productOptionsLoading"
              >
                 <el-option
                  v-for="p in productOptions"
                  :key="p.id"
                  :label="p.product_name"
                  :value="p.id"
                />
                <template v-if="productOptionsLoading">
                  <el-option :value="0" disabled label="Загрузка..." />
                </template>
              </el-select>
 -->
              <el-select
                v-model="form.productId"
                placeholder="Начните вводить название продукта"
                clearable
                filterable
                remote
                class="product-select"
                :loading="productOptionsLoading"
                :remote-method="handleProductSearch"
              >
                <el-option
                  v-for="p in productOptions"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                  :disabled="p.id === -1"
                />

<!--                 <template v-if="productOptionsLoading">
                  <el-option :value="0" disabled label="Загрузка..." />
                </template>
 -->
              </el-select>              

              <el-button type="primary" @click="openCreateProduct">
                + Новый продукт
              </el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Техпроцесс" prop="processId">
        <el-select
          v-model="form.processId"
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

      <el-form-item label="Исполнители" prop="executorIds">
        <el-select
          v-model="form.executorIds"
          multiple
          placeholder="Выберите исполнителей"
          :loading="executorOptionsLoading"
        >
          <el-option
            v-for="e in executorOptions"
            :key="e.id"
            :label="e.employee_name"
            :value="e.id"
          />
          <template v-if="executorOptionsLoading">
            <el-option :value="0" disabled label="Загрузка..." />
          </template>
        </el-select>
      </el-form-item>

      <el-form-item label="Шаблон документа приёма" prop="documentTemplateId">
        <el-select
          v-model="form.documentTemplateId"
          placeholder="Выберите шаблон"
          clearable
          :loading="templateOptionsLoading"
        >
          <el-option
            v-for="t in templateOptions"
            :key="t.id"
            :label="t.template_name"
            :value="t.id"
          />
          <template v-if="templateOptionsLoading">
            <el-option :value="0" disabled label="Загрузка..." />
          </template>
        </el-select>
      </el-form-item>

      <el-form-item label="Операция выполнена">
        <el-checkbox v-model="form.isCompleted"></el-checkbox>
      </el-form-item>

    </el-form>

    <div class="form-footer" v-if="!loading">
      <el-button @click="handleClose">Закрыть</el-button>
      <el-button
        v-if="currentOperationId > 0"
        type="danger"
        @click="handleDelete"
      >
        Удалить операцию
      </el-button>
      <el-button
        v-if="currentOperationId > 0 && !isTaskItemsBlocked"
        type="primary"
        @click="onOpenMaterialSelection"
      >
        {{ taskId ? 'Открыть подбор материалов' : 'Добавить новое задание' }}
      </el-button>
      <el-button type="primary" @click="handleSave">
        Сохранить
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import useApplicationStore from "@/store"

const store = useApplicationStore()

const currentOperationId = ref<number>(0);
// --- Пропсы ---
interface Props {
  stockID: number
  userID: number
  operationID: number | null
}

const props = defineProps<Props>()


const emit = defineEmits<{
  (e: 'close'): void,
  (e: 'open-material-selection', taskId: number, operationId: number, taskItemsKeyMaterial: frontend.ITaskItemsKeyMaterial): void
}>()

// --- Состояния ---
const formRef = ref<FormInstance | undefined>(undefined)
const loading = ref(true)                 

let taskId = 0;
let isTaskItemsBlocked = false;
let taskItemsKeyMaterial: frontend.ITaskItemsKeyMaterial = [];

interface FormData {
  operationName: string
  productId: number | null
  processId: number | null
  executorIds: number[]
  isCompleted: boolean
  documentTemplateId: number | null
}

const form = ref<FormData>({
  operationName: '',
  productId: null,
  processId: null,
  executorIds: [],
  isCompleted: false,
  documentTemplateId: null,
})

const originalForm = shallowRef<FormData | null>(null)

// Опции и флаги загрузки для каждого селекта (чтобы не блокировать весь UI сразу)
const productOptions = ref<{ id: number; name: string }[]>([])
const processOptions = ref<{ id: number; process_name: string }[]>([])
const executorOptions = ref<{ id: number; employee_name: string }[]>([])
const templateOptions = ref<{ id: number; template_name: string }[]>([])

const productOptionsLoading = ref(false)
const processOptionsLoading = ref(false)
const executorOptionsLoading = ref(false)
const templateOptionsLoading = ref(false)

// --- Мета-данные ---
const fetchMeta = async () => {
  if (!props.stockID) {
    loading.value = false
    return
  }

  loading.value = true

  const start = performance.now()

  try {
    processOptionsLoading.value = true
    executorOptionsLoading.value = true
    templateOptionsLoading.value = true

    const meta = await store.fetchOperationsMeta(props.stockID)

    processOptions.value = meta.processes
    executorOptions.value = meta.executors
    templateOptions.value = meta.doc_templates

    const assignEnd = performance.now()
    
  } catch (e) {
    console.error('fetchMeta error:', e)
    ElMessage.error('Не удалось загрузить справочники')
  } finally {
    processOptionsLoading.value = false
    executorOptionsLoading.value = false
    templateOptionsLoading.value = false
    loading.value = false
  }
}

const loadOperation = async (id: number) => {
  const operation = await store.fetchOperationData(id)

  const productId = operation.productId === 0 ? null : operation.productId
  const processId = operation.processId === 0 ? null : operation.processId
  taskId = operation.taskId;
  isTaskItemsBlocked = operation.isTaskItemsBlocked;
  taskItemsKeyMaterial = operation.taskItemsKeyMaterial;
  
  console.log("operation", operation);

  if (productId) {
    productOptions.value.push({id: productId, name: operation.productName});
  }

  form.value = {
    operationName: operation.operationName,
    productId,
    processId,
    executorIds: operation.executorIds,
    isCompleted: operation.isCompleted,
    documentTemplateId: operation.documentTemplateId,
  }
  originalForm.value = { ...form.value }
}

// Проверка изменений
const hasChanges = (): boolean => {
  if (!originalForm.value) return false
  const a = form.value
  const b = originalForm.value

  return (
    a.operationName !== b.operationName ||
    a.productId !== b.productId ||
    a.processId !== b.processId ||
    JSON.stringify(a.executorIds) !== JSON.stringify(b.executorIds) ||
    a.isCompleted !== b.isCompleted ||
    a.documentTemplateId !== b.documentTemplateId
  )
}

const handleSave = async () => {
  const validate = formRef.value?.validate
  if (!validate) return

  const isValid = await validate()
  if (!isValid) return

  const nameExists = await store.checkOperationName({ operationID: currentOperationId.value, operationName: form.value.operationName })
  if (nameExists) {
    ElMessage.error('Операция с таким именем уже существует. Выберите другое название.')
    return
  }

  const payload = {
    stockId: props.stockID,
    operationId: currentOperationId.value,
    operationName: form.value.operationName,
    productId: form.value.productId ?? 0,
    processId: form.value.processId ?? 0,
    executorIds: form.value.executorIds,
    isCompleted: form.value.isCompleted,
    documentTemplateId: form.value.documentTemplateId ?? 0,
    taskId: taskId
  }

  console.log(payload);

  const operation_id = await store.updateOperation(payload)
  if (!operation_id) {
    ElMessage.error('Ошибка при создании или обновлении операции')
    return
  }

  currentOperationId.value = operation_id
  originalForm.value = { ...form.value }
  ElMessage.success(`Операция ${form.value.operationName} сохранена`)
}

const handleDelete = async () => {
  if (currentOperationId.value == 0) return
  const confirmed = await ElMessageBox.confirm(
    'Вы уверены, что хотите удалить эту операцию?',
    'Подтверждение удаления',
    { confirmButtonText: 'Да', cancelButtonText: 'Нет', type: 'warning' }
  ).catch(() => false)

  if (!confirmed) return

  try {
    const success = await store.deleteOperation(currentOperationId.value)

    if (!success) {
      ElMessage.error('Операция не может быть удалена');
      return;
    }

    currentOperationId.value = 0
    form.value = {
      operationName: '',
      productId: null,
      processId: null,
      executorIds: [],
      isCompleted: false,
      documentTemplateId: null,
    }
    originalForm.value = null
    ensureCurrentUserInExecutors()

    ElMessage.success('Операция удалена')
  } catch (e) {
    ElMessage.error('Не удалось удалить операцию')
  }
}

const handleProductSearch = async (material_substring: string) => {
  console.log("material_substring", material_substring);

  if (material_substring.length < 2) {
    productOptions.value = []
    return
  }
  productOptionsLoading.value = true
  try {
    const result = await store.searchMaterials(material_substring, 100)
    productOptions.value = result
  } catch (e) {
    console.error(e)
    ElMessage.error('Ошибка при поиске продуктов')
  } finally {
    productOptionsLoading.value = false
  }
}

const onOpenMaterialSelection = () => {
  console.log('Opening material selection');
  emit('open-material-selection', taskId, currentOperationId.value, taskItemsKeyMaterial)
}


const handleClose = async () => {
  if (!hasChanges()) {
    emit('close')
    return
  }

  const confirmed = await ElMessageBox.confirm(
    'Есть несохранённые изменения. Сохранить перед закрытием?',
    'Подтверждение',
    { confirmButtonText: 'Сохранить', cancelButtonText: 'Не сохранять', type: 'warning' }
  ).catch(() => 'cancel')

  if (confirmed === 'confirm') {
    await handleSave();
  }
  emit('close');
}

const openCreateProduct = async () => {
  const result = await ElMessageBox.prompt('Введите название нового продукта', 'Новый продукт', {
    confirmButtonText: 'Создать',
    cancelButtonText: 'Отмена',
    inputPattern: /.{2,50}/,
    inputErrorMessage: 'Название должно быть от 2 до 50 символов',
  }).catch(() => null)

  if (!result || !result.value) return

  try {
    const newProductID = await store.createMaterial({ name: result.value })
    if (!newProductID) {
      ElMessageBox({ type: 'error', message: 'Не удалось создать новый продукт' })
      return
    }
    const existing = productOptions.value.find(item => item.id === newProductID)
    if (existing) {
      const confirmed = await ElMessageBox.confirm(
        'Такой продукт уже есть в списке. Выбрать этот прудукт?',
        'Подтверждение выбора',
        { confirmButtonText: 'Да', cancelButtonText: 'Нет', type: 'warning' }
      ).catch(() => false)
      if (!confirmed) return

    } else {
      productOptions.value.push({ id: newProductID, name: result.value })
    }
    form.value.productId = newProductID
  } catch (e) {
    console.error('createMaterial error:', e)
    ElMessageBox({
      type: 'error',
      message: 'Произошла ошибка при создании продукта.'
    })
  }
}



onMounted(() => {
  fetchMeta()
  currentOperationId.value = props.operationID ?? 0
})

const ensureCurrentUserInExecutors = () => {
  const ids = form.value.executorIds
  if (!ids.length) {
    form.value.executorIds = [props.userID]
  } else if (!ids.includes(props.userID)) {
    form.value.executorIds = [props.userID, ...ids]
  }
}

watch(
  () => props.operationID,
  async (newID) => {
    if (typeof newID === 'number' && newID !== 0 && newID !== null) {
      currentOperationId.value = newID
      await loadOperation(newID)
      originalForm.value = { ...form.value }
    } else {
      currentOperationId.value = 0
      form.value = {
        operationName: '',
        productId: null,
        processId: null,
        executorIds: [],
        isCompleted: false,
        documentTemplateId: null,
      }
      originalForm.value = null
      ensureCurrentUserInExecutors()
    }
  },
  { immediate: true }
)

watch(
  () => form.value.executorIds,
  () => {
    ensureCurrentUserInExecutors()
  },
  { immediate: true }
)

const rules = {
  operationName: [
    { required: true, message: 'Не указано наименование операции', trigger: 'blur' },
    { min: 2, message: 'Название должно быть не короче 2 символов', trigger: 'blur' }
  ],
}
</script>

<style scoped>
.skeleton-wrapper {
  padding: 20px;
}
.product-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.product-select {
  flex: 1;
}
.form-footer {
  margin-top: 24px;
  text-align: right;
}
.form-footer .el-button {
  min-width: 100px;
}
</style>
