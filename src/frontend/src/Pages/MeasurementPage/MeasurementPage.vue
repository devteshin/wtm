<template>
  <el-card>
    <!-- Панель: дата + действия -->
    <div class="toolbar">
      <el-button :icon="ArrowLeft" circle @click="shiftDay(-1)" />
      <el-date-picker
        v-model="selectedDate"
        type="date"
        :clearable="false"
        format="DD.MM.YYYY"
        @change="loadDay"
      />
      <el-button :icon="ArrowRight" circle @click="shiftDay(1)" />
      <el-button type="primary" @click="openCreate">Добавить измерение</el-button>
    </div>

    <!-- Таблица дня -->
    <el-table :data="rows" v-loading="loading" border>
      <el-table-column prop="measured_at" label="Время забора" width="120">
        <template #default="{ row }">{{ fmtTime(row.measured_at) }}</template>
      </el-table-column>
      <el-table-column prop="tech_process_name" label="Техпроцесс" />
      <el-table-column label="Операция" width="180">
        <template #default="{ row }">{{ row.operation_name || '—' }}</template>
      </el-table-column>
      <el-table-column label="C, %" width="100" align="right">
        <template #default="{ row }">{{ row.C ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="S, %" width="100" align="right">
        <template #default="{ row }">{{ row.S ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="" width="140" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">Изменить</el-button>
          <el-button link type="danger" @click="remove(row)">Удалить</el-button>
        </template>
      </el-table-column>
    </el-table>

  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import useApplicationStore from '@/store';
import { ElMessage } from 'element-plus';

const store = useApplicationStore();

const selectedDate = ref<Date>(new Date());

const loadDay = async () => {
  const d = selectedDate.value;
  
  const dateFrom = `${fmtDate(d)}`;
  const dateTo   = `${fmtDate(d)}`;


  try {
    store.loading = true;
    await Promise.all([
      store.fetchMeasurementsMeta({ meas_id: 0 }),

       store.fetchMeasurementsData({
        meas_id: 0,
        operation_id: 0,
        meas_date_start: dateFrom,
        meas_date_end: dateTo,
      }),
 

    ]);
  } catch (error) {
    console.error('Ошибка при загрузке измерений:', error);
    ElMessage.error('Не удалось загрузить измерения');
  } finally {
    store.loading = false;
  }

  console.log(store.measurements_meta);
  console.log(store.measurements_data);

};

const fmtDate = (d: Date) =>
  d.toLocaleDateString('sv-SE'); // даст 'YYYY-MM-DD' — удобно для SQL-диапазонов

onMounted(loadDay);
</script>
