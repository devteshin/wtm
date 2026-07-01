<template>
  <div class="grid-container">
    <div class="grid-header">
      Выбор номеров (сетка)
    </div>
    <div class="grid-body">
      <div
        v-for="num in numbers"
        :key="num"
        class="grid-cell"
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
}

const props = defineProps<IRawMaterialGridProps>();
const emit = defineEmits<{
  (e: 'cell-click', tareId: number): void;
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
  /* Ограничиваем высоту контейнера */
  max-height: 50vh;
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
}

.grid-body {
  /* Скролл только у тела сетки */
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: #e4e7ed;
  /* Занимает всё оставшееся место */
  flex: 1;
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
}
</style>
