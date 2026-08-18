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
  let mermaid_string: string = ''; 

  item_ids = ids.toString() ?? ''

  if (item_ids === '') {
    return;
  } 

  try {
    await store.fetchProductionGraphData({
      type: type,
      item_ids: item_ids
    })
    console.log('production_graph_data', store.production_graph_data)
    //mermaid_string = get_mermaid_code(store.production_graph_data);

    //renderMermaid(mermaid_string.mermaid)

  } catch (error) {
    console.error('fetchProductionGraphData error:', error)
  } finally {
    loading.value = false
  }



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
