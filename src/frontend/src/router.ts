import { RouteRecordRaw, createRouter, createWebHistory } from "vue-router";

import useApplicationStore from "@/store";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/login",
        component: () => import("@/Pages/LoginPage.vue")
    },
    {
        path: "/",
        component: () => import("@/Pages/StocksPage.vue")
    },
    {
        path: "/stock/:stockID",
        component: () => import("@/Pages/TasksListPage.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null
        })
    },
    {
        path: "/stock/:stockID/task/:taskID/material/:materialID",
        component: () => import("@/Pages/TaskPage/index.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null,
            taskID: (typeof route.params.taskID === "string") ? parseInt(route.params.taskID) : null,
            materialID: (typeof route.params.materialID === "string") ? parseInt(route.params.materialID) : null
        })
    },
    {
        path: "/stock/:stockID/operations",
        component: () => import("@/Pages/OperationsListPage.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null
        })
    },
    {
        path: "/stock/:stockID/operation/:operationID",
        component: () => import("@/Pages/OperationPage/OperationDocsTable.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null,
            operationID: (typeof route.params.operationID === "string") ? parseInt(route.params.operationID) : null
        })
    },
    {
        path: "/stock/:stockID/operation/:operationID/doc/:docID/",
        component: () => import("@/Pages/OperationPage/OperationDoc.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null,
            operationID: (typeof route.params.operationID === "string") ? parseInt(route.params.operationID) : null,
            docID: (typeof route.params.docID === "string") ? parseInt(route.params.docID) : null
        })
    },
    {
        path: "/stock/:stockID/materials",
        component: () => import("@/Pages/MaterialsPage.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null
        })
    },
    {
        path: "/stock/:stockID/production",
        component: () => import("@/Pages/ProductionPage/ProductionPage.vue"),
        props: route => ({
            stockID: (typeof route.params.stockID === "string") ? parseInt(route.params.stockID) : null
        })
    },


];
const router = createRouter({
    history: createWebHistory(),
    routes: routes
});
/** проверка токена перед каждым переходом на страницу */
router.beforeEach(() => useApplicationStore().checkToken());
/** обертка для PWA */
router.isReady().then(async () => {
    const { registerSW } = await import("virtual:pwa-register");
    return registerSW({ immediate: true });
}).catch(reason => {
    // eslint-disable-next-line no-console
    console.error(reason);
});

export default router;
