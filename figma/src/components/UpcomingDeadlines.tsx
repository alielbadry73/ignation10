import { Calendar, Play, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Deadline {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  color: 'red' | 'orange' | 'green';
  urgent?: boolean;
}

const deadlines: Deadline[] = [
  {
    id: '1',
    title: 'Algebra Quiz',
    subtitle: 'Chapter 5: Quadratic Equations - Due in 2 hours',
    date: 'Today',
    color: 'red',
    urgent: true,
  },
  {
    id: '2',
    title: 'Calculus Homework',
    subtitle: 'Derivative Applications - Problem Set 3',
    date: 'Dec 18',
    color: 'orange',
  },
  {
    id: '3',
    title: 'Geometry Project',
    subtitle: 'Triangle Congruence Proofs - Group Project',
    date: 'Dec 20',
    color: 'green',
  },
];

const colorClasses = {
  red: {
    border: 'border-l-rose-500',
    badge: 'bg-gradient-to-br from-rose-100 via-pink-100 to-rose-200 text-rose-800 border border-rose-300 shadow-sm',
    glow: 'hover:shadow-rose-300/60',
    iconBg: 'bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600',
    cardBg: 'from-rose-50/50 to-pink-50/30',
  },
  orange: {
    border: 'border-l-amber-500',
    badge: 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 text-amber-900 border border-amber-300 shadow-sm',
    glow: 'hover:shadow-amber-300/60',
    iconBg: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
    cardBg: 'from-amber-50/50 to-orange-50/30',
  },
  green: {
    border: 'border-l-emerald-500',
    badge: 'bg-gradient-to-br from-emerald-100 via-teal-100 to-emerald-200 text-emerald-900 border border-emerald-300 shadow-sm',
    glow: 'hover:shadow-emerald-300/60',
    iconBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600',
    cardBg: 'from-emerald-50/50 to-teal-50/30',
  },
};

export function UpcomingDeadlines() {
  const handleCardClick = (deadline: Deadline) => {
    toast.info(`Viewing details for ${deadline.title}`, {
      description: deadline.subtitle,
    });
  };

  const handleStartClick = (e: React.MouseEvent, deadline: Deadline) => {
    e.stopPropagation();
    toast.success(`Starting ${deadline.title}!`, {
      description: `Opening ${deadline.title}...`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-white/40 hover:shadow-2xl transition-all duration-500"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Calendar className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Upcoming Deadlines</h2>
      </div>

      <div className="space-y-3">
        {deadlines.map((deadline, index) => (
          <motion.div
            key={deadline.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, x: 4 }}
            onClick={() => handleCardClick(deadline)}
            className={`bg-gradient-to-br ${colorClasses[deadline.color].cardBg} border border-white/60 rounded-xl p-3 sm:p-4 border-l-4 ${colorClasses[deadline.color].border} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${colorClasses[deadline.color].glow} group backdrop-blur-sm`}
          >
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
              <motion.div
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${colorClasses[deadline.color].badge} shadow-sm`}
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center gap-1.5">
                  {deadline.urgent && <Clock className="w-3 h-3" />}
                  <span className="text-sm">{deadline.date}</span>
                </div>
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 group-hover:text-gray-950 transition-colors">
                  {deadline.title}
                </div>
                <div className="text-gray-500 text-sm mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {deadline.subtitle}
                </div>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={(e) => handleStartClick(e, deadline)}
                className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white rounded-lg px-4 sm:px-5 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 w-full sm:w-auto"
              >
                <Play className="w-4 h-4 mr-1.5" />
                <span>Start{deadline.urgent ? ' Now' : ''}</span>
              </Button>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
