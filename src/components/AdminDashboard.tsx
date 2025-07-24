import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SidebarItem } from "@/components/ui/sidebar";
import MinuteTracker from './MinuteTracker';
import ConfirmLogoutToast from '../components/ConfirmLogoutToast';
import MemberManagement from './MemberManagement';
import TeamInsights from './TeamInsights';
import { Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSection from './ProfileSection';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  limit
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { secondaryAuth, db } from '../lib/firebase';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Edit, 
  Zap,
  Trash2, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  LogOut,
  User,
  Download,
  BarChart3,
  Settings,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import * as XLSX from 'xlsx';

interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  position: string; // Changed to string to allow custom positions
  role: 'admin' | 'staff' | 'student'; // Updated roles
  createdAt: Date;
  studentDetails?: { // Optional student-specific details
    course?: string;
    year?: number;
    studentId?: string;
  };
  staffDetails?: { // Optional staff-specific details
    department?: string;
    designation?: string;
  };
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

interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  taskTitle: string;
}

interface LoginHistory {
  id: string;
  userId: string;
  userName: string;
  email: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress?: string;
  deviceInfo?: string;
}

const AdminDashboard = () => {
  const { logout, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); 
  const [videoVisible, setVideoVisible] = useState(true);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);


  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  
  const toggleMusic = () => {
  setMusicPlaying(!musicPlaying);
  setIframeKey(prev => prev + 1); // reload iframe
};
  
