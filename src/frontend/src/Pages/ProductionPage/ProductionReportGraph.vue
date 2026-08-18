<template>
  <div class="mermaid-container" ref="containerRef">
    <div v-if="loading" class="loading-state">Строим граф...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <!-- Сюда mermaid.init() вставит SVG -->
    <div ref="svgContainer" class="mermaid-render-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElNotification } from 'element-plus'
import useApplicationStore from '@/store'
import { useProductionReportStore } from '@/storeProductionReport'

const props = defineProps<{
  type: 'material' | 'product' | 'operation'
  ids: number[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const containerRef = ref<HTMLElement | null>(null)
const svgContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const store = useApplicationStore()
const reportStore = useProductionReportStore()

const fetchGraphData = async (type: string, ids: number[]) => {
  loading.value = true;
  let item_ids: string = ''; 

  item_ids = ids.toString() ?? ''

  if (item_ids === '') {
    return;
  } 

  try {
    await store.fetchProductionGraphData({
      type: type,
      item_ids: item_ids
    })
    console.log('production_graph_data', store.production_graph_data);
    const mermaidStr = get_mermaid_code();
    console.log("mermaidStr", mermaidStr);
    //renderMermaid(mermaidStr);
  } catch (error) {
    console.error('fetchProductionGraphData error:', error)
  } finally {
    loading.value = false
  }

  function get_mermaid_code(): string {
    const data = store.production_graph_data
    
    if (!data) {
      return ''
    } 

    const lines: string[] = ['flowchart TD'];
    lines.push('classDef product fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
    lines.push('classDef rawMat fill:#fff3e0,stroke:#ff9800,stroke-width:2px')

    for (const row of data.material_chain) {
      lines.push(`material_${row.material_id} -->|Вес:  ${row.material_weight} кг.| operation_${row.operation_id}`)
    };
    for (const row of data.product_chain) {
      lines.push(`operation_${row.operation_id} -->|Вес:  ${row.product_weight} кг.| material_${row.product_id}`)
    }
    for (const row of data.operation_node) {
      lines.push(`operation_${row.operation_id}[${row.operation}<br/>Выход продуктов: ${row.product_operation_weight}<br/>Выход операции всего: ${row.total_operation_weight}<br/>Коэфф: ${row.koeff}]`)
    }
    for (const row of data.material_node) {
      lines.push(`material_${row.material_id}([${row.material}<br/>Коэфф: ${row.koeff}])`)
    }
    for (const row of data.material_node) {
      lines.push(`material_${row.material_id}:::product`)
    }
    for (const row of data.raw_material_node) {
      lines.push(`material_${row.material_id}([${row.material}<br/>Вес: ${row.weight_out} кг.])`)
    }
    for (const row of data.raw_material_node) {
      lines.push(`material_${row.material_id}:::rawMat`)
    }

    return lines.join('\n');
  };


}

const renderMermaid = (mermaidStr: string) => {
  if (!svgContainer.value) return

  // Очищаем перед новым рендером
  svgContainer.value.innerHTML = ''

  const source = mermaidStr.trim()
  if (!source) {
    svgContainer.value.textContent = 'Нет данных для построения графа.'
    return
  }

  // Вставляем исходный код в скрытый блок — mermaid.init найдёт его по классу
  const rawBlock = document.createElement('div')
  rawBlock.className = 'mermaid'
  rawBlock.style.display = 'none'
  rawBlock.textContent = source
  svgContainer.value.appendChild(rawBlock)

  // Запускаем рендер
  ;(window as any).mermaid.init(undefined, '.mermaid')
}

onMounted(() => {
  fetchGraphData(props.type, props.ids)
})

</script>

<style scoped>
.mermaid-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}
.mermaid-render-area {
  text-align: center;
  padding: 20px;
}
.loading-state, .error-state {
  padding: 20px;
  text-align: center;
}
.error-state { color: #ff4d4f; }
</style>
