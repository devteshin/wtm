<template>
  <div class="test-scada">
    <h2>Тест подключения к базе Симп Лайт</h2>

    <div class="toolbar">
      <label>
        Записей:
        <input v-model.number="limit" type="number" min="1" max="1000" />
      </label>
      <button :disabled="scada_loading" @click="onConnect">
        {{ scada_loading ? 'Читаю…' : 'Подключиться' }}
      </button>
    </div>

    <div v-if="scada_error" class="error">Ошибка: {{ scada_error }}</div>

    <p v-if="scada_rows.length === 0 && !scada_loading && !scada_error">
      Записей нет. Возможные причины: Репликатор ещё не наполнял базу,
      путь в app["scada_db_path"] неверный либо таблица DataValues пуста.
    </p>

    <table v-if="scada_rows.length > 0" class="data-table">
      <thead>
        <tr>
          <th>code</th>
          <th>stationID</th>
          <th>passportID</th>
          <th>valueTime (TDateTime)</th>
          <th>valueTime (ISO)</th>
          <th>valueData</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in scada_rows" :key="row.code">
          <td>{{ row.code }}</td>
          <td>{{ row.stationID }}</td>
          <td>{{ row.passportID }}</td>
          <td>{{ formatTDateTime(row.valueTime) }}</td>
          <td>{{ row.value_time_iso }}</td>
          <td>{{ row.valueData }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import useApplicationStore from "@/store";

const store = useApplicationStore();
const { scada_rows, scada_error, scada_loading } = storeToRefs(store);

const limit = ref(20);

function onConnect() {
  store.fetchScadaTestData({ limit: limit.value });
}

// TDateTime — дробное число суток; показываем сырым числом,
// чтобы визуально сверить с ISO-колонкой
function formatTDateTime(value: number | null): string {
  return value === null ? '' : String(value);
}
</script>

<style scoped>
.test-scada {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}
.toolbar label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
}
.toolbar input {
  padding: 6px;
  width: 120px;
}
.toolbar button {
  padding: 8px 20px;
  cursor: pointer;
}
.error {
  color: #b00020;
  margin-bottom: 12px;
  white-space: pre-wrap;
}
.data-table {
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  border: 1px solid #ccc;
  padding: 4px 10px;
  text-align: left;
}
.data-table th {
  background: #f4f4f4;
}
</style>
