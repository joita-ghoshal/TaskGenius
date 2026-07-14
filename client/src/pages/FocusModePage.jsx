import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react'

const FOCUS_TIME = 25 * 60
const BREAK_TIME = 5 * 60

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusModePage() {
  const [mode, setMode] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('focusSessions')
    return saved ? JSON.parse(saved) : []
  })
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  const totalTime = mode === 'focus' ? FOCUS_TIME : BREAK_TIME
  const progress = ((totalTime - timeLeft) / totalTime) * 100
  const circumference = 2 * Math.PI * 90
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setRunning(false)
            if (mode === 'focus') {
              const newSession = { id: Date.now(), completedAt: new Date().toISOString(), type: 'focus' }
              setSessions((prev) => {
                const updated = [newSession, ...prev].slice(0, 50)
                localStorage.setItem('focusSessions', JSON.stringify(updated))
                return updated
              })
            }
            try {
              if (!audioRef.current) {
                audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH9/f3+Af39/gIB/f3+AgH+Af39/gIB/f3+AgH+Af39/gIB/f3+AgH9/f3+AgH+Af39/gIB/f3+AgH+Af39/gIB/f3+AgH+Af39/gIB/f3+AgH+Af38=')
              }
              audioRef.current.play()
            } catch {}
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running, mode])

  const handleStart = () => setRunning(true)
  const handlePause = () => setRunning(false)
  const handleReset = () => {
    setRunning(false)
    setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME)
  }

  const switchMode = (newMode) => {
    setRunning(false)
    setMode(newMode)
    setTimeLeft(newMode === 'focus' ? FOCUS_TIME : BREAK_TIME)
  }

  const todaySessions = sessions.filter(
    (s) => new Date(s.completedAt).toDateString() === new Date().toDateString()
  )
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.completedAt)
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  })

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary">Focus Mode</h1>
          <p className="text-text-secondary mt-1">Stay in the zone with timed sessions</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-surface-tertiary rounded-xl p-1 gap-1">
            <button
              onClick={() => switchMode('focus')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'focus' ? 'bg-white text-brand-600 shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Brain size={18} />
              Focus
            </button>
            <button
              onClick={() => switchMode('break')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'break' ? 'bg-white text-accent-600 shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Coffee size={18} />
              Break
            </button>
          </div>
        </div>

        {/* Timer Card */}
        <motion.div
          animate={running ? { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } } : {}}
          className="glass rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-accent-500/[0.03] pointer-events-none" />

          {/* Progress Ring */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg width="220" height="220" className="-rotate-90">
              <circle cx="110" cy="110" r="90" fill="none" strokeWidth="10" className="stroke-surface-tertiary" />
              <motion.circle
                cx="110" cy="110" r="90" fill="none"
                strokeWidth="10" strokeLinecap="round"
                className={mode === 'focus' ? 'stroke-brand-500' : 'stroke-accent-500'}
                strokeDasharray={circumference}
                initial={false}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl sm:text-6xl font-bold tabular-nums ${mode === 'focus' ? 'text-text-primary' : 'text-accent-600'}`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm text-text-tertiary mt-1 uppercase tracking-wider">
                {mode === 'focus' ? 'Focus Time' : 'Break Time'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 relative">
            {!running ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                disabled={timeLeft === 0}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all disabled:opacity-40 ${
                  mode === 'focus'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-brand-200'
                    : 'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 shadow-accent-200'
                }`}
              >
                <Play size={20} fill="white" />
                Start
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePause}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-white text-text-primary border border-border hover:bg-surface-secondary shadow-sm transition-all"
              >
                <Pause size={20} />
                Pause
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="p-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-all"
              title="Reset"
            >
              <RotateCcw size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* Session Counter */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Tracked Sessions</h2>
            <span className="text-sm text-text-tertiary bg-surface-tertiary px-3 py-1 rounded-full font-medium">
              {sessions.length} total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center p-3 rounded-xl bg-surface-tertiary/50">
              <p className="text-2xl font-bold text-text-primary">{sessions.length}</p>
              <p className="text-xs text-text-tertiary mt-0.5">All Time</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-surface-tertiary/50">
              <p className="text-2xl font-bold text-text-primary">{weekSessions.length}</p>
              <p className="text-xs text-text-tertiary mt-0.5">This Week</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-surface-tertiary/50">
              <p className="text-2xl font-bold text-text-primary">{todaySessions.length}</p>
              <p className="text-xs text-text-tertiary mt-0.5">Today</p>
            </div>
          </div>
          {sessions.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-tertiary/30 hover:bg-surface-tertiary/60 transition-colors">
                  <div className="flex items-center gap-2">
                    {s.type === 'focus' ? <Brain size={14} className="text-brand-500" /> : <Coffee size={14} className="text-accent-500" />}
                    <span className="text-sm text-text-primary capitalize">{s.type} Session</span>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {new Date(s.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-tertiary text-sm py-4">No sessions completed yet. Start your first focus session!</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
