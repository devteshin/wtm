declare namespace frontend {
    /** Материалы */
    export type IMaterialsMeta = {
        material_list: Array<IMaterial> 
        stock_list: Array<IStock>
        material_group_list: Array<IMaterialGroups>
        process_list: Array<IProcess>
        operation_list: Array<IOpertion>
        processing_schemes: Array<IProcessingSchem>
    }

    export type IProcessingSchem = {
        id: number
        name: string
    }
    
    export type IOpertion = {
        id: number
        name: string
    }
    
    export type IProcess = {
        id: number
        name: string
    }

    export type IMaterial = {
        id: number
        name: string
    }

    export type IStock = {
        id: number
        name: string
    }

    export type IMaterialGroups = {
        code: string
        name: string
        min_value: number
        max_value: number
        umi: string
        type: number
    }

    export type IMaterialsData = {
        stock_name: string
        stock_id: number
        material: string
        material_id: number
        key_material: string
        tare_type: string
        tare_id: number
        tare_mark: string
        material_mark: string
        material_group: string
        rest_tare_amount: number
        rest_net_weight: number
        rest_gross_weight: number
        [key: string]: number;
    }    

    export type IProductionReportData = {
        operation_date_in: string
        process: string
        operation: string
        material: string
        weight_in: number
        product: string
        weight_out: number
        operation_date_out: string;
    }    

    export type ISelectionData = {
        stock_name: string
        material: string
        material_id: number
        rest_tare_amount: number
        rest_net_weight: number
        [key: string]: number;
    }    

    export type ISelectionIndData = {
        [key: string]: number;
    }    

    export type IMaterialsQueryParams = {
        materials?: string;
        stocks?: string;
        material_groups?: string;
        indicators?: string;
        indicator_conditions?: string;
        detailed_mode?: string;
        only_non_zero_mode?: boolean;
        element_order?: string;
    }

    export type IProductionReportQueryParams = {
        stock_ids?: string;
        material_ids?: string;
        product_ids?: string;
        process_ids?: string;
        operation_ids?: string;
        schema_ids?: string;
        date_start?: string;
        date_end?: string;
    }

    export type ISelectionQueryParams = {
        stock_list?: string;
        indicators?: string;
        key_material_list?: string;
        query_type?: string;
        element_order?: string;
    }

    export type ITaskItemKeyMaterial = {
    key_material: string;
    material_id: number;
    };

    export type ITaskItemsKeyMaterial = ITaskItemKeyMaterial[];


    /** Операции */
    export type IOperationsList = {
        id: number
        operation: string
        doc_count: number
    }

    /** Документы операции */
    export type IOperationDoc = {
        doc_id: number
        doc_number: string
        doc_date: string
        operation: string
        material_id: number
        material: string
        net_weight: number
        tare_mount: number
    }

    /** Склад */
    export type IStock = {
        id: number
        name: string
        tasks_count: number
    }

    /** Задача для списка */
    export type ITaskL = {
        material: string
        material_id: number
        doc_id: number
        doc_number: string
        planned_date: string
        technical_process: string
        operation: string
        amount: number
        weight: number|string
        amount_fact: number
        weight_fact: number
        tare_type: string
        category: string
        net_weight_fact: number
        done: number
    }

    /** Задание из задачи */
    export type IJob = {
        /** id материала */
        material_id: string
        /** название материала */
        material: string
        /** id тары */
        tare_id: number
        /** маркировка */
        tare_mark: string
        /** вес тары */
        tara_weight: number
        /** брутто */
        rest_gross_weight: number
        /** категория */
        category: string
        /** тип тары */
        tare_type: string
        /** кол-во тар */
        task_tare_amount: number
        /** нетто */
        task_net_weight: number
        /** взято веса нетто */
        net_weight_fact: number
        /** id типа процесса */
        add_processing_id: number
        /** работа выполнена */
        done: boolean
    }

    /** Ограничение по весу в категории материала */
    export type ITaskWeight = {
        category: string
        net_weight_fact: number
        material: string
        material_id: number
        tare_amount: number
        tare_amount_fact: number
        task_weight: number
        category_details: string
    }

    export type IProcessingType = {
        id: number
        process_name: string
    }

    export type ICatMat = {
        [key: string]: string
    }

    /** Задача со списком заданий */
    export type ITaskP = {
        id: number
        doc_number: string
        doc_date: string
        planned_date: string
        stock: number
        technical_process: string
        operation: string
        material: string
        task_weights: Array<ITaskWeight>
        jobs: Array<IJob>
        processing_types: Array<IProcessingType>
        catmat: ICatMat
    }

    export type IArrivalItems = {
        key_material_str: string
        material: string
        tare_id: number
        gross_weight: number
        tare_type: string
        tare_weight: number
        next_operation_flag: string
        shape_ids: number[]
    }

    export type ITareOptions = {
        tare_type: string
        tare_weight: number
        tare_type_id: number
    }

    export type IShapeOptions = {
        shape_id: number
        shape_name: string
    }

    export type IBaseRawMaterial = {
        material: string
        material_id: number
    }

    export type IRawMaterial = {
        material_id: number
        material: string
        tare_id: number
        net_weight: number
    }

    export type IArrival = {
        doc_number: string
        doc_date: string
        operation: string
        operation_material: string
        raw_materials: Array<IRawMaterial>
        base_raw_materials: Array<IBaseRawMaterial>
        items: Array<IArrivalItems>
        tare_options: Array<ITareOptions>
        shape_options: Array<IShapeOptions>
    }

    export type ILoginPayload = {
        login: string;
        password: string;
    }

    export type IChangePassword = {
        newPassword: string;
        repetitionPassword: string;
    }

    export type IDocList = {
        next_doc_number_list: string;
    }


}
