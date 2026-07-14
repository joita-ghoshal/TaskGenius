import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Mic, Save, Volume2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth()
  const fileInputRef = useRef(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(user?.voiceSettings?.muted ?? false)
  const [voiceLang, setVoiceLang] = useState(user?.voiceSettings?.language ?? 'en')
  const [voiceVolume, setVoiceVolume] = useState(user?.voiceSettings?.volume ?? 80)

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('File must be less than 2MB')
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await import('../services/api').then(m => m.default.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }))
      toast.success('Photo uploaded successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      goals: user?.goals || '',
      dailyTarget: user?.dailyTarget || 5,
      workStart: user?.workHours?.start || '09:00',
      workEnd: user?.workHours?.end || '17:00',
      preferredStudyTime: user?.preferredStudyTime || 'morning',
    },
  })

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm()

  const onProfileSave = async (data) => {
    setProfileLoading(true)
    try {
      await updateProfile({
        name: data.name,
        goals: data.goals,
        dailyTarget: Number(data.dailyTarget),
        workHours: { start: data.workStart, end: data.workEnd },
        preferredStudyTime: data.preferredStudyTime,
        voiceSettings: { muted: voiceMuted, language: voiceLang, volume: voiceVolume },
      })
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const onPasswordSave = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      await updatePassword(data.currentPassword, data.newPassword)
      toast.success('Password changed successfully')
      resetPasswordForm()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { transition: { staggerChildren: 0.06 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  function SectionCard({ icon: Icon, title, children }) {
    return (
      <motion.div variants={itemVariants} className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
            <Icon size={20} />
          </div>
          <h2 className="section-title mb-0">{title}</h2>
        </div>
        {children}
      </motion.div>
    )
  }

  return (
    <div className="page-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">Manage your account preferences and configuration.</p>
        </motion.div>

        {/* Profile Section */}
        <SectionCard icon={User} title="Profile">
          <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'TG'}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                <button type="button" className="btn-secondary text-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-xs text-text-tertiary mt-1">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                {...profileRegister('name', { required: 'Name is required' })}
                className={`input-field ${profileErrors.name ? 'ring-2 ring-danger-500/30 border-danger-400' : ''}`}
              />
              {profileErrors.name && <p className="text-danger-500 text-xs mt-1">{profileErrors.name.message}</p>}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                {...profileRegister('email')}
                className="input-field bg-surface-tertiary/50 text-text-tertiary cursor-not-allowed"
                disabled
              />
            </div>

            {/* Goals */}
            <div>
              <label className="label">Goals</label>
              <textarea
                rows={3}
                {...profileRegister('goals')}
                className="input-field resize-none"
                placeholder="What are your main productivity goals?"
              />
            </div>

            {/* Daily Target */}
            <div>
              <label className="label">Daily Task Target</label>
              <input
                type="number"
                min={1}
                max={50}
                {...profileRegister('dailyTarget', { min: { value: 1, message: 'Minimum is 1' }, max: { value: 50, message: 'Maximum is 50' } })}
                className={`input-field w-32 ${profileErrors.dailyTarget ? 'ring-2 ring-danger-500/30 border-danger-400' : ''}`}
              />
              {profileErrors.dailyTarget && <p className="text-danger-500 text-xs mt-1">{profileErrors.dailyTarget.message}</p>}
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Work Start Time</label>
                <input type="time" {...profileRegister('workStart')} className="input-field" />
              </div>
              <div>
                <label className="label">Work End Time</label>
                <input type="time" {...profileRegister('workEnd')} className="input-field" />
              </div>
            </div>

            {/* Preferred Study Time */}
            <div>
              <label className="label">Preferred Study Time</label>
              <select {...profileRegister('preferredStudyTime')} className="input-field">
                <option value="morning">Morning (6AM - 12PM)</option>
                <option value="afternoon">Afternoon (12PM - 5PM)</option>
                <option value="evening">Evening (5PM - 9PM)</option>
                <option value="night">Night (9PM - 12AM)</option>
              </select>
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={profileLoading}
                className="btn-primary"
              >
                <Save size={16} className="mr-2" />
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </motion.button>
            </div>
          </form>
        </SectionCard>

        {/* Voice Settings */}
        <SectionCard icon={Mic} title="Voice Settings">
          <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 size={18} className="text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Mute All Voice</p>
                  <p className="text-xs text-text-tertiary">Disable voice assistant audio</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={voiceMuted} onChange={(e) => setVoiceMuted(e.target.checked)} className="sr-only peer" />
                <div className="w-10 h-5.5 bg-surface-tertiary rounded-full peer peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-[18px] rounded-full h-5 w-10 p-0.5" />
              </label>
            </div>

            <div>
              <label className="label">Language</label>
              <select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)} className="input-field">
                <option value="en">English</option>
                <option value="bn">Bengali</option>
              </select>
            </div>

            <div>
              <label className="label">Volume: {voiceVolume}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </form>
        </SectionCard>

        {/* Password Section */}
        <SectionCard icon={Lock} title="Change Password">
          <form onSubmit={handlePasswordSubmit(onPasswordSave)} className="space-y-5">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                {...passwordRegister('currentPassword', { required: 'Current password is required' })}
                className={`input-field ${passwordErrors.currentPassword ? 'ring-2 ring-danger-500/30 border-danger-400' : ''}`}
              />
              {passwordErrors.currentPassword && <p className="text-danger-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                {...passwordRegister('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
                className={`input-field ${passwordErrors.newPassword ? 'ring-2 ring-danger-500/30 border-danger-400' : ''}`}
              />
              {passwordErrors.newPassword && <p className="text-danger-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                {...passwordRegister('confirmPassword', { required: 'Please confirm your password' })}
                className={`input-field ${passwordErrors.confirmPassword ? 'ring-2 ring-danger-500/30 border-danger-400' : ''}`}
              />
              {passwordErrors.confirmPassword && <p className="text-danger-500 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>}
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={passwordLoading}
                className="btn-primary"
              >
                <Lock size={16} className="mr-2" />
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </motion.button>
            </div>
          </form>
        </SectionCard>
      </motion.div>
    </div>
  )
}
