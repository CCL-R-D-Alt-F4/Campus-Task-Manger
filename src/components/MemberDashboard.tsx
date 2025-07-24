import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmLogoutToast from '../components/ConfirmLogoutToast';
import { Music, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSection from './ProfileSection';
import { 
  collection, 
  getDocs, 
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Clock, 
  Calendar,
  AlertTriangle,
  LogOut,
  User,
  Download,
  Home,
  List,
  History,
  Users,
  Crown,
  Star,
  Menu,
  X,
  Smile,
  PartyPopper,
  Trophy,
  Zap
} from 'lucide-react';
import { format, isAfter, isBefore, addDays, isToday } from 'date-fns';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import MinuteTracker from './MinuteTracker';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedTo: string[];
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  createdBy: string;
  completedBy?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'student',
  position: string,
  createdAt: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'student',
  position: string,
  createdAt: Date;
  lastActive?: Date;
}

const MemberDashboard = () => {
  const { logout, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dailyMessage, setDailyMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); 
  const [videoVisible, setVideoVisible] = useState(true);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);
  const accessLevel = userData?.staffDetails?.accessLevel || 1;
  const canCreateTasks = userData?.role === 'staff' && accessLevel === 2;
  const [showTaskModal, setShowTaskModal] = useState(false);
  

  const [taskForm, setTaskForm] = useState({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  assignedTo: [] as string[]
});


const handleCreateTask = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const newTask = {
      title: taskForm.title,
      description: taskForm.description,
      dueDate: new Date(taskForm.dueDate),
      priority: taskForm.priority,
      assignedTo: taskForm.assignedTo,
      status: 'pending',
      createdAt: new Date(),
      createdBy: userData!.uid,
      completedBy: []
    };

    const docRef = await addDoc(collection(db, 'tasks'), newTask);
    await addDoc(collection(db, 'taskHistory'), {
      taskId: docRef.id,
      userId: userData!.uid,
      userName: userData!.name,
      action: 'created',
      timestamp: new Date(),
      taskTitle: taskForm.title
    });

    toast.success('Task created successfully!');
    setShowTaskModal(false);
    setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: [] });
  } catch (error: any) {
    toast.error(error.message);
  }
};

