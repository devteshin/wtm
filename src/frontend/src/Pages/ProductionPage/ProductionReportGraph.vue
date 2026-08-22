<template>
  <div class="mermaid-container" ref="containerRef">
    <div class="graph-controls">
      <!-- Управление масштабом -->
      <el-button size="small" @click="zoomOut" plain type="info">
        <template #icon><el-icon :size="14"><Minus /></el-icon></template>
      </el-button>
      <span class="zoom-value">{{ Math.round(scale * 100) }}%</span>
      <el-button size="small" @click="zoomIn" plain type="info">
        <template #icon><el-icon :size="14"><Plus /></el-icon></template>
      </el-button>

      <!-- Сброс и обновление -->
      <el-button size="small" @click="resetView" plain type="primary">Сброс</el-button>

      <span class="separator-line" />

      <div class="coeff-toggle-group">
        <span class="coeff-label">с учётом коэффициентов списания материалов</span>
        <el-switch
          v-model="withCoefficients"
          size="small"
        />
        <span class="separator-line" />
        <span class="coeff-label">таблицы расчёта коэффициентов</span>
        <el-switch
          v-model="withCoefficientsDetailsTables"
          :disabled="!withCoefficients"
          size="small"
        />
      </div>
      <span class="separator-line" />
    </div>

    <!-- Таблицы расчётов (показываются только если флаг включён) -->
    <div
      v-if="withCoefficients && withCoefficientsDetailsTables"
      class="coeff-tables-wrapper"
    >
      <!-- Таблица 1: Расчёт коэффициентов списания -->
      <div class="coeff-table-card">
        <h4 class="table-title">Таблица расчёта коэффициентов списания</h4>
        <el-table
          :data="store.production_graph_data?.operation_sequences || []"
          style="width: 100%"
          :border="true"
          size="small"
        >
          <el-table-column prop="operation_sequence" label="Операция (последовательность)" width="220" />
          <el-table-column prop="koeff" label="Коэффициент" width="120">
            <template #default="scope">
              {{ scope.row.koeff.toFixed(4) }}
            </template>
          </el-table-column>
          <el-table-column prop="next_operation" label="Следующая операция" />
        </el-table>
      </div>

      <!-- Таблица 2: Расчётные веса списания исходных материалов -->
      <div class="coeff-table-card">
        <h4 class="table-title">Расчётные веса списания исходных материалов</h4>
        <el-table
          :data="store.production_graph_data?.raw_material_node || []"
          style="width: 100%"
          :border="true"
          size="small"
        >
          <el-table-column prop="material" label="Материал" width="200" />
          <el-table-column prop="adjusted_weight_out" label="Скорректированный вес (кг)">
            <template #default="scope">
              {{ Number(scope.row.adjusted_weight_out).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
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
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
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

// Флаги отображения
const withCoefficients = ref(false)
const withCoefficientsDetailsTables = ref(false)

const store = useApplicationStore()

// --- Перетаскивание ---
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

// --- Зум ---
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

// Зум по колёсику
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

function get_mermaid_code(withCoeff: boolean = true): string {
  const data = store.production_graph_data
  if (!data) return ''

  const lines: string[] = ['flowchart RL']
  lines.push('classDef product fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
  lines.push('classDef rawMat fill:#fff3e0,stroke:#ff9800,stroke-width:2px')

  const escapeLabel = (text: string) => text.replace(/"/g, '\\"')

  for (const row of data.material_chain) {
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

  for (const row of data.product_chain) {
    const label = withCoeff && row.koeff !== 1
      ? `-->|"${row.product_weight} кг (${row.koeff})"|`
      : `-->|${row.product_weight} кг|`
    lines.push(`operation_${row.operation_id} ${label} material_${row.product_id}`)
  }

  for (const row of data.operation_node) {
    const parts = withCoeff
      ? [
          row.process_name,
          row.operation,
          `Выход продуктов: ${row.product_operation_weight}`,
          `Выход операции всего: ${row.total_operation_weight}`,
          `Коэфф: ${row.koeff}`,
        ]
      : [row.process_name, row.operation]
    const label = escapeLabel(parts.join('<br/>'))
    lines.push(`operation_${row.operation_id}["${label}"]`)
  }

  for (const row of data.material_node) {
    const label = escapeLabel(`${row.material}`)
    lines.push(`material_${row.material_id}(["${label}"]):::product`)
  }

  for (const row of data.raw_material_node) {
    const parts = [
      `${row.material}`,
      withCoeff && row.weight_out && row.weight_out !== row.adjusted_weight_out
        ? `Вес: ${row.weight_out} (${row.adjusted_weight_out}) кг.`
        : `Вес: ${row.weight_out} кг.`,
    ]
    const label = escapeLabel(parts.join('<br/>'))
    lines.push(`material_${row.material_id}(["${label}"]):::rawMat`)
  }

  return lines.join('\n')
}

const renderMermaid = (mermaidStr: string) => {
  if (!svgContainer.value) return

  svgContainer.value.innerHTML = ''
  const source = mermaidStr.trim()
  if (!source) {
    svgContainer.value.textContent = 'Нет данных для построения графа.'
    isRenderingMermaid.value = false
    return
  }

  isRenderingMermaid.value = true

  const rawBlock = document.createElement('div')
  rawBlock.className = 'mermaid'
  rawBlock.innerHTML = source
  svgContainer.value.appendChild(rawBlock)

  // Принудительный reflow
  void svgContainer.value.offsetHeight

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
    isRenderingMermaid.value = false
  })
}

const renderGraph = async () => {
  const item_ids = props.ids.toString() ?? ''
  if (!item_ids) return

  loading.value = true
  error.value = null
  isRendered.value = false

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

watch(withCoefficientsDetailsTables, () => {
  // Таблицы не требуют перерисовки графа, но можно добавить логику, если позже понадобится
  // Например, пересчёт сводных значений или валидацию данных
})

onMounted(async () => {
  await renderGraph()

  if (svgContainer.value) {
    svgContainer.value.addEventListener('wheel', handleWheel, { passive: false })
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

.graph-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.separator-line {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 8px;
}

.zoom-value {
  font-weight: 600;
  min-width: 48px;
  text-align: center;
}

/* Зона рендера: фиксируем размеры и скролл */
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
  visibility: hidden;
  pointer-events: none;
}

.mermaid-render-area.mermaid-hidden::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.coeff-toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coeff-label {
  font-size: 13px;
  line-height: 20px;
  color: #333;
  white-space: nowrap;
}

/* Контейнер для двух таблиц */
.coeff-tables-wrapper {
  display: flex;
  flex-direction: row;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* Карточка таблицы — для отступов и фона */
.coeff-table-card {
  flex: 1 1 450px; /* на десктопе занимают примерно половину, но не меньше 450px */
  min-width: 300px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

/* Адаптив: на узких экранах таблицы друг под другом */
@media (max-width: 960px) {
  .coeff-tables-wrapper {
    flex-direction: column;
  }

  .coeff-table-card {
    flex: 1 1 100%;
    min-width: 100%;
  }
}
</style>
