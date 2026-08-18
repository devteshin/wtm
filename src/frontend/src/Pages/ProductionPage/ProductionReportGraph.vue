<template>
  <div class="mermaid-container" ref="containerRef">
    <div class="zoom-controls">
      <el-button size="small" @click="zoomOut" plain type="info">
        <template #icon><el-icon :size="14"><Minus /></el-icon></template>
      </el-button>
      <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
      <el-button size="small" @click="zoomIn" plain type="info">
        <template #icon><el-icon :size="14"><Plus /></el-icon></template>
      </el-button>
      <el-button size="small" @click="resetView" plain type="primary">Сброс</el-button>
    </div>

    <div v-if="loading" class="loading-state">Строим граф...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>

    <!-- Контейнер всегда есть, но содержимое скрыто через CSS -->
    <div
      ref="svgContainer"
      class="mermaid-render-area"
      :class="{ 'mermaid-hidden': isRenderingMermaid }"
      @mousedown="onPanStart"
      @mouseleave="onPanEnd"
      @mouseup="onPanEnd"
    >
      <!-- Сюда Mermaid вставит SVG -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import useApplicationStore from '@/store'
import { Minus, Plus } from '@element-plus/icons-vue'

const props = defineProps<{
  type: 'material' | 'product' | 'operation'
  ids: number[]
}>()

const containerRef = ref<HTMLElement | null>(null)
const svgContainer = ref<HTMLElement | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)
const isRendered = ref(false)
const isRenderingMermaid = ref(false)

// Состояние вида: зум и панорамирование
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)

const minScale = 0.5
const maxScale = 3

const store = useApplicationStore()

// --- Перетаскивание ---
let isDragging = false
let startX = 0
let startY = 0
let startPanX = 0
let startPanY = 0

const onPanStart = (e: MouseEvent) => {
  // Не запускаем, если зажали Ctrl/Shift/Alt или клик по кнопке/инпуту
  if (e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()

  isDragging = true
  startX = e.clientX
  startY = e.clientY
  startPanX = panX.value
  startPanY = panY.value

  document.addEventListener('mousemove', onPanMove)
  document.addEventListener('mouseup', onPanEnd)
}

const onPanMove = (e: MouseEvent) => {
  if (!isDragging) return
  e.preventDefault()
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  panX.value = startPanX + dx
  panY.value = startPanY + dy
  applyTransform()
}

const onPanEnd = () => {
  isDragging = false
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', onPanEnd)
}

// --- Зум ---
const applyTransform = () => {
  const svg = svgContainer.value?.querySelector('svg')
  if (!svg) return

  svg.style.transform = `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`
  svg.style.transformOrigin = '0 0' // начало координат в левом верхнем углу
  svg.style.willChange = 'transform'
}

const zoomIn = () => {
  if (scale.value >= maxScale) return
  scale.value = Math.min(maxScale, scale.value + 0.25)
  applyTransform()
}

const zoomOut = () => {
  if (scale.value <= minScale) return
  scale.value = Math.max(minScale, scale.value - 0.25)
  applyTransform()
}

const resetView = () => {
  scale.value = 1
  panX.value = 0
  panY.value = 0
  applyTransform()
}

// Зум по колёсику (панорамирование при этом не сбрасывается)
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY
  const step = delta > 0 ? -0.1 : 0.1
  const newScale = Math.max(minScale, Math.min(maxScale, scale.value + step))
  if (newScale !== scale.value) {
    scale.value = newScale
    applyTransform()
  }
}


