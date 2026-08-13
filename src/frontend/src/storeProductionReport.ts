// stores/useProductionReportStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProductionReportStore = defineStore('productionReport', () => {
  const selectedStore = ref<number[]>([])
  const selectedMaterial = ref<number[]>([])
  const selectedProduct = ref<number[]>([])

  // Действия
  const setFilters = (filters: Partial<{
    selectedStore: number[]
    selectedMaterial: number[]
    selectedProduct: number[]
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
  }

  const resetFilters = () => {
    selectedStore.value = []
    selectedMaterial.value = []
    selectedProduct.value = []
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('reportProductionFiltersState')
      if (saved) {
        const data = JSON.parse(saved)
        setFilters({
          selectedStore: data.selectedStore || [],
          selectedMaterial: data.selectedMaterial || []
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
      timestamp: Date.now()
    }
    localStorage.setItem('reportProductionFiltersState', JSON.stringify(stateToSave))
  }

  return {
    // Экспортируем реактивные переменные
    selectedStore,
    selectedMaterial,
    selectedProduct,

    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage
  }
})
