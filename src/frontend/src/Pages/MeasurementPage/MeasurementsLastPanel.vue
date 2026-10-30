<template>
    <el-table :data="store.measurements_last" size="small" style="width: 100%">
        <el-table-column prop="measurement" label="Измерение" min-width="140" show-overflow-tooltip />

        <el-table-column label="Прошло" min-width="90" align="right">
            <template #default="{ row }">
            <span v-if="row.last_measured_at">{{ elapsed(row.last_measured_at) }}</span>
            <el-tag v-else type="info" size="small">—</el-tag>
            </template>
        </el-table-column>

        <el-table-column label="Последнее измерение" min-width="130">
            <template #default="{ row }">
            <span v-if="row.last_measured_at">{{ formatDateTime(row.last_measured_at) }}</span>
            <el-tag v-else type="info" size="small">—</el-tag>
            </template>
        </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import useApplicationStore from '@/store';
import dayjs from 'dayjs';

const store = useApplicationStore();

const formatDateTime = (v: string): string => dayjs(v).format('DD.MM.YYYY HH:mm');

const elapsed = (v: string): string => {
  const minutes = dayjs().diff(dayjs(v), 'minute');
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  if (days > 0) {
    return `${days} дн ${hours} ч`;
  }
  if (hours > 0) {
    return `${hours} ч`;
  }
  if (minutes > 0) {
    return `${minutes} мин`;
  }
  return 'только что';
};

const REFRESH_DEBOUNCE_MS = 500;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const refresh = (): void => {
  if (refreshTimer !== undefined) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    store.fetchMeasurementsLast();
  }, REFRESH_DEBOUNCE_MS);
};

const REFRESH_INTERVAL_MS = 60_000;
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  store.fetchMeasurementsLast();
  timer = setInterval(() => {
    store.fetchMeasurementsLast();
  }, REFRESH_INTERVAL_MS);
});

onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer);
  }
  if (refreshTimer !== undefined) {
    clearTimeout(refreshTimer);
  }
});

defineExpose({ refresh });
</script>