// Add this useEffect
useEffect(() => {
  const timer = setTimeout(() => {
    setShowLoadingAnimation(false);
  }, 2000); // Show for 2 seconds

  return () => clearTimeout(timer);
}, []);

  // Form states
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'staff' as 'admin' | 'staff',
    position: 'Member' as 'Leader' | 'Co-Leader' | 'Member'
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignedTo: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);
  
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

  const fetchData = () => {
    // Fetch users based on role
    const usersQuery = userData?.role === 'admin' 
      ? query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'users'), where('uid', '==', userData?.uid));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      })) as User[];
      setUsers(usersData);
    });

    // Fetch tasks
    const tasksQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as Task[];
      setTasks(tasksData);
    });

    // Fetch task history
    const historyQuery = query(collection(db, 'taskHistory'), orderBy('timestamp', 'desc'));
    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as TaskHistory[];
      setTaskHistory(historyData);
    });

    // Fetch login history
    const loginHistoryQuery = query(collection(db, 'loginHistory'), orderBy('loginTime', 'desc'));
    const unsubscribeLoginHistory = onSnapshot(loginHistoryQuery, (snapshot) => {
      const loginHistoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        loginTime: doc.data().loginTime.toDate(),
        logoutTime: doc.data().logoutTime?.toDate()
      })) as LoginHistory[];
      setLoginHistory(loginHistoryData);
      setLoginHistoryLoading(false);
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
      unsubscribeHistory();
      unsubscribeLoginHistory();
    };
  };

  const getUrgentTasks = () => {
    if (!userData) return [];
    const now = new Date();
    return tasks
      .filter(task => 
        task.status === 'pending' &&
        (task.assignedTo.includes(userData.uid) || task.assignedTo.length === 0)
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3);
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

  const syncAuthUsersToFirestore = async () => {
    setSyncingUsers(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const existingUserIds = usersSnapshot.docs.map(doc => doc.data().uid);
      
      toast.info('User sync requires a backend implementation. New users will be created in both Auth and Firestore automatically.');
      
      setSyncingUsers(false);
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error('Failed to sync users');
      setSyncingUsers(false);
    }
  };

  const addTaskHistory = async (taskId: string, action: string, taskTitle: string) => {
    try {
      await addDoc(collection(db, 'taskHistory'), {
        taskId,
        userId: userData!.uid,
        userName: userData!.name,
        action,
        timestamp: new Date(),
        taskTitle
      });
    } catch (error) {
      console.error('Error adding task history:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!userData) {
        toast.error("User data not loaded. Please try again.");
        return;
      }
      if (userData?.role !== 'admin') {
        toast.error('Only admins can create users');
        return;
      }

      if (!userForm.email || !userForm.password || !userForm.name) {
        toast.error('Please fill all required fields');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        userForm.email,
        userForm.password
      );
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        position: userForm.position,
        createdAt: new Date()
      });

      await secondaryAuth.signOut();

      toast.success('User created successfully in both Auth and Firestore!');
      setShowUserModal(false);
      setUserForm({ 
        email: '', 
        password: '', 
        name: '', 
        role: 'staff', 
        position: 'Member' 
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || userData?.role !== 'admin') return;

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: userForm.name,
        role: userForm.role,
        position: userForm.position
      });

      toast.success('User updated successfully!');
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ email: '', password: '', name: '', role: 'staff', position: 'Member' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userData?.role !== 'admin') {
      toast.error('Only admins can delete users');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        toast.success('User deleted successfully from Firestore! Note: You need to delete from Auth separately.');
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userData?.role !== 'admin') {
        toast.error('Only admins can create tasks');
        return;
      }

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
      
      await addTaskHistory(docRef.id, 'created', taskForm.title);

      toast.success('Task created successfully!');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: [] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) return;
      
      await updateDoc(taskRef, {
        status: 'completed',
        completedBy: [...(task.completedBy || []), userData!.uid]
      });

      await addTaskHistory(taskId, 'completed', task.title);

      toast.success('Task marked as completed!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (userData?.role !== 'admin') {
      toast.error('Only admins can delete tasks');
      return;
    }

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        toast.success('Task deleted successfully!');
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (userData?.role !== 'admin') {
      toast.error('Only admins can delete history');
      return;
    }

    if (window.confirm('Are you sure you want to delete this history entry?')) {
      try {
        await deleteDoc(doc(db, 'taskHistory', historyId));
        toast.success('History entry deleted!');
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const exportData = (type: 'users' | 'tasks' | 'history' | 'loginHistory') => {
    if (userData?.role !== 'admin') {
      toast.error('Only admins can export data');
      return;
    }

    const workbook = XLSX.utils.book_new();
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = users.map(user => ({
          Name: user.name,
          Email: user.email,
          Role: user.role,
          Position: user.position,
          'Created At': format(user.createdAt, 'yyyy-MM-dd HH:mm:ss')
        }));
        filename = 'Users';
        break;
      case 'tasks':
        data = tasks.map(task => ({
          Title: task.title,
          Description: task.description,
          'Due Date': format(task.dueDate, 'yyyy-MM-dd HH:mm:ss'),
          Priority: task.priority,
          Status: task.status,
          'Assigned To': task.assignedTo.join(', '),
          'Completed Count': task.completedBy?.length || 0
        }));
        filename = 'Tasks';
        break;
      case 'history':
        data = taskHistory.map(entry => ({
          'Task Title': entry.taskTitle,
          'User Name': entry.userName,
          Action: entry.action,
          Timestamp: format(entry.timestamp, 'yyyy-MM-dd HH:mm:ss')
        }));
        filename = 'Task_History';
        break;
      case 'loginHistory':
        data = loginHistory.map(entry => ({
          'User Name': entry.userName,
          Email: entry.email,
          'Login Time': format(entry.loginTime, 'yyyy-MM-dd HH:mm:ss'),
          'Logout Time': entry.logoutTime ? format(entry.logoutTime, 'yyyy-MM-dd HH:mm:ss') : 'Still active',
          Duration: entry.logoutTime 
            ? `${Math.round((entry.logoutTime.getTime() - entry.loginTime.getTime()) / (1000 * 60))} min`
            : 'Active',
          'IP Address': entry.ipAddress || 'N/A',
          'Device Info': entry.deviceInfo || 'N/A'
        }));
        filename = 'Login_History';
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, filename);
    XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`${filename} exported successfully!`);
  };

  const getTaskStats = () => {
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    const overdue = tasks.filter(task => 
      task.status === 'pending' && isBefore(task.dueDate, today)
    ).length;
    const dueSoon = tasks.filter(task => 
      task.status === 'pending' && 
      isBefore(task.dueDate, weekFromNow) && 
      isAfter(task.dueDate, today)
    ).length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const total = tasks.length;

    return { overdue, dueSoon, completed, total };
  };

  const stats = getTaskStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#2980B9]/50 border-t-purple-500 rounded-full"
        />
      </div>
    );
  }

  return (
    
    <div className="min-h-screen bg-[#f9f9ff] text-[#1A237E]">
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
        className="w-24 h-24 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center mb-6">
        <Zap className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="text-2xl font-bold text-white mb-2"
      >
        Loading Dashboard
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
        className="text-white mt-4"
      >
        Preparing your workspace...
      </motion.p>
    </motion.div>
  )}
