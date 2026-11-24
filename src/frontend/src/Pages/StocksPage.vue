<template>
  <div v-if="store.isAuth" class="stock-picker" v-loading="store.loading">
    <div class="picker-title">Выберите склад</div>

    <div v-if="!store.loading && store.stocks.length === 0" class="empty">
      Нет доступных складов
    </div>

    <div v-else class="stock-grid">
      <button
        v-for="s in store.stocks"
        :key="s.id"
        type="button"
        class="stock-card"
        @click="selectStock(s as frontend.IStock)"
      >
        <span class="stock-name">{{ s.name }}</span>
        <span class="stock-count" :class="{ 'stock-count--zero': !s.tasks_count }">
          {{ s.tasks_count ? `Задач: ${s.tasks_count}` : 'Нет задач' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import useApplicationStore from "@/store";
import { useRouter } from "vue-router";

const router = useRouter();
const store = useApplicationStore();

/** Выбор склада: запоминаем и переходим к списку заданий */
const selectStock = (stock: frontend.IStock): void => {
  store.currentStockID = stock.id;
  localStorage.setItem("currentStockID", String(stock.id));
  router.push(`/stock/${stock.id}`);
};

/** Единственный склад для роли 1 — выбираем сразу, без экрана выбора */
onMounted(async () => {
  if (store.currentUser?.role_id === 1) {
    await store.fetchStocks();
    if (store.stocks.length === 1) selectStock(store.stocks[0] as frontend.IStock);
  } else {
    router.push(`/material`);
  }
});
</script>

<style scoped>
.stock-picker {
  max-width: 720px;
  margin: 40px auto 0;
  padding: 0 16px;
  box-sizing: border-box;
}

.picker-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

/* сброс нативной кнопки — по паттерну раздела 5 */
.stock-card {
  appearance: none;
  margin: 0;
  padding: 16px;
  font: inherit;
  border: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 96px;
  cursor: pointer;
  text-align: left;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}

.stock-card:hover {
  background: var(--el-color-primary-light-9);
  box-shadow: 0 2px 8px rgba(16, 24, 40, 0.10);
}

.stock-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.stock-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.stock-count {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

/* ноль задач — приглушённо, без терракоты: повода кликать нет */
.stock-count--zero {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.empty {
  padding: 40px 24px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
</style>
