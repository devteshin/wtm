<template>
    <TextInputDialog
    width="500"
    title="Введите название материала"
    v-model:dialogVisible="visible"
    :initial-value="props.initialValue"
    @submit="handleSubmit"
    />            
</template>

<script setup lang="ts">
import TextInputDialog from "@/components/TextInputDialog.vue";
import { ElMessageBox } from 'element-plus';
import { computed, PropType } from 'vue';

const props = defineProps({
  dialogVisible: { type: Boolean, required: true },
  initialValue: { type: String, required: true },
  material_list: { type: Array as PropType<string[]>, required: true }
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

const handleSubmit = (value) => {
    if (props.material_list.includes(value)) {
        ElMessageBox.alert(`Материал "${value}" уже есть в этом документе`, 'Предупреждение')
    } else {
        emit('submit', value);
    };


};

</script>
