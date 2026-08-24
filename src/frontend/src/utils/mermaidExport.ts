import { ElMessage } from 'element-plus'

/**
 * Экспортирует SVG из любого контейнера с Mermaid-графом.
 * Работает независимо от зума/скролла: сохраняет ВЕСЬ граф целиком.
 */
export const saveMermaidSvg = (containerRef: HTMLElement | null, filenamePrefix: string = 'graph') => {
  if (!containerRef) {
    ElMessage.error('Контейнер с графом не найден')
    return
  }

  const svg = containerRef.querySelector('svg') as SVGSVGElement | null
  if (!svg) {
    ElMessage.error('SVG-элемент внутри контейнера не найден')
    return
  }

  // Клонируем, чтобы не трогать DOM в UI
  const cloned = svg.cloneNode(true) as SVGSVGElement

  // Гарантируем наличие namespace
  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(cloned)
  const blob = new Blob([xmlString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${filenamePrefix}_${dateStr}.svg`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Освобождаем память
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
