import jwt_decode from "jwt-decode";

const BASE_URL = "/api";
const TASKS_LIST = "tasks";
const TASK_POSITIONS = "task";
const LOGIN = "login";
const CHANGE_PASSWORD = "change_password";
const STOCK = "stock";
const OPERATION = "operation";
const OPERATION_UPDATE = "operation/update";
const CHECK_OPERATION_NAME = "operation/check_name";
const MATERIAL = "material";
const DOC = "doc";
const JOB = "job";
const DNM = "dnm";
const ARRIVAL = "arrival";
const ARRIVAL_DELETE = "arrival/delete";
const ARRIVAL_CREATE = "arrival/create";
const MATERIAL_CREATE = "material/create";
const RGW = "rest_gross_weight";
const TASKS_PROGRESS = "tasks_progress";
const CHECK_ITEM = "check_item";


type user = {
    can_login: number;
    id: string;
    employee_name: string;
    login: string;
}

class ClientAPI {
    currentUser: user | null = null;
    token: string | null;
    constructor() {
        this.currentUser = null;
        this.token = null;
    }

    decodeToken() {
        /** декодирование токена */
        if (this.token) {
            const decode_token = jwt_decode(this.token);
            this.currentUser = decode_token ? decode_token["payload"] : null;
        }
    }

    checkToken() {
        /** проверка токена */
        if (!this.token) {
            this.token = window.localStorage.getItem("token");
        }
        if (!this.token && location.pathname !== "/login") {
            location.href = "/login";
        }
        if (!this.currentUser) {
            this.decodeToken();
        }
    }

    requestHeaders(): HeadersInit {
        return this.token ? { token: this.token } : {};
    }

    async fetchMaterialsMeta(stockID: number) {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/materials`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchMaterialsData(stockID: number, params: frontend.IMaterialsQueryParams = {}) {
        this.checkToken();

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
            }
        });

        const url = `${BASE_URL}/${STOCK}/${stockID}/materials_data${
            queryParams.toString() ? `?${queryParams.toString()}` : ''
        }`;        

        const response = await fetch(url, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchSelectionData(params: frontend.ISelectionQueryParams = {}) {
        this.checkToken();

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
            }
        });

        const url = `${BASE_URL}/selection_data${
            queryParams.toString() ? `?${queryParams.toString()}` : ''
        }`;        

        const response = await fetch(url, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchDNMDocNumber(operationID: number) {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${DNM}/${operationID}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

/*     async fetchOperations(stockID: number, activeOperationMode: boolean) {
        this.checkToken();
        const modeValue = activeOperationMode ? 1 : 0;
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${ACTIVE_OPERATION}/${modeValue}/operations`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }
 */
    async fetchOperations(stockID: number, activeOperationMode: boolean) {
    this.checkToken();

    const path = `${BASE_URL}/${STOCK}/${stockID}/operations`;
    const query = `?activeOperationMode=${activeOperationMode ? '1' : '0'}`;

    const url = path + query;

    console.log('URL:', url);

    const response = await fetch(url, { headers: this.requestHeaders() });
    if (response.status === 403) {
        window.localStorage.removeItem("token");
        location.href = "/login";
    }

    return response.json();
    }

