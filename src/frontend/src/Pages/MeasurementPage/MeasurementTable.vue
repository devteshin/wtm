<template>
  <div class="measurement-table">
    <div class="toolbar">
      <!-- managed: заголовок-строка вместо «неактивных заголовков» -->
      <div v-if="isManaged" class="managed-caption">
        <span class="managed-title">
          {{ measurementName || `Измерение #${activeMeasurementId}` }}
        </span>
        <span v-if="isProbeKind" class="managed-sub">
          {{ materialName || `Материал #${activeMaterialId}` }}
        </span>
        <span v-else class="managed-sub">{{ managedDateLabel }}</span>
      </div>

      <!-- uncontrolled: обычный рабочий тулбар -->
      <template v-else>
        <el-select v-model="measurementModel" class="toolbar-measurement"
                  placeholder="Измерение" filterable>
          <el-option v-for="m in measurementsList" :key="m.id" :label="m.name" :value="m.id" />
        </el-select>

        <el-select v-if="isProbeKind" v-model="materialModel" class="toolbar-material"
                  placeholder="Материал" filterable>
          <el-option v-for="mat in materialOptions" :key="mat.id" :label="mat.name" :value="mat.id" />
        </el-select>

        <template v-if="!isProbeKind">
          <el-button :icon="ArrowLeft" circle @click="shiftDay(-1)" />
          <el-date-picker v-model="dateModel" class="toolbar-date" type="date"
            :clearable="false" format="DD.MM.YYYY" value-format="YYYY-MM-DD" />
          <el-button :icon="ArrowRight" circle @click="shiftDay(1)" />
        </template>

        <el-button type="primary" :disabled="!canLoad" @click="loadData">Заполнить</el-button>
        <el-button v-if="canEdit" :disabled="!canLoad" @click="addRow">Добавить строку</el-button>
      </template>
    </div>

    <!-- Таблица: в managed-режиме всегда рендерится, пока идёт загрузка — показывается v-loading -->
    <div class="table-container" v-if="activeMeasurementId">
      <el-table
        ref="tableRef"
        :data="rows"
        highlight-current-row
        v-loading="loading"
        row-key="rowKey"
        height="100%"
        scrollbar-always-on
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

        <el-table-column v-if="!isProbeKind" label="Операция" min-width="200">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox, TableInstance } from 'element-plus';
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import useApplicationStore from '@/store';
import { useMeasurementsTableStore } from '@/storeMeasurementTable.js';

const props = withDefaults(
  defineProps<{
    editable?: boolean;
    /** Managed-режим: наличие measurementId переводит компонент в управляемый режим */
    measurementId?: number | null;
    /** Managed-режим: день ('YYYY-MM-DD') */
    date?: string | null;
    /** Managed-режим: материал для probe-измерений */
    materialId?: number | null;
    /** Managed-режим: фильтр по операции для time-измерений; не передан — фильтрации нет */
    operationId?: number | null;
    /** Managed-режим: имена для «заголовков»-селектов */
    measurementName?: string;
    materialName?: string;
    measureKind?: 1 | 2;
    meta?: frontend.IMeasurementsMeta | null;
  }>(),
  {
    editable: true,
    measurementId: undefined,
    date: undefined,
    materialId: undefined,
    operationId: undefined,
    measurementName: '',
    materialName: '',
  },
);

const emit = defineEmits<{
  (e: 'changed'): void;         // что-то сохранилось/удалилось — родитель обновляет панель последних
  (e: 'loaded', rowCount: number): void;
}>();

/** Managed-режим: выбором управляет родитель через пропсы */
const isManaged = computed(() => props.measurementId !== undefined);

const managedDateLabel = computed<string>(() => {
  const [y, m, d] = (activeDate.value ?? '').split('-');
  return d && m && y ? `${d}.${m}.${y}` : '';
});

const tableStore = useMeasurementsTableStore();
const { selectedMeasurementId, selectedMaterialId, selectedDate } = storeToRefs(tableStore);

const store = useApplicationStore();

