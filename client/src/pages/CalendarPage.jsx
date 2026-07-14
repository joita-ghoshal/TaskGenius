import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, List, Plus, Clock, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, getDay, parseISO, isToday } from 'date-fns'
import { tasksAPI } from '../services/api'

const VIEWS = { MONTHLY: 'monthly', WEEKLY: 'weekly', DAILY: 'daily' }
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const priorityColor = {
  low: 'bg-gray-400',
  medium: 'bg-brand-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const priorityBadge = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-orange',
  critical: 'badge-red',
}

const statusIcon = {
  completed: 'text-accent-500',
  'in-progress': 'text-brand-500',
  pending: 'text-text-tertiary',
}

function getTasksForDate(tasks, date) {
  return tasks.filter(t => {
    if (!t.deadline) return false
    const d = typeof t.deadline === 'string' ? parseISO(t.deadline) : new Date(t.deadline)
    return isSameDay(d, date)
  })
}

function getTaskCounts(tasks, date) {
  const dayTasks = getTasksForDate(tasks, date)
  const completed = dayTasks.filter(t => t.status === 'completed' || t.completed).length
  const pending = dayTasks.filter(t => t.status !== 'completed' && !t.completed).length
  const highPriority = dayTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length
  return { total: dayTasks.length, completed, pending, highPriority }
}

