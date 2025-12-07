<template>
  <el-dialog draggable
    v-model="visible"
    @close="handleClose"
  >
    <el-input
      v-model="inputValue"
    ></el-input>
    
    <span slot="footer" class="dialog-footer">
      <el-button @click="closeDialog">Отмена</el-button>
      <el-button type="primary" @click="submitValue">Подтвердить</el-button>
    </span>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  dialogVisible: { type: Boolean, required: true },
  initialValue: { type: String, required: true }
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

const inputValue = ref(props.initialValue);
const initialtValue = props.initialValue;

const handleClose = () => {
    inputValue.value = initialtValue; 
    emit('update:dialogVisible', false);
};

const closeDialog = () => {
    emit('update:dialogVisible', false);
};

const submitValue = () => {
    emit('submit', inputValue.value);
    handleClose();
};

</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;

}
</style>