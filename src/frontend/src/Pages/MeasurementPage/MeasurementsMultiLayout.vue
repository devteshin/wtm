<template>
  <div class="multi-layout">
    <div class="toolbar">
      <el-select
        v-model="schemeModel"
        placeholder="Схема производства"
        filterable
        class="toolbar-scheme"
      >
        <el-option
          v-for="s in store.processing_schemes"
          :key="s.id"
          :label="s.name"
          :value="s.id"
        />
      </el-select>

      <el-date-picker
        v-model="dateModel"
        type="date"
        :clearable="false"
        format="DD.MM.YYYY"
        value-format="YYYY-MM-DD"
        class="toolbar-date"
      />

      <el-button
        :icon="Refresh"
        circle
        title="Обновить все таблицы"
        :disabled="cards.length === 0"
        @click="reloadAll"
      />
    </div>

    <div v-if="!selectedSchemeId" class="empty">Выберите схему производства</div>
    <div v-else-if="loading" class="empty" v-loading="true"></div>
    <div v-else-if="cards.length === 0" class="empty">Для выбранной схемы измерения не заданы</div>

    <div v-else class="cards">
      <el-card v-for="card in cards" :key="card.key" class="card">
        <MeasurementTable
          :ref="registerRef(card.key)"
          :editable="false"
          :measurement-id="card.measurementId"
          :measurement-name="card.measurementName"
          :operation-id="card.kind === 'time' ? card.operationId : undefined"
          :date="card.kind === 'time' ? selectedDate : undefined"
          :material-id="card.kind === 'probe' ? card.materialId : undefined"
          :material-name="card.kind === 'probe' ? card.materialName : ''"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import MeasurementTable from './MeasurementTable.vue';
import { useMeasurementsMultiStore } from '@/storeMeasurementsMulti.js';
import useApplicationStore from '@/store';

type SchemeCard =
  | { kind: 'time'; key: string; measurementId: number; measurementName: string;
      operationId: number }
  | { kind: 'probe'; key: string; measurementId: number; measurementName: string;
      materialId: number; materialName: string };

const store = useMeasurementsMultiStore();
const app_store = useApplicationStore();
const { selectedSchemeId, selectedDate, loading, metas } = storeToRefs(store);

const schemeModel = computed<number | null>({
  get: () => selectedSchemeId.value,
  set: (id) => {
    if (id !== null) store.setSelection({ schemeId: id });
  },
});

const dateModel = computed<string>({
  get: () => selectedDate.value,
  set: (d) => {
    if (d) store.setSelection({ date: d });
  },
});

// ---------- расчёт карточек ----------
const cards = computed<SchemeCard[]>(() => {
  const out: SchemeCard[] = [];

  for (const item of store.scheme_measurements) {
    // мета измерения — источник measure_kind и имён; при сбое загрузки мета
    // измерение трактуется как time-режим с именем-плейсхолдером
    const measItem = metas.value[item.measurement_id]
      ?.measurement_list.find(m => m.id === item.measurement_id);
    const measName = measItem?.name ?? `Измерение #${item.measurement_id}`;
    const kind = item.measure_kind;

    if (kind === 2) {
      // probe: карточка на каждую пару «измерение × материал»
      for (const matId of item.material_ids) {
        const matName = metas.value[item.measurement_id]?.material_list
          .find(m => m.id === matId)?.name ?? `Материал #${matId}`;
        out.push({
          kind: 'probe',
          key: `probe-${item.measurement_id}-${matId}`,
          measurementId: item.measurement_id,
          measurementName: measName,
          materialId: matId,
          materialName: matName,
        });
      }
    } else {
      // time: одна карточка на пару «измерение × операция»
      out.push({
        kind: 'time',
        key: `time-${item.measurement_id}-${item.operation_id}`,
        measurementId: item.measurement_id,
        measurementName: measName,
        operationId: item.operation_id,
      });
    }
  }
  return out;
});

// ---------- загрузка схемы ----------
const loadScheme = async (): Promise<void> => {
  const schemeId = selectedSchemeId.value;
  if (schemeId === null) return;

  loading.value = true;
  try {
    const items = await store.fetchSchemeMeasurements(schemeId);
    if (selectedSchemeId.value !== schemeId) return;   // схема уже сменилась — ответ неактуален

    const ids = [...new Set(items.map(i => i.measurement_id))];
    const results = await Promise.all(
      ids.map(id => app_store.fetchMeasurementsMeta({ meas_id: id }).catch(() => null)),
    );
    if (selectedSchemeId.value !== schemeId) return;   // и здесь тоже

    const map: Record<number, frontend.IMeasurementsMeta> = {};
    ids.forEach((id, i) => {
      if (results[i]) map[id] = results[i]!;
    });
    metas.value = map;
  } catch (e) {
    console.error('Ошибка загрузки состава схемы:', e);
    ElMessage.error('Не удалось загрузить состав схемы');
  } finally {
    loading.value = false;
  }
};

watch(selectedSchemeId, async (id) => {
  if (hydrating) return;   // гидрацией управляет onMounted
  if (id === null) {
    store.scheme_measurements = [];
    metas.value = {};
    return;
  }
  await loadScheme();
});

// ---------- обновление всех карточек ----------
const tableRefs = new Map<string, { reload: () => Promise<void> }>();

const registerRef = (key: string) => (el: any): void => {
  if (el) tableRefs.set(key, el);
  else tableRefs.delete(key);
};

const reloadAll = (): void => {
  tableRefs.forEach(t => t.reload?.());
};

let hydrating = true;

onMounted(async () => {
  store.loadFromStorage();

  try {
    await store.fetchProcessingSchemes();
  } catch (e) {
    console.error('Ошибка загрузки схем:', e);
    ElMessage.error('Не удалось загрузить список схем');
  }

  if (selectedSchemeId.value !== null &&
      !store.processing_schemes.some(s => s.id === selectedSchemeId.value)) {
    store.setSelection({ schemeId: null });
  }

  if (selectedSchemeId.value !== null) {
    await loadScheme();
  }

  hydrating = false;
});

</script>

<style scoped>
.multi-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-scheme { width: 360px; }
.toolbar-date   { width: 140px; }

.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
}

.card {
  flex: 1 1 480px;
  min-width: 480px;
  height: 420px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  min-height: 120px;
}
</style>
