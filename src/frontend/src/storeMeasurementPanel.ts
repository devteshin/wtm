import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'measurementsPanelState'

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export const useMeasurementsPanelStore = defineStore('measurementsPanel', () => {
  const selectedMeasurementId = ref<number | null>(null)
  const selectedMaterialId = ref<number | null>(null)
  const selectedDate = ref<string>('')          // 'YYYY-MM-DD', '' — не выбрана
  const chartCollapsed = ref(false)             // свёрнут ли график

  const setSelection = (payload: {
    measId?: number | null
    materialId?: number | null
    date?: string
  }) => {
    if (payload.measId !== undefined && payload.measId !== selectedMeasurementId.value) {
      // материал принадлежит probe-режиму измерения — при смене измерения он теряет смысл
      selectedMaterialId.value = null
    } else {
      if (payload.materialId !== undefined) selectedMaterialId.value = payload.materialId
    }
    if (payload.measId !== undefined) selectedMeasurementId.value = payload.measId
    if (payload.date !== undefined) selectedDate.value = payload.date
    saveToStorage()
  }


  const setChartCollapsed = (v: boolean): void => {
    chartCollapsed.value = v
    saveToStorage()
  }

  const reset = (): void => {
    selectedMeasurementId.value = null
    selectedMaterialId.value = null
    selectedDate.value = ''
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
      if (data.selectedMaterialId === null || Number.isFinite(data.selectedMaterialId)) {
        selectedMaterialId.value = data.selectedMaterialId
      }
      if (isIsoDate(data.selectedDate)) {
        selectedDate.value = data.selectedDate
      }
      if (typeof data.chartCollapsed === 'boolean') {
        chartCollapsed.value = data.chartCollapsed
      }
    } catch (error) {
      console.error('Ошибка загрузки состояния панели измерений:', error)
    }
  }

  const saveToStorage = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedMeasurementId: selectedMeasurementId.value,
        selectedMaterialId: selectedMaterialId.value,
        selectedDate: selectedDate.value,
        chartCollapsed: chartCollapsed.value,
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.error('Ошибка сохранения состояния панели измерений:', error)
    }
  }

  return {
    selectedMeasurementId,
    selectedMaterialId,
    selectedDate,
    chartCollapsed,
    setSelection,
    setChartCollapsed,
    reset,
    loadFromStorage,
    saveToStorage,
  }
})
