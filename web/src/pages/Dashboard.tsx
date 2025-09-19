import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, TrendingUp, DollarSign, Users } from 'lucide-react'
import { ApiWidget } from '../components/ApiWidget'

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState({
    health: null,
    readiness: null,
    stats: {
      totalRevenue: '0',
      activeDeals: '0',
      completionRate: '0',
      customers: '0'
    }
  })

  const loadDashboardData = async () => {
    try {
      // Note: These calls might fail in development without proper backend setup
      const health = await api.getHealth()
      const readiness = await api.getReadiness()
      
      setDashboardData(prev => ({
        ...prev,
        health,
        readiness,
        stats: {
          totalRevenue: '2.4M',
          activeDeals: '127',
          completionRate: '94.2',
          customers: '1,234'
        }
      }))
    } catch (error) {
      console.warn('Health check failed:', error)
      // Set demo data for development
      setDashboardData(prev => ({
        ...prev,
        health: { status: 'demo' },
        readiness: { status: 'demo' },
        stats: {
          totalRevenue: '2.4M',
          activeDeals: '127', 
          completionRate: '94.2',
          customers: '1,234'
        }
      }))
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const formatCurrency = (value: string) => {
    return `$${value}`
  }

  const formatPercentage = (value: string) => {
    return `${value}%`
  }

  const StatCard: React.FC<{
    title: string
    value: string
    icon: React.ReactNode
    trend?: string
    formatter?: (val: string) => string
  }> = ({ title, value, icon, trend, formatter }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base mb-1">{title}</h3>
          <p className="text-2xl font-bold text-slate-800">
            {formatter ? formatter(value) : value}
          </p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className="text-blue-500">{icon}</div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Underwriting Wizard Dashboard
          </h1>
          <p className="text-slate-600">
            Automated lending operations platform with comprehensive underwriting guardrails
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={dashboardData.stats.totalRevenue}
            icon={<DollarSign className="w-8 h-8" />}
            trend="+12.5% from last month"
            formatter={formatCurrency}
          />
          <StatCard
            title="Active Deals"
            value={dashboardData.stats.activeDeals}
            icon={<BarChart className="w-8 h-8" />}
            trend="+8.2% from last week"
          />
          <StatCard
            title="Completion Rate"
            value={dashboardData.stats.completionRate}
            icon={<TrendingUp className="w-8 h-8" />}
            trend="+2.1% from last month"
            formatter={formatPercentage}
          />
          <StatCard
            title="Total Customers"
            value={dashboardData.stats.customers}
            icon={<Users className="w-8 h-8" />}
            trend="+15.3% from last month"
          />
        </div>

        {/* API Widgets Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Live API Widgets Demo
          </h2>
          <p className="text-slate-600 mb-6">
            Demonstrating real-time data fetching, error handling, and responsive design patterns.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ApiWidget
              title="Posts Feed"
              endpoint="https://jsonplaceholder.typicode.com/posts"
              refreshInterval={30000}
              limit={5}
            />
            <ApiWidget
              title="User Directory"
              endpoint="https://jsonplaceholder.typicode.com/users"
              refreshInterval={45000}
              limit={6}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ApiWidget
              title="Photo Gallery"
              endpoint="https://jsonplaceholder.typicode.com/photos"
              refreshInterval={60000}
              limit={4}
            />
            <ApiWidget
              title="Comments Stream"
              endpoint="https://jsonplaceholder.typicode.com/comments"
              refreshInterval={20000}
              limit={5}
            />
          </div>

          {/* Features List */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Widget Features Demonstrated
            </h3>

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
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard