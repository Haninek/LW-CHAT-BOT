import React from 'react'

interface DynamicCsvTableProps {
  rowsRaw: Record<string, string>[]
}

export function DynamicCsvTable({ rowsRaw }: DynamicCsvTableProps) {
  if (!rowsRaw?.length) return null

  // Get all unique keys from all rows to ensure we show all columns
  const allKeys = Array.from(
    new Set(rowsRaw.flatMap(row => Object.keys(row)))
  )

  const formatCellValue = (value: string, key: string): string => {
    // Format numeric values that look like money
    if (key.includes('balance') || key.includes('deposit') || key.includes('withdrawal') || key.includes('credit')) {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(num)
      }
    }
    
    // Format count fields
    if (key.includes('count')) {
      const num = parseInt(value)
      if (!isNaN(num)) {
        return num.toLocaleString()
      }
    }
    
    return value || ''
  }

  const formatHeaderName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Pfsingle/g, 'PFSINGLE')
      .replace(/Sba/g, 'SBA')
      .replace(/Eidl/g, 'EIDL')
      .replace(/Cc/g, 'CC')
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h4 className="text-md font-semibold text-slate-900">
          Monthly Analysis Data ({rowsRaw.length} months)
        </h4>
        <p className="text-sm text-slate-600 mt-1">
          Complete breakdown of all monthly metrics from bank statements
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {allKeys.map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left font-medium text-slate-700 whitespace-nowrap"
                >
                  {formatHeaderName(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsRaw.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-slate-100 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                } hover:bg-slate-100/50`}
              >
                {allKeys.map((key) => (
                  <td
                    key={key}
                    className="px-4 py-3 text-slate-900 whitespace-nowrap"
                  >
                    {formatCellValue(row[key] || '', key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}