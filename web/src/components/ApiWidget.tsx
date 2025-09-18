import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useApiWidget } from '../hooks/useApiWidget'
import { ApiWidgetConfig } from '../types/widget'

interface ApiWidgetProps {
  config: ApiWidgetConfig
  className?: string
}

export function ApiWidget({ config, className = '' }: ApiWidgetProps) {
  const { data, loading, error, lastUpdated, refetch } = useApiWidget(config)

  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600', 
    warning: 'from-warning-500 to-warning-600',
    accent: 'from-accent-500 to-accent-600'
  }

  // Icon color classes for potential future use
  // const iconColorClasses = {
  //   primary: 'text-primary-600',
  //   success: 'text-success-600',
  //   warning: 'text-warning-600', 
  //   accent: 'text-accent-600'
  // }

  const color = config.color || 'primary'

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card border-l-4 border-l-accent-500 ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-600">{config.title}</h3>
          <button
            onClick={refetch}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex items-center space-x-2 text-accent-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Connection failed</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card group hover:scale-105 transition-transform ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-slate-600">{config.title}</h3>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </div>
        <div className="flex items-center space-x-2">
          {loading && (
            <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900">
                {data?.value ?? '--'}
              </p>
              {data?.subtitle && (
                <p className="text-xs text-slate-500 mt-1">{data.subtitle}</p>
              )}
              {data?.trend && (
                <div className={`flex items-center mt-2 text-xs ${
                  data.trend.direction === 'up' ? 'text-success-600' : 'text-accent-600'
                }`}>
                  {data.trend.direction === 'up' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {data.trend.value}%
                </div>
              )}
            </>
          )}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
          <ExternalLink className="w-6 h-6 text-white" />
        </div>
      </div>

      {lastUpdated && !loading && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </motion.div>
  )
}