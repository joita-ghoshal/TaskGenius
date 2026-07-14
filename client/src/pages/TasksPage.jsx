import { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Search, Calendar, Clock, AlertTriangle, CheckCircle2,
  Circle, Trash2, Edit3, X, Sparkles,
  Layers, ListTodo, ArrowUpDown
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'in-progress', 'completed'];
const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
];

const priorityConfig = {
  low: { label: 'Low', color: 'badge-gray', dot: 'bg-gray-400', border: 'border-gray-300' },
  medium: { label: 'Medium', color: 'badge-blue', dot: 'bg-brand-500', border: 'border-brand-300' },
  high: { label: 'High', color: 'badge-orange', dot: 'bg-orange-500', border: 'border-orange-300' },
  critical: { label: 'Critical', color: 'badge-red', dot: 'bg-red-500', border: 'border-red-400' },
};

const riskConfig = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const defaultTaskForm = {
  title: '', description: '', deadline: '', priority: 'medium',
  category: '', estimatedDuration: '', notes: '', subtasks: [],
};

function getRelativeDeadline(dateStr) {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  if (isPast(date) && !isToday(date)) return 'Overdue';
  if (isToday(date)) {
    const hours = differenceInHours(date, new Date());
    if (hours < 1) {
      const mins = differenceInMinutes(date, new Date());
      return mins <= 0 ? 'Due now' : `${mins} min left`;
    }
    return `${hours}h left`;
  }
  if (isTomorrow(date)) return 'Due tomorrow';
  const dist = formatDistanceToNow(date, { addSuffix: true });
  return dist.charAt(0).toUpperCase() + dist.slice(1);
}

function getDeadlineStyle(dateStr) {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (isPast(date) && !isToday(date)) return 'text-red-600 font-semibold';
  if (isToday(date)) return 'text-orange-600 font-semibold';
  return 'text-text-secondary';
}

