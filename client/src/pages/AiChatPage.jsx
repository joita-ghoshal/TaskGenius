import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Send, Bot, User, Mic, MicOff, Volume2, VolumeX, Plus, Sparkles, MessageSquare, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

const SUGGESTED_QUESTIONS = [
  'What should I do today?',
  'Which task is most important?',
  'Am I on track?',
  'Create a study plan for me',
  'Help me prepare for my interview',
  'What am I missing?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot size={16} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white border border-border px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function MessageBox({ message, onPlayTTS, isSpeaking }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isUser ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-gradient-to-br from-brand-500 to-purple-600'}`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>
      <div className={`group relative max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-tr-md' : 'bg-white border border-border text-text-primary rounded-tl-md shadow-sm'}`}>
          {message.content}
        </div>
        {!isUser && onPlayTTS && (
          <button
            onClick={() => onPlayTTS(message.content)}
            className="mt-1 text-text-tertiary hover:text-brand-500 transition-colors opacity-0 group-hover:opacity-100"
            title={isSpeaking ? 'Stop' : 'Play response'}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  )
}

function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className={`space-y-2 ${i % 2 === 0 ? 'items-end' : ''}`} style={{ maxWidth: '60%' }}>
            <div className="skeleton h-4 w-32 rounded-xl" />
            <div className="skeleton h-4 w-48 rounded-xl" />
            {i % 2 === 1 && <div className="skeleton h-4 w-24 rounded-xl" />}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AiChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [sessions, setSessions] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [voiceResponse, setVoiceResponse] = useState(true)
  const [speakingIndex, setSpeakingIndex] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const { data } = await aiAPI.getHistory(sessionId)
        const msgs = data.messages || data.history || []
        setMessages(msgs)
        const s = data.sessions || []
        setSessions(s)
      } catch {
        setMessages([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [sessionId])

  const sendMessage = useCallback(async (content) => {
    const text = (content || input).trim()
    if (!text || sending) return

    const userMessage = { role: 'user', content: text, id: uuidv4() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const { data } = await aiAPI.chat({ message: text, sessionId })
      const aiMessage = { role: 'assistant', content: data.response || data.message || data.text || 'I understand.', id: data.id || uuidv4() }
      setMessages(prev => [...prev, aiMessage])

      if (voiceResponse && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiMessage.content)
        utterance.rate = 1.1
        utterance.pitch = 1
        utterance.onend = () => setSpeakingIndex(null)
        setSpeakingIndex(messages.length + 1)
        speechSynthesis.speak(utterance)
      }
    } catch {
      toast.error('Failed to get AI response')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', id: uuidv4() }])
    } finally {
      setSending(false)
    }
  }, [input, sending, sessionId, voiceResponse, messages.length])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final) {
        setInput(prev => prev + final)
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      toast.error('Speech recognition error')
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const handlePlayTTS = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported')
      return
    }
    if (speakingIndex !== null) {
      speechSynthesis.cancel()
      setSpeakingIndex(null)
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1
    utterance.onend = () => setSpeakingIndex(null)
    setSpeakingIndex(messages.length - 1)
    speechSynthesis.speak(utterance)
  }, [speakingIndex, messages.length])

  const newChat = useCallback(() => {
    setSessionId(uuidv4())
    setMessages([])
    setInput('')
    setSpeakingIndex(null)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const switchSession = useCallback((sid) => {
    setSessionId(sid)
    setSidebarOpen(false)
  }, [])

  const clearSession = useCallback(async (sid, e) => {
    e.stopPropagation()
    try {
      await aiAPI.clearHistory(sid)
      setSessions(prev => prev.filter(s => s.id !== sid && s._id !== sid))
      if (sessionId === sid) newChat()
      toast.success('Session cleared')
    } catch {
      toast.error('Failed to clear session')
    }
  }, [sessionId, newChat])

  const autoGrow = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleSuggestionClick = (question) => {
    setInput(question)
    setTimeout(() => sendMessage(question), 50)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-16 bottom-0 w-72 bg-white border-r border-border z-40 lg:static lg:z-0 flex flex-col"
            >
              <div className="p-4 border-b border-border">
                <button onClick={newChat} className="w-full btn-primary gap-2 text-sm">
                  <Plus size={16} />
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-2 mb-2">Recent Sessions</p>
                {sessions.length === 0 && (
                  <p className="text-xs text-text-tertiary text-center py-6">No previous sessions</p>
                )}
                {sessions.map((s, i) => (
                  <button
                    key={s.id || s._id || i}
                    onClick={() => switchSession(s.id || s._id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                      (s.id || s._id) === sessionId ? 'bg-brand-50 text-brand-700 font-medium' : 'text-text-secondary hover:bg-surface-tertiary'
                    }`}
                  >
                    <MessageSquare size={15} className="shrink-0" />
                    <span className="flex-1 truncate">{s.title || s.name || `Chat ${i + 1}`}</span>
                    <button onClick={(e) => clearSession(s.id || s._id, e)} className="text-text-tertiary hover:text-danger-500 transition-colors p-0.5">
                      <Trash2 size={13} />
                    </button>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="btn-ghost p-2 lg:flex hidden"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="btn-ghost p-2 lg:hidden"
            >
              <MessageSquare size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-text-primary">AI Assistant</h1>
              <p className="text-xs text-text-secondary">Your personal productivity coach</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceResponse(prev => !prev)}
              className={`btn-ghost p-2 ${voiceResponse ? 'text-brand-500' : 'text-text-tertiary'}`}
              title={voiceResponse ? 'Voice responses on' : 'Voice responses off'}
            >
              {voiceResponse ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={newChat} className="btn-ghost p-2" title="New Chat">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scrollbar-custom" style={{ scrollBehavior: 'smooth' }}>
          {loading ? (
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-brand-500/20">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-1">How can I help you today?</h2>
              <p className="text-sm text-text-secondary mb-8 max-w-md">
                I'm your AI productivity coach. Ask me anything about your tasks, schedule, or productivity.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 max-w-xl">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => handleSuggestionClick(q)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-border text-sm text-text-secondary hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBox
                  key={msg.id || idx}
                  message={msg}
                  onPlayTTS={voiceResponse ? handlePlayTTS : null}
                  isSpeaking={speakingIndex === idx}
                />
              ))}
              {sending && <TypingDots />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-border bg-gradient-to-t from-white via-white to-transparent px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-1.5 flex items-end gap-2 shadow-lg shadow-black/5">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`shrink-0 p-2.5 rounded-xl transition-all duration-200 ${isRecording ? 'bg-danger-100 text-danger-500 animate-pulse' : 'text-text-tertiary hover:text-brand-500 hover:bg-brand-50'}`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? (
                  <span className="relative flex items-center justify-center">
                    <MicOff size={20} />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger-500 rounded-full animate-ping" />
                  </span>
                ) : (
                  <Mic size={20} />
                )}
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoGrow(e) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your productivity..."
                  rows={1}
                  className="w-full bg-transparent text-text-primary placeholder-text-tertiary resize-none outline-none py-2.5 px-1 text-sm max-h-40 leading-relaxed"
                  style={{ scrollbarWidth: 'thin' }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25"
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="text-[11px] text-text-tertiary text-center mt-2">
              AI responses are generated based on your tasks and productivity data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
