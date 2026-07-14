import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  X,
  CalendarClock,
  AlertTriangle,
  Info,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { format, formatDistanceToNow } from 'date-fns';

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

const typeIcons = {
  deadline: CalendarClock,
  alert: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const typeColors = {
  deadline: 'bg-amber-100 text-amber-600',
  alert: 'bg-danger-100 text-danger-500',
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
  )?.[1] || 'Dashboard';

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

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
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search tasks, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 pr-4 w-48 lg:w-64 h-9 text-sm rounded-xl bg-surface-secondary/50 border-border/70 focus:bg-white"
            />
          </form>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-all duration-200"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
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

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-1.5 bg-white/90 backdrop-blur-xl border border-border rounded-2xl shadow-xl shadow-black/5 max-h-[70vh] flex flex-col"
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-10">
                        <Bell size={32} className="mx-auto text-text-tertiary mb-2" />
                        <p className="text-sm text-text-tertiary">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = typeIcons[n.type] || Info;
                        return (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer ${
                              n.read ? '' : 'bg-brand-50/50'
                            } hover:bg-surface-tertiary`}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.actionUrl) navigate(n.actionUrl);
                              setNotifOpen(false);
                            }}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${typeColors[n.type] || typeColors.info}`}>
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${n.read ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-text-tertiary/60 mt-1">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search tasks, projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 pr-4 w-full h-9 text-sm"
                autoFocus
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