function completionProbabilityColor(value) {
  if (value >= 80) return 'bg-green-500';
  if (value >= 50) return 'bg-yellow-500';
  if (value >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [subtaskInput, setSubtaskInput] = useState('');

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: defaultTaskForm });

  const watchSubtasks = watch('subtasks', []);

  const allCategories = useMemo(() => {
    const cats = new Set();
    tasks.forEach(t => { if (t.category) cats.add(t.category); });
    return ['all', ...Array.from(cats)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'deadline': {
          if (!a.deadline) return 1; if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        }
        case 'priority': {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
        }
        case 'created': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'title': return (a.title || '').localeCompare(b.title || '');
        default: return 0;
      }
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const openCreateModal = () => {
    setEditingTask(null);
    reset(defaultTaskForm);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    reset({
      title: task.title || '',
      description: task.description || '',
      deadline: task.deadline ? format(parseISO(task.deadline), "yyyy-MM-dd'T'HH:mm") : '',
      priority: task.priority || 'medium',
      category: task.category || '',
      estimatedDuration: task.estimatedDuration || '',
      notes: task.notes || '',
      subtasks: task.subtasks || [],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    reset(defaultTaskForm);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        estimatedDuration: data.estimatedDuration ? Number(data.estimatedDuration) : undefined,
        subtasks: data.subtasks || [],
      };
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        toast.success('Task updated');
      } else {
        await createTask(payload);
        toast.success('Task created');
      }
      closeModal();
    } catch {
      toast.error('Failed to save task');
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      if (expandedTask?.id === task.id) setExpandedTask(null);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const toggleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(task.id, { status: newStatus });
    } catch {
      toast.error('Failed to update task');
    }
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    const current = watchSubtasks || [];
    setValue('subtasks', [...current, { title: subtaskInput.trim(), completed: false }]);
    setSubtaskInput('');
  };

  const removeSubtask = (index) => {
    const current = watchSubtasks || [];
    setValue('subtasks', current.filter((_, i) => i !== index));
  };

  const toggleSubtask = (index) => {
    const current = watchSubtasks || [];
    const updated = current.map((st, i) =>
      i === index ? { ...st, completed: !st.completed } : st
    );
    setValue('subtasks', updated);
  };

  const handleAnalyze = async (task) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    try {
      const { aiAPI } = await import('../services/api');
      const { data } = await aiAPI.analyzeTask(task.id);
      setAiAnalysis(data.analysis || data);
      toast.success('Analysis complete');
    } catch {
      setAiAnalysis('AI analysis is currently unavailable. Please try again later.');
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Tasks</h1>
          <p className="text-text-secondary text-sm mt-1">
            {tasks.length} total &middot; {completedCount} completed
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </motion.button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field w-auto min-w-[130px]"
          >
            <option value="all">All Status</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="input-field w-auto min-w-[130px]"
          >
            <option value="all">All Priority</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field w-auto min-w-[130px]"
          >
            {allCategories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input-field pl-9 w-auto min-w-[130px]"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton w-5 h-5 rounded mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="flex gap-3">
                    <div className="skeleton h-6 w-16 rounded-full" />
                    <div className="skeleton h-6 w-20 rounded-full" />
                    <div className="skeleton h-6 w-24 rounded-full" />
                  </div>
                  <div className="skeleton h-2 w-full rounded-full" />
                </div>
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-tertiary mb-4">
            <ListTodo className="w-8 h-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">No tasks found</h3>
          <p className="text-text-secondary text-sm mb-4">
            {search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first task'}
          </p>
          {!search && statusFilter === 'all' && priorityFilter === 'all' && categoryFilter === 'all' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCreateModal}
              className="btn-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Task Cards List */}
      {!loading && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`card card-hover overflow-hidden ${
                  task.emergency ? 'border-red-400 animate-countdown-pulse' : ''
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleComplete(task)}
                      className={`mt-0.5 flex-shrink-0 transition-colors ${
                        task.status === 'completed' ? 'text-green-500' : 'text-text-tertiary hover:text-brand-500'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <button
                          onClick={() => setExpandedTask(expandedTask?.id === task.id ? null : task)}
                          className={`text-left font-semibold truncate hover:text-brand-600 transition-colors ${
                            task.status === 'completed' ? 'line-through text-text-tertiary' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                          {task.emergency && (
                            <span className="badge-red gap-1 animate-emergency-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Emergency
                            </span>
                          )}
                          <span className={priorityConfig[task.priority]?.color || 'badge-gray'}>
                            {priorityConfig[task.priority]?.label || task.priority}
                          </span>
                          {task.category && (
                            <span className="badge-gray">{task.category}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
                        {task.deadline && (
                          <span className={`inline-flex items-center gap-1 ${getDeadlineStyle(task.deadline)}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseISO(task.deadline), 'MMM d, HH:mm')}
                            <span className="ml-0.5">({getRelativeDeadline(task.deadline)})</span>
                          </span>
                        )}
                        {task.estimatedDuration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {task.estimatedDuration} min
                          </span>
                        )}
                        {task.subtasks?.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${riskConfig[task.risk] || 'bg-gray-400'}`} />
                          {task.risk || 'Unknown'} risk
                        </span>
                      </div>

                      {task.completionProbability !== undefined && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${completionProbabilityColor(task.completionProbability)}`}
                              style={{ width: `${task.completionProbability}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
                            {task.completionProbability}%
                          </span>
                        </div>
                      )}

                      {/* Subtask progress */}
                      {task.subtasks?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {task.subtasks.slice(0, 3).map((st, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                              {st.completed ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                              )}
                              <span className={st.completed ? 'line-through' : ''}>{st.title}</span>
                            </div>
                          ))}
                          {task.subtasks.length > 3 && (
                            <p className="text-xs text-text-tertiary">+{task.subtasks.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openEditModal(task)}
                        className="btn-ghost p-1.5"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(task)}
                        className="btn-ghost p-1.5 text-danger-400 hover:text-danger-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail View */}
                <AnimatePresence>
                  {expandedTask?.id === task.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-5 py-4 space-y-4">
                        {task.description && (
                          <div>
                            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Description</h4>
                            <p className="text-sm text-text-secondary">{task.description}</p>
                          </div>
                        )}

                        {task.notes && (
                          <div>
                            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Notes</h4>
                            <p className="text-sm text-text-secondary">{task.notes}</p>
                          </div>
                        )}

                        {/* AI Analysis */}
                        <div>
                          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">AI Analysis</h4>
                          {!aiAnalysis && !analyzing && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleAnalyze(task)}
                              className="btn-secondary gap-2 text-sm"
                            >
                              <Sparkles className="w-4 h-4" />
                              Analyze with AI
                            </motion.button>
                          )}
                          {analyzing && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                              Analyzing...
                            </div>
                          )}
                          {aiAnalysis && !analyzing && (
                            <div className="bg-surface-tertiary rounded-xl p-3 text-sm text-text-secondary">
                              {typeof aiAnalysis === 'string' ? (
                                <p>{aiAnalysis}</p>
                              ) : (
                                <div className="space-y-2">
                                  {aiAnalysis.summary && <p>{aiAnalysis.summary}</p>}
                                  {aiAnalysis.insights?.length > 0 && (
                                    <ul className="list-disc list-inside space-y-1">
                                      {aiAnalysis.insights.map((insight, i) => (
                                        <li key={i}>{insight}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {aiAnalysis.recommendations?.length > 0 && (
                                    <div>
                                      <p className="font-medium text-text-primary mt-2">Recommendations:</p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {aiAnalysis.recommendations.map((rec, i) => (
                                          <li key={i}>{rec}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openEditModal(task)}
                            className="btn-secondary gap-2 text-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDelete(task)}
                            className="btn-danger gap-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl border-t border-border"
            >
              <div className="max-w-2xl mx-auto p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingTask ? 'Edit Task' : 'Create Task'}
                  </h2>
                  <button onClick={closeModal} className="btn-ghost p-1.5">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="label">Title *</label>
                    <input
                      type="text"
                      {...register('title', { required: 'Title is required' })}
                      placeholder="Enter task title"
                      className={`input-field ${errors.title ? 'ring-2 ring-red-400' : ''}`}
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <textarea
                      {...register('description')}
                      placeholder="Enter task description"
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Deadline</label>
                      <input
                        type="datetime-local"
                        {...register('deadline')}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Priority</label>
                      <div className="flex gap-2">
                        {PRIORITIES.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setValue('priority', p)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                              watch('priority') === p
                                ? `${priorityConfig[p].border} ${priorityConfig[p].color} ring-1 ring-brand-500/30`
                                : 'border-border text-text-secondary hover:border-brand-300'
                            }`}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${priorityConfig[p].dot} mr-1 align-middle`} />
                            {priorityConfig[p].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <input
                        type="text"
                        {...register('category')}
                        placeholder="e.g. Work, Personal"
                        list="category-suggestions"
                        className="input-field"
                      />
                      <datalist id="category-suggestions">
                        {allCategories.filter(c => c !== 'all').map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="label">Estimated Duration (minutes)</label>
                      <input
                        type="number"
                        {...register('estimatedDuration')}
                        placeholder="e.g. 30"
                        min="0"
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div>
                    <label className="label">Subtasks</label>
                    <div className="space-y-2">
                      {watchSubtasks?.map((st, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSubtask(i)}
                            className={`flex-shrink-0 ${st.completed ? 'text-green-500' : 'text-text-tertiary'}`}
                          >
                            {st.completed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${st.completed ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                            {st.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSubtask(i)}
                            className="text-danger-400 hover:text-danger-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={subtaskInput}
                          onChange={e => setSubtaskInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                          placeholder="Add a subtask..."
                          className="input-field flex-1"
                        />
                        <button
                          type="button"
                          onClick={addSubtask}
                          className="btn-secondary px-3"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      {...register('notes')}
                      placeholder="Additional notes..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary flex-1 gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {editingTask ? 'Update Task' : 'Save Task'}
                    </motion.button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
