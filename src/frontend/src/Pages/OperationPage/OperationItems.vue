<template>
  <div class="operation-items-form">
    <el-form
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
              <el-select
                v-model="form.productId"
                placeholder="Выберите продукт"
                clearable
                filterable
                class="product-select"
              >
                <el-option
                  v-for="p in productOptions"
                  :key="p.id"
                  :label="p.product_name"
                  :value="p.id"
                />
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
        >
          <el-option
            v-for="p in processOptions"
            :key="p.id"
            :label="p.process_name"
            :value="p.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Исполнители" prop="executorIds">
        <el-select
          v-model="form.executorIds"
          multiple
          placeholder="Выберите исполнителей"
          clearable
        >
          <el-option
            v-for="e in executorOptions"
            :key="e.id"
            :label="e.employee_name"
            :value="e.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Операция выполнена">
        <el-checkbox v-model="form.isCompleted">
        </el-checkbox>
      </el-form-item>

      <el-form-item label="Шаблон документа приёма" prop="documentTemplateId">
        <el-select
          v-model="form.documentTemplateId"
          placeholder="Выберите шаблон"
          clearable
        >
          <el-option
            v-for="t in templateOptions"
            :key="t.id"
            :label="t.template_name"
            :value="t.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="form-footer">
      <el-button @click="handleClose">Закрыть</el-button>
      <el-button
        v-if="operationID != null"
        type="danger"
        @click="handleDelete"
      >
        Удалить
      </el-button>
      <el-button type="primary" @click="handleSave">
        Сохранить
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef, computed } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import useApplicationStore from "@/store";

const store = useApplicationStore();

// --- Пропсы ---
const props = defineProps({
  stockID: { type: Number, required: true },
  userID: { type: Number, required: true },
  operationID: { type: Number || null, required: true }, // допускаем null для создания новой
});

// --- Локальные состояния ---
const formRef = ref<FormInstance | undefined>(undefined)

interface FormData {
  operationName: string
  productId: number | null
  processId: number | null          // храним ID
  executorIds: number[]            // храним массив ID
  isCompleted: boolean
  documentTemplateId: number | null // храним ID
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

const productOptions = ref<{ id: number; product_name: string }[]>([])
const processOptions = ref<{ id: number; process_name: string }[]>([])
const executorOptions = ref<{ id: number; employee_name: string }[]>([])
const templateOptions = ref<{ id: number; template_name: string }[]>([])

// --- Мета-данные ---
const fetchMeta = async () => {
  if (!props.stockID) return
  const meta = await store.fetchOperationsMeta(props.stockID)
  productOptions.value = meta.products
  processOptions.value = meta.processes
  executorOptions.value = meta.executors
  templateOptions.value = meta.doc_templates
}

// Загрузка операции для редактирования
const loadOperation = async (id: number) => {
  const operation = await store.fetchOperationData(id)

  form.value = {
    operationName: operation.operationName,
    productId: operation.productId,
    processId: operation.processId,
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

  const isUnique = await store.checkOperationName(props.operationID, form.value.operationName)

  if (!isUnique){ 
    ElMessage.error('Операция с таким именем уже существует. Выберите другое название.');
    return;
  };

  const payload = {
    operationName: form.value.operationName,
    productId: form.value.productId,
    processId: form.value.processId,
    executorIds: form.value.executorIds,
    isCompleted: form.value.isCompleted,
    documentTemplateId: form.value.documentTemplateId,
  }


   //await store.saveOperation(payload)

  originalForm.value = { ...form.value }
}

// Удаление
const handleDelete = async () => {
  if (props.operationID === null) return
  const confirmed = await ElMessageBox.confirm(
    'Вы уверены, что хотите удалить эту операцию?',
    'Подтверждение удаления',
    { confirmButtonText: 'Да', cancelButtonText: 'Нет', type: 'warning' }
  ).catch(() => false)

  if (!confirmed) return

  // Вызов API/стора на удаление
  // await api.deleteOperation(props.operationID)

  originalForm.value = null
  form.value = {
    operationName: '',
    productId: null,
    processId: null,
    executorIds: [],
    isCompleted: false,
    documentTemplateId: null,
  }
}

// Закрытие с проверкой изменений
const handleClose = async () => {
  if (!hasChanges()) {
    return
  }

  const confirmed = await ElMessageBox.confirm(
    'Есть несохранённые изменения. Сохранить перед закрытием?',
    'Подтверждение',
    { confirmButtonText: 'Сохранить', cancelButtonText: 'Не сохранять', type: 'warning' }
  ).catch(() => 'cancel')

  if (confirmed === 'confirm') {
    await handleSave()
  } else if (confirmed === 'cancel') {
    // Можно сбросить форму до оригинала
    // form.value = { ...originalForm.value! }
  }
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
    if (!existing) {
      productOptions.value.push({ id: newProductID, product_name: result.value })
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
})

watch(
  () => props.operationID,
  async (newID) => {
    if (newID !== null && newID !== undefined && newID !== 0) {
      await loadOperation(newID)
      originalForm.value = { ...form.value }
    } else {
      form.value = {
        operationName: '',
        productId: null,
        processId: null,
        executorIds: [],
        isCompleted: false,
        documentTemplateId: null,
      }
      originalForm.value = null
    }
  },
  { immediate: true }
)

const rules = {
  operationName: [
    { required: true, message: 'Не указано наименование операции', trigger: 'blur' },
    { min: 2, message: 'Название должно быть не короче 2 символов', trigger: 'blur' }
  ],
}; 
</script>

<style scoped>
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
