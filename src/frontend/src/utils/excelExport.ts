import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

export interface ExcelSheetConfig {
  name: string
  columns: Array<{ key: string; header: string }>
  data: any[] // массив объектов
}

/**
 * Экспортирует несколько листов в один Excel-файл.
 * Подходит для любого компонента: можно передать 1 лист или 10.
 */
export const exportToExcel = (
  sheets: ExcelSheetConfig[],
  filenamePrefix: string = 'report'
) => {
  if (!sheets.length) {
    ElMessage.warning('Нет данных для экспорта')
    return
  }

  const wb = XLSX.utils.book_new()

  sheets.forEach((sheet) => {
    if (!sheet.data.length) return // пропускаем пустые листы

    // Формируем плоский массив строк только с нужными колонками
    const rows = sheet.data.map((row) => {
      const obj: Record<string, any> = {}
      sheet.columns.forEach((col) => {
        obj[col.key] = row[col.key] ?? ''
      })
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  })

  // Если все листы пустые — сообщаем и выходим
  const hasData = sheets.some((s) => s.data.length > 0)
  if (!hasData) {
    ElMessage.warning('В выбранных данных нет строк для экспорта')
    return
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${filenamePrefix}_${dateStr}.xlsx`

  XLSX.writeFile(wb, filename)
}
