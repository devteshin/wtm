<template>
  <div class="panel-layout">
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
  
        <el-button type="primary" :disabled="!selectedMeasurementId" @click="loadData">Заполнить</el-button>
        <el-button :disabled="!selectedMeasurementId" @click="addRow">Добавить строку</el-button>
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
                v-model="row.measuredAt"
                type="datetime"
                :clearable="false"
                format="DD.MM.YYYY HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="disableOtherDays"
                style="width: 100%"
                @change="onKeyChanged(row as EditableRow)"
              />
            </template>
          </el-table-column>
    
          <el-table-column label="Операция" min-width="200">
            <template #default="{ row }">
              <el-select
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
                v-model="row.values[String(ind.id)]"
                :controls="false"
                :precision="ind.value_precision ?? 2"
                :min="ind.min_value ?? 0"
                :max="ind.max_value ?? 100"
                style="width: 100%; text-align: right"
                @change="onValueChanged(row as EditableRow, ind.id)"
              />
            </template>
          </el-table-column>
    
          <el-table-column label="" width="60" align="center">
            <template #default="{ row }">
              <el-tooltip content="Удалить" placement="top">
                <el-button :icon="Delete" circle type="danger" plain
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
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue';
import MeasurementsLastPanel from './MeasurementsLastPanel.vue'
import MeasurementChartPanel from './MeasurementChartPanel.vue'
import useApplicationStore from '@/store';

const store = useApplicationStore();

const lastPanel = ref<InstanceType<typeof MeasurementsLastPanel>>();

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
const selectedMeasurementId = ref<number | null>(null);

const loading = ref(false);

type EditableRow = {
  rowKey: string;
  sampleId: number | null;      // id пробы (measurement_data), null — ещё не сохранена
  measuredAt: string | null;
  operationId: number | null;
  values: Record<string, number | null>;   // indicator_id → значение
};

const rows = ref<EditableRow[]>([]);

// ---------- загрузка ----------
const loadData = async (): Promise<void> => {
  if (!selectedMeasurementId.value || !selectedDate.value) return;
  try {
    loading.value = true;
    await Promise.all([
      store.fetchMeasurementsMeta({ meas_id: selectedMeasurementId.value }),
      store.fetchMeasurementsData({
        meas_id: selectedMeasurementId.value,
        operation_id: 0,
        meas_date_start: selectedDate.value,
        meas_date_end: selectedDate.value,
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

const mapFromStore = (): void => {
  rows.value = (store.measurements_data ?? []).map((r: frontend.IMeasurementsData, i: number) => ({
    rowKey: `db-${r.id}`,
    sampleId: r.id,
    measuredAt: r.measured_at,
    operationId: (r as any).operation_id ?? null,
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
    operationId: null,
    values: Object.fromEntries(indicatorSet.value.map(ind => [String(ind.id), null])),
  });
};

// ---------- готовность строки ----------
const filledValues = (row: EditableRow): frontend.ISampleValuePayload[] =>
  indicatorSet.value
    .map(ind => ({ indicator_id: ind.id, value: row.values[String(ind.id)] }))
    .filter((v): v is frontend.ISampleValuePayload => v.value !== null && v.value !== undefined);

const isRowReady = (row: EditableRow): boolean =>
  row.sampleId !== null ||
  (!!row.measuredAt && row.operationId !== null && filledValues(row).length > 0);

// ---------- события редактирования ----------
const onKeyChanged = async (row: EditableRow): Promise<void> => {
  // время/операция у сохранённой пробы — обновляем пробу целиком
  if (row.sampleId !== null && row.measuredAt && row.operationId !== null) {
    try {
      await updateSample(row.sampleId, {
        measured_at: row.measuredAt,
        operation_id: row.operationId,
      });
      somethingChanged();
    } catch (e) {
      console.error('Ошибка обновления пробы:', e);
      ElMessage.error('Не удалось сохранить время/операцию');
    }
  }
};

const onValueChanged = async (row: EditableRow, indicatorId: number): Promise<void> => {
  // 1. Новая строка: как только готова — сохраняем пробу с имеющимися значениями
  if (row.sampleId === null) {
    if (isRowReady(row)) {
      try {
        const res = await createSample({
          measurement_id: selectedMeasurementId.value!,
          measured_at: row.measuredAt!,
          operation_id: row.operationId!,
          values: filledValues(row),
        });
        row.sampleId = res.id;
        row.rowKey = `db-${res.id}`;   // ключ перевыпускается, больше не «new-*»
        somethingChanged();
      } catch (e: any) {
        console.error('Ошибка сохранения пробы:', e);
        ElMessage.error(e?.message ?? 'Не удалось сохранить пробу');
      }
    }
    return;
  }

  // 2. Сохранённая строка: правка/добавление значения — UPSERT по показателю
  try {
    const value = row.values[String(indicatorId)];
    if (value === null || value === undefined) {
      await deleteSampleValue(row.sampleId, indicatorId);   // стёрли поле — запись значения удаляем
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

const selectedDate = ref<string>(fmtDateLocal(new Date()));

const shiftDay = (days: number): void => {
  const [y, m, d] = selectedDate.value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  selectedDate.value = fmtDateLocal(dt);
  void loadData();
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

.card-chart {
  flex: 1 1 100%;      /* график всегда занимает весь ряд */
  height: 380px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.card-chart :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

</style>
