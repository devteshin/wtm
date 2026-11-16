<template>
  <el-dialog
    draggable
    :model-value="dialogVisible"
    @update:model-value="emit('update:dialogVisible', $event)"
    @closed="handleClosed"
    title="Введите название материала"
    width="400px"
  >
    <el-select
      v-model="inputValue"
      filterable
      allow-create
      default-first-option
      clearable
      placeholder="Выберите из списка или введите название"
      style="width: 100%"
    >
      <el-option
        v-for="m in operation_material_list"
        :key="m"
        :label="m"
        :value="m"
      />
    </el-select>

    <template #footer>
      <el-button @click="emit('update:dialogVisible', false)">Отмена</el-button>
      <el-button type="primary" @click="handleSubmit">Подтвердить</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, PropType } from 'vue';
import { ElMessageBox } from 'element-plus';

const props = defineProps({
  dialogVisible: { type: Boolean, required: true },
  initialValue: { type: String, required: true },
  material_list: { type: Array as PropType<string[]>, required: true },
  operation_material_list: { type: Array as PropType<string[]>, required: true }
});

const emit = defineEmits<{
  "update:dialogVisible": [value: boolean],
  "submit": [value: string],
}>();

const inputValue = ref(props.initialValue);

const handleClosed = () => {
  // диалог закрыт — возвращаемся к исходному значению
  inputValue.value = props.initialValue;
};

const handleSubmit = () => {
  const value = (inputValue.value ?? '').trim();
  if (value === '') {
    ElMessageBox.alert(`Наименование материала должно быть указано`, 'Предупреждение');
    return;
  }

  if (props.material_list.includes(value)) {
    ElMessageBox.alert(`Материал "${value}" уже есть в этом документе`, 'Предупреждение');
  } else {
    emit('submit', value);
  }
};
</script>
