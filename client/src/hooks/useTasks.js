import { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import toast from 'react-hot-toast';

export function useTasks(params) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await tasksAPI.getAll(params);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (taskData) => {
    try {
      const { data } = await tasksAPI.create(taskData);
      setTasks(prev => [data.task, ...prev]);
      toast.success('Task created successfully');
      return data.task;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
      throw err;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      const { data } = await tasksAPI.update(id, taskData);
      setTasks(prev => prev.map(t => t.id === id ? data.task : t));
      toast.success('Task updated');
      return data.task;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      await tasksAPI.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
      throw err;
    }
  };

  return { tasks, loading, error, refetch: fetchTasks, createTask, updateTask, deleteTask };
}
