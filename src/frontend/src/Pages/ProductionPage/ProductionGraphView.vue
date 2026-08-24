<template>
  <div class="graph-wrapper">
    <div class="graph-controls">
      <div v-if="props.type==='product'" class="coeff-toggle-group">
        <span class="coeff-label">с учётом коэффициентов списания</span>
        <el-switch v-model="withCoefficients" size="small" />
      </div>

      <span class="separator-line" />

      <el-button size="small" @click="zoomOut" plain type="info">
        <template #icon><el-icon :size="14"><Minus /></el-icon></template>
      </el-button>

      <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>

      <el-button size="small" @click="zoomIn" plain type="info">
        <template #icon><el-icon :size="14"><Plus /></el-icon></template>
      </el-button>

      <el-button size="small" @click="resetView" plain type="primary">Сброс</el-button>

    <span class="separator-line" />

      <el-button
        size="small"
        type="success"
        @click="saveGraphAsSvg"
      >
        <template #icon><el-icon :size="14"><Download /></el-icon></template>
      Сохранить как SVG
      </el-button>

    </div>

    <!-- ВАЖНО: overflow: auto здесь даёт изолированный скролл -->
    <div
      ref="svgContainer"
      class="mermaid-render-area"
      @mousedown="onPanStart"
      @mouseleave="onPanEnd"
      @mouseup="onPanEnd"
    >
      <div v-if="loading" class="overlay-loader">Строим граф...</div>
      <div v-else-if="error" class="error-state">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import useApplicationStore from '@/store'
import { Minus, Plus, Download } from '@element-plus/icons-vue'
import { saveMermaidSvg } from '@/utils/mermaidExport'

const props = defineProps<{
  type: 'material' | 'product' | 'operation'
  ids: number[]
}>()

const svgContainer = ref<HTMLElement | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)
let wheelListenerAttached = false

// Зум и панорамирование
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)

const minScale = 0.5
const maxScale = 3

// Переключатель коэффициентов — теперь boolean
const withCoefficients = ref(false)

const store = useApplicationStore()

// --- Панорамирование ---
let isDragging = false
let startX = 0
let startY = 0
let startPanX = 0
let startPanY = 0

