import { UpcomingDeadlines } from './components/UpcomingDeadlines';
import { RecentActivities } from './components/RecentActivities';
import { MathematicsTasks } from './components/MathematicsTasks';
import { MathematicsLeaderboard } from './components/MathematicsLeaderboard';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-purple-100 to-cyan-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-300/40 to-purple-300/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-300/40 to-cyan-300/40 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-3xl animate-pulse delay-500" />
      
      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <UpcomingDeadlines />
          <RecentActivities />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <MathematicsTasks />
          <MathematicsLeaderboard />
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
