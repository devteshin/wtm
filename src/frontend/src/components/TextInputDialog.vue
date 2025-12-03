<template>
  <el-dialog
    title="Введите значение"
    v-model="visible"
    @close="handleClose"
  >
    <el-input
      v-model="inputValue"
      placeholder="Введите текст"
    ></el-input>
    
    <span slot="footer" class="dialog-footer">
      <el-button @click="closeDialog">Отмена</el-button>
      <el-button type="primary" @click="submitValue">Подтвердить</el-button>
    </span>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps({
    dialogVisible: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits<{
    "update:dialogVisible": [value: boolean],
    "submit": [value: string],
}>();

const visible = computed({
    get: () => props.dialogVisible,
    set: (value: boolean) => {
        emit("update:dialogVisible", value);
    }
});

const inputValue = ref('');

const handleClose = () => {
    inputValue.value = ''; // Очистка поля ввода при закрытии
    emit('update:dialogVisible', false); // Закрытие диалога
};

const closeDialog = () => {
    emit('update:dialogVisible', false); // Закрытие диалога
};

const submitValue = () => {
    emit('submit', inputValue.value); // Передача значения в родительский компонент
    handleClose(); // Закрытие диалога
};

</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>