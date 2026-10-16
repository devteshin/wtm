import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

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
  const isSelectionDetailedMode = ref(false);
  const isOnlyNonZeroMode = ref(false);
  const isElementOrderMode = ref(false);
  const isSelectionEnabled = ref(false);
  const isSelectionControlEnabled = ref(false);
  const isOperationDocAutoGenerateReport = ref(false);
  const isOperationListAutoGenerateReport = ref(false);
  const tableCondition = ref<TableConditionItem[]>([
    { element: '', min: '', max: '' }
  ]);

  const tableData = ref<any[]>([]); // таблица материалов
  const selectionTableData = ref<any[]>([]); // таблица подбора 
  const selectionIndTableData = ref<any[]>([]); // таблица показателей подбора 
  const basicColumns = ref<any[]>([]);
  const detailedColumns = ref<any[]>([]);
  const selectionColumns = ref<any[]>([]);
  const detailedSelectionColumns = ref<any[]>([]);
  //const selectedTableData = ref<any[]>([]); // выбранные строки текущей таблицы материалов
  const selectionData = ref<any[]>([]); // хранит выбранные строки в формате таблицы материалов (tableData) 
  
  // Действия
  const setFilters = (filters: Partial<{
    selectedStore: number[];
    selectedMaterialGroup: string[];
    selectedMaterial: number[];
    isDetailedMode: boolean;
    isSelectionDetailedMode: boolean;
    isOnlyNonZeroMode: boolean;
    isElementOrderMode: boolean;
    isSelectionEnabled: boolean;
    isSelectionControlEnabled: boolean;
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
    if (filters.isSelectionDetailedMode !== undefined) {
      isSelectionDetailedMode.value = filters.isSelectionDetailedMode;
    }
    if (filters.isOnlyNonZeroMode !== undefined) {
      isOnlyNonZeroMode.value = filters.isOnlyNonZeroMode;
    }
    if (filters.isElementOrderMode !== undefined) {
      isElementOrderMode.value = filters.isElementOrderMode;
    }
    if (filters.isSelectionEnabled !== undefined) {
      isSelectionEnabled.value = filters.isSelectionEnabled;
    }
    if (filters.isSelectionControlEnabled !== undefined) {
      isSelectionControlEnabled.value = filters.isSelectionControlEnabled;
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
    isSelectionDetailedMode.value = false;
    isOnlyNonZeroMode.value = false;
    isElementOrderMode.value = false;
    isSelectionEnabled.value = false;
    isSelectionControlEnabled.value = false;
    tableCondition.value = [{ element: '', min: '', max: '' }];
    tableData.value = [];
    selectionTableData.value = [];
    selectionIndTableData.value = [];
    //selectedTableData.value = [];
    selectionData.value = [];
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
          isSelectionDetailedMode: data.isSelectionDetailedMode || false,
          isOnlyNonZeroMode: data.isOnlyNonZeroMode || false,
          isElementOrderMode: data.isElementOrderMode || false,
          isSelectionEnabled: data.isSelectionEnabled || false,
          isSelectionControlEnabled: data.isSelectionControlEnabled || false,
          tableCondition: data.tableCondition || [{ element: '', min: '', max: '' }]
        });
        if (data.tableData) {
          tableData.value = data.tableData;
        }
        if (data.selectionTableData) {
          selectionTableData.value = data.selectionTableData;
        }
        if (data.selectionIndTableData) {
          selectionIndTableData.value = data.selectionIndTableData;
        }
        //if (data.selectedTableData) {
        //  selectedTableData.value = data.selectedTableData;
        //}
        if(data.selectionData) {
          selectionData.value = data.selectionData;
        }
        basicColumns.value = data.basicColumns || [];
        detailedColumns.value = data.detailedColumns || [];
        selectionColumns.value = data.selectionColumns || [];
        detailedSelectionColumns.value = data.detailedSelectionColumns || [];
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
      isSelectionDetailedMode: isSelectionDetailedMode.value,
      isOnlyNonZeroMode: isOnlyNonZeroMode.value,
      isElementOrderMode: isElementOrderMode.value,
      isSelectionEnabled: isSelectionEnabled.value,
      isSelectionControlEnabled: isSelectionControlEnabled.value,
      tableCondition: tableCondition.value,
      tableData: tableData.value,
      selectionTableData: selectionTableData.value,
      selectionIndTableData: selectionIndTableData.value,
      basicColumns: basicColumns.value,
      detailedColumns: detailedColumns.value,
      selectionColumns: selectionColumns.value,
      detailedSelectionColumns: detailedSelectionColumns.value,
      //selectedTableData: selectedTableData.value,
      selectionData: selectionData.value,
      timestamp: Date.now()
    };
    localStorage.setItem('materialsReportState', JSON.stringify(stateToSave));
  };

  const setTableData = (data: any[]) => {
    tableData.value = data;
    saveToStorage(); // Автосохранение при обновлении данных
  };

  const setSelectionTableData = (data: any[]) => {
    selectionTableData.value = data;
    saveToStorage(); // Автосохранение при обновлении данных
  };

  const setSelectionIndTableData = (data: any[]) => {
    selectionIndTableData.value = data;
    saveToStorage(); // Автосохранение при обновлении данных
  };

  //const setSelectedTableData = (data: any[]) => {
  //  selectedTableData.value = data;
  //  saveToStorage(); // Автосохранение при обновлении выбранных данных
  //};

  const setSelectionData = (data: any[]) => {
    selectionData.value = data;
    saveToStorage(); // Автосохранение при обновлении выбранных данных
  };

  return {
    // Экспортируем реактивные переменные (только настройки)
    selectedStore,
    selectedMaterialGroup,
    selectedMaterial,
    isDetailedMode,
    isSelectionDetailedMode,
    isOnlyNonZeroMode,
    isElementOrderMode,
    isSelectionEnabled,
    isSelectionControlEnabled,
    isOperationDocAutoGenerateReport,
    isOperationListAutoGenerateReport,
    tableCondition,
    tableData,
    selectionTableData,
    selectionIndTableData,
    //selectedTableData,
    selectionData,
    basicColumns,
    detailedColumns,
    selectionColumns,
    detailedSelectionColumns,
    // Экспортируем действия
    setFilters,
    resetFilters,
    loadFromStorage,
    saveToStorage,
    setTableData,
    setSelectionTableData,
    setSelectionIndTableData,
    //setSelectedTableData,
    setSelectionData
  };
});

