
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ReportMode = 'paginated' | 'full'

export const useZoneDocsStore = defineStore('zoneDocs', () => {
  const selectedStore = ref<number[]>([])
  const selectedMaterial = ref<number[]>([])
  const selectedMaterialZone = ref<number[]>([])
  const selectedPeriod = ref<[string, string] | null>(null)
  const total = ref(0)

// --- Режим отчёта и пагинация ---
  const reportMode = ref<ReportMode>('paginated')
  const currentPage = ref(1)
  const pageSize = ref(100)

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

 const resetPagination = () => {
    reportMode.value = 'paginated'
    currentPage.value = 1
    pageSize.value = 100
  }

  const setMode = (mode: ReportMode) => {
    reportMode.value = mode
    currentPage.value = 1
    pageSize.value = 100
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
        // Восстанавливаем режим и пагинацию, если они там есть
        if (data.reportMode === 'paginated' || data.reportMode === 'full') {
          reportMode.value = data.reportMode
        }
        if (Number.isFinite(data.currentPage) && data.currentPage >= 1) {
          currentPage.value = data.currentPage
        }
        if ([100, 200, 300].includes(data.pageSize)) {
          pageSize.value = data.pageSize
        }
        if (Number.isFinite(data.total) && data.total >= 0) {
          total.value = data.total
        }        
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
      reportMode: reportMode.value,
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      total: total.value,      
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
    reportMode,
    currentPage,
    pageSize,
    total,  

    // Экспортируем действия
    setFilters,
    resetFilters,
    resetPagination,
    setMode,    
    loadFromStorage,
    saveToStorage
  }
})
