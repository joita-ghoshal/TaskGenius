import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

const pageTitles = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/ai-chat': 'AI Chat',
  '/focus-mode': 'Focus Mode',
  '/settings': 'Settings',
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
  )?.[1] || 'Dashboard';

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/70 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-all duration-200"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <motion.h1
            key={pageTitle}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-lg font-bold text-text-primary hidden sm:block"
          >
            {pageTitle}
          </motion.h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search tasks, projects..."
              className="input-field pl-10 pr-4 w-48 lg:w-64 h-9 text-sm rounded-xl bg-surface-secondary/50 border-border/70 focus:bg-white"
            />
          </div>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-all duration-200"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <div className="relative">
            <button
              className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-gradient-to-br from-danger-400 to-danger-500 text-white text-[10px] font-bold rounded-full shadow-sm shadow-danger-500/30">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-tertiary transition-all duration-200 group"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <span className="hidden lg:block text-sm font-medium text-text-primary max-w-[100px] truncate">
                {user?.name || 'User'}
              </span>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="absolute right-0 top-full mt-2 w-56 p-1.5 bg-white/90 backdrop-blur-xl border border-border rounded-2xl shadow-xl shadow-black/5"
                >
                  <div className="px-3 py-2.5 border-b border-border/50 mb-1">
                    <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-text-tertiary truncate">{user?.email || ''}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-xl transition-all duration-200"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-xl transition-all duration-200"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                  <div className="border-t border-border/50 mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-danger-500 hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-all duration-200"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-t border-border/50 px-4 py-3 bg-white/90 backdrop-blur-xl"
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search tasks, projects..."
                className="input-field pl-10 pr-4 w-full h-9 text-sm"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
