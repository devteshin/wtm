<template>
  <div class="panel-layout" :class="{ 'chart-collapsed': chartCollapsed }">
    <el-card class="card">
      <!-- Тулбар -->
      <div class="toolbar">
        <el-select
          v-model="selectedMeasurementId"
          class="toolbar-measurement"
          placeholder="Измерение"
          filterable
        >
          <el-option
            v-for="m in measurementsList"
            :key="m.id"
            :label="m.name"
            :value="m.id"
          />
        </el-select>
  
        <template v-if="!isProbeKind">
          <el-button :icon="ArrowLeft" circle @click="shiftDay(-1)" />
          <el-date-picker
            v-model="selectedDate"
            class="toolbar-date"
            type="date"
            :clearable="false"
            format="DD.MM.YYYY"
            value-format="YYYY-MM-DD"
          />
          <el-button :icon="ArrowRight" circle @click="shiftDay(1)" />
        </template>

  
        <el-button type="primary" :disabled="!selectedMeasurementId" @click="loadData">Заполнить</el-button>
        <el-button v-if="canEdit" :disabled="!selectedMeasurementId" @click="addRow">Добавить строку</el-button>

        <el-tooltip
          :content="chartCollapsed ? 'Показать график' : 'Развернуть таблицу'"
          placement="top"
        >
          <el-button class="btn-toggle-chart" circle :icon="chartCollapsed ? Bottom : Top" @click="toggleChart" />
        </el-tooltip>
        


      </div>
  
      <!-- Таблица: показывается только после выбора измерения -->
      <div class="table-container" v-if="selectedMeasurementId">
        <el-table
          :data="rows"
          v-loading="loading"
          border
          row-key="rowKey"
          height="100%"
        >
          <el-table-column label="Время измерения" width="200">
            <template #default="{ row }">
              <el-date-picker
                v-if="canEdit && !isProbeKind"
                v-model="row.measuredAt"
                type="datetime"
                :clearable="false"
                format="DD.MM.YYYY HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="disableOtherDays"
                style="width: 100%"
                @change="onKeyChanged(row as EditableRow)"
              />
              <span v-else>{{ row.measuredAtFmt ?? '—' }}</span>
            </template>
          </el-table-column>
    
          <el-table-column label="Операция" min-width="200">
            <template #default="{ row }">
              <el-select
                v-if="canEdit"
                v-model="row.operationId"
                placeholder="—"
                filterable
                style="width: 100%"
                @change="onKeyChanged(row as EditableRow)"
              >
                <el-option
                  v-for="op in operationsList"
                  :key="op.id"
                  :label="op.name"
                  :value="op.id"
                />
              </el-select>
              <span v-else>{{ row.operationName ?? '—' }}</span>
            </template>
          </el-table-column>

          <el-table-column v-if="isProbeKind" label="№ пробы" width="110" align="right">
            <template #default="{ row }">
              <el-input-number
                v-if="canEdit"
                v-model="row.probeNum"
                :controls="false"
                :precision="0"
                :min="1"
                style="width: 100%; text-align: right"
                @change="onKeyChanged(row as EditableRow)"
              />
              <span v-else>{{ row.probeNum ?? '—' }}</span>
            </template>
          </el-table-column>          
          

          <el-table-column
            v-for="ind in indicatorSet"
            :key="ind.id"
            :label="columnLabel(ind)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <el-input-number
                v-if="canEdit"
                v-model="row.values[String(ind.id)]"
                :controls="false"
                :precision="ind.value_precision ?? 2"
                :min="ind.min_value ?? 0"
                :max="ind.max_value ?? 100"
                style="width: 100%; text-align: right"
                @change="onValueChanged(row as EditableRow, ind.id)"
              />
              <span v-else class="cell-value">{{ formatValue(row as EditableRow, ind) }}</span>
            </template>
          </el-table-column>
    
          <el-table-column v-if="canEdit" label="" width="60" align="center">
            <template #default="{ row }">
              <el-tooltip content="Удалить" placement="top">
                <el-button :icon="Delete" circle type="danger" plain tabindex="-1"
                          @click="removeRow(row as EditableRow)" />
              </el-tooltip>
            </template>
          </el-table-column>          
        </el-table>
      </div>
    </el-card>
    <el-card class="card-side">
      <MeasurementsLastPanel ref="lastPanel" :auto-refresh="false" />
    </el-card>
    <el-card class="card-chart">
      <MeasurementChartPanel />
    </el-card>        
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight, Delete, Bottom, Top } from '@element-plus/icons-vue';
import MeasurementsLastPanel from './MeasurementsLastPanel.vue'
import MeasurementChartPanel from './MeasurementChartPanel.vue'
import useApplicationStore from '@/store';
import { storeToRefs } from 'pinia';
import { useMeasurementsPanelStore } from '@/storeMeasurementPanel.js';

