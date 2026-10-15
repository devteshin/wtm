
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useZoneDocsStore = defineStore('zoneDocs', () => {
  const selectedStore = ref<number[]>([])
  const selectedMaterial = ref<number[]>([])
  const selectedMaterialZone = ref<number[]>([])
  const selectedPeriod = ref<[string, string] | null>(null)

  // Действия
  const setFilters = (filters: Partial<{
    selectedStore: number[]
    selectedMaterial: number[]
    selectedMaterialZone: number[]
    selectedPeriod: [string, string] | null
  }>) => {
    if (filters.selectedStore !== undefined) {
      selectedStore.value = filters.selectedStore
    }
    if (filters.selectedMaterial !== undefined) {
      selectedMaterial.value = filters.selectedMaterial
    }
    if (filters.selectedMaterialZone !== undefined) {
      selectedMaterialZone.value = filters.selectedMaterialZone
    }
    if (filters.selectedPeriod !== undefined) {
      selectedPeriod.value = filters.selectedPeriod
    }
  }

  const resetFilters = () => {
    selectedStore.value = []
    selectedMaterial.value = []
    selectedMaterialZone.value = []
    selectedPeriod.value = null
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('zoneDocsFiltersState')
      if (saved) {
        const data = JSON.parse(saved)
        setFilters({
          selectedStore: data.selectedStore || [],
          selectedMaterial: data.selectedMaterial || [],
          selectedMaterialZone: data.selectedMaterialZone || [],
          selectedPeriod: data.selectedPeriod || null,
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
      selectedMaterialZone: selectedMaterialZone.value,
      selectedPeriod: selectedPeriod.value,
      timestamp: Date.now()
    }
    localStorage.setItem('zoneDocsFiltersState', JSON.stringify(stateToSave))
  }

  return {
    // Экспортируем реактивные переменные
    selectedStore,
    selectedMaterial,
    selectedMaterialZone,
    selectedPeriod,  

    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage
  }
})