</AnimatePresence>


      {/* Mobile Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="backdrop-blur-xl bg-white border-b border-[#BBDEFB] p-4 md:hidden flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#1A237E]">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-[#2980B9] font-bold">
            ALT F4
          </h1>
        </div>
        <button
          onClick={() => {
            toast.custom((t) => (
              <ConfirmLogoutToast logout={logout} toastId={t} />
            ));
          }}
          className="p-2 rounded-lg bg-[#E74C3C] hover:bg-[#C0392B] hover:bg-red-500/30 transition-colors"
        >
          <LogOut className="w-5 h-5 text-[#E74C3C]" />
        </button>
      </motion.header>

      {/* Desktop Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="backdrop-blur-xl bg-gradient-to-r from-[#f0faff] to-[#e3f2fd] border-r border-[#BBDEFB] p-6 hidden md:block"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2980B9] font-bold">
                ALT F4 Admin
              </h1>
              <p className="text-[#1A237E]">Welcome, {userData?.name}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              toast.custom((t) => (
                <ConfirmLogoutToast logout={logout} toastId={t} />
              ));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#E74C3C] hover:bg-[#C0392B] text-[#1A237E] rounded-xl border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </motion.button>
        </div>
      </motion.header>

      <div className="flex">
        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-xl bg-white/80 shadow-2xl border-r border-[#BBDEFB] p-6 md:hidden"
          >
            <div className="flex justify-end mb-6">
              <button onClick={() => setMobileMenuOpen(false)} className="text-[#1A237E]">
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'users', label: 'Members', icon: Users },
                { id: 'tasks', label: 'Task Management', icon: Calendar },
                { id: 'tracker', label: 'Minute Tracker', icon: Clock },
                { id: 'insights', label: 'Team Insights', icon: BarChart3 },
                { id: 'history', label: 'Task History', icon: Clock },
                { id: 'loginHistory', label: 'Login History', icon: Clock },
                { id: 'profile', label: 'My Profile', icon: User }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === item.id
                      ? 'bg-[#2196F3] text-white shadow-xl ring-2 ring-[#1976D2]'
                      : 'bg-white text-[#1A237E] hover:bg-[#BBDEFB] hover:text-[#0D47A1] shadow-md'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </motion.aside>
        )}

        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="hidden md:block w-64 bg-white shadow-2xl border-r border-[#BBDEFB] h-screen sticky top-0 p-6 z-40"
        >
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'users', label: 'Members', icon: Users },
              { id: 'tasks', label: 'Task Management', icon: Calendar },
              { id: 'tracker', label: 'Minute Tracker', icon: Clock },
              { id: 'insights', label: 'Team Insights', icon: BarChart3 },
              { id: 'history', label: 'Task History', icon: Clock },
              { id: 'loginHistory', label: 'Login History', icon: Clock },
              { id: 'profile', label: 'My Profile', icon: User }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-[#2196F3] text-white shadow-xl ring-2 ring-[#1976D2]'
                  : 'bg-white text-[#1A237E] hover:bg-[#BBDEFB] hover:text-[#0D47A1] shadow-md'
              }`}


              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </motion.aside>
          
        {/* Main Content */}
        <main className="flex-1 bg-white p-4 md:p-6 min-h-screen overflow-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Urgent Tasks Section */}
              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#E74C3C] mb-4">⏰ Urgent Tasks</h2>
                {getUrgentTasks().length === 0 ? (
                  <p className="text-[#1A237E]">No urgent tasks</p>
                ) : (
                  <ul className="space-y-2">
                    {getUrgentTasks().map(task => (
                      <li key={task.id} className="p-3 bg-[#BDC3C7] hover:bg-[#95A5A6] text-[#1A237E] rounded-lg">
                        <p className="font-semibold text-[#1A237E]">{task.title}</p>
                        <p className="text-sm text-[#1A237E]">Due: {format(task.dueDate, 'MMM dd, yyyy')}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
                
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Tasks', value: stats.total, color: 'bg-[#2980B9]', icon: Calendar },
                  { label: 'Completed', value: stats.completed, color: 'bg-[#2196F3]', icon: CheckCircle },
                  { label: 'Due Soon', value: stats.dueSoon, color: 'bg-[#F1C40F]', icon: Clock },
                  { label: 'Overdue', value: stats.overdue, color: 'bg-[#E74C3C]', icon: AlertTriangle }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#1A237E] text-sm">{stat.label}</p>
                        <p className="text-3xl text-[#1A237E] font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-[#1A237E]" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
                
              {/* Recent Activity */}
              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl text-[#1A237E] font-bold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {taskHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-lg">
                      <CheckCircle className="w-5 h-5 text-[#27AE60]" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{entry.userName}</span> {entry.action} "{entry.taskTitle}"
                        </p>
                        <p className="text-xs text-[#1A237E]">{format(entry.timestamp, 'MMM dd, yyyy h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
          <div className="w-full">
            <MemberManagement userData={userData} />
          </div>
        )}
        
        {activeTab === 'insights' && <TeamInsights />}
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
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#2980B9] font-bold">Task Management</h2>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportData('tasks')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-[#2980B9] rounded-xl border border-blue-500/30"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </motion.button>
                  {userData?.role === 'admin' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2196F3] hover:bg-[#229954] text-[#1A237E] rounded-xl border border-green-500/30"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Create Task</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6">
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const today = new Date();
                    const weekFromNow = addDays(today, 7);
                    let borderColor = 'border-[#2980B9]/50';
                    
                    if (task.status === 'completed') borderColor = 'border-[#27AE60]/50';
                    else if (isBefore(task.dueDate, today)) borderColor = 'border-[#E74C3C]/50';
                    else if (isBefore(task.dueDate, weekFromNow)) borderColor = 'border-[#F1C40F]/50';

                    return (
                      <div key={task.id} className={`p-4 border ${borderColor} bg-white rounded-lg`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <p className="text-[#1A237E] mt-1">{task.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                              <span className="text-[#1A237E]">
                                Due: {format(task.dueDate, 'MMM dd, yyyy h:mm a')}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                task.priority === 'high' ? 'bg-[#E74C3C] hover:bg-[#C0392B] text-[#E74C3C]' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-[#F39C12]' :
                                'bg-blue-500/20 text-[#2980B9]'
                              }`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                task.status === 'completed' ? 'bg-[#2196F3] hover:bg-[#229954] text-[#27AE60]' : 'bg-gray-500/20 text-[#1A237E]'
                              }`}>
                                {task.status}
                              </span>
                              <span className="text-[#1A237E]">
                                Completed by: {task.completedBy?.length || 0} members
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-[#1A237E]">
                              Assigned to: {task.assignedTo.length === 0 ? 'All members' : `${task.assignedTo.length} members`}
                            </div>
                          </div>
                          <div className="flex gap-2 sm:flex-col">
                            {task.status !== 'completed' && (
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="p-2 text-[#27AE60] hover:bg-[#2196F3] hover:bg-[#229954] rounded-lg transition-all"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {userData?.role === 'admin' && (
                              <>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 text-[#E74C3C] hover:bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setTaskForm({
                                      title: task.title,
                                      description: task.description,
                                      dueDate: format(task.dueDate, "yyyy-MM-dd'T'HH:mm"),
                                      priority: task.priority,
                                      assignedTo: task.assignedTo
                                    });
                                    setShowTaskModal(true);
                                  }}
                                  className="p-2 text-[#2980B9] hover:bg-blue-500/20 rounded-lg transition-all"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tracker' && (
              <MinuteTracker />
            )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#2980B9] font-bold">Task History & Analytics</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => exportData('history')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-[#2980B9] rounded-xl border border-blue-500/30"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </motion.button>
              </div>

              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6">
                <div className="space-y-4">
                  {taskHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className={`w-5 h-5 ${entry.action === 'completed' ? 'text-[#27AE60]' : 'text-[#1A237E]'}`} />
                        <div>
                          <p className="font-semibold">{entry.taskTitle}</p>
                          <p className="text-sm text-[#1A237E]">
                            {entry.userName} {entry.action} this task
                          </p>
                          <p className="text-xs text-gray-500">{format(entry.timestamp, 'MMM dd, yyyy h:mm a')}</p>
                        </div>
                      </div>
                      {userData?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteHistory(entry.id)}
                          className="p-2 text-[#E74C3C] hover:bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'loginHistory' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#2980B9] font-bold">User Login History</h2>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportData('loginHistory')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-[#2980B9] rounded-xl border border-blue-500/30"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </motion.button>
                  {userData?.role === 'admin' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete ALL login history? This cannot be undone.')) {
                          try {
                            const historyRef = collection(db, 'loginHistory');
                            const snapshot = await getDocs(historyRef);
                            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                            await Promise.all(deletePromises);
                            toast.success('All login history deleted successfully!');
                          } catch (error) {
                            console.error('Error deleting login history:', error);
                            toast.error('Failed to delete login history');
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#E74C3C] hover:bg-[#C0392B] text-[#1A237E] rounded-xl border border-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete All</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white shadow-lg border border-white/10 rounded-2xl p-6">
                {loginHistoryLoading ? (
                  <div className="flex justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-[#2980B9]/50 border-t-purple-500 rounded-full"
                    />
                  </div>
                ) : loginHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-[#1A237E]">No login history found</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#BBDEFB] text-left text-[#1A237E]">
                            <th className="pb-3 px-4">User</th>
                            <th className="pb-3 px-4">Email</th>
                            <th className="pb-3 px-4">Login Time</th>
                            <th className="pb-3 px-4">IP Address</th>
                            {userData?.role === 'admin' && <th className="pb-3 px-4">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {loginHistory.map((entry) => {
                            const loginTime = format(entry.loginTime, 'MMM dd, yyyy h:mm a');
                            return (
                              <tr key={entry.id} className="hover:bg-white transition-colors">
                                <td className="py-3 px-4 text-[#1A237E]">{entry.userName}</td>
                                <td className="py-3 px-4 text-[#1A237E]">{entry.email}</td>
                                <td className="py-3 px-4 text-[#1A237E]">{loginTime}</td>
                                <td className="py-3 px-4 text-[#1A237E]">{entry.ipAddress || 'N/A'}</td>
                                {userData?.role === 'admin' && (
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this login history?')) {
                                          deleteDoc(doc(db, 'loginHistory', entry.id))
                                            .then(() => toast.success('Login history deleted'))
                                            .catch(() => toast.error('Failed to delete login history'));
                                        }
                                      }}
                                      className="p-1 text-[#E74C3C] hover:bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {loginHistory.map((entry) => {
                        const loginTime = format(entry.loginTime, 'MMM dd, yyyy h:mm a');
                        return (
                          <div key={entry.id} className="p-4 bg-white rounded-lg border border-[#BBDEFB]">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{entry.userName}</h3>
                                <p className="text-sm text-[#1A237E]">{entry.email}</p>
                              </div>
                              {userData?.role === 'admin' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this login history?')) {
                                      deleteDoc(doc(db, 'loginHistory', entry.id))
                                        .then(() => toast.success('Login history deleted'))
                                        .catch(() => toast.error('Failed to delete login history'));
                                    }
                                  }}
                                  className="p-1 text-[#E74C3C] hover:bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500">Login Time</p>
                                <p>{loginTime}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">IP Address</p>
                                <p>{entry.ipAddress || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-effect bg-white backdrop-blur-lg border border-[#BBDEFB] rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold mb-4 text-[#1A237E]">
              {editingUser ? 'Edit Member' : 'Add New Member'}
            </h3>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                    required
                  />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value as 'admin' | 'staff'})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Position</label>
                <select
                  value={userForm.position}
                  onChange={(e) => setUserForm({...userForm, position: e.target.value as 'Leader' | 'Co-Leader' | 'Member'})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                >
                  <option value="Member">Member</option>
                  <option value="Co-Leader">Co-Leader</option>
                  <option value="Leader">Leader</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserForm({ email: '', password: '', name: '', role: 'staff', position: 'Member' });
                  }}
                  className="flex-1 px-4 py-2 bg-[#BDC3C7] hover:bg-[#95A5A6] text-[#1A237E] text-[#1A237E] rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-[#1A237E] rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-effect bg-white backdrop-blur-lg border border-[#BBDEFB] rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold mb-4 text-[#1A237E]">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none h-20 text-[#1A237E]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Due Date</label>
                <input
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({...taskForm, priority: e.target.value as 'low' | 'medium' | 'high'})}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#BBDEFB] focus:border-purple-500 focus:outline-none text-[#1A237E]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Assign To</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={taskForm.assignedTo.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTaskForm({...taskForm, assignedTo: []});
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">All Members</span>
                  </label>
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={taskForm.assignedTo.includes(user.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTaskForm({...taskForm, assignedTo: [...taskForm.assignedTo, user.uid]});
                          } else {
                            setTaskForm({...taskForm, assignedTo: taskForm.assignedTo.filter(id => id !== user.uid)});
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: [] });
                    setEditingTask(null);
                  }}
                  className="flex-1 px-4 py-2 bg-[#BDC3C7] hover:bg-[#95A5A6] text-[#1A237E] text-[#1A237E] rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-[#1A237E] rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
          <span className="text-[#1A237E]">Developed by</span>
          <span className="relative overflow-hidden">
            <motion.span
              className="block font-medium text-[#2980B9] font-bold"
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
            className="lucide lucide-arrow-up-right text-purple-400 transition-transform group-hover:rotate-45 duration-300"
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
    className={`relative p-3 rounded-full backdrop-blur-xl border border-[#BBDEFB] bg-[#BDC3C7] hover:bg-[#95A5A6] text-[#1A237E] text-[#1A237E] hover:bg-purple-500/30 transition-all ${
      musicPlaying ? 'text-[#27AE60]' : 'text-[#1A237E]'
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
        className="block w-full text-xs text-gray-300 bg-[#BDC3C7] hover:bg-[#95A5A6] text-[#1A237E] border border-[#BBDEFB] rounded-xl px-2 py-1 hover:bg-white/20 transition-all"
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




    </div>
  );
};

export default AdminDashboard;