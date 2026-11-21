<template>
  <div class="indicators-table">
    <el-table
      v-if="modelValue.length"
      :data="modelValue"
      style="width: 100%"
      max-height="250"
      :show-header="false"
    >
      <el-table-column prop="element" min-width="110">
        <template #default="scope">
          <el-select
            v-model="scope.row.element"
            size="small"
            placeholder="—"
            filterable
          >
            <el-option
              v-for="item in availableOptions"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </template>
      </el-table-column>

      <el-table-column prop="min" width="90">
        <template #default="scope">
          <el-input v-model="scope.row.min" size="small" placeholder="мин" />
        </template>
      </el-table-column>

      <el-table-column prop="max" width="90">
        <template #default="scope">
          <el-input v-model="scope.row.max" size="small" placeholder="макс" />
        </template>
      </el-table-column>

      <el-table-column width="36" align="center">
        <template #default="scope">
          <el-button text size="small" @click.prevent="removeRow(scope.$index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-button class="add-row" text bg @click="addRow">
      Добавить показатель
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';
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
.indicators-table :deep(.el-table .cell) {
  padding: 2px 4px;
}

.add-row {
  margin-top: 8px;
  width: 100%;
  border-style: dashed;
}

.indicators-table :deep(.el-button:hover .el-icon) {
  color: var(--el-color-danger);
}
</style>