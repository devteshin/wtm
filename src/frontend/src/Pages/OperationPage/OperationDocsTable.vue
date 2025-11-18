<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
    /** ID задачи */
    operationID: { type: Number, required: true },
});

//const handleRowClick = (row: frontend.IOperations) => router.push(`/stock/${props.stockID}/operation/${row.id}`);
const handleRowClick = () => router.push(`/stock/${props.stockID}/operations`);

 onMounted(async () => {
     await store.fetchOperation(props.stockID, props.operationID);
});

/** Список столбцов для таблицы */
const columns = [
    {
        label: "Операция",
        prop: "doc_number"
    },
    {
        label: "Дата",
        prop: "doc_date"
    },
    {
        label: "Нетто",
        prop: "net_weight"
    },
    {
        label: "Кол-во",
        prop: "tare_amount"
    }
];


</script>

<template>
    <el-row
        v-if="store.isAuth"
        justify="center">
        <el-col
            v-loading="store.loading"
            :span="24"
            :sm="10">
            <el-table
                :data="store.operation"
                :row-style="{cursor: 'pointer'}"
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