const measurementsStore = useMeasurementsPanelStore();
const { selectedMeasurementId, selectedDate, chartCollapsed } = storeToRefs(measurementsStore);


const props = withDefaults(
  defineProps<{ editable?: boolean }>(),
  { editable: true },   
);

const canEdit = computed(() => props.editable);
const store = useApplicationStore();

const lastPanel = ref<InstanceType<typeof MeasurementsLastPanel>>();

const toggleChart = (): void => {
  measurementsStore.setChartCollapsed(!chartCollapsed.value);
};

// ---------- справочники из meta ----------
const measurementsList = computed(() => store.measurements_meta?.measurement_list ?? []);
const operationsList   = computed(() => store.measurements_meta?.operation_list ?? []);
const indicatorSet = computed(() =>
  (store.measurements_meta?.indicator_set_list ?? [])
    .slice()
    .sort((a, b) => a.order_num - b.order_num)   // по возрастанию order_num
);

const somethingChanged = (): void => {
  lastPanel.value?.refresh();
};

const columnLabel = (ind: frontend.IIndicatorSet): string =>
  `${ind.code}, ${ind.measurement_unit}`;

// ---------- состояние ----------
const selectedMeasurement = computed(() =>
  measurementsList.value.find(m => m.id === selectedMeasurementId.value) ?? null
);

// 1 = по времени, 2 = по пробам
const isProbeKind = computed(() => selectedMeasurement.value?.measure_kind === 2);  

const loading = ref(false);

type EditableRow = {
  rowKey: string;
  sampleId: number | null;      // id пробы (measurement_data), null — ещё не сохранена
  probeNum: number | null; // для измерений по пробам
  measuredAt: string | null;
  measuredAtFmt: string | null;
  operationId: number | null;
  operationName: string | null;
  values: Record<string, number | null>;   // indicator_id → значение
};

const rows = ref<EditableRow[]>([]);

let lastLoadedKey = '';

const loadKey = (): string =>
  isProbeKind.value
    ? `probe:${selectedMeasurementId.value}`
    : `time:${selectedMeasurementId.value}:${selectedDate.value}`;


// ---------- загрузка ----------
const loadData = async (): Promise<void> => {
  if (!selectedMeasurementId.value || !selectedDate.value) return;
  lastLoadedKey = loadKey();
  try {
    loading.value = true;
    await Promise.all([
      store.fetchMeasurementsMeta({ meas_id: selectedMeasurementId.value }),
      store.fetchMeasurementsData({
        meas_id: selectedMeasurementId.value,
        operation_id: 0,
        ...(isProbeKind.value
          ? {}
          : { meas_date_start: selectedDate.value, meas_date_end: selectedDate.value }),
      }),
    ]);
    mapFromStore();
  } catch (e) {
    console.error('Ошибка загрузки измерений:', e);
    ElMessage.error('Не удалось загрузить данные');
  } finally {
    loading.value = false;
  }
};

const formatValue = (row: EditableRow, ind: frontend.IIndicatorSet): string => {
  const v = row.values[String(ind.id)];
  return v === null || v === undefined ? '—' : Number(v).toFixed(ind.value_precision ?? 2);
};

const mapFromStore = (): void => {
  const list = [...(store.measurements_data ?? [])];
  if (isProbeKind.value) {
    list.sort((a, b) =>
      ((a as any).operation_id - (b as any).operation_id) ||
      (((a as any).probe_num ?? 0) - ((b as any).probe_num ?? 0))
    );
  }

  rows.value = (store.measurements_data ?? []).map((r: frontend.IMeasurementsData, i: number) => ({
    rowKey: `db-${r.id}`,
    sampleId: r.id,
    measuredAt: r.measured_at,
    measuredAtFmt: r.measured_at_fmt,
    operationId: (r as any).operation_id ?? null,
    operationName: (r as any).operation ?? null,
    probeNum: (r as any).probe_num ?? null,
    values: Object.fromEntries(
      indicatorSet.value.map(ind => [String(ind.id), r.vals?.[String(ind.id)] ?? null])
    ),
  }));
};


// ---------- добавление строки ----------
let newRowSeq = 0;

const addRow = (): void => {
  if (!selectedMeasurementId.value) return;
  rows.value.push({
    rowKey: `new-${++newRowSeq}`,
    sampleId: null,
    measuredAt: null,
    measuredAtFmt: null,
    operationId: null,
    operationName: null,
    probeNum: null,
    values: Object.fromEntries(indicatorSet.value.map(ind => [String(ind.id), null])),
  });
};

