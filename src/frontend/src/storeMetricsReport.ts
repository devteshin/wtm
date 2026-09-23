// stores/useMetricsReportStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MetricType } from '@/components/metricsConfig'

export const useMetricsReportStore = defineStore('metricsReport', () => {
  const selectedStore = ref<number[]>([])
  const selectedMaterial = ref<number[]>([])
  const selectedProduct = ref<number[]>([])
  const selectedSupplier = ref<number[]>([])
  const selectedProcess = ref<number[]>([])
  const selectedOperation = ref<number[]>([])
  const selectedSchema = ref<number[]>([])
  const selectedDate = ref<string | null>(null)
  const selectedPeriod = ref<[string, string] | null>(null)
  const selectedMetricType = ref<MetricType>('storage_lifetime')

  // Действия
  const setFilters = (filters: Partial<{
    selectedStore: number[]
    selectedMaterial: number[]
    selectedProduct: number[]
    selectedSupplier: number[]
    selectedProcess: number[]
    selectedOperation: number[]
    selectedSchema: number[]
    selectedDate: string | null
    selectedPeriod: [string, string] | null
    selectedMetricType: MetricType
  }>) => {
    if (filters.selectedStore !== undefined) {
      selectedStore.value = filters.selectedStore
    }
    if (filters.selectedMaterial !== undefined) {
      selectedMaterial.value = filters.selectedMaterial
    }
    if (filters.selectedProduct !== undefined) {
      selectedProduct.value = filters.selectedProduct
    }
    if (filters.selectedSupplier !== undefined) {
      selectedSupplier.value = filters.selectedSupplier
    }
    if (filters.selectedProcess !== undefined) {
      selectedProcess.value = filters.selectedProcess
    }
    if (filters.selectedOperation !== undefined) {
      selectedOperation.value = filters.selectedOperation
    }
    if (filters.selectedSchema !== undefined) {
      selectedSchema.value = filters.selectedSchema
    }
    if (filters.selectedDate !== undefined) {
      selectedDate.value = filters.selectedDate
    }
    if (filters.selectedPeriod !== undefined) {
      selectedPeriod.value = filters.selectedPeriod
    }
    if (filters.selectedMetricType !== undefined) {
      selectedMetricType.value = filters.selectedMetricType
    }
  }

  const resetFilters = () => {
    selectedStore.value = []
    selectedMaterial.value = []
    selectedProduct.value = []
    selectedSupplier.value = []
    selectedProcess.value = []
    selectedOperation.value = []
    selectedSchema.value = []
    selectedDate.value = null
    selectedPeriod.value = null
    selectedMetricType.value = 'storage_lifetime'
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('reportMetricsFiltersState')
      if (saved) {
        const data = JSON.parse(saved)
        setFilters({
          selectedStore: data.selectedStore || [],
          selectedMaterial: data.selectedMaterial || [],
          selectedProduct: data.selectedProduct || [],
          selectedSupplier: data.selectedSupplier || [],
          selectedProcess: data.selectedProcess || [],
          selectedOperation: data.selectedOperation || [],
          selectedSchema: data.selectedSchema || [],
          selectedDate: data.selectedDate || null,
          selectedPeriod: data.selectedPeriod || null,
          selectedMetricType: data.selectedMetricType || 'storage_lifetime',
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки из LocalStorage:', error)
    }
  }

  const saveToStorage = () => {
    const stateToSave = {
      selectedStore: selectedStore.value,
      selectedMaterial: selectedMaterial.value,
      selectedProduct: selectedProduct.value,
      selectedSupplier: selectedSupplier.value,
      selectedProcess: selectedProcess.value,
      selectedOperation: selectedOperation.value,
      selectedSchema: selectedSchema.value,
      selectedDate: selectedDate.value,
      selectedPeriod: selectedPeriod.value,
      selectedMetricType: selectedMetricType.value,
      timestamp: Date.now()
    }
    localStorage.setItem('reportMetricsFiltersState', JSON.stringify(stateToSave))
  }

  return {
    // Экспортируем реактивные переменные
    selectedStore,
    selectedMaterial,
    selectedProduct,
    selectedSupplier,
    selectedProcess,
    selectedOperation,
    selectedSchema,
    selectedDate,
    selectedPeriod,
    selectedMetricType,  

    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage
  }
})