const tableRef = ref<TableInstance>();
const canEdit = computed(() => props.editable);

// ---------- двусторонние модели для тулбара ----------
const measurementModel = computed<number | null>({
  get: () => activeMeasurementId.value,
  set: (id) => {
    if (isManaged.value || id === null) return;
    tableStore.setSelection({ measId: id, materialId: null }); // материал сбрасываем: мета у каждого измерения своя
  },
});

const materialModel = computed<number | null>({
  get: () => activeMaterialId.value,
  set: (id) => {
    if (isManaged.value) return;
    tableStore.setSelection({ materialId: id });
  },
});

const dateModel = computed<string | null>({
  get: () => activeDate.value,
  set: (d) => {
    if (isManaged.value || d === null) return;
    tableStore.setSelection({ date: d });
  },
});



// ---------- активные значения (пропсы в managed, стор в uncontrolled) ----------
const activeMeasurementId = computed<number | null>(() =>
  isManaged.value ? props.measurementId! : selectedMeasurementId.value);
const activeDate = computed<string | null>(() =>
  isManaged.value ? (props.date ?? null) : selectedDate.value);
const activeMaterialId = computed<number | null>(() =>
  isManaged.value ? (props.materialId ?? null) : selectedMaterialId.value);
const activeOperationId = computed<number | null>(() =>
  isManaged.value ? (props.operationId ?? null) : null);

const canLoad = computed(() =>
  !!activeMeasurementId.value &&
  (isProbeKind.value
    ? activeMaterialId.value !== null
    : !!activeDate.value)
);

// мета для активного измерения подтверждена? (uncontrolled: меты из слота; managed: всегда да)
const metaReady = computed(() =>
  isManaged.value ? true : selectedMeasurement.value !== null);

const somethingChanged = (): void => {
  emit('changed');
};

// ---------- справочники из meta ----------
// В managed-режиме мета держится локально: N карточек с разными измерениями
// иначе затирали бы друг другу store.measurements_meta
const localMeta = ref<frontend.IMeasurementsMeta | null>(null);
const meta = computed<frontend.IMeasurementsMeta | null>(() =>
  isManaged.value
    ? (props.meta ?? localMeta.value)
    : store.measurements_meta ?? null);

type MeasurementOption = frontend.IMeasurementsMeta['measurement_list'][number];

const measurementsList = computed<MeasurementOption[]>(() =>
  isManaged.value
    ? (activeMeasurementId.value !== null
        ? [{
            id: activeMeasurementId.value,
            name: props.measurementName || `Измерение #${activeMeasurementId.value}`,
            // до загрузки мета kind неизвестен: по умолчанию считаем time-режимом (1),
            // после прихода мета selectedMeasurement возьмёт реальное значение
            measure_kind: props.measureKind ?? 1,
          }]
        : [])
    : (meta.value?.measurement_list ?? []));
    
const materialOptions = computed(() =>
  isManaged.value
    ? (activeMaterialId.value !== null
        ? [{
            id: activeMaterialId.value,
            name: props.materialName || `Материал #${activeMaterialId.value}`,
          }]
        : [])
    : (meta.value?.material_list ?? []));

const operationsList = computed(() => meta.value?.operation_list ?? []);
const indicatorSet = computed(() =>
  (meta.value?.indicator_set_list ?? [])
    .slice()
    .sort((a, b) => a.order_num - b.order_num)   // по возрастанию order_num
);

const columnLabel = (ind: frontend.IIndicatorSet): string =>
  `${ind.code}, ${ind.measurement_unit}`;

// ---------- состояние ----------
const selectedMeasurement = computed(() =>
  measurementsList.value.find(m => m.id === activeMeasurementId.value) ?? null
);


// 1 = по времени, 2 = по пробам
const isProbeKind = computed(() => selectedMeasurement.value?.measure_kind === 2);

const loading = ref(false);

