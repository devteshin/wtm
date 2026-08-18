import { computed, reactive, Ref, ref, shallowRef } from "vue";

import ClientAPI from "@/api";
import { defineStore } from "pinia";

export default defineStore("app_store", () => {
    /** http клиент */
    const api = reactive(new ClientAPI());
    /** флаг процесса загрузки данных */
    const loading = ref(false);
    /** информация из декодированного токена о пользователе */
    const currentUser = computed(() => api.currentUser);
    /** вычисляемое свойство - авторизован пользователь или нет */
    const isAuth = computed(() => currentUser.value?.can_login === 1);
    /** проверка токена клиента внутри браузера */
    const checkToken = () => api.checkToken();

    /** список операций */
    const operations = ref<Array<frontend.IOperationsList>>([]);
    /** список документов операции */
    const operation = ref<Array<frontend.IOperationDoc>>([]);
    /** документ приема из производства */
    const arrival = ref<frontend.IArrival | null>(null);
    /** данные материалов для отчета по остаткам */
    const materials_meta = ref<frontend.IMaterialsMeta | null>(null);
    /** список материалов id, name */
    const materials_list = ref<frontend.IMaterial | null>(null);
    /** остатки материалов для отчета по остаткам */
    const materials_data = ref<frontend.IMaterialsData | null>(null);
    /** данные отчета по производству */
    const production_report_data = ref<Array<frontend.IProductionReportData | null>> ([]);
    /** данные графа по производству */
    const production_graph_data = ref<frontend.IProductionGraphData | null> (null);
    /** подбор материалов */
    const selection_data = ref<frontend.ISelectionData | null>(null);
    /** подбор материалов - значения показателей подбора */
    const selection_ind_data = ref<frontend.ISelectionIndData | null>(null);
    /** подбор материалов для списания в документе приема из производства */
    const raw_materials_data = ref<frontend.IRawMaterial[]>([]);
    /** список складов */
    const stocks = shallowRef<Array<frontend.IStock>>([]);
    /** список заданий */
    const tasks = shallowRef<Array<frontend.ITaskL>>([]);
    /** список прогресса заданий */
    const tasks_progress = shallowRef<Array<frontend.ITaskL>>([]);
    /** задание */
    const task = ref<frontend.ITaskP | null>(null);
    const doc_list = shallowRef<Array<frontend.IDocList>>([]);


    const doLogin = (payload: frontend.ILoginPayload) => api.doLogin(payload);

    /** запрос к API для получения данных для отчета по остаткам материалов */
    const fetchMaterialsData = (stockID: number, params?: frontend.IMaterialsQueryParams) => {
        return api.fetchMaterialsData(stockID, params).then(body => materials_data.value = body).finally(() => loading.value = false);
    };

    /** запрос к API для получения данных для отчета по производству */
    const fetchProductionReportData = (params?: frontend.IProductionReportQueryParams) => {
        return api.fetchProductionReportData(params).then(body => production_report_data.value = body).finally(() => loading.value = false);
    };

    /** запрос к API для получения данных для графа по производству */
    const fetchProductionGraphData = (params?: frontend.IProductionGraphQueryParams) => {
        return api.fetchProductionGraphData(params).then(body => production_graph_data.value = body).finally(() => loading.value = false);
    };

    /** запрос к API для получения данных по остаткам материалов подбора */
    const fetchSelectionData = (params?: frontend.ISelectionQueryParams) => {
        let targetRef: Ref<any>;

        if (params?.query_type === "selection_indicators") {
            targetRef = selection_ind_data;
        } else if (params?.query_type === "raw_materials") {
            targetRef = raw_materials_data;
        } else {
            targetRef = selection_data;
        }

        return api.fetchSelectionData(params).then(body => targetRef.value = body).finally(() => loading.value = false);
    };
    /** запрос к API для получения данных для отчета по остаткам материалов */
    const fetchMaterialsMeta = (stockID: number) => {
        return api.fetchMaterialsMeta(stockID).then(body => materials_meta.value = body).finally(() => loading.value = false);
    };
    /** запрос к API для получения списка операций */
    const fetchOperations = (stockID: number, activeOperationMode: boolean) => {
        return api.fetchOperations(stockID, activeOperationMode).then(body => operations.value = body).finally(() => loading.value = false);
    };
    /** запрос к API для получения списка складов */
    const fetchStocks = () => {
        return api.fetchStocks().then(body => stocks.value = body).finally(() => loading.value = false);
    };
    /** запрос к API для получения списка задач */
    /** запрос к API для получения списка прогрессса по задачам */
    const fetchTasksList = (stockID: number) => {
        loading.value = true;
        return Promise.all([
            api.fetchTasksList(stockID).then(body => tasks.value = body),
            api.fetchTasksProgress(stockID).then(body => tasks_progress.value = body)
        ]).finally(() => loading.value = false);
    };

    /** запрос к API для получения данных задания */
    const fetchTask = (stockID: number, taskID: number, materialID: number, tareType: string, with_load=true) => {
        if (with_load) loading.value = true;
        return api.fetchTask(stockID, taskID, materialID, tareType).then(body => task.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };
    /** запрос к API для получения данных операции */
    const fetchOperation = (stockID: number, operationID: number, with_load=true) => {
        if (with_load) loading.value = true;
        return api.fetchOperation(stockID, operationID).then(body => operation.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };

    const fetchOperationsMeta = (stockID: number, with_load=true) => {
        if (with_load) loading.value = true;
        return api.fetchOperationsMeta(stockID).then(body => operation.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };

    const searchMaterials = (material_substring: string, limit: number=50, with_load=true) => {
        if (with_load) loading.value = true;
        return api.searchMaterials(material_substring, limit).then(body => materials_list.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };

    const searchOperations = (operation_substring: string, limit: number=50, with_load=true) => {
        if (with_load) loading.value = true;
        return api.searchOperations(operation_substring, limit).then(body => materials_list.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };

    const fetchOperationData = (operationID: number, with_load=true) => {
        if (with_load) loading.value = true;
        return api.fetchOperationData(operationID).then(body => operation.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };


    /** запрос к API для получения позиций документа приема из производства */
    const fetchArrival = (stockID: number, operationID: number, docID: number, with_load=true) => {
        if (with_load) loading.value = true;
        return api.fetchArrival(stockID, operationID, docID).then(body => arrival.value = body).finally(() => {
            if (with_load) loading.value = false;
        });
    };

    /** запрос к API на изменение пароля */
    const changePassword = (payload: frontend.IChangePassword) => {
        loading.value = true;
        return api.changePasswor(payload).finally(() => loading.value = false);
    };
    /** изменение статуса "выполнено" для задания в задаче */
    const updateJobStatus = (taskID: number, materialID: number, taraID: number, netWeightFact: number, restGrossWeight: number, add_processing_id: number, done: boolean) => {
        return api.updateJobStatus(taskID, materialID, taraID, netWeightFact, restGrossWeight, add_processing_id, done);
    };

    const checkMaterialItem = (materialID: number, taraID: number, taskID: number) => {
        return api.checkMaterialItem(materialID, taraID, taskID).then(body => doc_list.value = body);
    };

    const updateJobsStatus = (payload: any) => {
        loading.value = true;
        return api.updateJobsStatus(payload).finally(() => {
            loading.value = false;
        });
    };

    const fetchDNMDocNumber = (operationID: number) => {
        loading.value = true;
        return api.fetchDNMDocNumber(operationID).finally(() => {
            loading.value = false;
        });
    };

    const fetchMaxTareID = (material: string) => {
        loading.value = true;
        return api.fetchMaxTareID(material).finally(() => {
            loading.value = false;
        });
    };

    const createMaterial = (payload: any) => {
        loading.value = true;
        return api.createMaterial(payload).finally(() => {
            loading.value = false;
        });
    };

    const checkOperationName = (payload: any) => {
        return api.checkOperationName(payload);
    };

    const updateOperation = (payload: any) => {
        loading.value = true;
        return api.updateOperation(payload).finally(() => {
            loading.value = false;
        });
    };

    const updateTask = (payload: any) => {
        loading.value = true;
        return api.updateTask(payload).finally(() => {
            loading.value = false;
        });
    };

    const deleteOperation = (payload: any) => {
        loading.value = true;
        return api.deleteOperation(payload).finally(() => {
            loading.value = false;
        });
    };


    const createArrival = (payload: any) => {
        loading.value = true;
        return api.createArrival(payload).finally(() => {
            loading.value = false;
        });
    };

    const updateArrival = (payload: any) => {
        loading.value = true;
        return api.updateArrival(payload).finally(() => {
            loading.value = false;
        });
    };

    const deleteArrival = (payload: any) => {
        loading.value = true;
        return api.deleteArrival(payload).finally(() => {
            loading.value = false;
        });
    };

    const updateRestGrossWeight = (taskID: number, job :frontend.IJob) => {
        return api.updateRestGrossWeight(taskID, job);
    };

    /** ID таймера */
    let timer: NodeJS.Timer;
    /** интервал в ms для setInterval */
    const delay = 15_000;
    /** запуск автообновления */
    const doAutofetch = (stockID: number, taskID: number, materialID: number, tareType: string) => {
        timer = setInterval(() => {
            fetchTask(stockID, taskID, materialID, tareType, false);
        }, delay);
    };
    /** остановка автообновления */
    const stopAutofetch = () => {
        clearInterval(timer as unknown as number);
    };

    /** т.к. процесс выхода (logout) не требует фиксации на бэке, то достаточно просто стереть токен из памяти */
    const logOut = () => {
        api.currentUser = null;
        api.token = null;
        window.localStorage.removeItem("token");
        location.href = "/login";
    };

    const orientation = ref("landscape-primary");
    const isLandscape = computed(() => orientation.value === "landscape-primary");
    try {
        orientation.value = screen.orientation.type;
        window.addEventListener("orientationchange", () => {
            orientation.value = screen.orientation.type;
        }, false);
    } catch (error) {
        // eslint-disable-next-line
        console.warn(error);
    }


    return {
        doLogin,
        fetchStocks,
        fetchMaterialsMeta,
        fetchMaterialsData,
        fetchProductionReportData,
        fetchProductionGraphData,
        fetchSelectionData,
        fetchOperations,
        fetchOperationsMeta,
        fetchOperationData,
        fetchOperation,
        fetchDNMDocNumber,
        fetchMaxTareID,
        fetchArrival,
        fetchTasksList,
        fetchTask,
        checkMaterialItem,
        checkOperationName,
        updateJobStatus,
        updateJobsStatus,
        updateRestGrossWeight,
        createMaterial,
        searchMaterials,
        searchOperations,
        createArrival,
        updateArrival,
        deleteArrival,
        updateOperation,
        deleteOperation,
        updateTask,
        stocks,
        operations,
        operation,
        materials_meta,
        materials_data,
        production_report_data,
        production_graph_data,
        selection_data,
        raw_materials_data,
        selection_ind_data,
        tasks,
        tasks_progress,
        task,
        arrival,
        isAuth,
        currentUser,
        checkToken,
        changePassword,
        logOut,
        loading,
        isLandscape,

        doAutofetch,
        stopAutofetch
    };
});
