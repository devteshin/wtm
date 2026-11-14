import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'measurementsChartState'

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

const isPeriod = (v: unknown): v is [string, string] =>
  Array.isArray(v) && v.length === 2 && isIsoDate(v[0]) && isIsoDate(v[1])

export const useMeasurementsChartStore = defineStore('measurementsChart', () => {
  const selectedMeasurementId = ref<number | null>(null)
  const selectedOperationId = ref<number | null>(null)
  const selectedMaterialId = ref<number | null>(null)
  const period = ref<[string, string] | null>(null)

  const setSelection = (payload: {
    measId?: number | null
    opId?: number | null
    materialId?: number | null
    period?: [string, string] | null
  }) => {
    if (payload.measId !== undefined && payload.measId !== selectedMeasurementId.value) {
      // материал принадлежит probe-режиму измерения — при смене измерения он теряет смысл
      selectedMaterialId.value = null
      selectedOperationId.value = null
    } else {
      if (payload.opId !== undefined) selectedOperationId.value = payload.opId
      if (payload.materialId !== undefined) selectedMaterialId.value = payload.materialId
    }

    if (payload.measId !== undefined) selectedMeasurementId.value = payload.measId
    if (payload.period !== undefined) period.value = payload.period
  }

  const reset = (): void => {
    selectedMeasurementId.value = null
    selectedOperationId.value = null
    selectedMaterialId.value = null
    period.value = null
    saveToStorage()
  }

  const loadFromStorage = (): void => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const data = JSON.parse(saved)

      if (data.selectedMeasurementId === null || Number.isFinite(data.selectedMeasurementId)) {
        selectedMeasurementId.value = data.selectedMeasurementId
      }
      if (data.selectedOperationId === null || Number.isFinite(data.selectedOperationId)) {
        selectedOperationId.value = data.selectedOperationId
      }
      if (data.selectedMaterialId === null || Number.isFinite(data.selectedMaterialId)) {
        selectedMaterialId.value = data.selectedMaterialId
      }
      if (isPeriod(data.period) || data.period === null) {
        period.value = data.period
      }
    } catch (error) {
      console.error('Ошибка загрузки состояния графика:', error)
    }
  }

  const saveToStorage = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedMeasurementId: selectedMeasurementId.value,
        selectedOperationId: selectedOperationId.value,
        selectedMaterialId: selectedMaterialId.value,
        period: period.value,
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.error('Ошибка сохранения состояния графика:', error)
    }
  }

  return {
    selectedMeasurementId,
    selectedOperationId,
    selectedMaterialId,
    period,
    setSelection,
    reset,
    loadFromStorage,
    saveToStorage,
  }
})
