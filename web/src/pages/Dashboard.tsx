import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react'
import { apiClient } from '../lib/api'
// import { useAppStore } from '../state/useAppStore'

interface HealthData {
  status: string
  uptime: number
}

interface ReadinessData {
  ready: boolean
  checks: Record<string, boolean>
}

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', trend }: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color?: 'primary' | 'success' | 'warning' | 'accent'
  trend?: { value: number; direction: 'up' | 'down' }
}) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    accent: 'from-accent-500 to-accent-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card group hover:scale-105"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-xs ${
              trend.direction === 'up' ? 'text-success-600' : 'text-accent-600'
            }`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${
                trend.direction === 'down' ? 'rotate-180' : ''
              }`} />
              {trend.value}% vs last month
            </div>
          )}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
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
  color?: 'primary' | 'success' | 'warning' | 'accent'
}) {
  const colorClasses = {
    primary: 'hover:bg-primary-50 text-primary-600 border-primary-200',
    success: 'hover:bg-success-50 text-success-600 border-success-200',
    warning: 'hover:bg-warning-50 text-warning-600 border-warning-200',
    accent: 'hover:bg-accent-50 text-accent-600 border-accent-200'
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full p-4 text-left border-2 border-dashed border-slate-200 rounded-xl transition-all duration-200 ${colorClasses[color]}`}
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

export default function Dashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  // const seedDemoData = useAppStore(state => state.seedDemoData) // TODO: Add if needed

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [healthResponse, readinessResponse] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getReadiness()
      ])
      
      setHealthData(healthResponse.data || null)
      setReadinessData(readinessResponse.data || null)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getHealthStatus = () => {
    if (!healthData) return { status: 'unknown', color: 'warning' }
    return healthData.status === 'healthy' 
      ? { status: 'Healthy', color: 'success' }
      : { status: 'Unhealthy', color: 'warning' }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Monitor your LendWisely chatbot performance and system health
          </p>
        </div>
        <motion.button
          onClick={loadDashboardData}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="API Health"
              value={health.status}
              subtitle={healthData ? `Uptime: ${formatUptime(healthData.uptime)}` : undefined}
              icon={health.color === 'success' ? CheckCircle : AlertCircle}
              color={health.color as any}
            />
            
            <StatCard
              title="Service Readiness"
              value={`${readiness.ready}/${readiness.total}`}
              subtitle="Services ready"
              icon={Zap}
              color={readiness.ready === readiness.total ? 'success' : 'warning'}
            />
            
            <StatCard
              title="Active Sessions"
              value="24"
              subtitle="Current chat sessions"
              icon={Users}
              color="primary"
              trend={{ value: 12, direction: 'up' }}
            />
            
            <StatCard
              title="Offers Generated"
              value="156"
              subtitle="This month"
              icon={DollarSign}
              color="success"
              trend={{ value: 8, direction: 'up' }}
            />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              title="View Merchants"
              description="See all registered merchants and their status"
              icon={Users}
              onClick={() => window.location.href = '/merchants'}
              color="primary"
            />
            <QuickAction
              title="Start Chat Session"
              description="Begin a new conversation with Chad the chatbot"
              icon={Activity}
              onClick={() => window.location.href = '/chat'}
              color="success"
            />
            <QuickAction
              title="SMS Campaigns"
              description="Create and manage SMS marketing campaigns"
              icon={DollarSign}
              onClick={() => window.location.href = '/campaigns'}
              color="warning"
            />
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">System Status</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 h-4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {readinessData && Object.entries(readinessData.checks).map(([service, ready]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      ready ? 'bg-success-500' : 'bg-accent-500'
                    }`}></div>
                    <span className="text-sm text-slate-700 capitalize">
                      {service.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <span className={`status-indicator ${
                    ready ? 'status-success' : 'status-error'
                  }`}>
                    {ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'New chat session started', user: 'Ava M.', time: '2 minutes ago', type: 'success' },
            { action: 'Offer generated successfully', user: 'Luis B.', time: '5 minutes ago', type: 'primary' },
            { action: 'Background check completed', user: 'Sarah K.', time: '12 minutes ago', type: 'info' },
            { action: 'Document uploaded', user: 'Mike R.', time: '18 minutes ago', type: 'warning' }
          ].map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full bg-${activity.type}-500`}></div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">{activity.action}</p>
                <p className="text-xs text-slate-500">{activity.user}</p>
              </div>
              <div className="flex items-center text-xs text-slate-400">
                <Clock className="w-3 h-3 mr-1" />
                {activity.time}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}