import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

export interface ExcelSheetConfig {
  name: string
  columns: Array<{ key: string; header: string }>
  data: any[]
}

export const exportToExcel = (
  sheets: ExcelSheetConfig[],
  filenamePrefix: string = 'report'
) => {
  if (!sheets.length) {
    ElMessage.warning('Нет данных для экспорта')
    return
  }

  const wb = XLSX.utils.book_new()
  let hasData = false

  sheets.forEach((sheet) => {
    if (!sheet.data.length) return

    hasData = true

    // 1. Сначала формируем массив строк (только нужные поля)
    const rows = sheet.data.map((row) => {
      const obj: Record<string, any> = {}
      sheet.columns.forEach((col) => {
        obj[col.key] = row[col.key] ?? ''
      })
      return obj
    })

    // 2. Создаём лист из JSON
    const ws = XLSX.utils.json_to_sheet(rows, { header: sheet.columns.map(c => c.key) })

    // 3. Перезаписываем заголовки ячеек на пользовательские (header)
    // В XLSX первая строка — это заголовки. Мы меняем текстовые значения ячеек.
    sheet.columns.forEach((col, index) => {
      // A1=0, B1=1, ...
      const cellRef = XLSX.utils.encode_cell({ c: index, r: 0 })
      if (ws[cellRef]) {
        ws[cellRef].v = col.header
        ws[cellRef].t = 's' // тип string
      }
    })

    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  })

  if (!hasData) {
    ElMessage.warning('В выбранных данных нет строк для экспорта')
    return
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${filenamePrefix}_${dateStr}.xlsx`

  XLSX.writeFile(wb, filename)
}
