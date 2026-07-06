<template>
  <div class="operation-items-form">
    <el-form
      ref="formRef"
      :model="form"
      label-width="140px"
      status-icon
      :rules="rules"
    >
      <el-form-item label="Наименование операции" prop="operationName">
        <el-input v-model="form.operationName" clearable />
      </el-form-item>

      <el-form-item label="Наименование продукта" prop="productName">
        <el-input v-model="form.productName" clearable />
      </el-form-item>

      <el-form-item label="Техпроцесс" prop="processId">
        <el-select
          v-model="form.processId"
          placeholder="Выберите техпроцесс"
          clearable
        >
          <el-option
            v-for="p in processOptions"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Исполнители" prop="executorIds">
        <el-select
          v-model="form.executorIds"
          multiple
          collapse-tags
          placeholder="Выберите исполнителей"
          clearable
        >
          <el-option
            v-for="e in executorOptions"
            :key="e.id"
            :label="e.name"
            :value="e.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Операция выполнена">
        <el-checkbox v-model="form.isCompleted">
          Отметить как выполненную
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
            :label="t.name"
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
import { ref, onMounted, watch, shallowRef } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessageBox } from 'element-plus' // для confirm

// --- Пропсы ---
const props = defineProps<{
  stockID: number | null
  userID: number | null
  operationID: number | null
}>()

// --- Локальные состояния ---
const formRef = ref<FormInstance | undefined>(undefined)

interface FormData {
  operationName: string
  productName: string
  processId: number | null
  executorIds: number[]
  isCompleted: boolean
  documentTemplateId: number | null
}

const form = shallowRef<FormData>({
  operationName: '',
  productName: '',
  processId: null,
  executorIds: [],
  isCompleted: false,
  documentTemplateId: null,
})

// Храним «оригинальную» версию формы, чтобы детектить изменения
const originalForm = shallowRef<FormData | null>(null)

const processOptions = ref<{ id: number; name: string }[]>([])
const executorOptions = ref<{ id: number; name: string }[]>([])
const templateOptions = ref<{ id: number; name: string }[]>([])

// --- Мета-данные ---
const fetchMeta = async () => {
  // Вставь сюда свой fetchOperationMeta
  // Пример:
  // const meta = await fetchOperationMeta()
  // processOptions.value = meta.processes
  // executorOptions.value = meta.executors
  // templateOptions.value = meta.templates
}

// Загрузка операции для редактирования
const loadOperation = async (id: number) => {
  // Запрос к API по operationID, получение данных и заполнение form.value
  // После заполнения обязательно сохраняем копию в originalForm.value
}

// Проверка изменений (поверхностное сравнение полей)
const hasChanges = (): boolean => {
  if (!originalForm.value) return false
  const a = form.value
  const b = originalForm.value

  return (
    a.operationName !== b.operationName ||
    a.productName !== b.productName ||
    a.processId !== b.processId ||
    JSON.stringify(a.executorIds) !== JSON.stringify(b.executorIds) ||
    a.isCompleted !== b.isCompleted ||
    a.documentTemplateId !== b.documentTemplateId
  )
}

// Сохранение
const handleSave = async () => {
  const validate = formRef.value?.validate
  if (!validate) return

  const isValid = await validate()
  if (!isValid) return

  const payload = {
    stockID: props.stockID,
    userID: props.userID,
    operationName: form.value.operationName,
    productName: form.value.productName,
    processId: form.value.processId,
    executorIds: form.value.executorIds,
    isCompleted: form.value.isCompleted,
    documentTemplateId: form.value.documentTemplateId,
  }

  // Тут вызывай свой API/стор для сохранения
  // await api.saveOperation(payload)

  // После успешного сохранения обновляем оригинал, чтобы «изменений» не было
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

  // Тут вызов API/стора на удаление
  // await api.deleteOperation(props.operationID)

  // После удаления можно сбросить форму и сообщить, что операция удалена
  originalForm.value = null
  form.value = {
    operationName: '',
    productName: '',
    processId: null,
    executorIds: [],
    isCompleted: false,
    documentTemplateId: null,
  }
}

// Закрытие с проверкой изменений
const handleClose = async () => {
  if (!hasChanges()) {
    // Просто закрываем (родитель сам управляет видимостью drawer через v-model)
    // Для этого компонента достаточно ничего не делать: родитель слушает кнопку и ставит drawerVisible = false
    return
  }

  const confirmed = await ElMessageBox.confirm(
    'Есть несохранённые изменения. Сохранить перед закрытием?',
    'Подтверждение',
    { confirmButtonText: 'Сохранить', cancelButtonText: 'Не сохранять', type: 'warning' }
  ).catch(() => 'cancel')

  if (confirmed === 'confirm') {
    await handleSave()
    // После сохранения изменений нет — можно спокойно закрыться
  } else if (confirmed === 'cancel') {
    // Пользователь отказался сохранять — просто закрываемся
  }
  // Если пользователь нажал «Не сохранять», можно дополнительно сбросить форму до оригинала, если нужно
}

onMounted(() => {
  fetchMeta()
})

watch(
  () => props.operationID,
  async (newID) => {
    if (newID !== null) {
      await loadOperation(newID)
      // После загрузки сохраняем «оригинал»
      originalForm.value = { ...form.value }
    } else {
      // Сброс для создания новой операции
      form.value = {
        operationName: '',
        productName: '',
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

const rules = {} // добавь правила валидации по необходимости
</script>

<style scoped>
.form-footer {
  margin-top: 24px;
  text-align: right;
}
.form-footer .el-button {
  min-width: 100px;
}
</style>
