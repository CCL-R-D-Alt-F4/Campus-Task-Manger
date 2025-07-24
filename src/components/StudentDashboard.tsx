import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmLogoutToast from '../components/ConfirmLogoutToast';
import { motion, AnimatePresence } from 'framer-motion';
import { limit } from 'firebase/firestore';

import { 
  Clock, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  LogOut,
  User,
  Home,
  List,
  History,
  Users,
  Menu,
  X,
  Smile,
  PartyPopper,
  Clock as ClockIn,
  Clock as ClockOut
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import ProfileSection from './ProfileSection';

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

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  timeIn: Date;
  timeOut?: Date;
  status: 'present' | 'late' | 'absent';
}

const StudentDashboard = () => {
  const { logout, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dailyMessage, setDailyMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentAttendanceId, setCurrentAttendanceId] = useState('');

  const motivationalMessages = [
    "Keep up with your studies! 📚",
    "Every day is a learning opportunity! 🧠",
    "Your hard work will pay off! 💪",
    "Stay focused on your goals! 🎯",
    "You're making great progress! 🚀",
    "One step at a time towards success! 👣",
    "Your dedication is inspiring! ✨",
    "Learning is a journey - enjoy it! 🛣️",
    "You're capable of amazing things! 🌟",
    "Stay curious and keep learning! 🔍"
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingAnimation(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tasks', label: 'My Tasks', icon: List },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const activeTab = location.pathname.split('/').pop() || 'dashboard';

 useEffect(() => {
  if (!userData) return; // Only fetch after userData is loaded

  fetchTasks();
  fetchAttendance();
  setDailyMessage(
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );
}, [userData]);


  const fetchTasks = () => {
    if (!userData) return;

    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, 
      orderBy('dueDate', 'asc'),
      where('assignedTo', 'array-contains', userData.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate?.() || new Date(),
        createdAt: doc.data().createdAt.toDate()
      })) as Task[];
      
      setTasks(tasksData);
      const todayTasks = tasksData.filter(task => isToday(task.dueDate));
      setTodayTasks(todayTasks);
      setLoading(false);
    });

    return unsubscribe;
  };

  const fetchAttendance = async () => {
    if (!userData) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const attendanceRef = collection(db, 'attendance');
    const q = query(
  collection(db, 'attendance'),
  where('userId', '==', userData.uid),
  orderBy('date', 'desc'),
  limit(30)
  );


    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timeIn: doc.data().timeIn.toDate(),
        timeOut: doc.data().timeOut?.toDate()
      })) as AttendanceRecord[];

      setAttendance(attendanceData);
      
      // Check if user is currently clocked in
      const todayRecord = attendanceData.find(record => record.date === today);
      if (todayRecord) {
        setClockedIn(!todayRecord.timeOut);
        setCurrentAttendanceId(todayRecord.id);
      } else {
        setClockedIn(false);
        setCurrentAttendanceId('');
      }
    });

    return unsubscribe;
  };

  const handleClockInOut = async () => {
    if (!userData) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    try {
      if (clockedIn) {
        // Clock out
        await updateDoc(doc(db, 'attendance', currentAttendanceId), {
          timeOut: now,
          status: calculateAttendanceStatus(now)
        });
        toast.success('Successfully clocked out!');
      } else {
        // Clock in
        const newAttendance = {
          userId: userData.uid,
          userName: userData.name,
          date: today,
          timeIn: now,
          status: calculateAttendanceStatus(now)
        };
        await addDoc(collection(db, 'attendance'), newAttendance);
        toast.success('Successfully clocked in!');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const calculateAttendanceStatus = (timeIn: Date): 'present' | 'late' => {
    const hours = timeIn.getHours();
    return hours >= 9 ? 'late' : 'present'; // Assuming 9AM is cutoff for late
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
    
    if (task.completedBy?.includes(userData!.uid)) return 'border-green-500/50 bg-green-500/10';
    if (isToday(task.dueDate)) return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-blue-500/50 bg-blue-500/10';
  };

  const getTaskStats = () => {
    const myCompletedTasks = tasks.filter(task => task.completedBy?.includes(userData!.uid));
    const overdue = tasks.filter(task => 
      !task.completedBy?.includes(userData!.uid) && task.dueDate < new Date()
    ).length;
    const completed = myCompletedTasks.length;
    const total = tasks.length;

    return { overdue, completed, total };
  };

  const stats = getTaskStats();

 if (loading || !userData) {
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
              Welcome Student!
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
              Loading your dashboard...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

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
            Student Portal
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
                <h1 className="text-xl font-bold">Student Portal</h1>
                <p className="text-sm text-[#2980B9]">Dashboard</p>
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
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-[#2980B9]">Dashboard</p>
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
                  <p className="text-sm md:text-base text-[#2980B9]">
                    Welcome, {userData?.name} ({userData?.position})
                    {userData?.studentDetails?.course && ` - ${userData.studentDetails.course}`}
                  </p>
                </div>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { 
                      label: 'Total Tasks', 
                      value: stats.total, 
                      color: 'from-blue-500 to-cyan-500', 
                      icon: List,
                      hoverEffect: 'hover:shadow-blue-500/20'
                    },
                    { 
                      label: 'Completed', 
                      value: stats.completed, 
                      color: 'from-green-500 to-emerald-500', 
                      icon: CheckCircle,
                      hoverEffect: 'hover:shadow-green-500/20'
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
                          onClick={() => navigate(`/${userData?.role}/tasks`)}
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
              </>
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
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </>
            )}

            {activeTab === 'attendance' && (
              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-6">Attendance</h2>
                
                {/* Clock In/Out Button */}
                <div className="mb-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClockInOut}
                    className={`w-full py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 ${
                      clockedIn 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    }`}
                  >
                    {clockedIn ? (
                      <>
                        <ClockOut className="w-6 h-6" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <ClockIn className="w-6 h-6" />
                        Clock In
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Attendance History */}
                <h3 className="text-lg font-semibold mb-4">Your Attendance History</h3>
                {attendance.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-[#2980B9] text-lg">No attendance records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendance.map((record) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{record.date}</h4>
                          <span className={`px-2 py-1 rounded-lg text-xs ${
                            record.status === 'present' ? 'bg-green-500/20 text-green-400' :
                            record.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Time In</p>
                            <p>{format(record.timeIn, 'h:mm a')}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Time Out</p>
                            <p>{record.timeOut ? format(record.timeOut, 'h:mm a') : '--'}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

           {activeTab === 'profile' && userData && (
              <ProfileSection userData={userData} />
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
    </div>
  );
};

export default StudentDashboard;