import { Trophy, Star, User, Crown, Medal, Award as AwardIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  avatar?: string;
  highlighted?: boolean;
}

const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Ahmed Hassan',
    points: 2850,
    highlighted: true,
  },
  {
    rank: 2,
    name: 'Fatima Ali',
    points: 2640,
    highlighted: true,
  },
  {
    rank: 3,
    name: 'Omar Mohamed',
    points: 2420,
    highlighted: true,
  },
  {
    rank: 4,
    name: 'Nour Ibrahim',
    points: 2180,
  },
  {
    rank: 5,
    name: 'Youssef Ahmed',
    points: 2050,
  },
];

const rankConfig = {
  1: {
    bg: 'from-amber-400 via-yellow-400 to-amber-500',
    cardBg: 'from-yellow-100/80 via-amber-100/60 to-yellow-200/80',
    border: 'border-amber-400',
    shadow: 'shadow-amber-400/50',
    glow: 'hover:shadow-amber-400/70',
    icon: Crown,
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
    starColor: 'text-amber-500',
  },
  2: {
    bg: 'from-gray-300 via-gray-200 to-gray-400',
    cardBg: 'from-gray-100/80 via-slate-100/60 to-gray-200/80',
    border: 'border-gray-400',
    shadow: 'shadow-gray-400/50',
    glow: 'hover:shadow-gray-400/70',
    icon: Medal,
    iconColor: 'text-gray-600',
    textColor: 'text-gray-900',
    starColor: 'text-gray-500',
  },
  3: {
    bg: 'from-orange-400 via-amber-500 to-orange-600',
    cardBg: 'from-orange-100/80 via-amber-100/60 to-orange-200/80',
    border: 'border-orange-400',
    shadow: 'shadow-orange-400/50',
    glow: 'hover:shadow-orange-400/70',
    icon: AwardIcon,
    iconColor: 'text-orange-600',
    textColor: 'text-orange-900',
    starColor: 'text-orange-500',
  },
};

export function MathematicsLeaderboard() {
  const handleEntryClick = (entry: LeaderboardEntry) => {
    toast.info(`Viewing ${entry.name}'s profile`, {
      description: `${entry.points} points - Rank #${entry.rank}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-500 relative overflow-hidden"
    >
      {/* Animated background effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl animate-pulse delay-500" />
      
      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <motion.div
          className="flex items-center justify-center gap-3 mb-3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
        >
          <motion.div
            className="w-14 h-14 bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/50"
            animate={{
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.05, 1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          >
            <Trophy className="w-7 h-7 text-amber-900" />
          </motion.div>
          <h2 className="text-white">
            Mathematics Leaderboard
          </h2>
        </motion.div>
        <motion.p
          className="text-purple-100 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Top performers in mathematics course
        </motion.p>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-3 relative z-10">
        {leaderboardData.map((entry, index) => {
          const config = rankConfig[entry.rank as keyof typeof rankConfig];
          const isTopThree = entry.rank <= 3;
          const RankIcon = config?.icon || User;

          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.5 + index * 0.1,
                type: 'spring',
                stiffness: 150,
              }}
              whileHover={{
                scale: 1.03,
                x: 8,
                transition: { duration: 0.2 },
              }}
              onClick={() => handleEntryClick(entry)}
              className={`${
                isTopThree
                  ? `bg-gradient-to-br ${config.cardBg} border-2 ${config.border} shadow-xl ${config.shadow} ${config.glow}`
                  : 'bg-white/95 backdrop-blur-sm border-2 border-white/60 shadow-lg hover:shadow-xl'
              } rounded-2xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer transition-all duration-300 group relative overflow-hidden`}
            >
              {/* Rank number with special styling */}
              <div className="relative">
                <motion.div
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl ${
                    isTopThree
                      ? `bg-gradient-to-br ${config.bg} shadow-lg ${config.shadow}`
                      : 'bg-gradient-to-br from-slate-200 to-slate-300'
                  } shrink-0`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <span
                    className={`${
                      isTopThree ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {entry.rank}
                  </span>
                </motion.div>
                {isTopThree && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
                  >
                    <RankIcon
                      className={`w-5 h-5 ${config.iconColor} drop-shadow-lg`}
                    />
                  </motion.div>
                )}
              </div>

              {/* Avatar */}
              <motion.div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
                  isTopThree
                    ? `bg-gradient-to-br ${config.bg}`
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                } shadow-lg ring-4 ${
                  isTopThree ? 'ring-white/40' : 'ring-white/30'
                }`}
                whileHover={{ scale: 1.15, rotate: 360 }}
                transition={{ duration: 0.4 }}
              >
                <User className="w-6 h-6 text-white" />
              </motion.div>

              {/* Name and Points */}
              <div className="flex-1 min-w-0">
                <div
                  className={`${
                    isTopThree ? config.textColor : 'text-gray-900'
                  } group-hover:scale-105 transition-transform origin-left`}
                >
                  {entry.name}
                </div>
                <div
                  className={`text-sm mt-0.5 ${
                    isTopThree
                      ? `${config.textColor} opacity-80`
                      : 'text-gray-600'
                  }`}
                >
                  {entry.points.toLocaleString()} points
                </div>
              </div>

              {/* Star/Badge */}
              {entry.highlighted && (
                <motion.div
                  whileHover={{ rotate: 180, scale: 1.2 }}
                  transition={{ duration: 0.4 }}
                  className="shrink-0"
                >
                  <Star
                    className={`w-7 h-7 ${
                      isTopThree ? config.starColor : 'text-gray-400'
                    } fill-current drop-shadow-md`}
                  />
                </motion.div>
              )}

              {/* Shimmer effect for top 3 */}
              {isTopThree && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'linear',
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-6 pt-6 border-t border-white/20 relative z-10"
      >
        <div className="flex justify-around text-center">
          <div>
            <div className="text-white">
              {leaderboardData.length}
            </div>
            <div className="text-purple-200 text-sm mt-1">Total Students</div>
          </div>
          <div>
            <div className="text-white">
              {Math.max(...leaderboardData.map((e) => e.points))}
            </div>
            <div className="text-purple-200 text-sm mt-1">Top Score</div>
          </div>
          <div>
            <div className="text-white">
              {Math.round(
                leaderboardData.reduce((acc, e) => acc + e.points, 0) /
                  leaderboardData.length
              )}
            </div>
            <div className="text-purple-200 text-sm mt-1">Avg Score</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