type EditableRow = {
  rowKey: string;
  sampleId: number | null;      // id пробы (measurement_data), null — ещё не сохранена
  probeNum: number | null;      // для измерений по пробам
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
    ? `probe:${activeMeasurementId.value}:${activeMaterialId.value ?? '-'}`
    : `time:${activeMeasurementId.value}:${activeDate.value}:${activeOperationId.value ?? '-'}`;


// ---------- загрузка ----------
const loadData = async (): Promise<void> => {
  if (!activeMeasurementId.value) return;

  const measId = activeMeasurementId.value;
  const metaPromise = store.fetchMeasurementsMeta({ meas_id: measId })
    .catch(e => {
      console.error('Ошибка загрузки справочника измерения:', e);
      return null;
    });

  if (isProbeKind.value) {
    if (activeMaterialId.value === null) {
      await metaPromise;   // данные подтянутся после выбора материала
      return;
    }
    const materialId = activeMaterialId.value;
    await runLoad(measId, { meas_id: measId, material_id: materialId });
    return;
  }

  if (!activeDate.value) return;
  const date = activeDate.value;   // теперь string
  const params: frontend.IMeasurementsQueryParams = {
    meas_id: measId,
    meas_date_start: date,
    meas_date_end: date,
    ...(activeOperationId.value !== null
      ? { operation_id: activeOperationId.value }
      : {}),
  };
  await runLoad(measId, params);
};

const runLoad = async (
  measId: number,
  params: frontend.IMeasurementsQueryParams,
): Promise<void> => {
  lastLoadedKey = loadKey();
  try {
    loading.value = true;
    const [metaRes, dataRes] = await Promise.all([
      props.meta
        ? Promise.resolve(props.meta)                 // мета уже у родителя — не дублируем
        : store.fetchMeasurementsMeta({ meas_id: measId }),
      store.fetchMeasurementsData(params),
    ]);
    if (isManaged.value && !props.meta) localMeta.value = metaRes ?? null;
    if (loadKey() !== lastLoadedKey) return;
    mapFromRows(dataRes ?? []);
    emit('loaded', rows.value.length);
  } catch (e) {
    console.error('Ошибка загрузки измерений:', e);
    rows.value = [];
    ElMessage.error('Не удалось загрузить данные');
  } finally {
    loading.value = false;
  }
};

const mapFromRows = (list: frontend.IMeasurementsData[]): void => {
  const sorted = [...list];
  if (isProbeKind.value) {
    sorted.sort((a, b) => (((a as any).probe_num ?? 0) - ((b as any).probe_num ?? 0)));
  }

  rows.value = sorted.map((r: frontend.IMeasurementsData) => ({
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

const formatValue = (row: EditableRow, ind: frontend.IIndicatorSet): string => {
  const v = row.values[String(ind.id)];
  return v === null || v === undefined ? '—' : Number(v).toFixed(ind.value_precision ?? 2);
};

// ---------- добавление строки (только uncontrolled) ----------
let newRowSeq = 0;

const addRow = async (): Promise<void> => {
  if (isManaged.value || !metaReady.value) return;
  if (!activeMeasurementId.value) return;
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

  await nextTick();

  const last = rows.value[rows.value.length - 1];
  if (!last) return;

  // подсветка + фокус: строка становится current-row
  tableRef.value?.setCurrentRow(last);

  // докрутить контейнер таблицы к строке
  const tableEl = tableRef.value?.$el as HTMLElement | undefined;
  const tr = tableEl?.querySelector('.el-table__body tbody tr:last-child');
  tr?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};


// ---------- готовность строки ----------
const filledValues = (row: EditableRow): frontend.ISampleValuePayload[] =>
  indicatorSet.value
    .map(ind => ({ indicator_id: ind.id, value: row.values[String(ind.id)] }))
    .filter((v): v is frontend.ISampleValuePayload => v.value !== null && v.value !== undefined);

const isRowReady = (row: EditableRow): boolean => {
  if (row.sampleId !== null) return true;
  if (filledValues(row).length === 0) return false;
  if (isProbeKind.value) return row.probeNum !== null && activeMaterialId.value !== null;
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
  if (!isProbeKind.value || row.probeNum === null || activeMaterialId.value === null) {
    return undefined;
  }
  return rows.value.find(r =>
    r.rowKey !== row.rowKey &&
    r.sampleId !== null &&                       // учитываем только сохранённые строки
    r.probeNum === row.probeNum
  );
};

const creatingRows = new WeakSet<EditableRow>(); // защита от гонки двойного create

const createRowIfReady = async (row: EditableRow): Promise<void> => {
  if (isManaged.value) return;
  if (!metaReady.value || row.sampleId !== null || !isRowReady(row) || creatingRows.has(row)) return;

  const dup = findProbeDuplicate(row);
  if (dup) {
    ElMessage.warning(
      `Проба №${row.probeNum} для этого материала уже введена — откорректируйте существующую строку`
    );
    row.probeNum = null;   // строка снова «не готова», дубль не создаётся
    return;
  }

  creatingRows.add(row);
  try {
    if (isProbeKind.value) {
      const matOk = materialOptions.value.some(m => m.id === activeMaterialId.value);
      if (!matOk) {
        ElMessage.warning('Выбранный материал не относится к этому измерению');
        return;   // без создания; finally ниже снимет creatingRows
      }
    } else {
      const opOk = operationsList.value.some(op => op.id === row.operationId);
      if (!opOk) {
        ElMessage.warning('Выбранная операция не относится к этому измерению');
        return;
      }
    }    
    const payload: frontend.ISamplePayload = {
      measurement_id: activeMeasurementId.value!,
      measured_at: isProbeKind.value ? fmtNowLocal() : row.measuredAt!,
      values: filledValues(row),
    };

    if (isProbeKind.value) {
      payload.material_id = activeMaterialId.value!;
      payload.probe_num = row.probeNum!;
    } else {
      payload.operation_id = row.operationId!;
    }

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
      if (row.probeNum !== null) {
        const dup = findProbeDuplicate(row);
        if (dup) {
          ElMessage.warning(
            `Проба №${row.probeNum} для этого материала уже есть — откорректируйте существующую строку`
          );
          row.probeNum = null;
          return;
        }
        await updateSample(row.sampleId, { probe_num: row.probeNum });
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

// ---------- навигация по дням (только uncontrolled) ----------
const fmtDateLocal = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const shiftDay = (days: number): void => {
  if (isManaged.value) return;
  const [y, m, d] = (activeDate.value ?? '').split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  selectedDate.value = fmtDateLocal(dt);
};

const disableOtherDays = (d: Date): boolean =>
  fmtDateLocal(d) !== activeDate.value;

// true, пока идёт восстановление состояния из storage — watch в это время молчит
let hydrating = true;

// ---------- старт ----------
onMounted(async () => {
  if (isManaged.value) {
    hydrating = false;
    await loadData();   // managed: родитель уже всё знает — сразу грузим
    return;
  }

  try {
    loading.value = true;
    await store.fetchMeasurementsMeta({ meas_id: 0 });   // measurement_list для селектора
  } catch (e) {
    console.error('Ошибка загрузки справочника:', e);
    ElMessage.error('Не удалось загрузить список измерений');
  } finally {
    loading.value = false;
  }

  tableStore.loadFromStorage();

  if (!tableStore.selectedDate) {
    tableStore.setSelection({ date: fmtDateLocal(new Date()) });
  }

  // Измерение из хранилища могло исчезнуть из справочника — отбрасываем
  const restoredId = tableStore.selectedMeasurementId;
  if (restoredId !== null && !measurementsList.value.some(m => m.id === restoredId)) {
    tableStore.setSelection({ measId: null });
    tableStore.saveToStorage();
  }

  if (selectedMeasurementId.value) {
    try {
      // мета конкретного измерения — единственный источник material_list
      await store.fetchMeasurementsMeta({ meas_id: selectedMeasurementId.value });
    } catch (e) {
      console.error('Ошибка загрузки справочника измерения:', e);
    }

    // материал валидируем только теперь — список заполнен детерминированно
    const restoredMaterialId = tableStore.selectedMaterialId;
    if (restoredMaterialId !== null &&
        !materialOptions.value.some(m => m.id === restoredMaterialId)) {
      tableStore.setSelection({ materialId: null });
      tableStore.saveToStorage();
    }

    await loadData();
  }

  hydrating = false;
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

// parent вызывает через ref: "обновить все карточки"
defineExpose({ reload: loadData });

// managed: следим за пропсами родителя
watch(
  () => [props.measurementId, props.date, props.materialId, props.operationId] as const,
  () => {
    if (!isManaged.value) return;
    if (loadKey() === lastLoadedKey) return;
    rows.value = [];
    loadData();
  },
);

// managed: вид измерения проявился из мета после загрузки — перезагружаем данные
watch(isProbeKind, () => {
  rows.value = [];
  lastLoadedKey = '';
  if (isManaged.value) {
    loadData();
    return;
  }
  if (isProbeKind.value) {
    loadData();   // материал не выбран — runLoad вернётся рано, таблица ждёт выбора
  }
  // время-режим: главный watch на стор уже перезагрузил по дате
});

// uncontrolled: следим за стором, как раньше
watch(
  [selectedMeasurementId, selectedDate, selectedMaterialId],
  ([measId]) => {
    if (isManaged.value || hydrating) return;
    tableStore.saveToStorage();

    if (!measId) {
      rows.value = [];
      lastLoadedKey = '';
      return;
    }
    if (loadKey() === lastLoadedKey) return;
    rows.value = [];
    loadData();
  },
);

// мета приехала/сменилась: валидируем материал, чистим строки с чужим контекстом
watch(materialOptions, (opts) => {
  if (isManaged.value || hydrating) return;
  const id = tableStore.selectedMaterialId;
  if (id !== null && !opts.some(m => m.id === id)) {
    rows.value = [];
    tableStore.setSelection({ materialId: null });
    tableStore.saveToStorage();
  }
});


</script>

<style scoped>
.measurement-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
.toolbar-material    { width: 220px; }

/* таблица забирает всё место под тулбаром */
.table-container {
  flex: 1;
  min-height: 0;
}

/* токены темы для таблицы: сетка мягче дефолтной, шапка — подложка из токенов */
:deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
  --el-table-header-bg-color: var(--el-fill-color-light);
  --el-table-header-text-color: var(--el-text-color-primary);

  /* высоты полей в ячейках — только через переменную */
  --el-input-height: 36px;
}

:deep(.el-table .el-table__cell) { padding: 4px 8px; }

/* эталон borderless-полей в ячейках: текст без рамки, рамка — на hover/focus */
:deep(.el-table .el-input__inner) {
  font-size: 18px;
  font-weight: 500;
}
:deep(.el-table .el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}
:deep(.el-table .el-input:not(.is-disabled) .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  background: #fff;
}
:deep(.el-table .el-input:not(.is-disabled) .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
  background: #fff;
}

:deep(.el-table .el-select__wrapper) {
  box-shadow: none;
  background: transparent;
  min-height: var(--el-input-height, 36px);   /* не хардкодить высоту */
}
:deep(.el-table .el-select__wrapper.is-hovering:not(.is-disabled)) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  background: #fff;
}
:deep(.el-table .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
  background: #fff;
}

/* выравнивание внутри el-input-number — только через :deep, инлайном не достать */
:deep(.el-input-number .el-input__inner) {
  text-align: right;
}

.cell-value {
  display: block;
  text-align: right;
  width: 100%;
}

.managed-caption {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}
.managed-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.managed-sub {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  white-space: nowrap;
}

/* адаптив высот полей — через переменную, без дублей базы */
@media (max-width: 1024px) {
  :deep(.el-table) { --el-input-height: 40px; }
}
@media (max-width: 480px) {
  :deep(.el-table) { --el-input-height: 32px; }
  :deep(.el-table .el-input__inner) { font-size: 16px; }
}
</style>
