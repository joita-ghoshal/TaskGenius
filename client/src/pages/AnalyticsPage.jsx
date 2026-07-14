import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Target, Clock, AlertTriangle, Download, Calendar, Award, CheckCircle2, ListTodo, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { analyticsAPI } from '../services/api'
import toast from 'react-hot-toast'

const PERIODS = ['Weekly', 'Monthly']

const COLORS = {
  completed: '#22c55e',
  missed: '#ef4444',
  pending: '#94a3b8',
  brand: '#3b82f6',
  accent: '#22c55e',
  warm: '#f59e0b',
  purple: '#a855f7',
}

const PIE_COLORS = [COLORS.completed, COLORS.missed, COLORS.pending]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function AnimatedCounter({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const duration = 1200
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(current)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <span ref={ref}>
      {display.toFixed(decimals)}{suffix}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, suffix = '', color = 'blue', decimals = 0 }) {
  const colorMap = {
    blue: 'bg-brand-50 text-brand-600 ring-brand-200',
    green: 'bg-accent-100 text-accent-600 ring-accent-200',
    red: 'bg-danger-100 text-danger-500 ring-danger-200',
    amber: 'bg-warm-100 text-warm-500 ring-warm-200',
  }
  return (
    <motion.div variants={itemVariants} className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ring-1 ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
          <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
        </p>
      </div>
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: '13px',
  },
  labelStyle: { fontWeight: 600, color: '#0f172a' },
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <motion.div variants={itemVariants} className="card p-4 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-brand-50 text-brand-600 shrink-0">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary truncate">{label}</p>
        <p className="text-lg font-bold text-text-primary mt-0.5">{value}</p>
        {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

function CategoryBar({ name, completed, pending, total }) {
  const pct = total > 0 ? (completed / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary truncate">{name}</span>
        <span className="text-text-tertiary shrink-0 ml-2">
          <span className="text-accent-600">{completed}</span>
          <span className="text-text-tertiary"> / {total}</span>
        </span>
      </div>
      <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('Weekly')
  const [analytics, setAnalytics] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [analyticsRes, statsRes] = await Promise.all([
        analyticsAPI.get({ period: period.toLowerCase() }),
        analyticsAPI.getStats(),
      ])
      setAnalytics(analyticsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const summary = useMemo(() => ({
    totalTasks: analytics?.totalTasks ?? 0,
    completedTasks: analytics?.completedTasks ?? 0,
    missedDeadlines: analytics?.missedDeadlines ?? 0,
    avgCompletionTime: analytics?.avgCompletionTime ?? 0,
  }), [analytics])

  const productivityData = useMemo(() => {
    return (analytics?.productivity || []).map(d => ({
      ...d,
      name: format(new Date(d.date), 'MMM dd'),
    }))
  }, [analytics?.productivity])

  const focusData = useMemo(() => {
    return (analytics?.focusMinutes || []).map(d => ({
      ...d,
      name: format(new Date(d.date), 'EEE'),
    }))
  }, [analytics?.focusMinutes])

  const completionData = useMemo(() => {
    const c = analytics?.completionRate || {}
    return [
      { name: 'Completed', value: c.completed ?? analytics?.completedTasks ?? 0 },
      { name: 'Missed', value: c.missed ?? analytics?.missedDeadlines ?? 0 },
      { name: 'Pending', value: c.pending ?? Math.max(0, (analytics?.totalTasks ?? 0) - (analytics?.completedTasks ?? 0) - (analytics?.missedDeadlines ?? 0)) },
    ].filter(d => d.value > 0)
  }, [analytics])

  const categories = useMemo(() => {
    return (analytics?.categories || []).map(c => ({
      ...c,
      total: (c.completed || 0) + (c.pending || 0),
    }))
  }, [analytics?.categories])

  const reportText = useMemo(() => {
    if (!analytics) return ''
    const rate = summary.totalTasks > 0 ? ((summary.completedTasks / summary.totalTasks) * 100).toFixed(1) : '0.0'
    const days = productivityData.length || 1
    const avgProductivity = productivityData.reduce((s, d) => s + (d.score || 0), 0) / days
    return `This ${period.toLowerCase()} you completed ${summary.completedTasks} out of ${summary.totalTasks} tasks (${rate}% completion rate). Your average productivity score was ${avgProductivity.toFixed(0)} out of 100. ${summary.missedDeadlines > 0 ? `You missed ${summary.missedDeadlines} deadline${summary.missedDeadlines > 1 ? 's' : ''}. ` : ''}${stats?.streak ? `You're on a ${stats.streak}-day streak!` : ''}`
  }, [analytics, summary, period, productivityData, stats])

  const handleDownloadReport = () => {
    const now = new Date()
    const rows = [
      ['Metric', 'Value'],
      ['Period', period],
      ['Total Tasks', summary.totalTasks],
      ['Completed Tasks', summary.completedTasks],
      ['Missed Deadlines', summary.missedDeadlines],
      ['Average Completion Time (min)', summary.avgCompletionTime],
      ['Report', reportText],
      ['Generated', format(now, 'yyyy-MM-dd HH:mm:ss')],
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taskgenius-report-${format(now, 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-8">
          <div className="skeleton h-10 w-40" />
          <div className="skeleton h-8 w-28" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="card p-5"><div className="skeleton h-8 w-8 rounded-xl mb-4" /><div className="skeleton h-3 w-24 mb-2" /><div className="skeleton h-8 w-16" /></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6"><div className="skeleton h-64 w-full" /></div>
          <div className="card p-6"><div className="skeleton h-64 w-full" /></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <AlertTriangle size={48} className="mx-auto text-danger-400 mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load analytics</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={fetchData} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Analytics</h1>
            <p className="text-text-secondary mt-1 flex items-center gap-2">
              <Sparkles size={14} className="text-brand-500" />
              Track your productivity and performance
            </p>
          </div>
          <div className="flex items-center gap-2 bg-surface-tertiary rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  period === p
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={ListTodo} label="Total Tasks" value={summary.totalTasks} color="blue" />
          <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completedTasks} color="green" />
          <SummaryCard icon={AlertTriangle} label="Missed Deadlines" value={summary.missedDeadlines} color="red" />
          <SummaryCard icon={Clock} label="Avg Completion" value={summary.avgCompletionTime} suffix="h" decimals={1} color="amber" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Productivity Area Chart */}
          <motion.div variants={itemVariants} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Productivity Score</h2>
            </div>
            {productivityData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip {...chartTooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke={COLORS.brand}
                      strokeWidth={2}
                      fill="url(#scoreGrad)"
                      dot={{ r: 3, fill: COLORS.brand, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, fill: COLORS.brand, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-text-tertiary text-sm">No productivity data yet</div>
            )}
          </motion.div>

          {/* Completion Rate Donut */}
          <motion.div variants={itemVariants} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Completion Rate</h2>
            </div>
            {completionData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {completionData.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipStyle} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-sm text-text-secondary">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-text-tertiary text-sm">No completion data yet</div>
            )}
          </motion.div>

        </div>

        {/* Category Breakdown */}
        <motion.div variants={itemVariants} className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award size={18} className="text-brand-500" />
            <h2 className="section-title mb-0">Category Breakdown</h2>
          </div>
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {categories.map((cat, i) => (
                <CategoryBar key={i} name={cat.name} completed={cat.completed || 0} pending={cat.pending || 0} total={cat.total} />
              ))}
            </div>
          ) : (
            <p className="text-text-tertiary text-sm text-center py-8">No category data yet</p>
          )}
        </motion.div>

        {/* Focus Minutes Chart */}
        <motion.div variants={itemVariants} className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-brand-500" />
            <h2 className="section-title mb-0">Focus Minutes</h2>
          </div>
          {focusData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={focusData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="minutes" name="Minutes" radius={[6, 6, 0, 0]}>
                    {focusData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? COLORS.brand : COLORS.accent} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-text-tertiary text-sm">No focus data yet</div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h2 className="section-title mb-0">Key Statistics</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Target} label="Avg Productivity" value={stats?.avgProductivity != null ? `${Math.round(stats.avgProductivity)}%` : '--'} />
            <StatCard icon={Calendar} label="Best Day" value={stats?.bestDay || '--'} sub={stats?.bestDate ? format(new Date(stats.bestDate), 'MMM dd') : ''} />
            <StatCard icon={Clock} label="Most Productive Time" value={stats?.mostProductiveTime || '--'} />
            <StatCard icon={Award} label="Current Streak" value={stats?.streak != null ? `${stats.streak} days` : '--'} />
          </div>
        </motion.div>

        {/* Weekly/Monthly Report */}
        <motion.div variants={itemVariants} className="card p-6 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-brand-600" />
                <h2 className="section-title mb-0 text-brand-800">{period} Report</h2>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{reportText || 'Loading report...'}</p>
            </div>
            <button onClick={handleDownloadReport} className="btn-primary shrink-0 whitespace-nowrap">
              <Download size={16} className="mr-1.5" />
              Download Report
            </button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
