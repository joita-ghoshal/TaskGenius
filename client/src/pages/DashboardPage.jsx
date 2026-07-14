import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { Clock, CheckCircle2, ListTodo, Target, Sparkles, AlertTriangle, Plus, Play, MessageSquare, TrendingUp, Calendar } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../context/AuthContext'
import { aiAPI } from '../services/api'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getTimeRemaining(deadline) {
  const diff = new Date(deadline) - new Date()
  if (diff <= 0) return 'Overdue'
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hrs > 24) return `${Math.floor(hrs / 24)}d left`
  if (hrs > 0) return `${hrs}h ${mins}m left`
  return `${mins}m left`
}

function isEmergency(task) {
  if (!task?.deadline) return false
  const diff = new Date(task.deadline) - new Date()
  const hrs = diff / 3600000
  return hrs > 0 && hrs < 3
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function CircularProgress({ value = 0, size = 80, strokeWidth = 6 }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(value, 100) / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-surface-tertiary" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          strokeWidth={strokeWidth} strokeLinecap="round"
          className="stroke-brand-500"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-lg font-bold text-text-primary">{Math.round(value)}%</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, trend, color = 'blue', children }) {
  const colors = {
    blue: 'bg-brand-50 text-brand-600 ring-brand-200',
    green: 'bg-accent-100 text-accent-600 ring-accent-200',
    amber: 'bg-warm-100 text-warm-500 ring-warm-200',
    purple: 'bg-purple-50 text-purple-600 ring-purple-200',
  }
  return (
    <motion.div variants={itemVariants} className="card card-hover p-5 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ring-1 ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-accent-600' : 'text-danger-500'}`}>
            <TrendingUp size={13} className={trend >= 0 ? '' : 'rotate-180'} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-text-secondary">{label}</p>
        {children || <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>}
      </div>
    </motion.div>
  )
}

function EmergencyAlert({ tasks, onRescue }) {
  const [timeLeft, setTimeLeft] = useState('')
  const emergency = tasks?.find(isEmergency)

  useEffect(() => {
    if (!emergency) return
    const tick = () => setTimeLeft(getTimeRemaining(emergency.deadline))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [emergency])

  if (!emergency) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-danger-500 to-orange-500 p-0.5 shadow-lg animate-emergency-pulse"
    >
      <div className="rounded-2xl bg-gradient-to-r from-danger-600/95 to-orange-600/95 px-6 py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-white/20 rounded-full animate-countdown-pulse">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-base">Emergency Task</p>
              <p className="text-white/80 text-sm">{emergency.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:ml-auto">
            <div className="text-center">
              <p className="text-white/70 text-xs uppercase tracking-wider">Time Left</p>
              <p className="text-white font-bold text-lg tabular-nums">{timeLeft || '--'}</p>
            </div>
            <button onClick={onRescue} className="px-5 py-2.5 bg-white text-danger-600 font-semibold rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg whitespace-nowrap">
              Start Rescue Mode
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TaskItem({ task, onToggle }) {
  const badges = {
    low: 'badge-green',
    medium: 'badge-yellow',
    high: 'badge-orange',
    urgent: 'badge-red',
  }
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-tertiary/50 transition-colors group cursor-pointer"
      onClick={() => onToggle?.(task)}
    >
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${task.completed ? 'bg-accent-500 border-accent-500' : 'border-text-tertiary group-hover:border-brand-400'}`}>
        {task.completed && <CheckCircle2 size={14} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Clock size={11} />
            {getTimeRemaining(task.deadline)}
          </span>
          {task.priority && (
            <span className={`${badges[task.priority] || 'badge-gray'} text-[10px] px-1.5 py-0.5`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="skeleton w-5 h-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { dashboard, loading, error } = useDashboard()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState(null)
  const [tasks, setTasks] = useState([])

  const greeting = useMemo(getGreeting, [])

  useEffect(() => {
    if (!dashboard?.todayTasks) return
    setTasks(dashboard.todayTasks)
  }, [dashboard?.todayTasks])

  useEffect(() => {
    let cancelled = false
    const fetchInsights = async () => {
      try {
        setInsightsLoading(true)
        const { data } = await aiAPI.getInsights()
        if (!cancelled) setInsights(data.insights || data.messages || [])
      } catch (err) {
        if (!cancelled) setInsightsError(err.message || 'Failed to load insights')
      } finally {
        if (!cancelled) setInsightsLoading(false)
      }
    }
    fetchInsights()
    const id = setInterval(fetchInsights, 120000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const handleToggleTask = useCallback(async (task) => {
    if (!task?.id) return
    try {
      const { tasksAPI } = await import('../services/api')
      const res = await tasksAPI.update(task.id, { completed: !task.completed })
      setTasks(prev => prev.map(t => t.id === task.id ? res.data.task : t))
    } catch {
      // silent fail
    }
  }, [])

  const handleRescueMode = useCallback(() => {
    const emergency = tasks?.find(isEmergency)
    if (emergency) navigate(`/tasks/${emergency.id}`)
  }, [tasks, navigate])

  const stats = useMemo(() => ({
    todayCount: dashboard?.todayCount ?? dashboard?.todayTasks?.length ?? 0,
    completedCount: dashboard?.completedCount ?? 0,
    pendingCount: dashboard?.pendingCount ?? 0,
    productivityScore: dashboard?.productivityScore ?? 0,
    trend: dashboard?.trend,
  }), [dashboard])

  const upcomingTasks = useMemo(() => {
    const raw = dashboard?.upcomingTasks || []
    return raw.slice(0, 5).filter(t => !t.completed)
  }, [dashboard?.upcomingTasks])

  const weeklyData = useMemo(() => {
    return (dashboard?.weeklyProductivity || []).slice(-7).map(d => ({
      ...d,
      name: new Date(d.date || d.name).toLocaleDateString('en-US', { weekday: 'short' }),
    }))
  }, [dashboard?.weeklyProductivity])

  const quote = dashboard?.dailyQuote || 'Stay organized, stay ahead.'

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-8">
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-6"><div className="skeleton h-48 w-full" /></div>
          <div className="card p-6"><TaskListSkeleton /></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <AlertTriangle size={48} className="mx-auto text-danger-400 mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load dashboard</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              {greeting}, {user?.name || 'there'}
            </h1>
            <p className="text-text-secondary mt-1 flex items-center gap-2">
              <Sparkles size={14} className="text-brand-500 shrink-0" />
              <em className="not-italic">{quote}</em>
            </p>
          </div>
        </motion.div>

        {/* Emergency Alert */}
        <EmergencyAlert tasks={tasks} onRescue={handleRescueMode} />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ListTodo} label="Today's Tasks" value={stats.todayCount} trend={stats.trend} color="blue" />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.completedCount} color="green" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingCount} color="amber" />
          <StatCard icon={Target} label="Productivity Score" color="purple">
            <div className="mt-2 flex justify-center">
              <CircularProgress value={stats.productivityScore} />
            </div>
          </StatCard>
        </div>

        {/* AI Insights + Today's Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Insights Panel */}
          <motion.div variants={itemVariants} className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-purple-500/[0.03] pointer-events-none" />
            <div className="flex items-center gap-2 mb-5 relative">
              <div className="p-1.5 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg">
                <Sparkles size={16} className="text-white" />
              </div>
              <h2 className="section-title mb-0">AI Insights</h2>
            </div>
            {insightsLoading ? (
              <AISkeleton />
            ) : insightsError ? (
              <div className="text-center py-6">
                <p className="text-text-tertiary text-sm">Unable to load insights</p>
                <button onClick={() => window.location.reload()} className="text-brand-500 text-sm font-medium mt-2 hover:underline">Retry</button>
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-surface-tertiary flex items-center justify-center">
                  <Sparkles size={24} className="text-text-tertiary" />
                </div>
                <p className="text-text-secondary text-sm">No insights yet. Start using TaskGenius to get AI-powered suggestions.</p>
              </div>
            ) : (
              <div className="space-y-3 relative">
                {insights.slice(0, 4).map((insight, i) => (
                  <motion.div
                    key={insight.id || insight.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex gap-3 p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      AI
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {insight.message || insight.text || insight.content || insight}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Today's Tasks */}
          <motion.div variants={itemVariants} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Today's Tasks</h2>
              <span className="text-xs text-text-tertiary bg-surface-tertiary px-2.5 py-1 rounded-full font-medium">
                {tasks?.length || 0} tasks
              </span>
            </div>
            {tasks?.length > 0 ? (
              <div className="space-y-1">
                {tasks.map((task, i) => (
                  <motion.div
                    key={task.id || i}
                    variants={itemVariants}
                  >
                    <TaskItem task={task} onToggle={handleToggleTask} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-100 to-purple-100 flex items-center justify-center">
                  <ListTodo size={32} className="text-brand-400" />
                </div>
                <p className="text-text-primary font-medium mb-1">All clear!</p>
                <p className="text-text-tertiary text-sm mb-4">No tasks scheduled for today</p>
                <Link to="/tasks/new" className="btn-primary inline-flex">
                  <Plus size={16} className="mr-1.5" />
                  Create Task
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Row: Upcoming, Quick Actions, Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Tasks */}
          <motion.div variants={itemVariants} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Upcoming</h2>
            </div>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map((task, i) => (
                  <motion.div
                    key={task.id || i}
                    variants={itemVariants}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-tertiary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{formatDate(task.deadline)}</p>
                    </div>
                    {task.priority && (
                      <span className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        task.priority === 'urgent' ? 'bg-danger-100 text-danger-500' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                        task.priority === 'medium' ? 'bg-warm-100 text-warm-500' :
                        'bg-surface-tertiary text-text-secondary'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-tertiary flex items-center justify-center">
                  <Calendar size={22} className="text-text-tertiary" />
                </div>
                <p className="text-text-tertiary text-sm">No upcoming tasks</p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="card p-5">
            <h2 className="section-title mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/tasks/new"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-brand-50 to-brand-100/50 hover:from-brand-100 hover:to-brand-200/50 border border-brand-200/50 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-brand-500 text-white">
                  <Plus size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-700 transition-colors">Create Task</p>
                  <p className="text-xs text-text-tertiary">Add a new task to your list</p>
                </div>
              </Link>
              <Link
                to="/focus"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100/50 hover:from-accent-100 hover:to-accent-200/50 border border-accent-200/50 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-accent-500 text-white">
                  <Play size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-accent-700 transition-colors">Start Focus Mode</p>
                  <p className="text-xs text-text-tertiary">25-minute focused session</p>
                </div>
              </Link>
              <Link
                to="/ai-chat"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-200/50 border border-purple-200/50 transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-purple-700 transition-colors">AI Chat</p>
                  <p className="text-xs text-text-tertiary">Ask AI for help</p>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Productivity Mini-Chart */}
          <motion.div variants={itemVariants} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Weekly Productivity</h2>
            </div>
            {weeklyData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '13px',
                      }}
                      labelStyle={{ fontWeight: 600, color: '#0f172a' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#completedGrad)"
                      dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-tertiary flex items-center justify-center">
                  <TrendingUp size={22} className="text-text-tertiary" />
                </div>
                <p className="text-text-tertiary text-sm">No data yet this week</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-8 w-8 rounded-xl mb-4" />
      <div className="skeleton h-3 w-20 mb-2" />
      <div className="skeleton h-8 w-16" />
    </div>
  )
}

function AISkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