    async fetchOperationsMeta(stockID: number) {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/operations_meta`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchOperationData(operationID: number) {
        this.checkToken();
        console.log("API", "fetching operation data for ID:", {operationID});
        const response = await fetch(`${BASE_URL}/${OPERATION}/${operationID}/operation_data`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchOperation(stockID: number, operationID: number) {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${OPERATION}/${operationID}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchMaxTareID(material: string) {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${MATERIAL}/${material}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchArrival(stockID: number, operationID: number, docID: number) {
        /** получение списка позиций в документе приема из производства */
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${OPERATION}/${operationID}/${DOC}/${docID}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        if (response.status === 404) {
            alert("Документ не найден");
            location.href = "/";
        }
        if (response.status !== 200) {
            location.href = "/stock/" + stockID + "/operations";
        }
        const body = await response.json();
        return body;
    }

    async fetchStocks() {
        this.checkToken();
        const response = await fetch(`${BASE_URL}/stocks`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchTasksList(stockID: number) {
        /** получение списка задач */
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${TASKS_LIST}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchTasksProgress(stockID: number) {
        /** получение списка прогресса по задачам */
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${TASKS_PROGRESS}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        const body = await response.json();
        return body;
    }

    async fetchTask(stockID: number, taskID: number, materialID: number, tareType: string): Promise<frontend.ITaskP> {
        /** получение списка позиций в задаче */
        this.checkToken();
        const response = await fetch(`${BASE_URL}/${STOCK}/${stockID}/${TASK_POSITIONS}/${taskID}/${MATERIAL}/${materialID}?tareType=${tareType}`, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
        }
        if (response.status === 404) {
            alert("Задача не найдена");
            location.href = "/";
        }
        if (response.status !== 200) {
            location.href = "/";
        }
        const body = await response.json();
        body.jobs.forEach(job => job.done = Boolean(job.done));
        return body;
    }

    async updateJobStatus(taskID: number, materialID: number, taraID: number, netWeightFact: number, restGrossWeight: number, processingID: number, done: boolean) {
        const url = `${BASE_URL}/${JOB}`;
        const payload = {
            taskID,
            materialID,
            taraID,
            netWeightFact,
            restGrossWeight,
            processingID,
            done
        };
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };
        const response = await fetch(url, { method: "PUT", headers, body: JSON.stringify(payload) });
        if (response.status !== 201) {
            throw new Error(await response.text());
        }
        return;
    }

    async updateJobsStatus(payload: any) {
        const url = `${BASE_URL}/${JOB}`;
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };
        
        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
        if (response.status !== 201) {
            throw new Error(await response.text());
        }

        return;
    }

    handleError(error) {
        if (error instanceof Error) {
            alert(error);
        } else {
            alert("Произошла неопознанная ошибка");
        }
        return;
    }

    async updateArrival(payload: any) {
        const url = `${BASE_URL}/${ARRIVAL}`;
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
            const responseBody = await response.text(); // Считываем тело ответа как текст

            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = JSON.parse(responseBody); // Пробуем распарсить текст как JSON
                    errorMessage = errorData.message || "Неизвестная ошибка"; // Получаем сообщение об ошибке
                } catch {
                    errorMessage = responseBody || "Неизвестная ошибка"; // Если не удалось распарсить как JSON, используем текст
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            this.handleError(error);
            return false
        }                
        return true;
    }

    async createMaterial(payload: any) {
        const url = `${BASE_URL}/${MATERIAL_CREATE}`;
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
            if (!response.ok) {
                const responseBody = await response.text(); // Считываем тело ответа как текст
                let errorMessage = "";
                try {
                    const errorData = JSON.parse(responseBody); // Пробуем распарсить текст как JSON
                    errorMessage = errorData.message || "Неизвестная ошибка"; // Получаем сообщение об ошибке
                } catch {
                    errorMessage = responseBody || "Неизвестная ошибка"; // Если не удалось распарсить как JSON, используем текст
                }
                throw new Error(errorMessage);
            }
            else {
                const newMaterialID = await response.json();
                return newMaterialID;
            };
        } catch (error) {
            this.handleError(error);
            return null;
        }
    }

    async updateOperation(payload: any) {
        const url = `${BASE_URL}/${OPERATION_UPDATE}`;
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
            if (!response.ok) {
                const responseBody = await response.text(); // Считываем тело ответа как текст
                let errorMessage = "";
                try {
                    const errorData = JSON.parse(responseBody); // Пробуем распарсить текст как JSON
                    errorMessage = errorData.message || "Неизвестная ошибка"; // Получаем сообщение об ошибке
                } catch {
                    errorMessage = responseBody || "Неизвестная ошибка"; // Если не удалось распарсить как JSON, используем текст
                }
                throw new Error(errorMessage);
            }
            else {
               return;
            };
        } catch (error) {
            this.handleError(error);
            return;
        }
    }

    async createArrival(payload: any) {
        const url = `${BASE_URL}/${ARRIVAL_CREATE}`;
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
            if (!response.ok) {
                const responseBody = await response.text(); // Считываем тело ответа как текст
                let errorMessage = "";
                try {
                    const errorData = JSON.parse(responseBody); // Пробуем распарсить текст как JSON
                    errorMessage = errorData.message || "Неизвестная ошибка"; // Получаем сообщение об ошибке
                } catch {
                    errorMessage = responseBody || "Неизвестная ошибка"; // Если не удалось распарсить как JSON, используем текст
                }
                throw new Error(errorMessage);
            }
            else {
                const data = await response.json();
                const newDocId = data.new_doc_id;
                return newDocId;
            };
        } catch (error) {
            this.handleError(error);
            return 0;
        }
    }

    async deleteArrival(docID: number) {
        const url = `${BASE_URL}/${ARRIVAL_DELETE}`;
        const payload = {
            docID: docID,
        };
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        try {
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
            if (!response.ok) {
                const responseBody = await response.text(); // Считываем тело ответа как текст
                let errorMessage = "";
                try {
                    const errorData = JSON.parse(responseBody); // Пробуем распарсить текст как JSON
                    errorMessage = errorData.message || "Неизвестная ошибка"; // Получаем сообщение об ошибке
                } catch {
                    errorMessage = responseBody || "Неизвестная ошибка"; // Если не удалось распарсить как JSON, используем текст
                }
                throw new Error(errorMessage);
            };
        } catch (error) {
            this.handleError(error);
            return false;
        }
        return true;
    }

/*     async checkOperationName(operationID: number, operationName: string) {
        const url = `${BASE_URL}/${CHECK_OPERATION_NAME}`;
        const payload = {
            operationID,
            operationName,
        };

        console.log(payload);

        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };

        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

        const body = await response.json();

        return body;

    }
 */

    async checkOperationName(params: { operationID: number; operationName: string }) {
        this.checkToken();

        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
            }
        });

        const url = `${BASE_URL}/${CHECK_OPERATION_NAME}${
            queryParams.toString() ? `?${queryParams.toString()}` : ''
        }`;        

        const response = await fetch(url, { headers: this.requestHeaders() });
        if (response.status === 403) {
            window.localStorage.removeItem("token");
            location.href = "/login";
            throw new Error("Unauthorized");
        }
        if (!response.ok) {
            let errorBody;
            try {
            errorBody = await response.json();
            } catch {
            errorBody = {};
            }
            throw new Error(errorBody.message || `HTTP ${response.status}`);
        }
        const body = await response.json();
        return body;

    }

    async checkMaterialItem(materialID: number, taraID: number, taskID: number) {
        const url = `${BASE_URL}/${CHECK_ITEM}`;
        const payload = {
            materialID,
            taraID,
            taskID,
        };

        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };
        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

        const body = await response.json();

        return body;
    }

    async updateRestGrossWeight(taskID: number, job: frontend.IJob) {
        this.checkToken();
        const url = `${BASE_URL}/${RGW}`;
        const payload = {
            taskID,
            material_id: job.material_id,
            tare_id: job.tare_id,
            gross_weight: job.rest_gross_weight
        };
        const headers = {
            "Content-Type": "application/json",
            ...this.requestHeaders()
        };
        const response = await fetch(url, { method: "PUT" ,headers, body: JSON.stringify(payload) });
        if (response.status !== 201) {
            throw new Error(await response.text());
        }
        return;
    }

    async doLogin(payload: frontend.ILoginPayload) {
        /** авторизация */
        const response = await fetch(`${BASE_URL}/${LOGIN}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (response.ok === false) {
            throw "Неправильный логин или пароль";
        }
        const token = await response.json();
        window.localStorage.setItem("token", token as string);
        this.decodeToken();
        location.href = "/";
        return;
    }

    async changePasswor(payload: frontend.IChangePassword) {
        const response = await fetch(`${BASE_URL}/${CHANGE_PASSWORD}`, { method: "POST", headers: { "Content-Type": "application/json", ...this.requestHeaders() }, body: JSON.stringify(payload) });
        if (response.status !== 201) {
            throw new Error(await response.text());
        }
        return;
    }
}

export default ClientAPI;
