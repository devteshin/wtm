<template>
    <el-row
        v-if="store.isAuth"
        justify="center">
        <el-col
            v-loading="store.loading"
            :span="24"
            :sm="10">
            <el-table
                :data="store.operations"
                :border="true"
                style="width: 100%"
                table-layout="auto"
                @row-click="handleRowClick">
                <el-table-column
                    v-for="col in columns"
                    :key="col.prop"
                    :prop="col.prop"
                    :label="col.label" />
            </el-table>
        </el-col>
    </el-row>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import useApplicationStore from "@/store";
import { useRouter } from "vue-router";

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
});


const router = useRouter();
const store = useApplicationStore();
/** Обработчик нажатия строки таблицы - переход на список заданий на складе */
const handleRowClick = (row: frontend.IStock) => router.push(`/stock/${row.id}`);
/** Получение данных от API со списком операций */
onMounted(async () => {
    //await store.fetchStocks();
    await store.fetchOperations(props.stockID);
    //if (store.stocks.length === 1) await handleRowClick(store.stocks[0] as frontend.IStock);
});

/** Список столбцов для таблицы */
const columns = [
    {
        label: "Операция",
        prop: "operation"
    },
    {
        label: "Кол-во операций",
        prop: "operation_count"
    }
];
</script>
