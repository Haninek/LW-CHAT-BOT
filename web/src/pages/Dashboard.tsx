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
    primary: 'premium-gradient shadow-blue-500/30',
    success: 'success-gradient shadow-emerald-500/30',
    warning: 'warning-gradient shadow-amber-500/30', 
    error: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30'
  }

  if (isLoading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full w-28 mb-4 animate-shimmer"></div>
            <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-20 mb-3 animate-shimmer"></div>
            <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full w-24 animate-shimmer"></div>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl animate-shimmer"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 group-hover:text-slate-700 transition-colors tracking-wide uppercase">
            {title}
          </p>
          <p className="text-4xl font-bold text-slate-900 mt-3 mb-2 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
          )}
          {trend && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`flex items-center mt-4 text-sm font-semibold ${
                trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              <TrendingUp className={`w-4 h-4 mr-1 ${
                trend.direction === 'down' ? 'rotate-180' : ''
              }`} />
              {Math.abs(trend.value)}% vs last month
            </motion.div>
          )}
        </div>
        <motion.div 
          className={`w-16 h-16 ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-2xl animate-float relative`}
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Icon className="w-8 h-8 text-white relative z-10" />
          <div className="absolute inset-0 bg-white/20 rounded-2xl"></div>
        </motion.div>
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
    primary: 'bg-gradient-to-br from-blue-50/80 to-indigo-50/80 text-blue-700 hover:from-blue-100/90 hover:to-indigo-100/90 border-blue-200/60',
    success: 'bg-gradient-to-br from-emerald-50/80 to-teal-50/80 text-emerald-700 hover:from-emerald-100/90 hover:to-teal-100/90 border-emerald-200/60',
    warning: 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 text-amber-700 hover:from-amber-100/90 hover:to-orange-100/90 border-amber-200/60'
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
      className={`p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 text-left w-full shadow-lg hover:shadow-xl ${colorClasses[color]} relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10 flex items-center">
        <motion.div
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-12 h-12 mr-4 bg-white/50 rounded-xl flex items-center justify-center shadow-md"
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <div>
          <h3 className="font-bold text-base mb-1">{title}</h3>
          <p className="text-sm opacity-80 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

export default function Dashboard() {
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
      color: 'primary',
      valuePath: 'length',
      formatter: 'number'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Header with Gradient Background */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute inset-0 backdrop-blur-3xl bg-white/10"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <motion.h1 
              className="text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              Underwriting Wizard
            </motion.h1>
            <motion.p 
              className="text-xl text-blue-100 mb-8 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              AI-powered lending operations platform with intelligent automation
            </motion.p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {lastRefresh && (
                <motion.div 
                  className="text-sm text-blue-200 bg-white/10 px-4 py-2 rounded-full backdrop-blur-xl border border-white/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live • Updated {lastRefresh.toLocaleTimeString()}</span>
                  </div>
                </motion.div>
              )}
              
              <motion.button
                onClick={loadDashboardData}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white px-8 py-3 rounded-2xl font-semibold shadow-2xl backdrop-blur-xl border border-white/30 transition-all duration-300 flex items-center disabled:opacity-50 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <RefreshCw className={`w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                Refresh Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {/* System Health Overview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
                System Health Overview
              </h2>
              <p className="text-slate-600 text-lg">Real-time monitoring and performance metrics</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
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