// ---------- готовность строки ----------
const filledValues = (row: EditableRow): frontend.ISampleValuePayload[] =>
  indicatorSet.value
    .map(ind => ({ indicator_id: ind.id, value: row.values[String(ind.id)] }))
    .filter((v): v is frontend.ISampleValuePayload => v.value !== null && v.value !== undefined);

const isRowReady = (row: EditableRow): boolean => {
  if (row.sampleId !== null) return true;
  if (filledValues(row).length === 0) return false;
  if (isProbeKind.value) return row.operationId !== null && row.probeNum !== null;
  return !!row.measuredAt && row.operationId !== null;
};


// ---------- создание пробы, когда строка готова ----------
const fmtNowLocal = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};


const findProbeDuplicate = (row: EditableRow): EditableRow | undefined => {
  if (!isProbeKind.value || row.probeNum === null || row.operationId === null) {
    return undefined;
  }
  return rows.value.find(r =>
    r.rowKey !== row.rowKey &&
    r.operationId === row.operationId &&
    r.probeNum === row.probeNum
  );
};

const creatingRows = new WeakSet<EditableRow>(); // защита от гонки двойного create

const createRowIfReady = async (row: EditableRow): Promise<void> => {
  if (row.sampleId !== null || !isRowReady(row) || creatingRows.has(row)) return;

  const dup = findProbeDuplicate(row);
  if (dup) {
    ElMessage.warning(
      `Проба №${row.probeNum} для этой операции уже введена — откорректируйте существующую строку`
    );
    row.probeNum = null;   // строка снова «не готова», дубль не создаётся
    return;
  }

  creatingRows.add(row);
  try {
    const payload: frontend.ISamplePayload = {
      measurement_id: selectedMeasurementId.value!,
      measured_at: isProbeKind.value ? fmtNowLocal() : row.measuredAt!,
      operation_id: row.operationId!,
      values: filledValues(row),
    };

    if (isProbeKind.value) payload.probe_num = row.probeNum!;

    const res = await createSample(payload);
    row.sampleId = res.id;
    row.rowKey = `db-${res.id}`;
    somethingChanged();
  } catch (e: any) {
    console.error('Ошибка сохранения пробы:', e);
    ElMessage.error(e?.message ?? 'Не удалось сохранить пробу');
  } finally {
    creatingRows.delete(row);
  }
};


// ---------- события редактирования ----------

const onKeyChanged = async (row: EditableRow): Promise<void> => {
  if (row.sampleId === null) {
    await createRowIfReady(row);
    return;
  }
  try {
    if (isProbeKind.value) {
      if (row.operationId !== null && row.probeNum !== null) {
        const dup = findProbeDuplicate(row);
        if (dup) {
          ElMessage.warning(
            `Проба №${row.probeNum} для этой операции уже есть — откорректируйте существующую строку`
          );
          row.probeNum = null;   // в БД старый номер не тронут, вернётся при перезагрузке
          return;
        }
        await updateSample(row.sampleId, { operation_id: row.operationId, probe_num: row.probeNum });
        somethingChanged();
      }
    } else if (row.measuredAt && row.operationId !== null) {
      await updateSample(row.sampleId, { measured_at: row.measuredAt, operation_id: row.operationId });
      somethingChanged();
    }
  } catch (e: any) {
    console.error('Ошибка обновления пробы:', e);
    // уникальный ключ uq_probe: на бэкенде стоит вернуть 409 на дубликат
    ElMessage.error(
      e?.status === 409
        ? 'Проба с таким номером для этой операции уже есть'
        : 'Не удалось сохранить изменения пробы'
    );
  }
};


const onValueChanged = async (row: EditableRow, indicatorId: number): Promise<void> => {
  // 1. Новая строка: как только готова — создаём пробу со всеми введёнными значениями
  if (row.sampleId === null) {
    await createRowIfReady(row);
    return;
  }

  // 2. Сохранённая строка: правка/добавление значения — UPSERT по показателю
  try {
    const value = row.values[String(indicatorId)];
    if (value === null || value === undefined) {
      await deleteSampleValue(row.sampleId, indicatorId);
    } else {
      await upsertValue(row.sampleId, {
        indicator_id: indicatorId,
        value,
      });
    }
    somethingChanged();
  } catch (e) {
    console.error('Ошибка сохранения значения:', e);
    ElMessage.error('Не удалось сохранить значение');
  }
};


const removeRow = async (row: EditableRow): Promise<void> => {
  try {
    await ElMessageBox.confirm('Удалить измерение целиком?', 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    });
  } catch {
    return; // пользователь отменил
  }

  if (row.sampleId !== null) {
    try {
      await deleteSample(row.sampleId);
      somethingChanged();
    } catch (e) {
      console.error('Ошибка удаления:', e);
      ElMessage.error('Не удалось удалить пробу');
      return;
    }
  }
  rows.value = rows.value.filter(r => r.rowKey !== row.rowKey);
};

