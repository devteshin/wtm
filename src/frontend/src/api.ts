import jwt_decode from "jwt-decode";

const BASE_URL = "/api";
const TASKS_LIST = "tasks";
const TASK_POSITIONS = "task";
const LOGIN = "login";
const CHANGE_PASSWORD = "change_password";
const STOCK = "stock";
const MATERIAL = "material";
const JOB = "job";
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
        // if (response.status !== 201) {
        //     throw new Error(await response.text());
        // }

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
