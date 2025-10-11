import { Clock, ArrowRight, TrendingUp, Award, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Activity {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'completion' | 'submission' | 'attendance' | 'achievement';
}

const activities: Activity[] = [
  {
    id: '1',
    title: 'Completed Algebra Quiz',
    subtitle: 'Scored 95% on Chapter 5: Quadratic Equations',
    timestamp: '2h ago',
    type: 'completion',
  },
  {
    id: '2',
    title: 'Submitted Calculus Homework',
    subtitle: 'Derivative Applications - Problem Set 3',
    timestamp: '1d ago',
    type: 'submission',
  },
  {
    id: '3',
    title: 'Attended Study Group',
    subtitle: 'Geometry: Circle Properties and Theorems',
    timestamp: '2d ago',
    type: 'attendance',
  },
  {
    id: '4',
    title: 'Earned Achievement Badge',
    subtitle: 'Problem Solver: Completed 100 math problems',
    timestamp: '3d ago',
    type: 'achievement',
  },
];

const activityIcons = {
  completion: CheckCircle2,
  submission: BookOpen,
  attendance: TrendingUp,
  achievement: Award,
};

const activityColors = {
  completion: 'from-emerald-500 via-green-500 to-teal-600',
  submission: 'from-sky-500 via-blue-500 to-cyan-600',
  attendance: 'from-violet-500 via-purple-500 to-fuchsia-600',
  achievement: 'from-amber-500 via-orange-500 to-yellow-600',
};

const activityGlows = {
  completion: 'shadow-emerald-500/40',
  submission: 'shadow-blue-500/40',
  attendance: 'shadow-purple-500/40',
  achievement: 'shadow-amber-500/40',
};

export function RecentActivities() {
  const handleActivityClick = (activity: Activity) => {
    toast.info(`Viewing ${activity.title}`, {
      description: activity.subtitle,
    });
  };

  const handleViewAllClick = () => {
    toast.success('Opening full activity history...', {
      description: 'Loading all your recent activities',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-white/40 hover:shadow-2xl transition-all duration-500"
    >
      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Clock className="w-5 h-5 text-white" />
          </motion.div>
          <h2 className="text-gray-900 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Recent Activities</h2>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleViewAllClick}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg -mr-2 transition-all duration-300"
          >
            <span className="hidden sm:inline">View All</span>
            <ArrowRight className="w-4 h-4 sm:ml-1" />
          </Button>
        </motion.div>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];
          const gradientColor = activityColors[activity.type];
          const glowColor = activityGlows[activity.type];

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              onClick={() => handleActivityClick(activity)}
              className="bg-gradient-to-br from-white/80 to-gray-50/50 backdrop-blur-sm border border-white/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-white/80 hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              <motion.div
                className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${gradientColor} rounded-lg flex items-center justify-center shadow-lg ${glowColor} shrink-0`}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 group-hover:text-gray-950 transition-colors">
                  {activity.title}
                </div>
                <div className="text-gray-500 text-sm mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {activity.subtitle}
                </div>
              </div>
              <motion.div
                className="px-3 py-1.5 bg-gradient-to-br from-indigo-100 via-purple-100 to-indigo-200 text-indigo-800 rounded-lg whitespace-nowrap text-sm border border-indigo-300 shadow-sm shrink-0"
                whileHover={{ scale: 1.05 }}
              >
                {activity.timestamp}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