function get_mermaid_code(): string {
  const data = store.production_graph_data
  if (!data) return ''

  const lines: string[] = ['flowchart RL']
  lines.push('classDef product fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
  lines.push('classDef rawMat fill:#fff3e0,stroke:#ff9800,stroke-width:2px')

  for (const row of data.material_chain) {
    lines.push(`material_${row.material_id} -->|Вес: ${row.material_weight} кг.| operation_${row.operation_id}`)
  }
  for (const row of data.product_chain) {
    lines.push(`operation_${row.operation_id} -->|Вес: ${row.product_weight} кг.| material_${row.product_id}`)
  }
  for (const row of data.operation_node) {
    lines.push(`operation_${row.operation_id}["${row.operation}<br/>Выход продуктов: ${row.product_operation_weight}<br/>Выход операции всего: ${row.total_operation_weight}<br/>Коэфф: ${row.koeff}"]`)
  }
  for (const row of data.material_node) {
    lines.push(`material_${row.material_id}(["${row.material}<br/>Коэфф: ${row.koeff}"])`)
    lines.push(`material_${row.material_id}:::product`)
  }
  for (const row of data.raw_material_node) {
    lines.push(`material_${row.material_id}(["${row.material}<br/>Вес: ${row.weight_out} кг."])`)
    lines.push(`material_${row.material_id}:::rawMat`)
  }

  return lines.join('\n')
}

const renderMermaid = (mermaidStr: string) => {
  if (!svgContainer.value) return

  svgContainer.value.innerHTML = ''
  const source = mermaidStr.trim()
  if (!source) {
    svgContainer.value.textContent = 'Нет данных для построения графа.'
    return
  }

  // Ставим флаг: сейчас будем рендерить
  isRenderingMermaid.value = true

  const rawBlock = document.createElement('div')
  rawBlock.className = 'mermaid'
  rawBlock.innerHTML = source
  svgContainer.value.appendChild(rawBlock)

  const forceReflow = svgContainer.value.offsetHeight

  nextTick(async () => {
    const rect = svgContainer.value?.getBoundingClientRect()
    if (!rect?.width || !rect?.height) {
      console.warn('[Mermaid] Контейнер нулевой — рендер отменяется')
      isRenderingMermaid.value = false
      return
    }

    await new Promise(resolve => setTimeout(resolve, 50))

    ;(window as any).mermaid.init({
      flowchart: {
        useMaxWidth: true,
        height: rect.height,
      },
    }, '.mermaid')

    isRendered.value = true
    applyTransform()

    // Снимаем флаг: Mermaid отрисовал SVG, можно показывать
    isRenderingMermaid.value = false
  })
}

onMounted(async () => {
  const item_ids = props.ids.toString() ?? ''
  if (!item_ids) return

  loading.value = true
  error.value = null

  try {
    await store.fetchProductionGraphData({
      type: props.type,
      item_ids,
    })
    const mermaidStr = get_mermaid_code()
    //console.log('mermaid', mermaidStr);
    renderMermaid(mermaidStr)

    if (svgContainer.value) {
      svgContainer.value.addEventListener('wheel', handleWheel, { passive: false })
    }
  } catch (e: any) {
    console.error('loadGraph error:', e)
    error.value = e.message || 'Ошибка при построении графа'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (svgContainer.value) {
    svgContainer.value.removeEventListener('wheel', handleWheel)
  }
})
</script>

<style scoped>
.mermaid-container {
  width: 100%;
  position: relative;
}
.loading-state,
.error-state {
  padding: 20px;
  text-align: center;
}
.error-state {
  color: #ff4d4f;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: flex-start;
}
.zoom-value {
  font-weight: 600;
  min-width: 48px;
  text-align: center;
}

/* Зона рендера: фиксируем размеры и скролл (на случай, если граф очень большой до зума) */
.mermaid-render-area {
  width: 100%;
  min-height: calc(100vh - 260px);
  max-height: calc(100vh - 260px);
  overflow: auto;
  text-align: center;
  box-sizing: border-box;
  cursor: grab;
}
.mermaid-render-area:active {
  cursor: grabbing;
}

/* Стили скроллбара */
.mermaid-render-area::-webkit-scrollbar {
  width: 8px;
}
.mermaid-render-area::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.mermaid-render-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.mermaid-render-area.mermaid-hidden {
  visibility: hidden; /* скрывает содержимое, но оставляет место */
  pointer-events: none; /* отключаем события мыши, чтобы не мешал */
}

.mermaid-render-area.mermaid-hidden::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

</style>
