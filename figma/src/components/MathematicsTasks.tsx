import { useState } from 'react';
import { ListTodo, Plus, Pencil, Trash2, Save, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
}

type FilterType = 'all' | 'pending' | 'completed';

const priorityConfig = {
  high: {
    label: 'High Priority',
    border: 'border-l-rose-500',
    badge: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border border-rose-300',
    cardBg: 'from-rose-50/50 to-pink-50/30',
  },
  medium: {
    label: 'Medium Priority',
    border: 'border-l-amber-500',
    badge: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-300',
    cardBg: 'from-amber-50/50 to-orange-50/30',
  },
  low: {
    label: 'Low Priority',
    border: 'border-l-emerald-500',
    badge: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-300',
    cardBg: 'from-emerald-50/50 to-teal-50/30',
  },
};

export function MathematicsTasks() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Complete Algebra Practice Problems',
      description: 'Solve 20 quadratic equations from Chapter 5',
      priority: 'high',
      dueDate: 'Tomorrow',
      completed: false,
    },
    {
      id: '2',
      title: 'Review Calculus Formulas',
      description: 'Memorize derivative and integral formulas',
      priority: 'medium',
      dueDate: 'Friday',
      completed: false,
    },
    {
      id: '3',
      title: 'Complete Geometry Homework',
      description: 'Finish triangle congruence problems',
      priority: 'low',
      dueDate: 'Completed Today',
      completed: true,
    },
  ]);

  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const handleAddTask = () => {
    if (!newTask.trim()) {
      toast.error('Please enter a task');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      description: 'New mathematics task',
      priority: 'medium',
      dueDate: 'Soon',
      completed: false,
    };

    setTasks([...tasks, task]);
    setNewTask('');
    toast.success('Task added!', { description: newTask });
  };

  const handleToggleComplete = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
    const task = tasks.find((t) => t.id === id);
    if (task) {
      toast.success(
        task.completed ? 'Task marked as pending' : 'Task completed!',
        { description: task.title }
      );
    }
  };

  const handleDeleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    setTasks(tasks.filter((task) => task.id !== id));
    toast.success('Task deleted', { description: task?.title });
  };

  const handleEditTask = (id: string) => {
    setEditingId(id);
    toast.info('Edit mode enabled', { description: 'Click outside to save' });
  };

  const handleSaveTasks = () => {
    localStorage.setItem('mathTasks', JSON.stringify(tasks));
    toast.success('Tasks saved!', {
      description: `${tasks.length} tasks saved to browser`,
    });
  };

  const handleLoadTasks = () => {
    const saved = localStorage.getItem('mathTasks');
    if (saved) {
      setTasks(JSON.parse(saved));
      toast.success('Tasks loaded!', {
        description: `${JSON.parse(saved).length} tasks loaded`,
      });
    } else {
      toast.error('No saved tasks found');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-white/40 hover:shadow-2xl transition-all duration-500 relative overflow-hidden"
    >
      {/* Animated background particles */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 20, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-40 h-40 bg-blue-300/20 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -20, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />

      {/* Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div
            className="w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/40"
            whileHover={{ scale: 1.1, rotate: 360 }}
            animate={{
              boxShadow: [
                '0 10px 20px rgba(139, 92, 246, 0.4)',
                '0 15px 30px rgba(139, 92, 246, 0.6)',
                '0 10px 20px rgba(139, 92, 246, 0.4)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          >
            <ListTodo className="w-5 h-5 text-white" />
          </motion.div>
          <h2 className="text-gray-900 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Mathematics Tasks
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          Track your daily mathematics assignments and goals
        </p>
      </div>

      {/* Add Task Input */}
      <div className="flex gap-2 mb-6 relative z-10">
        <motion.div
          className="flex-1"
          whileFocus={{ scale: 1.01 }}
        >
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a new mathematics task..."
            className="w-full bg-white/80 border-white/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
          />
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{
            boxShadow: [
              '0 4px 15px rgba(59, 130, 246, 0.3)',
              '0 6px 20px rgba(59, 130, 246, 0.5)',
              '0 4px 15px rgba(59, 130, 246, 0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          <Button
            onClick={handleAddTask}
            className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 text-white rounded-lg shadow-lg bg-[length:200%_100%] hover:bg-right transition-all duration-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </motion.div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6 relative z-10">
        {(['all', 'pending', 'completed'] as FilterType[]).map((f, idx) => (
          <motion.button
            key={f}
            onClick={() => setFilter(f)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
              filter === f
                ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-lg shadow-blue-500/40 bg-[length:200%_100%] animate-gradient'
                : 'bg-white/70 text-gray-600 hover:bg-white/90 border border-white/80 hover:border-blue-300 shadow-sm hover:shadow-md'
            }`}
          >
            {f === 'all' && '⚡ All Tasks'}
            {f === 'pending' && '⏱️ Pending'}
            {f === 'completed' && '✓ Completed'}
          </motion.button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto relative z-10">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{
                opacity: 0,
                scale: 0.8,
                x: -100,
                rotateZ: -10,
                transition: { duration: 0.3 },
              }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                type: 'spring',
                stiffness: 200,
              }}
              whileHover={{
                scale: 1.02,
                y: -4,
                boxShadow: task.completed
                  ? '0 20px 40px rgba(0, 0, 0, 0.12)'
                  : '0 20px 40px rgba(139, 92, 246, 0.25)',
              }}
              className={`bg-gradient-to-br ${
                task.completed
                  ? 'from-gray-50/70 to-gray-100/40'
                  : priorityConfig[task.priority].cardBg
              } border ${
                task.completed ? 'border-gray-300' : 'border-white/60'
              } rounded-xl p-4 border-l-4 ${
                task.completed
                  ? 'border-l-emerald-500'
                  : priorityConfig[task.priority].border
              } backdrop-blur-sm transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Shimmer effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'linear',
                }}
              />
              <div className="flex items-start gap-3 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="mt-0.5 cursor-pointer"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleComplete(task.id)}
                    className="border-2 w-5 h-5"
                  />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-gray-900 ${
                      task.completed
                        ? 'line-through text-gray-500'
                        : 'group-hover:text-gray-950'
                    } transition-colors`}
                  >
                    {task.title}
                  </div>
                  <div
                    className={`text-sm mt-1 ${
                      task.completed ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {task.description}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${
                        task.completed
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : priorityConfig[task.priority].badge
                      }`}
                    >
                      {task.completed
                        ? 'Completed'
                        : priorityConfig[task.priority].label}
                    </span>
                    <span className="px-2 py-1 rounded-md text-xs bg-white/60 text-gray-600 border border-white/80">
                      Due: {task.dueDate}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 relative z-10">
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleEditTask(task.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                  >
                    <Pencil className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: -15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-br from-gray-50/90 to-gray-100/60 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/60 shadow-md relative z-10 overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
          }}
        />
        <div className="grid grid-cols-3 gap-4 text-center relative z-10">
          <motion.div whileHover={{ scale: 1.05, y: -2 }}>
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stats.total}
            </motion.div>
            <div className="text-gray-600 text-sm mt-1">Total Tasks</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }}>
            <motion.div
              className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            >
              {stats.pending}
            </motion.div>
            <div className="text-gray-600 text-sm mt-1">Pending</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }}>
            <motion.div
              className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            >
              {stats.completed}
            </motion.div>
            <div className="text-gray-600 text-sm mt-1">Completed</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Save/Load Buttons */}
      <div className="flex gap-2 relative z-10">
        <motion.div
          className="flex-1"
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button
            onClick={handleSaveTasks}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/50 transition-all duration-300 bg-[length:200%_100%]"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Save className="w-4 h-4 mr-2 inline" />
            </motion.div>
            Save Tasks
          </Button>
        </motion.div>
        <motion.div
          className="flex-1"
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button
            onClick={handleLoadTasks}
            className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/40 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 bg-[length:200%_100%]"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Download className="w-4 h-4 mr-2 inline" />
            </motion.div>
            Load Tasks
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
