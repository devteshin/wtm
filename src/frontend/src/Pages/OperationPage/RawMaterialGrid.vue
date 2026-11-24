<template>
  <div class="grid-container">
    <div class="grid-header">
      <span class="header-title">Выбор номеров</span>
      <div class="header-actions">
        <span v-if="selectedNumbers.length" class="selected-count">
          выбрано: {{ selectedNumbers.length }}
        </span>
        <el-button size="small" link class="close-btn" @click="emit('close-selection')">
          Закрыть подбор
        </el-button>
      </div>
    </div>

    <div v-if="numbers.length" class="grid-body">
      <button
        v-for="num in numbers"
        :key="num"
        class="grid-cell"
        :class="{ 'is-selected': selectedSet.has(num) }"
        @click="handleCellClick(num)"
      >
        {{ num }}
      </button>
    </div>
    <div v-else class="grid-empty">Нет номеров для подбора</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface IRawMaterialGridProps {
  numbers: number[];
  selectedNumbers: number[];
}

const props = defineProps<IRawMaterialGridProps>();
const emit = defineEmits<{
  (e: 'cell-click', tareId: number): void;
  (e: 'close-selection'): void;
}>();

const selectedSet = computed(() => new Set(props.selectedNumbers));

const handleCellClick = (tareId: number) => {
  emit('cell-click', tareId);
};
</script>

<style scoped>
.grid-container {
  margin-top: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.header-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.close-btn {
  font-size: 13px;
}
.close-btn:hover {
  color: var(--el-color-danger);
}

.grid-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  background: #fff;
}

.grid-cell {
  appearance: none;
  margin: 0;
  padding: 0;
  font: inherit;
  background: #fff;
  border: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s, color 0.15s;
}

.grid-cell:hover:not(.is-selected) {
  background-color: var(--el-fill-color-light);
}

.grid-cell.is-selected {
  background-color: var(--el-color-primary-light-8);
  color: var(--el-color-primary-dark-2);
  font-weight: 600;
}

.grid-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1024px) {
  .grid-cell {
    height: 40px;
    font-size: 14px;
  }
}
</style>
