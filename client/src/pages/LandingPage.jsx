import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Bell, Shield, Timer, BarChart3, Mic, ArrowRight, CheckCircle, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Brain, title: 'AI Task Planning', description: 'Smart prioritization and scheduling powered by AI that learns your workflow.' },
  { icon: Bell, title: 'Smart Reminders', description: 'Context-aware notifications that adapt to your deadlines and habits.' },
  { icon: Shield, title: 'Emergency Rescue', description: 'Automatic detection of urgent tasks with focus mode interventions.' },
  { icon: Timer, title: 'Focus Mode', description: 'Pomodoro timer with progress tracking to boost your productivity.' },
  { icon: BarChart3, title: 'Analytics', description: 'Detailed insights into your productivity patterns and trends.' },
  { icon: Mic, title: 'Voice Assistant', description: 'Hands-free task management with natural language voice commands.' },
]

const steps = [
  { icon: Brain, title: 'Create Tasks', description: 'Add tasks with deadlines, priorities, and categories using the intuitive interface.' },
  { icon: Bell, title: 'Get Smart Reminders', description: 'Receive timely notifications and AI-powered nudges to stay on track.' },
  { icon: Shield, title: 'Achieve More', description: 'Complete tasks, track progress, and build productive habits over time.' },
]

const testimonials = [
  { name: 'Sarah Chen', role: 'Product Designer', text: 'TaskGenius transformed how I manage my daily workflow. The AI insights are incredibly accurate.' },
  { name: 'Marcus Johnson', role: 'Freelance Developer', text: 'The emergency rescue feature has saved me from missing deadlines more times than I can count.' },
  { name: 'Priya Patel', role: 'Student', text: 'Focus mode with the Pomodoro timer helped me improve my study sessions dramatically.' },
]

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

function Section({ children, className = '' }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 ${className}`}
    >
      {children}
    </motion.section>
  )
}

export default function LandingPage() {
  const { user } = useAuth()

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto text-accent-500 mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">You're already signed in</h2>
          <p className="text-text-secondary mb-6">Head to your dashboard to manage your tasks.</p>
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold">TG</div>
              <span className="font-bold text-lg text-text-primary">TaskGenius</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
              <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-brand-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <Section className="relative text-center pt-20 pb-16 sm:pt-28 sm:pb-20">
          <motion.div variants={fadeInUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-600 text-sm font-medium mb-6">
              <Star size={14} />
              AI-Powered Productivity
            </div>
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight"
          >
            Don't Just Remind.<br />
            <span className="bg-gradient-to-r from-brand-500 to-purple-600 bg-clip-text text-transparent">Rescue.</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            TaskGenius combines AI-powered planning with smart reminders and emergency focus mode
            to ensure you never miss a deadline again.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3 shadow-lg shadow-brand-200">
              Get Started Free
              <ArrowRight size={18} className="ml-2" />
            </Link>
            <Link to="#features" className="btn-secondary text-base px-8 py-3" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>
              Learn More
            </Link>
          </motion.div>
        </Section>
      </section>

      {/* Features Grid */}
      <Section id="features">
        <motion.div variants={fadeInUp} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">Powerful Features</h2>
          <p className="text-text-secondary mt-3 max-w-xl mx-auto">Everything you need to stay organized, focused, and ahead of your deadlines.</p>
        </motion.div>
        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mb-4 group-hover:from-brand-500 group-hover:to-brand-600 transition-all duration-300">
                <feature.icon size={22} className="text-brand-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* How It Works */}
      <section className="bg-surface-secondary">
        <Section>
          <motion.div variants={fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">How It Works</h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto">Three simple steps to supercharge your productivity.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeInUp} className="text-center relative">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-200">
                  <step.icon size={26} className="text-white" />
                </div>
                <div className="absolute top-0 left-[calc(50%+3rem)] hidden md:block w-[calc(100%-3rem)] h-px bg-border -translate-y-1/2 -z-10" style={{ top: '2rem' }} />
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-600 text-sm font-bold mb-3">{i + 1}</span>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      {/* Testimonials */}
      <Section>
        <motion.div variants={fadeInUp} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">What Users Say</h2>
          <p className="text-text-secondary mt-3">Join thousands of productive users.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={i} variants={fadeInUp} className="glass rounded-2xl p-6 border border-white/20">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className="fill-warm-400 text-warm-400" />
                ))}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-tertiary">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-purple-700">
        <Section className="text-center">
          <motion.div variants={fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Take Control?</h2>
            <p className="mt-3 text-brand-100 max-w-xl mx-auto">Start your free trial today. No credit card required.</p>
            <Link to="/register" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-white text-brand-700 font-semibold rounded-xl hover:bg-brand-50 transition-all shadow-lg shadow-black/10">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </Section>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold">TG</div>
                <span className="font-bold text-lg text-text-primary">TaskGenius</span>
              </div>
              <p className="text-sm text-text-secondary">Don't Just Remind. Rescue.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#features" className="hover:text-brand-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand-600 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-8 text-center text-sm text-text-tertiary">
            &copy; {new Date().getFullYear()} TaskGenius. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
