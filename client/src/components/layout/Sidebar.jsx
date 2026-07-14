import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  BarChart3,
  Bot,
  Timer,
  Settings,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/ai-chat', label: 'AI Chat', icon: Bot },
  { to: '/focus-mode', label: 'Focus Mode', icon: Timer },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const sidebarVariants = {
  open: {
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  closed: {
    x: '-100%',
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

const itemVariants = {
  open: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: 'spring', stiffness: 300, damping: 24 },
  }),
  closed: {
    opacity: 0,
    x: -20,
  },
};

export default function Sidebar({ isOpen: externalOpen, onToggle }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : true;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  const showSidebar = isControlled ? isOpen : mobileOpen;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      <button
        onClick={handleToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-border shadow-sm hover:bg-surface-secondary transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {showSidebar ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={showSidebar ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          lg:translate-x-0 lg:static lg:z-auto
          flex flex-col
          bg-white/70 backdrop-blur-xl
          border-r border-border
          shadow-xl shadow-black/5
        `}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm shadow-brand-500/20">
              <span className="text-white font-bold text-sm">TG</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
              TaskGenius
            </span>
          </div>
          <button
            onClick={handleToggle}
            className="hidden lg:flex p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-all duration-200"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            const isDashboardActive = item.to === '/dashboard' && location.pathname === '/';

            return (
              <motion.div
                key={item.to}
                custom={i}
                variants={itemVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={() => {
                    if (!isControlled) setMobileOpen(false);
                  }}
                  className={`
                    group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 relative overflow-hidden
                    ${isActive || isDashboardActive
                      ? 'text-brand-600 bg-brand-50/80 shadow-sm shadow-brand-500/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/70'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-50 to-brand-100/50"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={`relative z-10 ${
                      isActive ? 'text-brand-500' : 'text-text-tertiary group-hover:text-text-secondary'
                    } transition-colors duration-200`}
                  />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand-500"
                      layoutId="sidebar-dot"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-tertiary/50 hover:bg-surface-tertiary transition-all duration-200 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {user?.email || 'online'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-accent-500 shadow-sm shadow-accent-500/40" />
          </div>
        </div>
      </motion.aside>
    </>
  );
}
