<template>
  <div class="grid-container">
    <div class="grid-header">
      <span class="header-title">Выбор номеров (сетка)</span>
      <el-button
        size="small"
        link                
        class="close-btn"
        @click="emit('close-selection')"
      >
        Закрыть подбор
      </el-button>
    </div>

    <div class="grid-body">
      <div
        v-for="num in numbers"
        :key="num"
        class="grid-cell"
        :class="{ 'is-selected': selectedNumbers.includes(num) }"
        @click="handleCellClick(num)"
      >
        {{ num }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface IRawMaterialGridProps {
  numbers: number[];
  selectedNumbers: number[]; // массив уже выбранных номеров
}

const props = defineProps<IRawMaterialGridProps>();
const emit = defineEmits<{
  (e: 'cell-click', tareId: number): void;
  (e: 'close-selection'): void;
}>();

const handleCellClick = (tareId: number) => {
  emit('cell-click', tareId);
};
</script>

<style scoped>
.grid-container {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-top: 20px;
  overflow: hidden;
  background: #fff;
  /* Было: max-height: 50vh; */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid-header {
  background: #f5f7fa;
  padding: 8px 12px;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  line-height: 1;
}

.close-btn {
  padding: 0 8px;
  font-size: 13px;
  color: #666;
}

.close-btn:hover {
  color: #ff4d4f;
}

.grid-body {
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: #e4e7ed;
  flex: 1;
  min-height: 0;
}

.grid-cell {
  background: #fff;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: #333;
  font-size: 13px;
  transition: background-color 0.2s, color 0.2s;
}

/* Стиль для уже выбранного номера */
.grid-cell.is-selected {
  background-color: #d4edda; /* светло-зелёный */
  color: #155724;            /* тёмно-зелёный текст */
  opacity: 0.8;
}

.grid-cell:hover:not(.is-selected) {
  background-color: #f0f7ff;
}
</style>