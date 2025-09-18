import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ApiWidgetConfig, WidgetState, WidgetData } from '../types/widget'

export function useApiWidget(config: ApiWidgetConfig): WidgetState & { refetch: () => void } {
  const [state, setState] = useState<WidgetState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  })

  const abortControllerRef = useRef<AbortController>()
  const intervalRef = useRef<number>()
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<number>()
  const maxRetries = 3

  // Memoize config to prevent unnecessary re-fetches
  const stableConfig = useMemo(() => config, [
    config.id,
    config.endpoint,
    config.method,
    config.refreshInterval,
    JSON.stringify(config.headers),
    JSON.stringify(config.body)
  ])

  const fetchData = useCallback(async () => {
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const headers: Record<string, string> = {
        ...stableConfig.headers
      }
      
      // Only add Content-Type for requests with body
      if (stableConfig.body && (stableConfig.method === 'POST' || stableConfig.method === 'PUT')) {
        headers['Content-Type'] = 'application/json'
      }
      
      const requestOptions: RequestInit = {
        method: stableConfig.method || 'GET',
        headers,
        signal: abortControllerRef.current.signal
      }

      if (stableConfig.body && (stableConfig.method === 'POST' || stableConfig.method === 'PUT')) {
        requestOptions.body = JSON.stringify(stableConfig.body)
      }

      const response = await fetch(stableConfig.endpoint, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      // Transform response data into widget format
      const widgetData: WidgetData = transformApiResponse(responseData)

      setState({
        data: widgetData,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })

      // Reset retry count on successful fetch
      retryCountRef.current = 0

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was aborted, don't update state
      }

      // Retry logic with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000) // Max 10s
        const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd
        
        retryTimeoutRef.current = window.setTimeout(() => {
          fetchData()
        }, backoffDelay + jitter)
        
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }, [stableConfig])

  // Helper function to extract value using dot notation path
  const extractByPath = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  // Transform API response to widget data format
  const transformApiResponse = (response: any): WidgetData => {
    // Use custom transform function if provided
    if (stableConfig.transform) {
      return stableConfig.transform(response)
    }

    // Use path-based extraction if configured
    let value: any = 'N/A'
    let subtitle: string | undefined
    let trend: any

    if (stableConfig.valuePath) {
      const extractedValue = extractByPath(response, stableConfig.valuePath)
      if (extractedValue !== undefined) {
        value = extractedValue
      }
    } else {
      // Fallback to common patterns
      value = response.value ?? response.count ?? response.total ?? response.amount ?? response.price ?? 'N/A'
    }

    if (stableConfig.subtitlePath) {
      subtitle = extractByPath(response, stableConfig.subtitlePath)
    }

    if (stableConfig.trendPath) {
      trend = extractByPath(response, stableConfig.trendPath)
    }

    // Parse numeric strings before formatting
    if (typeof value === 'string' && !isNaN(Number(value))) {
      value = Number.parseFloat(value)
    }
    
    // Apply formatting
    if (typeof value === 'number' && stableConfig.formatter) {
      switch (stableConfig.formatter) {
        case 'currency':
          value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
          break
        case 'number':
          value = new Intl.NumberFormat('en-US').format(value)
          break
        case 'percentage':
          value = `${value.toFixed(2)}%`
          break
      }
    }

    if (stableConfig.unit && typeof value === 'number') {
      value = `${value} ${stableConfig.unit}`
    }

    return {
      value,
      subtitle: subtitle ?? response.subtitle ?? response.description ?? response.label,
      trend,
      metadata: response
    }
  }

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Set up auto-refresh if configured
    if (stableConfig.refreshInterval && stableConfig.refreshInterval > 0) {
      intervalRef.current = window.setInterval(() => fetchData(), stableConfig.refreshInterval * 1000)
    }

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchData, stableConfig.refreshInterval])

  return {
    ...state,
    refetch
  }
}