// ---------- навигация по дням ----------
const fmtDateLocal = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const shiftDay = (days: number): void => {
    const [y, m, d] = selectedDate.value.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    selectedDate.value = fmtDateLocal(dt);
};

const disableOtherDays = (d: Date): boolean =>
  fmtDateLocal(d) !== selectedDate.value;

// ---------- старт: только справочник измерений ----------
onMounted(async () => {
  try {
    loading.value = true;
    await store.fetchMeasurementsMeta({ meas_id: 0 });
  } catch (e) {
    console.error('Ошибка загрузки справочника:', e);
    ElMessage.error('Не удалось загрузить список измерений');
  } finally {
    loading.value = false;
  }

  // Восстановление после загрузки справочника
  measurementsStore.loadFromStorage();
  // Нет сохранённой даты — начинаем с сегодняшнего дня
  if (!measurementsStore.selectedDate) {
    measurementsStore.setSelection({ date: fmtDateLocal(new Date()) });
  }  

  // Измерение из хранилища могло исчезнуть из справочника — отбрасываем
  const restoredId = measurementsStore.selectedMeasurementId;
  if (restoredId !== null && !measurementsList.value.some(m => m.id === restoredId)) {
    measurementsStore.setSelection({ measId: null });
    measurementsStore.saveToStorage();
  }
  // При возврате через роутинг стор уже заполнен и watcher не сработает —
  // при обновлении страницы watcher сработает, но увидит тот же ключ и пропустит
  if (selectedMeasurementId.value) {
    rows.value = [];
    loadData();
  }  
});

const createSample = async (payload: frontend.ISamplePayload): Promise<frontend.ISampleCreated> => {
  return store.createMeasurementData(payload);
};

const updateSample = async (id: number, patch: frontend.ISamplePatch): Promise<void> => {
  await store.updateMeasurementData(id, patch);
};

const upsertValue = async (
  sampleId: number,
  v: { indicator_id: number; value: number },
): Promise<void> => {
  await store.upsertMeasurementValue(sampleId, v);
};

const deleteSampleValue = async (sampleId: number, indicatorId: number): Promise<void> => {
  await store.deleteMeasurementValue(sampleId, indicatorId);
};

const deleteSample = async (id: number): Promise<void> => {
  await store.deleteMeasurementData(id);
};

watch([selectedMeasurementId, selectedDate], ([measId]) => {
  measurementsStore.saveToStorage();

  if (!measId) {
    rows.value = [];
    lastLoadedKey = '';
    return;
  }
  // уже загружено при монтировании (возврат через роутинг / свежий рефреш)
  if (loadKey() === lastLoadedKey) return;
  rows.value = [];
  loadData();
});


</script>

<style scoped>
.panel-layout {
  --top-menu: 120px;        /* верхнее меню */
  --chart-h: 380px;         /* высота карточки графика */
  --row-gap: 16px;          /* совпадает с gap */

  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;

  max-width: 1440px;
  margin: 0 auto;
}

.card,
.card-side {
  height: calc(100vh - var(--top-menu) - var(--chart-h) - var(--row-gap));
  min-height: 320px;        /* чтобы на низких окнах ряд не схлопнулся */
  transition: height 0.25s ease;
}

.card {
  flex: 1 1 640px;
  min-width: 640px;
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

/* панель последних измерений */
.card-side {
  flex: 0 1 460px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
}

.card-side :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-side :deep(.el-table) {
  flex: 1;
  overflow: auto;         /* скролл внутри панели, если измерений много */
}

.card-chart {
  flex: 1 1 100%;
  height: var(--chart-h);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* тулбар */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar-measurement { width: 320px; }
.toolbar-date        { width: 140px; }

/* таблица забирает всё место под тулбаром */
.table-container {
  flex: 1;
  min-height: 0;
}

/* выравнивание внутри el-input-number — только через :deep, инлайном не достать */
:deep(.el-input-number .el-input__inner) {
  text-align: right;
}

.card-chart :deep(.el-card__body){
  flex: 1 1 100%;      /* график всегда занимает весь ряд */
  height: 380px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.cell-value {
  display: block;
  text-align: right;
  width: 100%;
}

.panel-layout.chart-collapsed .card,
.panel-layout.chart-collapsed .card-side {
  height: calc(100vh - var(--top-menu));
}

.panel-layout.chart-collapsed .card-chart {
  display: none;
}

.toolbar .btn-toggle-chart {
  margin-left: auto;
}

</style>
