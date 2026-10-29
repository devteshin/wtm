<template>
  <el-table :data="store.measurements_last" size="small" style="width: 100%">
    <el-table-column prop="measurement" label="Измерение" min-width="140" />
    <el-table-column label="Последнее измерение" width="150">
      <template #default="{ row }">
        <span v-if="row.last_measured_at">{{ formatDateTime(row.last_measured_at) }}</span>
        <el-tag v-else type="info" size="small">нет данных</el-tag>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import useApplicationStore from '@/store';
import dayjs from 'dayjs';

const store = useApplicationStore();
const formatDateTime = (v: string): string => dayjs(v).format('DD.MM.YYYY HH:mm');

store.fetchMeasurementsLast();
</script>
