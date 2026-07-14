import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { tasksAPI } from '../services/api'

const URGENCY_PRIORITY = { emergency: 4, high: 3, medium: 2, low: 1 }

export default function VoiceReminder() {
  const { user } = useAuth()
  const spokenRef = useRef(new Set())
  const utteranceRef = useRef(null)

  const speak = useCallback((text, urgency = 'low') => {
    if (!window.speechSynthesis || user?.voiceMuted) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = user?.voiceLanguage || 'en'
    utterance.volume = user?.voiceVolume ?? 1
    utterance.rate = urgency === 'emergency' ? 1.2 : 0.9
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [user])

  useEffect(() => {
    if (!user) return
    const checkEmergencies = async () => {
      try {
        const { data } = await tasksAPI.getAll({ isEmergency: true, status: 'pending' })
        const emergencies = data.tasks || []
        for (const task of emergencies) {
          const key = `emergency-${task.id}`
          if (!spokenRef.current.has(key)) {
            spokenRef.current.add(key)
            speak(`Emergency Alert! Task "${task.title}" requires immediate attention!`, 'emergency')
          }
        }
      } catch {}
    }
    checkEmergencies()
    const interval = setInterval(checkEmergencies, 30000)
    return () => clearInterval(interval)
  }, [user, speak])

  return null
}
