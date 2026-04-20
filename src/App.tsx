/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Circle, 
  BrainCircuit, 
  ChevronRight,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Settings,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parse, isAfter, isBefore, addMinutes } from 'date-fns';
import { Task, AIOptimization } from './types';
import { optimizeSchedule, analyzeObstacles } from './services/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<AIOptimization | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'insights' | 'why'>('schedule');
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'work',
    completed: false
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [obstacleReason, setObstacleReason] = useState('');
  const [insight, setInsight] = useState<string | null>(null);
  const [isGettingInsight, setIsGettingInsight] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('tempopulse_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('tempopulse_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title!,
      startTime: newTask.startTime!,
      endTime: newTask.endTime!,
      category: newTask.category as any,
      completed: false,
      notes: newTask.notes
    };
    setTasks(prev => [...prev, task].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setNewTask({ title: '', startTime: '09:00', endTime: '10:00', category: 'work' });
    setShowAddModal(false);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleOptimize = async () => {
    if (tasks.length === 0) return;
    setIsOptimizing(true);
    const result = await optimizeSchedule(tasks);
    setOptimization(result);
    setIsOptimizing(false);
    setActiveTab('insights');
  };

  const handleGetInsight = async () => {
    if (!selectedTaskId || !obstacleReason) return;
    setIsGettingInsight(true);
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      const result = await analyzeObstacles(task, obstacleReason);
      setInsight(result);
    }
    setIsGettingInsight(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans selection:bg-blue-100">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#171717] rounded-xl flex items-center justify-center text-white shadow-sm">
              <Clock size={22} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter uppercase">T.M.A.</span>
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-widest">Time Mgmt App</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-full">
            <button 
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                activeTab === 'schedule' ? "bg-white shadow-sm text-[#171717]" : "text-[#737373] hover:text-[#171717]"
              )}
            >
              Schedule
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                activeTab === 'insights' ? "bg-white shadow-sm text-[#171717]" : "text-[#737373] hover:text-[#171717]"
              )}
            >
              Insights
            </button>
            <button 
              onClick={() => setActiveTab('why')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                activeTab === 'why' ? "bg-white shadow-sm text-[#171717]" : "text-[#737373] hover:text-[#171717]"
              )}
            >
              The Why
            </button>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-[#171717] text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-stone-200"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#737373]">Daily Progress</h2>
            <span className="text-xs font-bold text-[#171717]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-[#171717] rounded-full"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Your Pulse</h2>
                <button 
                  onClick={handleOptimize}
                  disabled={isOptimizing || tasks.length === 0}
                  className="flex items-center gap-2 text-sm font-bold text-[#171717] hover:underline disabled:opacity-30"
                >
                  <BrainCircuit size={18} />
                  AI Optimize
                </button>
              </div>

              <div className="grid gap-3">
                {tasks.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-3xl">
                    <p className="text-[#737373] font-medium">No tasks scheduled for today.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      className={cn(
                        "group bg-white border border-[#E5E5E5] p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-[#171717]",
                        task.completed && "bg-[#FAFAFA]"
                      )}
                    >
                      <button 
                        onClick={() => toggleComplete(task.id)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          task.completed ? "bg-[#171717] border-[#171717] text-white" : "border-[#E5E5E5] text-transparent hover:border-[#171717]"
                        )}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black text-[#737373] uppercase tracking-tighter">
                            {task.startTime} — {task.endTime}
                          </span>
                        </div>
                        <h3 className={cn(
                          "text-base font-bold tracking-tight",
                          task.completed && "text-[#A3A3A3] line-through"
                        )}>
                          {task.title}
                        </h3>
                      </div>

                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-[#A3A3A3] hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold tracking-tight">AI Insights</h2>
              
              {!optimization ? (
                <div className="py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-3xl">
                  <p className="text-[#737373] font-medium">Run AI Optimization to see insights.</p>
                  <button 
                    onClick={handleOptimize}
                    className="mt-4 px-6 py-2 bg-[#171717] text-white rounded-full font-bold text-sm"
                  >
                    Optimize Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-[#E5E5E5] p-8 rounded-[2rem] space-y-6">
                    <div>
                      <p className="text-xs font-bold text-[#737373] uppercase tracking-widest mb-2">Efficiency Score</p>
                      <p className="text-6xl font-black tracking-tighter">{optimization.efficiencyScore}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#737373] uppercase tracking-widest mb-2">Time Saved Potential</p>
                      <p className="text-4xl font-black tracking-tighter text-green-600">{optimization.timeSavedEstimate}</p>
                    </div>
                  </div>

                  <div className="bg-[#171717] text-white p-8 rounded-[2rem] space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Zap size={20} className="text-yellow-400" /> Suggestions
                    </h3>
                    <ul className="space-y-4">
                      {optimization.suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-[#D4D4D4] leading-relaxed flex gap-3">
                          <span className="text-white font-bold">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {optimization.bottlenecks.length > 0 && (
                    <div className="md:col-span-2 bg-red-50 border border-red-100 p-8 rounded-[2rem]">
                      <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={20} /> Critical Bottlenecks
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {optimization.bottlenecks.map((b, i) => (
                          <span key={i} className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-red-700 shadow-sm border border-red-100">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'why' && (
            <motion.div
              key="why"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">The Why Factor</h2>
                <p className="text-[#737373] font-medium">
                  Stuck on a task? Let's figure out the psychological block.
                </p>
              </div>

              <div className="bg-white border border-[#E5E5E5] p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">The Task</label>
                    <select 
                      value={selectedTaskId}
                      onChange={e => setSelectedTaskId(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#171717] outline-none"
                    >
                      <option value="">Select a task...</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">The Feeling</label>
                    <textarea 
                      value={obstacleReason}
                      onChange={e => setObstacleReason(e.target.value)}
                      placeholder="Why is it hard? (e.g. 'I feel overwhelmed by the scale')"
                      className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#171717] outline-none min-h-[120px]"
                    />
                  </div>

                  <button 
                    onClick={handleGetInsight}
                    disabled={isGettingInsight || !selectedTaskId || !obstacleReason}
                    className="w-full py-4 bg-[#171717] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-30"
                  >
                    {isGettingInsight ? 'Analyzing...' : 'Get Insight'}
                  </button>
                </div>

                <AnimatePresence>
                  {insight && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#F5F5F5] p-6 rounded-3xl border border-[#E5E5E5]"
                    >
                      <p className="text-[#171717] font-medium italic leading-relaxed">
                        "{insight}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-bold tracking-tighter mb-8">New Task</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">Title</label>
                  <input 
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Deep work session"
                    className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#171717] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">Start</label>
                    <input 
                      type="time" 
                      value={newTask.startTime}
                      onChange={e => setNewTask({...newTask, startTime: e.target.value})}
                      className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#171717] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">End</label>
                    <input 
                      type="time" 
                      value={newTask.endTime}
                      onChange={e => setNewTask({...newTask, endTime: e.target.value})}
                      className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 font-bold focus:ring-2 focus:ring-[#171717] outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={addTask}
                  className="w-full py-4 bg-[#171717] text-white rounded-2xl font-bold text-lg mt-4 hover:scale-[1.02] transition-transform"
                >
                  Add Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
