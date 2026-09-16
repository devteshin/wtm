<template>
  <div class="tables-wrapper">
    <!-- Панель управления -->
    <div class="tables-controls">
      <h3 class="controls-title">Сроки хранения материалов</h3>

      <span class="separator-line" />

      <el-button
        size="small"
        type="success"
        :loading="exportLoading"
        @click="exportToExcelClick"
      >
        <template #icon><el-icon :size="14"><Download /></el-icon></template>
        Экспорт в Excel
      </el-button>
    </div>

    <!-- Скроллируемая область с таблицами -->
    <div class="tables-scroll-area">
      <div class="tables-grid">
        <div class="table-card">
          <el-table
            :data="[]"
            style="width: 100%"
            :border="true"
            size="small"
            empty-text="Нет данных для отображения"
          >
          </el-table>
        </div>

      </div>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="loading" class="overlay-loader">Загрузка данных...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import useApplicationStore from '@/store'
import { Download } from '@element-plus/icons-vue'
import { exportToExcel } from '@/utils/excelExport'


const store = useApplicationStore()

const loading = ref(false)
const error = ref<string | null>(null)
const exportLoading = ref(false)

const fetchData = async () => {
}

onMounted(async () => {
  await fetchData()
})

const exportToExcelClick = () => {
}


</script>

<style scoped>

.tables-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 20px); /* Подстраивается под экран, включая планшеты */
  overflow: hidden; /* Важно: родитель не скроллится, скролл только внутри */
}

.tables-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  z-index: 10;
  position: sticky;
  top: 0;
  margin-bottom: 8px;
}

.controls-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.separator-line {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

/* Область со скроллом: занимает всё оставшееся место */
.tables-scroll-area {
  flex: 1;
  min-height: 0; /* Критично для flex-скролла внутри flex-контейнера */
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px; /* Небольшой отступ, чтобы скроллбар не прилипал к контенту */
}

/* Сетка карточек таблиц */
.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  padding: 8px;
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.table-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

/* Стили для состояний загрузки и ошибки */
.overlay-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  color: #333;
  font-weight: 500;
}

.error-state {
  padding: 24px;
  text-align: center;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  margin-top: 16px;
}

/* Кастомизация скроллбара (для Chrome/Edge/Safari) */
.tables-scroll-area::-webkit-scrollbar {
  width: 8px;
}
.tables-scroll-area::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.tables-scroll-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
</style>