const handleDeleteTask = async (taskId: string, taskTitle: string) => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    await addDoc(collection(db, 'taskHistory'), {
      taskId,
      userId: userData!.uid,
      userName: userData!.name,
      action: 'deleted',
      timestamp: new Date(),
      taskTitle
    });
    toast.success('Task deleted successfully!');
  } catch (error: any) {
    toast.error(error.message || 'Error deleting task');
  }
};



  const motivationalMessages = [
    "You're doing great! 💪",
    "Keep up the awesome work! 🚀",
    "Smile! You're crushing your goals 😄",
    "Every step counts 🧠✨",
    "Today is your day to shine! ☀️",
    "Productivity level: Expert 🎯",
    "One task at a time, you've got this! 🏆",
    "Making progress feels amazing! 🌟",
    "Your effort is paying off – keep pushing! 💥",
    "Small steps lead to big wins 🛤️",
    "You’re one task closer to success! 📈",
    "Stay focused. Stay unstoppable. 🧠💡",
    "You’re a productivity machine! ⚙️🔥",
    "Progress, not perfection. Keep moving! 🚶‍♂️➡️",
    "You inspire your team every day 💬✨",
    "Great work starts with small actions! 🪴",
    "You’re on a winning streak! 🏁",
    "You’re the hero of your own story today! 🦸‍♀️🦸",
    "Look at you go! Consistency is key 🔑",
    "Teamwork + Focus = Amazing Results 🤝💼",
    "You're building momentum – don’t stop! 🎢",
    "Even 1% better today is growth! 📊",
    "Your focus is your superpower 🧘‍♂️⚡"
  ];

  useEffect(() => {
  const timer = setTimeout(() => {
    setShowLoadingAnimation(false);
  }, 2000);

  return () => clearTimeout(timer);
}, []);

   const toggleMusic = () => {
    setMusicPlaying(!musicPlaying);
    setIframeKey(prev => prev + 1); // reload iframe
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tasks', label: 'My Tasks', icon: List },
    { id: 'tracker', label: 'Time Tracker', icon: Clock },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'history', label: 'Task History', icon: History },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const activeTab = location.pathname.split('/').pop() || 'dashboard';
 
  useEffect(() => {
  const interval = setInterval(() => {
    if (userData?.uid) {
      updateDoc(doc(db, 'users', userData.uid), {
        lastActive: new Date()
      });
    }
  }, 60000); // every 1 min

  return () => clearInterval(interval);
}, [userData]); 

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
    // Set random daily message
    setDailyMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
  }, [userData]);

  const getUrgentTasks = () => {
    const now = new Date();
    return tasks
      .filter(task => 
        task.status === 'pending' &&
        (task.assignedTo.includes(userData.uid) || task.assignedTo.length === 0)
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3);
  };

  const fetchTasks = () => {
    if (!userData) return;

    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, orderBy('dueDate', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as Task[];
      
      const userTasks = tasksData.filter(task => 
        task.assignedTo.length === 0 || 
        task.assignedTo.includes(userData.uid) ||
        task.assignedTo.includes(userData.email!)
      );
      
      setTasks(userTasks);
      const todayTasks = userTasks.filter(task => isToday(task.dueDate));
      setTodayTasks(todayTasks);
      setLoading(false);

      // Check for milestone achievements
      checkMilestones(todayTasks, userTasks);
    });

    return unsubscribe;
  };

  const checkMilestones = (todayTasks: Task[], allTasks: Task[]) => {
    const completedToday = todayTasks.filter(t => 
      t.completedBy?.includes(userData!.uid)
    ).length;
    const totalToday = todayTasks.length;
    
    // Show confetti if all today's tasks are completed
    if (totalToday > 0 && completedToday === totalToday) {
      triggerConfetti();
    }

    // Check for weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentTasks = allTasks.filter(t => t.dueDate > weekAgo);
    const completedRecent = recentTasks.filter(t => 
      t.completedBy?.includes(userData!.uid)
    ).length;
    
    if (completedRecent >= 5) {
      toast.success(
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-400" />
          <span>Amazing! You've completed {completedRecent} tasks this week!</span>
        </div>,
        { duration: 5000 }
      );
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    
    toast.success(
      <div className="flex items-center gap-2">
        <PartyPopper className="text-[#2196F3]" />
        <span>Congratulations! You've completed all today's tasks! 🎉</span>
      </div>,
      { duration: 5000 }
    );
  };
  
  useEffect(() => {
    if (!userData || tasks.length === 0) return;

    const urgent = getUrgentTasks();
    if (urgent.length > 0) {
      toast.warning(`You have ${urgent.length} urgent task(s)! First: "${urgent[0].title}"`, {
        position: 'bottom-right',
        duration: 6000,
      });
    }
  }, [tasks, userData]);

  const fetchTeamMembers = () => {
    const membersRef = collection(db, 'users');
    const q = query(membersRef, orderBy('position', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as TeamMember[];
      
      setTeamMembers(membersData);
    });

    return unsubscribe;
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'Leader': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'Co-Leader': return <Star className="w-4 h-4 text-blue-400" />;
      default: return <User className="w-4 h-4 text-[#2980B9]" />;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Leader': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Co-Leader': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-[#2980B9] border-gray-500/30';
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
      : 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let completedBy = task.completedBy || [];
      
      if (completed) {
        if (!completedBy.includes(userData!.uid)) {
          completedBy.push(userData!.uid);
        }
      } else {
        completedBy = completedBy.filter(uid => uid !== userData!.uid);
      }

      await addDoc(collection(db, 'taskHistory'), {
        taskId,
        userId: userData!.uid,
        userName: userData!.name,
        action: completed ? 'completed' : 'uncompleted',
        timestamp: new Date(),
        taskTitle: task.title
      });

      const newStatus = completedBy.length > 0 ? 'completed' : 'pending';
      
      await updateDoc(doc(db, 'tasks', taskId), {
        completedBy,
        status: newStatus
      });

      toast.success(completed ? 'Task marked as completed!' : 'Task marked as pending!');
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Error updating task:', error);
    }
  };

  const getTaskColor = (task: Task) => {
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    if (task.completedBy?.includes(userData!.uid)) return 'border-green-500/50 bg-green-500/10';
    if (isBefore(task.dueDate, today)) return 'border-red-500/50 bg-red-500/10';
    if (isBefore(task.dueDate, weekFromNow)) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-blue-500/50 bg-blue-500/10';
  };

  const getTaskStats = () => {
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    const myCompletedTasks = tasks.filter(task => task.completedBy?.includes(userData!.uid));
    const overdue = tasks.filter(task => 
      !task.completedBy?.includes(userData!.uid) && isBefore(task.dueDate, today)
    ).length;
    const dueSoon = tasks.filter(task => 
      !task.completedBy?.includes(userData!.uid) && 
      isBefore(task.dueDate, weekFromNow) && 
      isAfter(task.dueDate, today)
    ).length;
    const completed = myCompletedTasks.length;
    const total = tasks.length;

    return { overdue, dueSoon, completed, total };
  };

  const exportTodayTasks = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      todayTasks.map(task => ({
        Title: task.title,
        Description: task.description,
        'Due Date': format(task.dueDate, 'MM/dd/yyyy'),
        Status: task.completedBy?.includes(userData!.uid) ? 'Completed by me' : 'Pending',
        Priority: task.priority
      }))
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, 'My Today Tasks');
    XLSX.writeFile(workbook, `My_Tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Today\'s tasks exported!');
  };

  const stats = getTaskStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-[#f0faff] to-[#e3f2fd] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f0faff] to-[#e3f2fd] text-[#1A237E]">
      <AnimatePresence>
  {showLoadingAnimation && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md"
    >
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-24 h-24 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center mb-6"
      >
        <User className="w-12 h-12 text-[#1A237E]" />
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="text-2xl font-bold text-[#1A237E] mb-2"
      >
        Welcome Back!
      </motion.h2>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "80%" }}
        transition={{ duration: 3, ease: "easeInOut" }}
        className="h-1.5 bg-gray-700 rounded-full max-w-md overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="text-[#2980B9] mt-4"
      >
        Loading your tasks and team...
      </motion.p>
    </motion.div>
  )}
</AnimatePresence>


      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: -50,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
              rotate: 360,
              scale: [1, 1.15, 1]
            }}
            transition={{ 
              duration: 3, // slower rotation
              repeat: Infinity,
              ease: "linear"
            }}

              className="absolute text-2xl"
              style={{
                color: ['#f472b6', '#60a5fa', '#34d399', '#fbbf24'][Math.floor(Math.random() * 4)]
              }}
            >
              {['🎉', '✨', '🌟', '🎊', '🥳'][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="backdrop-blur-xl bg-gradient-to-r from-[#f0faff] to-[#e3f2fd] border-[#BBDEFB] p-4 md:hidden flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#1A237E]">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            ALT F4
          </h1>
        </div>
        <button
          onClick={() => {
            toast.custom((t) => (
              <ConfirmLogoutToast logout={logout} toastId={t} />
            ));
          }}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-400" />
        </button>
      </motion.header>

      <div className="flex">
        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-xl bg-white shadow-lg border border-white/10 border-r border-white/10 p-6 md:hidden"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ALT F4</h1>
                <p className="text-sm text-[#2980B9]">Staff Dashboard</p>
              </div>
            </div>

            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    navigate(`/${userData?.role}/${item.id}`);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === item.id
                      ? 'bg-[#2196F3] hover:bg-[#1976D2] text-black'
                      : 'text-[#2980B9] hover:bg-white shadow-lg border border-white/10 hover:text-[#1A237E]'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </motion.button>
              ))}
            </nav>

            <div className="absolute bottom-6 left-6 right-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  toast.custom((t) => (
                     <ConfirmLogoutToast logout={logout} toastId={t} />
                  ));
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-[#1A237E] bg-[#E74C3C] hover:bg-[#C0392B] transition-all border border-red-500/30"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </motion.button>
            </div>
          </motion.aside>
        )}

        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="hidden md:block w-64 backdrop-blur-xl bg-white shadow-lg border border-white/10 border-r border-white/10 h-screen sticky top-0 p-6"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ALT F4</h1>
              <p className="text-sm text-[#2980B9]">Staff Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/${userData?.role}/${item.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-[#2196F3] hover:bg-[#1976D2] text-black'
                    : 'text-[#2980B9] hover:bg-white shadow-lg border border-white/10 hover:text-[#1A237E]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            ))}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                toast.custom((t) => (
                  <ConfirmLogoutToast logout={logout} toastId={t} />
                ));
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-[#1A237E] bg-[#E74C3C] hover:bg-[#C0392B] transition-all border border-red-500/30"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </motion.button>
          </div>
        </motion.aside>
              
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="backdrop-blur-xl bg-gradient-to-r from-[#f0faff] to-[#e3f2fd] border-[#BBDEFB] p-4 md:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="md:hidden w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  </h1>
                  <p className="text-sm md:text-base text-[#2980B9]">Welcome, {userData?.name} ({userData?.position})</p>
                </div>
              </div>
              
              {activeTab === 'tasks' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportTodayTasks}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export Today</span>
                </motion.button>
              )}
            </div>
          </motion.header>

          <div className="p-4 md:p-6 space-y-6">
            {activeTab === 'dashboard' && (
              <>
                {/* Daily Motivation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-4 sm:p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-cyan-500" />
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="flex-shrink-0"
                    >
                      <Smile className="w-10 h-10 text-yellow-400" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg">Daily Motivation</h3>
                      <p className="text-gray-300">{dailyMessage}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { 
                      label: 'Total Tasks', 
                      value: stats.total, 
                      color: 'from-blue-500 to-cyan-500', 
                      icon: Calendar,
                      hoverEffect: 'hover:shadow-blue-500/20'
                    },
                    { 
                      label: 'My Completed', 
                      value: stats.completed, 
                      color: 'from-green-500 to-emerald-500', 
                      icon: CheckCircle,
                      hoverEffect: 'hover:shadow-green-500/20'
                    },
                    { 
                      label: 'Due Soon', 
                      value: stats.dueSoon, 
                      color: 'from-yellow-500 to-orange-500', 
                      icon: Clock,
                      hoverEffect: 'hover:shadow-yellow-500/20'
                    },
                    { 
                      label: 'Overdue', 
                      value: stats.overdue, 
                      color: 'from-red-500 to-pink-500', 
                      icon: AlertTriangle,
                      hoverEffect: 'hover:shadow-red-500/20'
                    }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className={`backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6 transition-all ${stat.hoverEffect}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#2980B9] text-sm">{stat.label}</p>
                          <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-[#1A237E]" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Weekly Progress */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="font-semibold text-lg mb-4">Weekly Progress</h3>
                  <div className="flex items-end h-32 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day, index) => {
                      const dayTasks = tasks.filter(task => {
                        const taskDay = task.dueDate.getDay();
                        return taskDay === day && 
                          (task.assignedTo.includes(userData!.uid) || task.assignedTo.length === 0);
                      });
                      const completed = dayTasks.filter(t => t.completedBy?.includes(userData!.uid)).length;
                      const total = dayTasks.length;
                      const height = total > 0 ? (completed / total) * 100 : 10;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className={`w-full rounded-t ${
                              height > 70 ? 'bg-green-500' : 
                              height > 30 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ maxHeight: '100%' }}
                          >
                            <div className="text-center text-xs mt-1">
                              {completed}/{total}
                            </div>
                          </motion.div>
                          <div className="text-xs text-[#2980B9] mt-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-red-400 mb-4">⏰ Urgent Tasks</h2>
                    {getUrgentTasks().length === 0 ? (
                      <p className="text-[#2980B9]">You have no urgent tasks 🎉</p>
                    ) : (
                      <ul className="space-y-2">
                        {getUrgentTasks().map(task => (
                          <motion.li 
                            key={task.id} 
                            whileHover={{ x: 5 }}
                            className="p-3 bg-white/10 rounded-lg cursor-pointer"
                            onClick={() => navigate('/dashboard/tasks')}
                          >
                            <p className="font-semibold text-[#1A237E]">{task.title}</p>
                            <p className="text-sm text-[#2980B9]">Due: {format(task.dueDate, 'MMM dd, yyyy')}</p>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>

                {/* Today's Tasks Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                    <h2 className="text-xl md:text-2xl font-bold">Today's Tasks</h2>
                    <div className="text-sm text-[#2980B9]">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </div>
                  </div>
                  {todayTasks.length > 0 ? (
                    <div className="space-y-4">
                      {todayTasks.slice(0, 3).map((task) => (
                        <motion.div 
                          key={task.id} 
                          whileHover={{ scale: 1.01 }}
                          className={`p-4 rounded-xl border ${getTaskColor(task)}`}
                        >
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm text-[#2980B9] mt-1">{format(task.dueDate, 'h:mm a')}</p>
                        </motion.div>
                      ))}
                      {todayTasks.length > 3 && (
                        <button 
                          onClick={() => navigate('/dashboard/tasks')}
                          className="text-sm text-[#2196F3] hover:underline"
                        >
                          View all {todayTasks.length} tasks
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-[#2980B9]">No tasks scheduled for today</p>
                    </div>
                  )}
                  
                </motion.div>
                {canCreateTasks && (
                  <button
                    
                    className="text-red-600 hover:text-red-800 text-sm mt-2"
                  >
                    Delete
                  </button>
                )}

              </>
            )}
            
            {activeTab === 'profile' && (
            <ProfileSection userData={{
            
            uid: userData?.uid || '',
            name: userData?.name || '',
            email: userData?.email || '',
            position: userData?.position as any || 'Member',
            role: userData?.role || 'member',
            createdAt: new Date(),
            lastActive: new Date()
          }} />
            )}

            {activeTab === 'tasks' && (
              <>
                {/* Today's Tasks */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                    <h2 className="text-xl md:text-2xl font-bold">Today's Tasks</h2>
                    <div className="text-sm text-[#2980B9]">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </div>
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-[#2980B9] text-lg">No tasks scheduled for today</p>
                      <p className="text-gray-500 text-sm">Enjoy your day!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.01 }}
                          className={`p-4 rounded-xl border ${getTaskColor(task)} transition-all`}
                        >
                          <div className="flex items-start gap-4">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleTaskComplete(task.id, !task.completedBy?.includes(userData!.uid))}
                              className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                task.completedBy?.includes(userData!.uid)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-400 hover:border-green-500'
                              }`}
                            >
                              {task.completedBy?.includes(userData!.uid) && (
                                <CheckCircle className="w-4 h-4 text-[#1A237E]" />
                              )}

                            </motion.button>
                            
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold ${
                                task.completedBy?.includes(userData!.uid) ? 'line-through text-gray-500' : ''
                              }`}>
                                {task.title}
                              </h3>
                              <p className="text-[#2980B9] mt-1">{task.description}</p>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                                <span className="text-[#2980B9]">
                                  Due: {format(task.dueDate, 'h:mm a')}
                                </span>
                                <span className={`px-2 py-1 rounded-lg ${
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {task.priority} priority
                                </span>
                                {task.completedBy?.includes(userData!.uid) && (
                                  <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400">
                                    Completed by you
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* All Tasks */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6"
                >
                  <h2 className="text-xl md:text-2xl font-bold mb-6">All My Tasks</h2>
                  
                  {canCreateTasks && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowTaskModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2196F3] hover:bg-[#229954] text-white rounded-xl border border-green-500/30"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create Task</span>
                          </motion.button>
                          
                        )}


                  {tasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-[#2980B9] text-lg">No tasks assigned to you</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.01 }}
                          className={`p-4 rounded-xl border ${getTaskColor(task)} transition-all`}
                        >
                          <div className="flex items-start gap-4">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleTaskComplete(task.id, !task.completedBy?.includes(userData!.uid))}
                              className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                task.completedBy?.includes(userData!.uid)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-400 hover:border-green-500'
                              }`}
                            >
                              {task.completedBy?.includes(userData!.uid) && (
                                <CheckCircle className="w-4 h-4 text-[#1A237E]" />
                              )}
                            </motion.button>
                            
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold ${
                                task.completedBy?.includes(userData!.uid) ? 'line-through text-gray-500' : ''
                              }`}>
                                {task.title}
                              </h3>
                              <p className="text-[#2980B9] mt-1">{task.description}</p>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                                <span className="text-[#2980B9]">
                                  Due: {format(task.dueDate, 'MMM dd, yyyy h:mm a')}
                                </span>
                                <span className={`px-2 py-1 rounded-lg ${
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {task.priority}
                                </span>
                                {task.completedBy?.includes(userData!.uid) && (
                                  <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400">
                                    ✓ Done
                                  </span>
                                )}
                                {isToday(task.dueDate) && (
                                  <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-[#2196F3]">
                                    Today
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {canCreateTasks && (
                              <button
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="text-red-600 hover:text-red-800 text-sm mt-2"
                              >
                                Delete
                              </button>
                            )}

                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                </motion.div>
              </>
            )}

            {activeTab === 'tracker' && (
              <MinuteTracker />
            )}

            {activeTab === 'team' && (
              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-6">Our Team</h2>
                
                {/* Team Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { 
                      label: 'Total Members', 
                      value: teamMembers.length, 
                      color: 'from-purple-500 to-indigo-500',
                      icon: Users
                    },
                    { 
                      label: 'Leaders', 
                      value: teamMembers.filter(m => m.position === 'Leader').length, 
                      color: 'from-yellow-500 to-orange-500',
                      icon: Crown
                    },
                    { 
                      label: 'Co-Leaders', 
                      value: teamMembers.filter(m => m.position === 'Co-Leader').length, 
                      color: 'from-blue-500 to-cyan-500',
                      icon: Star
                    }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#2980B9] text-sm">{stat.label}</p>
                          <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-[#1A237E]" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Team Members List */}
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ rotate: 10 }}
                          className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center"
                        >
                          {getPositionIcon(member.position)}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{member.name}</h3>
                          <p className="text-[#2980B9] text-sm truncate">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs md:text-sm ${getPositionColor(member.position)}`}>
                            {member.position}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs md:text-sm ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-6">Task History</h2>
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-[#2980B9] text-lg">Task history functionality</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-4 text-center"
      >
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="https://r2-vision.firebaseapp.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 group"
        >
          <span className="text-[#2980B9]">Developed by</span>
          <span className="relative overflow-hidden">
            <motion.span
              className="block font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            >
              R.R Bandara
            </motion.span>
            <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-purple-400 to-cyan-400 transition-all duration-300 group-hover:w-full" />
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-arrow-up-right text-[#2196F3] transition-transform group-hover:rotate-45 duration-300"
          >
            <path d="M7 7h10v10" />
            <path d="M7 17 17 7" />
          </svg>
        </motion.a>
      </motion.footer>

       {/* Music Player Toggle */}
<div className="fixed bottom-4 right-4 z-50 space-y-2">
  <button
    onClick={toggleMusic}
    className={`relative p-3 rounded-full backdrop-blur-xl border border-white/10 bg-white/10 text-[#1A237E] hover:bg-purple-500/30 transition-all ${
      musicPlaying ? 'text-green-400' : 'text-[#2980B9]'
    }`}
  >
    <motion.div
      animate={musicPlaying ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
    >
      <Music className="w-6 h-6" />
    </motion.div>

    {/* Slash line when music is OFF */}
    {!musicPlaying && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[2px] h-6 bg-red-500 rotate-45" />
      </div>
    )}
  </button>

  {musicPlaying && (
    <>
      <button
        onClick={() => setVideoVisible(!videoVisible)}
        className="block w-full text-xs text-gray-300 bg-white/10 border border-white/10 rounded-xl px-2 py-1 hover:bg-white/20 transition-all"
      >
        {videoVisible ? 'Hide Video' : 'Show Video'}
      </button>

      <div className="w-[320px] h-[180px]" style={{ display: videoVisible ? 'block' : 'none' }}>
        <iframe
          key={iframeKey}
          className="rounded-xl"
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/videoseries?list=PL6H6TfFpYvpfD72vyGLDYmZ-Di3-WedM-&autoplay=1"
          title="YouTube music player"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </>
  )}
</div>
  {showTaskModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
      <h2 className="text-xl font-bold mb-4 text-[#1A237E]">Create Task</h2>
      <form onSubmit={handleCreateTask} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={taskForm.title}
          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
          className="w-full p-2 border border-[#1A237E] rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={taskForm.description}
          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          className="w-full p-2 border border-[#1A237E] rounded"
        />
        <input
          type="datetime-local"
          value={taskForm.dueDate}
          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
          className="w-full p-2 border border-[#1A237E] rounded"
          required
        />
        <select
          value={taskForm.priority}
          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
          className="w-full p-2 border border-[#1A237E] rounded"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => setShowTaskModal(false)}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
)}



    </div>
  );
};

export default MemberDashboard;