<template>
  <div class="indicators-table">
    <el-table :data="modelValue" style="width: 100%" max-height="250">
      <el-table-column prop="element" label="">
        <template #default="scope">
          <el-select v-model="scope.row.element" style="width: 90px">
            <el-option
              v-for="item in availableOptions"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="min" label="min">
        <template #default="scope">
          <el-input type="number" v-model.number="scope.row.min" placeholder="" />
        </template>
      </el-table-column>
      <el-table-column prop="max" label="max">
        <template #default="scope">
          <el-input type="number" v-model.number="scope.row.max" placeholder="" />
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="" width="40">
        <template #default="scope">
          <el-button
            link
            type="danger"
            size="small"
            @click.prevent="removeRow(scope.$index)"
          >
            <Delete style="width: 16px; height: 16px;" />
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button class="mt-4" style="width: 100%" @click="addRow">
      Добавить
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import useApplicationStore from '@/store';
import type { TableConditionItem } from '@/storeMaterialsReport';

const props = defineProps<{
  modelValue: TableConditionItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TableConditionItem[]];
}>();

const store = useApplicationStore();

// Показатели, ещё не выбранные ни в одной строке
const availableOptions = computed<frontend.IMaterialGroups[]>(() => {
  const used = props.modelValue.map(row => row.element);
  return (store.materials_meta?.material_group_list ?? []).filter(
    item => (item.type === 0 || item.type === 1) && !used.includes(item.code)
  );
});

const removeRow = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};

const addRow = () => {
  emit('update:modelValue', [...props.modelValue, { element: '', min: '', max: '' }]);
};
</script>

<style scoped>
.indicators-table {
  width: 100%;
}
</style>