function formatTaskTime(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  return format(d, 'h:mm a')
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(VIEWS.MONTHLY)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchTasks = async () => {
      try {
        setLoading(true)
        const { data } = await tasksAPI.getAll()
        if (!cancelled) setTasks(data.tasks || data || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load tasks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTasks()
    return () => { cancelled = true }
  }, [])

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const handlePrev = useCallback(() => {
    if (viewMode === VIEWS.MONTHLY) setCurrentDate(prev => subMonths(prev, 1))
    else if (viewMode === VIEWS.WEEKLY) setCurrentDate(prev => subWeeks(prev, 1))
    else setCurrentDate(prev => subDays(prev, 1))
  }, [viewMode])

  const handleNext = useCallback(() => {
    if (viewMode === VIEWS.MONTHLY) setCurrentDate(prev => addMonths(prev, 1))
    else if (viewMode === VIEWS.WEEKLY) setCurrentDate(prev => addWeeks(prev, 1))
    else setCurrentDate(prev => addDays(prev, 1))
  }, [viewMode])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
    if (viewMode === VIEWS.DAILY) setSelectedDate(new Date())
  }, [viewMode])

  const handleDayClick = useCallback((day) => {
    setSelectedDate(day)
    setCurrentDate(day)
    setViewMode(VIEWS.DAILY)
  }, [])

  const dateLabel = useMemo(() => {
    if (viewMode === VIEWS.MONTHLY) return format(currentDate, 'MMMM yyyy')
    if (viewMode === VIEWS.WEEKLY) {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  }, [currentDate, viewMode])

  const selectedDateTasks = useMemo(() => {
    return getTasksForDate(tasks, selectedDate || currentDate)
      .sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })
  }, [tasks, selectedDate, currentDate])

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <AlertTriangle size={48} className="mx-auto text-danger-400 mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load calendar</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Calendar</h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-tertiary rounded-xl p-1 gap-1">
              {[
                { key: VIEWS.MONTHLY, icon: CalendarDays, label: 'Monthly' },
                { key: VIEWS.WEEKLY, icon: CalendarRange, label: 'Weekly' },
                { key: VIEWS.DAILY, icon: List, label: 'Daily' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => { setViewMode(key); if (key === VIEWS.DAILY && !selectedDate) setSelectedDate(currentDate) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === key
                      ? 'bg-white text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrev}
              className="btn-ghost p-2"
            >
              <ChevronLeft size={20} />
            </motion.button>
            <h2 className="text-lg font-semibold text-text-primary min-w-[180px] text-center">
              {dateLabel}
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="btn-ghost p-2"
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToday}
            className="btn-secondary text-sm px-4 py-2"
          >
            Today
          </motion.button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="card p-6">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === VIEWS.MONTHLY && (
              <MonthlyView key="monthly" days={monthDays} currentDate={currentDate} tasks={tasks} onDayClick={handleDayClick} />
            )}
            {viewMode === VIEWS.WEEKLY && (
              <WeeklyView key="weekly" days={weekDays} currentDate={currentDate} tasks={tasks} onDayClick={handleDayClick} />
            )}
            {viewMode === VIEWS.DAILY && (
              <DailyView key="daily" date={selectedDate || currentDate} tasks={selectedDateTasks} onBack={() => setViewMode(VIEWS.MONTHLY)} />
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}

function MonthlyView({ days, currentDate, tasks, onDayClick }) {
  const today = new Date()

  return (
    <motion.div
      key="monthly"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden"
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map(label => (
          <div key={label} className="py-3 text-center text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            {label}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const counts = getTaskCounts(tasks, day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isTodayDate = isSameDay(day, today)

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDayClick(day)}
              className={`relative min-h-[90px] sm:min-h-[110px] p-2 border-b border-r border-border text-left transition-colors hover:bg-brand-50/50 ${
                !isCurrentMonth ? 'bg-surface-secondary/50' : ''
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                  isTodayDate
                    ? 'bg-brand-500 text-white'
                    : isCurrentMonth
                      ? 'text-text-primary'
                      : 'text-text-tertiary'
                }`}
              >
                {format(day, 'd')}
              </span>

              {counts.total > 0 && (
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {counts.completed > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-accent-500" />
                        <span className="text-[10px] text-text-secondary">{counts.completed}</span>
                      </span>
                    )}
                    {counts.pending > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                        <span className="text-[10px] text-text-secondary">{counts.pending}</span>
                      </span>
                    )}
                    {counts.highPriority > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] text-text-secondary">{counts.highPriority}</span>
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-tertiary text-[10px] font-medium text-text-secondary">
                    {counts.total} task{counts.total !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

function WeeklyView({ days, currentDate, tasks, onDayClick }) {
  const today = new Date()

  const timeSlots = useMemo(() => {
    const slots = []
    for (let h = 6; h <= 22; h++) {
      const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
      slots.push(label)
    }
    return slots
  }, [])

  return (
    <motion.div
      key="weekly"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden"
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((day, i) => {
          const isTodayDate = isSameDay(day, today)
          const dayTasks = getTasksForDate(tasks, day)
          return (
            <div key={i} className={`py-3 text-center border-r border-border last:border-r-0 ${isTodayDate ? 'bg-brand-50/50' : ''}`}>
              <p className="text-xs text-text-tertiary uppercase font-semibold">{format(day, 'EEE')}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDayClick(day)}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-1 ${
                  isTodayDate ? 'bg-brand-500 text-white' : 'text-text-primary hover:bg-surface-tertiary'
                }`}
              >
                {format(day, 'd')}
              </motion.button>
              <p className="text-[10px] text-text-tertiary mt-1">{dayTasks.length} tasks</p>
            </div>
          )
        })}
      </div>
      {/* Task columns */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day, colIdx) => {
          const dayTasks = getTasksForDate(tasks, day)
          const isTodayDate = isSameDay(day, today)
          return (
            <div
              key={colIdx}
              className={`border-r border-border last:border-r-0 p-2 space-y-2 ${isTodayDate ? 'bg-brand-50/30' : ''}`}
            >
              {dayTasks.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-[11px] text-text-tertiary">No tasks</p>
                </div>
              )}
              {dayTasks.slice(0, 5).map(task => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-2.5 rounded-xl bg-white border-l-[3px] cursor-pointer hover:shadow-md transition-all duration-200 ${
                    task.priority === 'critical' ? 'border-l-red-500' :
                    task.priority === 'high' ? 'border-l-orange-500' :
                    task.priority === 'medium' ? 'border-l-brand-500' :
                    'border-l-gray-300'
                  }`}
                  onClick={() => onDayClick(day)}
                >
                  <p className="text-xs font-medium text-text-primary truncate leading-tight">{task.title}</p>
                  {task.deadline && (
                    <p className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatTaskTime(task.deadline)}
                    </p>
                  )}
                </motion.div>
              ))}
              {dayTasks.length > 5 && (
                <p className="text-[10px] text-brand-500 font-medium text-center">+{dayTasks.length - 5} more</p>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function DailyView({ date, tasks, onBack }) {
  const today = new Date()
  const isTodayDate = isSameDay(date, today)

  return (
    <motion.div
      key="daily"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="btn-ghost p-2"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {isTodayDate ? 'Today' : format(date, 'EEEE, MMMM d')}
            </h2>
            <p className="text-sm text-text-secondary">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              {!isTodayDate && ` \u2022 ${format(date, 'yyyy')}`}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary gap-2"
        >
          <Plus size={16} />
          Create Task
        </motion.button>
      </div>

      <div className="card p-5">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-tertiary flex items-center justify-center">
              <CalendarDays size={28} className="text-text-tertiary" />
            </div>
            <p className="text-text-primary font-medium mb-1">No tasks for this day</p>
            <p className="text-text-tertiary text-sm mb-4">Schedule a task to get started</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary gap-2"
            >
              <Plus size={16} />
              Create Task
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task, i) => {
              const taskDate = task.deadline ? (typeof task.deadline === 'string' ? parseISO(task.deadline) : new Date(task.deadline)) : null
              const isOverdue = taskDate && taskDate < today && !isTodayDate && task.status !== 'completed' && !task.completed
              const isCompleted = task.status === 'completed' || task.completed

              return (
                <motion.div
                  key={task._id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-4 p-4 hover:bg-surface-tertiary/50 transition-colors rounded-xl ${isOverdue ? 'bg-danger-50/50' : ''}`}
                >
                  <div className={`shrink-0 mt-0.5 ${isCompleted ? 'text-accent-500' : 'text-text-tertiary'}`}>
                    {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                        {task.title}
                      </h3>
                      {task.priority && (
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityBadge[task.priority] || 'badge-gray'}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                          <Clock size={12} />
                          {formatTaskTime(task.deadline)}
                        </span>
                      )}
                      {task.status && (
                        <span className={`inline-flex items-center gap-1 text-xs ${statusIcon[task.status] || 'text-text-tertiary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusIcon[task.status] || 'bg-text-tertiary'}`} />
                          {task.status}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-xs text-danger-500 font-medium">
                          <AlertTriangle size={12} />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