const onPanStart = (e: MouseEvent) => {
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

const applyTransform = () => {
  const svg = svgContainer.value?.querySelector('svg')
  if (!svg) return

  svg.style.transform = `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`
  svg.style.transformOrigin = '0 0'
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

// --- Зум по колёсику ---
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

function get_mermaid_code(withCoeff: boolean = false): string {
  const lines: string[] = []

  if (props.type === 'product') {
    const data_product = store.production_graph_data_product as frontend.IProductionGraphDataBackward;

    lines.push('flowchart RL')
    lines.push('classDef product fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
    lines.push('classDef rawMat fill:#fff3e0,stroke:#ff9800,stroke-width:2px')

    const escapeLabel = (text: string) => text.replace(/"/g, '\\"')

    for (const row of data_product.material_chain) {
      let label = ''
      const adjusted_material_weight_label = row.adjusted_material_weight &&
        row.material_weight !== row.adjusted_material_weight
        ? `(${row.adjusted_material_weight} кг)`
        : ''

      if (withCoeff) {
        label = row.koeff === 1
          ? `-->|"${row.material_weight} кг ${adjusted_material_weight_label}"|`
          : `-->|"${row.material_weight} кг (${row.koeff}) ${adjusted_material_weight_label}"|`
      } else {
        label = `-->|${row.material_weight} кг|`
      }
      lines.push(`material_${row.material_id} ${label} operation_${row.operation_id}`)
    }

    for (const row of data_product.product_chain) {
      const label = withCoeff && row.koeff !== 1
        ? `-->|"${row.product_weight} кг (${row.koeff})"|`
        : `-->|${row.product_weight} кг|`
      lines.push(`operation_${row.operation_id} ${label} material_${row.product_id}`)
    }

    for (const row of data_product.operation_node) {
      const parts = withCoeff
        ? [
            row.process_name,
            row.operation,
            `Выход продуктов: ${row.product_operation_weight} кг`,
            `Выход операции всего: ${row.total_operation_weight} кг`,
            `Коэфф: ${row.koeff}`,
          ]
        : [
            row.process_name,
            row.operation,
            `Выход продуктов: ${row.product_operation_weight} кг`,
            `Выход операции всего: ${row.total_operation_weight} кг`,
          ]
      const label = escapeLabel(parts.join('<br/>'))
      lines.push(`operation_${row.operation_id}["${label}"]`)
    }

    for (const row of data_product.material_node) {
      const label = escapeLabel(`${row.material}`)
      lines.push(`material_${row.material_id}(["${label}"]):::product`)
    }

    for (const row of data_product.raw_material_node) {
      const parts = [
        `${row.material}`,
        withCoeff && row.weight_out && row.weight_out !== row.adjusted_weight_out
          ? `Вес: ${row.weight_out} (${row.adjusted_weight_out}) кг.`
          : `Вес: ${row.weight_out} кг.`,
      ]
      const label = escapeLabel(parts.join('<br/>'))
      lines.push(`material_${row.material_id}(["${label}"]):::rawMat`)
    }


  } else if (props.type === 'material') {
    const data_material = store.production_graph_data_material as frontend.IProductionGraphDataForward;

    lines.push('flowchart LR')
    lines.push('classDef product fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
    lines.push('classDef finalProduct fill:#fff3e0,stroke:#ff9800,stroke-width:2px')

    const escapeLabel = (text: string) => text.replace(/"/g, '\\"')

    for (const row of data_material.material_chain) {
      const label = `-->|${row.material_weight} кг|`
      lines.push(`material_${row.material_id} ${label} operation_${row.operation_id}`)
    }

    for (const row of data_material.product_chain) {
      const label =  `-->|${row.product_weight} кг|`
      lines.push(`operation_${row.operation_id} ${label} material_${row.product_id}`)
    }

    for (const row of data_material.operation_node) {
      const parts = [
            row.process_name,
            row.operation,
            `Вход материалов: ${row.material_operation_weight} кг`,
            `Вход материалов всего: ${row.total_operation_weight} кг`,
          ]
      const label = escapeLabel(parts.join('<br/>'))
      lines.push(`operation_${row.operation_id}["${label}"]`)
    }

    for (const row of data_material.material_node) {
      const label = escapeLabel(`${row.material}`)
      lines.push(`material_${row.material_id}(["${label}"]):::product`)
    }

    for (const row of data_material.final_product_node) {
      const parts = [
        `${row.product}`,
        `Вес: ${row.weight_in} кг.`,
      ]
      const label = escapeLabel(parts.join('<br/>'))
      lines.push(`material_${row.product_id}(["${label}"]):::finalProduct`)
    }
    

  } else {
    return '';
  }

  return lines.join('\n')
}

const renderMermaid = (mermaidStr: string) => {
  if (!svgContainer.value) return

  detachWheelListener()
  svgContainer.value.innerHTML = ''

  const source = mermaidStr.trim()
  if (!source) {
    svgContainer.value.textContent = 'Нет данных для построения графа.'
    attachWheelListener()
    return
  }

  const rawBlock = document.createElement('div')
  rawBlock.className = 'mermaid'
  rawBlock.innerHTML = source
  svgContainer.value.appendChild(rawBlock)

  void svgContainer.value.offsetHeight // принудительный reflow

  ;(window as any).mermaid.init(
    { flowchart: { useMaxWidth: true } },
    '.mermaid'
  )

  attachWheelListener()
}

const renderGraph = async () => {
  const item_ids = props.ids.toString() ?? ''
  if (!item_ids) return

  loading.value = true
  error.value = null

  try {
    await store.fetchProductionGraphData({
      type: props.type,
      item_ids,
    })

    const mermaidStr = get_mermaid_code(withCoefficients.value)
    renderMermaid(mermaidStr)
  } catch (e: any) {
    console.error('loadGraph error:', e)
    error.value = e.message || 'Ошибка при построении графа'
  } finally {
    loading.value = false
  }
}

watch(withCoefficients, async () => {
  await renderGraph()
})

const attachWheelListener = () => {
  if (wheelListenerAttached) return
  const el = svgContainer.value
  if (!el) return

  el.addEventListener('wheel', handleWheel, { passive: false })
  wheelListenerAttached = true
}

const detachWheelListener = () => {
  const el = svgContainer.value
  if (!el) return

  el.removeEventListener('wheel', handleWheel)
  wheelListenerAttached = false
}

onMounted(async () => {
  await renderGraph()
})

onUnmounted(() => {
  detachWheelListener()
})

const saveGraphAsSvg = () => {
  saveMermaidSvg(svgContainer.value, 'product-graph')
}

</script>

<style scoped>
.graph-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 20px);
  max-width: 100%;
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  z-index: 10;
  position: sticky;
  top: 0;
  margin-bottom: 8px;
}

.coeff-toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coeff-label {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
}

.separator-line {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

.zoom-value {
  font-weight: 500;
  color: #333;
}

/* ГЛАВНОЕ: изолированный скролл + ограничение ширины */
.mermaid-render-area {
  flex: 1;
  min-height: 0; /* обязательно для flex-скролла */
  width: 100%;
  overflow: auto; /* вместо visible */
  text-align: center;
  box-sizing: border-box;
  cursor: grab;
  position: relative;
  /* Опционально: тонкая рамка, чтобы видеть границы области */
  border: 1px solid transparent;
}

.mermaid-render-area:active {
  cursor: grabbing;
}

/* Ограничиваем размер SVG, чтобы он не вылезал */
.mermaid-render-area svg {
  max-width: 100%; /* не шире контейнера */
  max-height: none;
  width: auto !important;
  height: auto !important;
  display: block;
  /* margin: 0 auto убран — он конфликтует с transform и скроллом */
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: auto;
}

.overlay-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  color: #333;
  font-weight: 500;
}

.error-state {
  padding: 24px;
  text-align: center;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  margin-top: 16px;
}
</style>
