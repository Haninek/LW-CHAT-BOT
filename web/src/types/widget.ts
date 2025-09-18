export interface ApiWidgetConfig {
  id: string
  title: string
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  refreshInterval?: number // in seconds
  displayType: 'stat' | 'chart' | 'table' | 'custom'
  icon?: string
  color?: 'primary' | 'success' | 'warning' | 'accent'
  // Data extraction configuration
  valuePath?: string // JSONPath or dot notation (e.g., 'data.priceUsd', 'bpi.USD.rate_float')
  subtitlePath?: string
  trendPath?: string
  transform?: (data: any) => WidgetData // Custom transformation function
  formatter?: 'currency' | 'number' | 'percentage' | 'none'
  unit?: string
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
  timestamp: string
}

export interface WidgetData {
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  metadata?: Record<string, any>
}

export interface WidgetState {
  data: WidgetData | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}