import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Volume2, VolumeX, Play, CheckCircle, ArrowRight, X } from 'lucide-react';
import { tasksAPI, aiAPI } from '../services/api';

function useAlarmSound() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);

  const play = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 600);
    } catch { /* ignore */ }
  }, []);

  const stop = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying };
}

export default function EmergencyRescue({ task, onClose, onComplete }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [actionPlan, setActionPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const { play, stop, isPlaying } = useAlarmSound();

  useEffect(() => {
    if (!task?.deadline) return;
    const interval = setInterval(() => {
      const now = new Date();
      const deadline = new Date(task.deadline);
      const diff = deadline - now;
      if (diff <= 0) { setTimeLeft('OVERDUE!'); clearInterval(interval); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      const total = deadline - new Date(task.createdAt);
      const elapsed = now - new Date(task.createdAt);
      setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
    }, 1000);
    return () => clearInterval(interval);
  }, [task]);

  useEffect(() => {
    if (!muted && timeLeft && !timeLeft.includes('OVERDUE')) {
      const [h, m, s] = timeLeft.split(':').map(Number);
      if (m === 0 && s === 0) play();
    }
  }, [timeLeft, muted, play]);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { data } = await aiAPI.analyzeTask(task.id);
        setActionPlan(data.analysis);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    if (task?.id) fetchPlan();
  }, [task]);

  const handleComplete = async () => {
    try {
      await tasksAPI.update(task.id, { status: 'completed' });
      setCompleted(true);
      stop();
      if (onComplete) onComplete();
    } catch { /* ignore */ }
  };

  const playAlarm = () => { if (!muted) play(); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-danger-500/10 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg mx-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-danger-400 overflow-hidden">
            <div className="bg-gradient-to-r from-danger-500 to-danger-600 p-6 text-white text-center">
              <div className="animate-emergency-pulse inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-1">EMERGENCY ALERT</h2>
              <p className="text-danger-100 text-sm">{task?.title}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-1">Time Remaining</p>
                <div className="animate-countdown-pulse inline-flex items-center gap-2 bg-danger-50 text-danger-600 px-6 py-3 rounded-2xl">
                  <Clock className="w-5 h-5" />
                  <span className="text-3xl font-mono font-bold">{timeLeft}</span>
                </div>
              </div>

              <div className="w-full bg-surface-tertiary rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-danger-500 to-warm-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={() => { setMuted(!muted); if (!muted) stop(); else playAlarm(); }}
                  className="btn-ghost p-2">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              ) : actionPlan ? (
                <div className="bg-surface-secondary rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-2">AI Emergency Action Plan</h4>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <p>Estimated time: {actionPlan.estimatedTime || task?.estimatedDuration || 60} minutes</p>
                    <p>Priority: {actionPlan.priority || task?.priority}</p>
                    {actionPlan.subtasks?.length > 0 && (
                      <div>
                        <p className="font-medium mt-2">Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-1">
                          {actionPlan.subtasks.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3">
                {!completed ? (
                  <>
                    <button onClick={handleComplete} className="btn-primary flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" /> I'm Done
                    </button>
                    <button onClick={onClose} className="btn-secondary">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={onClose} className="btn-primary flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" /> Task Completed!
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
