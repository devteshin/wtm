import { defineStore } from 'pinia';
import { ref } from 'vue';
import useApplicationStore from '@/store';


const STORAGE_KEY = 'measurementsMulti';

const fmtToday = (): string => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const useMeasurementsMultiStore = defineStore('measurementsMulti', () => {
    const appStore = useApplicationStore();
    const api = appStore.api;
    const processing_schemes = ref<frontend.IProcessingScheme[]>([]);
    const scheme_measurements = ref<frontend.IProcessingSchemeMeasurement[]>([]);
    const metas = ref<Record<number, frontend.IMeasurementsMeta>>({});

    const selectedSchemeId = ref<number | null>(null);
    const selectedDate = ref<string>(fmtToday());
    const loading = ref(false);

    const fetchProcessingSchemes = (): Promise<frontend.IProcessingScheme[]> => {
        return api.fetchProcessingSchemes().then(body => processing_schemes.value = body);
    };

    // бэкенд отдаёт {"measurement": [...]}; fallback на голый массив — если разворачивание
    // уже живёт в api-слое, убери эту «или»-логику и зафиксируй контракт
    const fetchSchemeMeasurements = (schemeId: number): Promise<frontend.IProcessingSchemeMeasurement[]> => {
        return api.fetchProcessingSchemeMeasurements(schemeId)
            .then((body) => scheme_measurements.value = body);
    };

    const setSelection = (patch: { schemeId?: number | null; date?: string }): void => {
        if (patch.schemeId !== undefined) selectedSchemeId.value = patch.schemeId;
        if (patch.date !== undefined) selectedDate.value = patch.date;
        saveToStorage();
    };

    const saveToStorage = (): void => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            schemeId: selectedSchemeId.value,
            date: selectedDate.value,
        }));
    };

    const loadFromStorage = (): void => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved.schemeId != null) selectedSchemeId.value = saved.schemeId;
            if (saved.date) selectedDate.value = saved.date;
        } catch {
            /* повреждённый JSON — начинаем с дефолтов */
        }
    };

    return {
        processing_schemes, scheme_measurements, metas,
        selectedSchemeId, selectedDate, loading,
        fetchProcessingSchemes, fetchSchemeMeasurements,
        setSelection, saveToStorage, loadFromStorage,
    };
});
