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
    operationTaskID: { type: Number, required: true },
});


onMounted(async () => {
    //await store.fetchOperation(props.stockID, props.operationTaskID);
});


</script>

<template>
    <div class="operation">
        <div class="left_pane">
            <div class="left_pane_item">
                <div>Операция</div>
                <div>ntcn</div> 
            </div>
            <div class="left_pane_item">
                <div>Материал</div>
                <div>ntcn</div> 
            </div>
            <div class="left_pane_item">
                <div>Смена</div>
                <div>ntcn</div> 
            </div>
        </div>
        <div class="right_pane">
            Правая панель
        </div>
    </div>

</template>

<style scoped>
.operation {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}
.left_pane {
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 50px;
}
.left_pane_item {
    width: 80%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
.right_pane {
    width: 50%;
}
</style>

