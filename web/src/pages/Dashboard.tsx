import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap,
  BarChart3,
  Shield,
  Database,
  Globe,
  RefreshCw
} from 'lucide-react'
import { apiClient } from '../lib/api'
import { ApiWidget } from '../components/ApiWidget'
import { ApiWidgetConfig } from '../types/widget'

interface HealthData {
  status: string
  uptime: number
}

interface ReadinessData {
  ready: boolean
  checks: Record<string, boolean>
}

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', trend, isLoading = false }: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color?: 'primary' | 'success' | 'warning' | 'error'
  trend?: { value: number; direction: 'up' | 'down' }
  isLoading?: boolean
}) {
  const colorClasses = {
    primary: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    success: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    warning: 'from-amber-500 to-amber-600 shadow-amber-500/25', 
    error: 'from-red-500 to-red-600 shadow-red-500/25'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
          </div>
          <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-300 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2 mb-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-3 text-sm font-medium ${
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${
                trend.direction === 'down' ? 'rotate-180' : ''
              }`} />
              {Math.abs(trend.value)}% vs last month
            </div>
          )}
        </div>
        <div className={`w-14 h-14 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

function QuickAction({ title, description, icon: Icon, onClick, color = 'primary' }: {
  title: string
  description: string
  icon: any
  onClick: () => void
  color?: 'primary' | 'success' | 'warning'
}) {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${colorClasses[color]}`}
    >
      <div className="flex items-center">
        <Icon className="w-8 h-8 mr-3" />
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

export function Dashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [healthResult, readinessResult] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.getReadiness()
      ])

      if (healthResult.status === 'fulfilled') {
        setHealthData(healthResult.value.data || null)
      } else {
        console.warn('Health check failed:', healthResult.reason)
        setHealthData(null)
      }

      if (readinessResult.status === 'fulfilled') {
        setReadinessData(readinessResult.value.data || null)
      } else {
        console.warn('Readiness check failed:', readinessResult.reason)
        setReadinessData(null)
      }

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Mock analytics data for now
  const mockStats = [
    { title: 'Total Applications', value: '1,247', subtitle: 'This month', icon: Users, color: 'primary' as const, trend: { value: 12, direction: 'up' as const } },
    { title: 'Approved Amount', value: '$2.4M', subtitle: 'This quarter', icon: DollarSign, color: 'success' as const, trend: { value: 8, direction: 'up' as const } },
    { title: 'Processing Time', value: '2.3 min', subtitle: 'Average', icon: Clock, color: 'warning' as const, trend: { value: 15, direction: 'down' as const } },
    { title: 'Success Rate', value: '94.2%', subtitle: 'Approval rate', icon: CheckCircle, color: 'success' as const, trend: { value: 3, direction: 'up' as const } }
  ]

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Unknown'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getHealthStatus = () => {
    if (!healthData) return { status: 'Offline', color: 'error' as const }
    return healthData.status === 'healthy' 
      ? { status: 'Healthy', color: 'success' as const }
      : { status: 'Issues', color: 'warning' as const }
  }

  const getReadinessCount = () => {
    if (!readinessData) return { ready: 0, total: 0 }
    const checks = Object.values(readinessData.checks)
    return {
      ready: checks.filter(Boolean).length,
      total: checks.length
    }
  }

  const health = getHealthStatus()
  const readiness = getReadinessCount()

  // Working demo API widgets with proper CORS-enabled endpoints
  const exampleApiWidgets: ApiWidgetConfig[] = [
    {
      id: 'demo-posts',
      title: 'Total Posts',
      endpoint: 'https://jsonplaceholder.typicode.com/posts',
      method: 'GET',
      refreshInterval: 60,
      displayType: 'stat',
      color: 'primary',
      valuePath: 'length',
      formatter: 'number'
    },
    {
      id: 'demo-users', 
      title: 'Active Users',
      endpoint: 'https://jsonplaceholder.typicode.com/users',
      method: 'GET',
      refreshInterval: 120,
      displayType: 'stat',
      color: 'success',
      valuePath: 'length',
      formatter: 'number'
    },
    {
      id: 'demo-comments',
      title: 'Comments Today',
      endpoint: 'https://jsonplaceholder.typicode.com/comments?postId=1',
      method: 'GET',
      refreshInterval: 30,
      displayType: 'stat',
      color: 'info',
      valuePath: 'length',
      formatter: 'number'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Underwriting Wizard
              </h1>
              <p className="text-slate-600 mt-1">
                AI-powered lending operations platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {lastRefresh && (
                <div className="text-sm text-slate-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              )}
              <motion.button
                onClick={loadDashboardData}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* System Health Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">System Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <StatCard
              title="Service Status"
              value={health.status}
              subtitle={healthData ? `Uptime: ${formatUptime(healthData.uptime)}` : 'Checking...'}
              icon={health.color === 'success' ? CheckCircle : AlertCircle}
              color={health.color}
              isLoading={loading && !healthData}
            />
            <StatCard
              title="Service Readiness"
              value={`${readiness.ready}/${readiness.total}`}
              subtitle="External services ready"
              icon={readiness.ready === readiness.total ? Shield : AlertCircle}
              color={readiness.ready === readiness.total ? 'success' : 'warning'}
              isLoading={loading && !readinessData}
            />
          </div>
        </motion.div>

        {/* Analytics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Analytics Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {mockStats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        </motion.div>

        {/* API Widgets Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">REST API Widgets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {exampleApiWidgets.map((widget) => (
              <ApiWidget key={widget.id} config={widget} />
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              Quick Actions
            </h3>
            <div className="grid gap-4">
              <QuickAction
                title="Analyze Statements"
                description="Upload bank statements for analysis"
                icon={BarChart3}
                color="primary"
                onClick={() => {}}
              />
              <QuickAction
                title="Generate Offers"
                description="Create loan offers based on analysis"
                icon={DollarSign}
                color="success"
                onClick={() => {}}
              />
              <QuickAction
                title="System Configuration"
                description="Configure API endpoints and settings"
                icon={Database}
                color="warning"
                onClick={() => {}}
              />
            </div>
          </motion.div>

          {/* API Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-indigo-600" />
              REST API Integration
            </h3>
            
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200/50 mb-4">
              <h4 className="font-medium text-slate-800 mb-2">📋 Configuration Example</h4>
              <pre className="text-xs bg-white/60 p-3 rounded-lg border border-white/20 overflow-x-auto">
{`{
  "id": "my-api-widget",
  "title": "My Data Widget", 
  "endpoint": "https://api.example.com/data",
  "method": "GET",
  "refreshInterval": 60,
  "displayType": "stat",
  "color": "primary",
  "valuePath": "data.value",
  "formatter": "currency"
}`}
              </pre>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-800">Real-time Updates</span>
                  <p className="text-slate-600">Automatic refresh with configurable intervals</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-800">Data Formatters</span>
                  <p className="text-slate-600">Currency, number, percentage formatting</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-slate-800">Error Handling</span>
                  <p className="text-slate-600">Graceful fallbacks and retry logic</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> The demo widgets above show live data from JSONPlaceholder API. Replace endpoints with your own!
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}