<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import useApplicationStore from "@/store";
import { formatTwoDecimal, formatInteger } from '@/utils/numberFormat';

const router = useRouter();
const store = useApplicationStore();

const props = defineProps({
    /** ID склада */
    stockID: { type: Number, required: true },
    /** ID задачи */
    operationID: { type: Number, required: true },
});

const handleRowClick = (row: frontend.IOperationDoc) => router.push(`/stock/${props.stockID}/operation/${props.operationID}/doc/${row.doc_id}`);

function createDoc() {
    router.push(`/stock/${props.stockID}/operation/${props.operationID}/doc/${0}`);
};

onMounted(async () => {
     await store.fetchOperation(props.stockID, props.operationID);
});

/** Список столбцов для таблицы */
const columns = [
    {
        label: "Номер документа",
        prop: "doc_number"
    },
    {
        label: "Дата",
        prop: "doc_date"
    },
    {
        label: "Материал",
        prop: "material"
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
  <div v-if="store.isAuth" class="operation-docs">
    <div class="docs-card">
      <div class="docs-toolbar">
        <h3 class="docs-title">Документы операции</h3>
        <el-button type="primary" @click="createDoc">Новый документ</el-button>
      </div>

      <div class="docs-table-area" v-loading="store.loading">
        <el-table
          :data="store.operation"
          :row-style="{ cursor: 'pointer' }"
          height="100%"
          empty-text="Документов пока нет"
          @row-click="handleRowClick"
        >
          <el-table-column prop="doc_number" label="Номер документа" min-width="220" />
          <el-table-column prop="doc_date" label="Дата" width="140" />
          <el-table-column prop="material" label="Материал" min-width="260" />
          <el-table-column prop="net_weight" label="Нетто" width="140" align="right" class-name="num">
              <template #default="{ row }">{{ formatTwoDecimal(row.net_weight) }}</template>
          </el-table-column>
          <el-table-column prop="tare_amount" label="Кол-во" width="110" align="right" class-name="num">
            <template #default="{ row }">{{ formatInteger(row.tare_amount) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.operation-docs {
  height: calc(100vh - 120px);
  padding: 10px;
  box-sizing: border-box;
  display: flex;
}

.docs-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.docs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.docs-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.docs-table-area {
  flex: 1;
  min-height: 0;
}

</style>
