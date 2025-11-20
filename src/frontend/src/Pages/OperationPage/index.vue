<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import OperationDocsTable from "./OperationDocsTable.vue";
import DocHeader from "./DocHeader.vue";

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
    /** ID задачи */
    operationID: { type: Number, required: true },
});


</script>

<template>
    <el-row
        v-if="store.isAuth"
        justify="center">
        <el-col>
            <DocHeader></DocHeader>
            <OperationDocsTable
                :stockID="props.stockID"
                :operationID="props.operationID"
            />
        </el-col>
    </el-row>
</template>

