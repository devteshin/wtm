// stores/useProductionReportStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProductionReportStore = defineStore('productionReport', () => {
  const selectedStore = ref<number[]>([])
  const selectedMaterial = ref<number[]>([])
  const selectedProduct = ref<number[]>([])
  const selectedProcess = ref<number[]>([])
  const selectedOperiation = ref<number[]>([])

  // Действия
  const setFilters = (filters: Partial<{
    selectedStore: number[]
    selectedMaterial: number[]
    selectedProduct: number[]
    selectedProcess: number[]
    selectedOperation: number[]
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
    if (filters.selectedProcess !== undefined) {
      selectedProcess.value = filters.selectedProcess
    }
    if (filters.selectedOperation !== undefined) {
      selectedOperiation.value = filters.selectedOperation
    }
  }

  const resetFilters = () => {
    selectedStore.value = []
    selectedMaterial.value = []
    selectedProduct.value = []
    selectedProcess.value = []
    selectedOperiation.value = []
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('reportProductionFiltersState')
      if (saved) {
        const data = JSON.parse(saved)
        setFilters({
          selectedStore: data.selectedStore || [],
          selectedMaterial: data.selectedMaterial || [],
          selectedProduct: data.selectedProduct || [],
          selectedProcess: data.selectedProcess || [],
          selectedOperation: data.selectedOperation || [],
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
      selectedProcess: selectedProcess.value,
      selectedOperiation: selectedOperiation.value,
      timestamp: Date.now()
    }
    localStorage.setItem('reportProductionFiltersState', JSON.stringify(stateToSave))
  }

  return {
    // Экспортируем реактивные переменные
    selectedStore,
    selectedMaterial,
    selectedProduct,
    selectedProcess,
    selectedOperiation,

    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage
  }
})
