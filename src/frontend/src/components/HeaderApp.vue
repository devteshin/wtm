<template>
    <el-menu
        class="top-menu"
        :ellipsis="false"
        :router="true"
        mode="horizontal">
        <el-menu-item
            v-for="menu in routes"
            :key="menu.label"
            :index="menu.label"
            :route="menu">
            <el-icon>
                <component :is="menu.icon" />
            </el-icon>
            <span>{{ menu.label }}</span>
        </el-menu-item>
        <div class="flex-grow" />
        <el-popover
            trigger="click"
            :width="300"
            popper-style="box-shadow: rgb(14 18 22 / 35%) 0px 10px 38px -10px, rgb(14 18 22 / 20%) 0px 10px 20px -15px; padding: 20px;">
            <template #reference>
                <el-button
                    style="margin-top: 0.5rem;"
                    plain
                    round>
                    <el-icon style="vertical-align: middle">
                        <User />
                    </el-icon>
                    <span v-if="store.isLandscape">{{ store.currentUser?.employee_name }} </span>
                </el-button>
            </template>
            <template #default>
            <div class="user-info">
                <div class="user-info__row"><span>ID</span><span>{{ store.currentUser?.id }}</span></div>
                <div class="user-info__row"><span>Логин</span><span>{{ store.currentUser?.login }}</span></div>
            </div>
            <div class="user-actions">
                <el-button size="small" type="danger" round @click="handleLogOut">Выход</el-button>
                <ChangePasswordDialog />
            </div>
            </template>
        </el-popover>
    </el-menu>
</template>

<script setup lang="ts">
import useApplicationStore from "@/store";
import ChangePasswordDialog from "./ChangePasswordDialog.vue";
import { computed } from "vue";

const store = useApplicationStore();
const handleLogOut = () => store.logOut();

const routes = computed(() => {
    //const stockID = route.params.stockID as string;
    const stockID = store.currentStockID;
    const role = store.currentUser?.role_id;
    const menuRoutes: Array<{ label: string; path: string; query?: Record<string, string>; icon: string }> = [];

    // role_id = 1 — полное меню
    if (role === 1) {
        menuRoutes.push({
            label: "Список складов",
            path: "/",
            icon: "Guide"
        });

        if (stockID) {
            menuRoutes.push(
                { label: "Задачи", path: `/stock/${stockID}`, icon: "MessageBox" },
                { label: "Операции", path: `/stock/${stockID}/operations`, icon: "MessageBox" },
                { label: "Материалы", path: `/material`, icon: "MessageBox" },
                { label: "Производство", path: `/production`, icon: "MessageBox" },
                { label: "Измерения", path: `/measurements?editable=0`, query: { editable: "0" }, icon: "MessageBox" },
                { label: "Контроль измерений", path: `/measurements_control`, icon: "MessageBox" },
            );
        }
    }

    // role_id = 2 — только Материалы и Производство
    if (role === 2) {
        menuRoutes.push(
            { label: "Материалы", path: `/material`, icon: "MessageBox" },
            { label: "Производство", path: `/production`, icon: "MessageBox" },
            { label: "Показатели", path: `/metrics`, icon: "MessageBox" }
        );
    }

    if (role === 3) {
        menuRoutes.push(
            { label: "Измерения", path: `/measurements`, icon: "MessageBox" }
        );
    }


    return menuRoutes;
});


</script>

<style scoped>
.top-menu {
  padding-right: 16px;   /* воздух до правого края экрана */
}

.user-badge {
  margin-top: 0.5rem;    /* вертикальное центрирование кнопки в строке меню */
}

.user-info__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.user-info__row span:first-child {
  color: var(--el-text-color-secondary);
}
.user-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

</style>