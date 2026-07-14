import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';

const strengthConfig = [
  { label: 'Weak', color: 'bg-red-400', min: 0 },
  { label: 'Fair', color: 'bg-orange-400', min: 2 },
  { label: 'Good', color: 'bg-yellow-400', min: 3 },
  { label: 'Strong', color: 'bg-green-400', min: 4 },
];

function getStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const level = getStrength(password);
  const { label, color } = strengthConfig.find((s) => level >= s.min) || strengthConfig[0];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < level ? color : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Password strength: <span className="font-medium">{label}</span></p>
    </div>
  );
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data.fullName, data.email, data.password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold shadow-lg shadow-blue-200 mb-4">
              TG
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-1">Join TaskGenius and boost your productivity</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  {...register('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                  placeholder="John Doe"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white/60 text-sm outline-none transition-colors ${
                    errors.fullName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                  } focus:ring-2 focus:ring-blue-100`}
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' },
                  })}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white/60 text-sm outline-none transition-colors ${
                    errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                  } focus:ring-2 focus:ring-blue-100`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'At least 6 characters' },
                    pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must contain upper, lower & number' },
                  })}
                  placeholder="Create a strong password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-white/60 text-sm outline-none transition-colors ${
                    errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                  } focus:ring-2 focus:ring-blue-100`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val) => val === password || 'Passwords do not match',
                  })}
                  placeholder="Confirm your password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-white/60 text-sm outline-none transition-colors ${
                    errors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                  } focus:ring-2 focus:ring-blue-100`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                {...register('agreeTerms', { required: 'You must agree to the terms' })}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
              />
              <span className="text-gray-600">
                I agree to the{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                  Terms & Conditions
                </Link>
              </span>
            </label>
            {errors.agreeTerms && <p className="text-red-500 text-xs -mt-3">{errors.agreeTerms.message}</p>}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-200 hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
