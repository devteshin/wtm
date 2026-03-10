import { defineStore } from 'pinia';
import { ref } from "vue";

interface TableConditionItem {
  element: string;
  min: string;
  max: string;
};


export const useMaterialsReportStore = defineStore('materialsReport', () => {
  const selectedStore = ref<number[]>([]);
  const selectedMaterialGroup = ref<string[]>([]);
  const selectedMaterial = ref<number[]>([]);
  const isDetailedMode = ref(false);
  const isOnlyNonZeroMode = ref(false);
  const tableCondition = ref<TableConditionItem[]>([
    { element: '', min: '', max: '' }
  ]);

const tableData = ref<any[]>([]);  

  // Действия
const setFilters = (filters: Partial<{
  selectedStore: number[];
  selectedMaterialGroup: string[];
  selectedMaterial: number[];
  isDetailedMode: boolean;
  isOnlyNonZeroMode: boolean;
  tableCondition: TableConditionItem[];
}>) => {
  if (filters.selectedStore !== undefined) {
    selectedStore.value = filters.selectedStore;
  }
  if (filters.selectedMaterialGroup !== undefined) {
    selectedMaterialGroup.value = filters.selectedMaterialGroup;
  }
  if (filters.selectedMaterial !== undefined) {
    selectedMaterial.value = filters.selectedMaterial;
  }
  if (filters.isDetailedMode !== undefined) {
    isDetailedMode.value = filters.isDetailedMode;
  }
  if (filters.isOnlyNonZeroMode !== undefined) {
    isOnlyNonZeroMode.value = filters.isOnlyNonZeroMode;
  }
  if (filters.tableCondition !== undefined) {
    tableCondition.value = filters.tableCondition;
  }
};

  const resetFilters = () => {
    selectedStore.value = [];
    selectedMaterialGroup.value = [];
    selectedMaterial.value = [];
    isDetailedMode.value = false;
    isOnlyNonZeroMode.value = false;
    tableCondition.value = [{ element: '', min: '', max: '' }];
    tableData.value = [];
  };

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('materialsReportState');
      if (saved) {
        const data = JSON.parse(saved);
        setFilters({
          selectedStore: data.selectedStore || [],
          selectedMaterialGroup: data.selectedMaterialGroup || [],
          selectedMaterial: data.selectedMaterial || [],
          isDetailedMode: data.isDetailedMode || false,
          isOnlyNonZeroMode: data.isOnlyNonZeroMode || false,
          tableCondition: data.tableCondition || [{ element: '', min: '', max: '' }]
        });
        if (data.tableData) {
          tableData.value = data.tableData;
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки из LocalStorage:', error);
    }
  };

  const saveToStorage = () => {
    const stateToSave = {
      selectedStore: selectedStore.value,
      selectedMaterialGroup: selectedMaterialGroup.value,
      selectedMaterial: selectedMaterial.value,
      isDetailedMode: isDetailedMode.value,
      isOnlyNonZeroMode: isOnlyNonZeroMode.value,
      tableCondition: tableCondition.value,
      tableData: tableData.value,
      timestamp: Date.now()
    };
    localStorage.setItem('materialsReportState', JSON.stringify(stateToSave));
  };

  const setTableData = (data: any[]) => {
    tableData.value = data;
    saveToStorage(); // Автосохранение при обновлении данных
  };

  return {
    // Экспортируем реактивные переменные (только настройки)
    selectedStore,
    selectedMaterialGroup,
    selectedMaterial,
    isDetailedMode,
    isOnlyNonZeroMode,
    tableCondition,
    tableData,

    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage,
    setTableData 
  };});
