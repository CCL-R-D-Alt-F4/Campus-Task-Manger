import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { 
  Clock,
  Plus,
  Trash2,
  Edit,
  Download,
  CheckCircle,
  AlertCircle,
  Calendar,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  List,
  Activity
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';

interface User {
  id: string;
  uid: string;
  name: string;
  position: string;
  createdAt: Date;
}

interface Task {
  id: string;
  description: string;
  minutes: number;
  completed: boolean;
  memberId: string;
  trackerId: string;
  createdAt: Date;
}

interface MinuteTracker {
  id: string;
  date: Date;
  totalMinutes: number;
  priority: 'low' | 'medium' | 'high';
  description: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  taskTemplate?: string;
}

const MinuteTracker = () => {
  const { userData } = useAuth();
  const [trackers, setTrackers] = useState<MinuteTracker[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTracker, setEditTracker] = useState<MinuteTracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedTracker, setExpandedTracker] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
  const [completedTrackers, setCompletedTrackers] = useState<string[]>([]);

  const [trackerForm, setTrackerForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    totalMinutes: 60,
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
    taskTemplate: '',
    members: [] as string[]
  });

  const [taskForm, setTaskForm] = useState({
    description: '',
    minutes: 30,
    memberId: '',
    completed: false
  });

  useEffect(() => {
    fetchData();
  }, [userData]);

  // Calculate statistics
  const getStats = () => {
    const totalMinutes = trackers.reduce((sum, tracker) => sum + tracker.totalMinutes, 0);
    const allTasks = trackers.flatMap(tracker => getTasksForTracker(tracker.id));
    const completedTasks = allTasks.filter(task => task.completed).length;
    const pendingTasks = allTasks.length - completedTasks;
    
    return [
      { label: 'Total Minutes', value: totalMinutes, color: 'bg-blue-50 text-blue-600 border-blue-200' },
      { label: 'Completed Tasks', value: completedTasks, color: 'bg-green-50 text-green-600 border-green-200' },
      { label: 'Pending Tasks', value: pendingTasks, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
      { label: 'Trackers Logged', value: trackers.length, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    ];
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const usersQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        name: doc.data().name || '',
        position: doc.data().position || '',
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      setUsers(usersData);

      // Fetch trackers
      const trackersQuery = query(
        collection(db, 'minuteTrackers'),
        orderBy('date', 'desc')
      );
      
      const unsubscribeTrackers = onSnapshot(trackersQuery, (snapshot) => {
        const trackersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as MinuteTracker[];
        setTrackers(trackersData);
      });

      // Fetch tasks
      const tasksQuery = query(collection(db, 'minuteTrackerTasks'), orderBy('createdAt', 'asc'));
      const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Task[];
        setTasks(tasksData);
        setLoading(false);
      });

      return () => {
        unsubscribeTrackers();
        unsubscribeTasks();
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!trackerForm.description) {
        toast.error('Please enter a description');
        return;
      }
      if (trackerForm.totalMinutes <= 0) {
        toast.error('Minutes must be greater than 0');
        return;
      }

      const trackerData = {
        date: new Date(trackerForm.date),
        totalMinutes: trackerForm.totalMinutes,
        priority: trackerForm.priority,
        description: trackerForm.description,
        createdBy: userData?.uid || '',
        createdAt: new Date(),
        members: trackerForm.members,
        taskTemplate: trackerForm.taskTemplate || ''
      };

      if (editTracker) {
        await updateDoc(doc(db, 'minuteTrackers', editTracker.id), trackerData);
        toast.success('Time tracker updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'minuteTrackers'), trackerData);
        
        // Add to history
        await addDoc(collection(db, 'minuteTrackerHistory'), {
          trackerId: docRef.id,
          userId: userData?.uid || '',
          userName: userData?.name || 'Unknown',
          action: editTracker ? 'updated' : 'created',
          minutes: trackerForm.totalMinutes,
          description: trackerForm.description,
          timestamp: new Date()
        });

        toast.success('Time tracker created successfully!');
      }

      setShowModal(false);
      setEditTracker(null);
      setTrackerForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalMinutes: 60,
        priority: 'medium',
        description: '',
        taskTemplate: '',
        members: []
      });
    } catch (error) {
      console.error('Error creating tracker:', error);
      toast.error(`Failed to ${editTracker ? 'update' : 'create'} time tracker`);
    }
  };

  const handleEditTracker = (tracker: MinuteTracker) => {
    setEditTracker(tracker);
    setTrackerForm({
      date: format(tracker.date, 'yyyy-MM-dd'),
      totalMinutes: tracker.totalMinutes,
      priority: tracker.priority,
      description: tracker.description,
      taskTemplate: tracker.taskTemplate || '',
      members: tracker.members
    });
    setShowModal(true);
  };

  const handleDeleteTracker = async (trackerId: string) => {
    if (window.confirm('Are you sure you want to delete this time tracker?')) {
      try {
        await deleteDoc(doc(db, 'minuteTrackers', trackerId));
        
        // Also delete related history and tasks
        const historyQuery = query(
          collection(db, 'minuteTrackerHistory'), 
          where('trackerId', '==', trackerId)
        );
        const historySnapshot = await getDocs(historyQuery);
        historySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });

        const tasksQuery = query(
          collection(db, 'minuteTrackerTasks'),
          where('trackerId', '==', trackerId)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });

        toast.success('Time tracker deleted successfully!');
      } catch (error) {
        console.error('Error deleting tracker:', error);
        toast.error('Failed to delete time tracker');
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!taskForm.description || !taskForm.memberId) {
        toast.error('Please fill all required fields');
        return;
      }

      if (currentTask) {
        await updateDoc(doc(db, 'minuteTrackerTasks', currentTask.id), {
          description: taskForm.description,
          minutes: taskForm.minutes,
          memberId: taskForm.memberId,
          completed: taskForm.completed
        });
        toast.success('Task updated successfully!');
      } else {
        if (!selectedTrackerId) return;
        
        await addDoc(collection(db, 'minuteTrackerTasks'), {
          description: taskForm.description,
          minutes: taskForm.minutes,
          memberId: taskForm.memberId,
          trackerId: selectedTrackerId,
          completed: false,
          createdAt: new Date()
        });
        toast.success('Task created successfully!');
      }

      setShowTaskModal(false);
      setCurrentTask(null);
      setTaskForm({
        description: '',
        minutes: 30,
        memberId: '',
        completed: false
      });
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(`Failed to ${currentTask ? 'update' : 'create'} task`);
    }
  };

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setTaskForm({
      description: task.description,
      minutes: task.minutes,
      memberId: task.memberId,
      completed: task.completed
    });
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'minuteTrackerTasks', taskId));
        toast.success('Task deleted successfully!');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'minuteTrackerTasks', taskId), {
        completed
      });

      // Check if all tasks in the tracker are completed
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const trackerTasks = tasks.filter(t => t.trackerId === task.trackerId);
        const allCompleted = trackerTasks.every(t => t.completed);
        
        if (allCompleted && !completedTrackers.includes(task.trackerId)) {
          setCompletedTrackers([...completedTrackers, task.trackerId]);
          confetti({ 
            particleCount: 100, 
            spread: 70, 
            origin: { y: 0.6 } 
          });
          toast.success('All tasks completed! Great job!', {
            icon: '🎉'
          });
        }
      }

      toast.success(`Task marked as ${completed ? 'completed' : 'pending'}!`);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const exportTrackerToExcel = (tracker: MinuteTracker) => {
    const workbook = XLSX.utils.book_new();
    
    // Prepare tracker details
    const trackerDetails = [
      ['Time Tracker Details', ''],
      ['Date', format(tracker.date, 'MM/dd/yyyy')],
      ['Total Minutes', tracker.totalMinutes],
      ['Priority', tracker.priority],
      ['Description', tracker.description],
      ['Created By', users.find(u => u.uid === tracker.createdBy)?.name || tracker.createdBy],
      ['Created At', format(tracker.createdAt, 'MM/dd/yyyy h:mm a')],
      ['Task Template', tracker.taskTemplate || 'N/A'],
      [''],
      ['Assigned Members Summary', ''],
      ['Name', 'Position', 'Total Assigned Minutes']
    ];

    // Calculate member minutes
    const memberTasks = tasks.filter(t => t.trackerId === tracker.id);
    const memberMinutes: Record<string, number> = {};

    tracker.members.forEach(memberId => {
      memberMinutes[memberId] = 0;
    });

    memberTasks.forEach(task => {
      if (memberMinutes.hasOwnProperty(task.memberId)) {
        memberMinutes[task.memberId] += task.minutes;
      }
    });

    // Add member summary
    tracker.members.forEach(memberId => {
      const member = users.find(u => u.uid === memberId);
      if (member) {
        trackerDetails.push([
          member.name,
          member.position,
          memberMinutes[memberId] || 0
        ]);
      }
    });

    trackerDetails.push(['', '', '']);
    trackerDetails.push(['Detailed Tasks', '', '']);
    trackerDetails.push(['Description', 'Member', 'Minutes', 'Status']);

    // Add detailed tasks
    memberTasks.forEach(task => {
      const member = users.find(u => u.uid === task.memberId);
      trackerDetails.push([
        task.description,
        member?.name || task.memberId,
        task.minutes,
        task.completed ? 'Completed' : 'Pending'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(trackerDetails);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Description
      { wch: 20 }, // Member
      { wch: 15 }, // Minutes
      { wch: 15 }  // Status
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'TimeTrackerDetails');
    XLSX.writeFile(workbook, `TimeTracker_${format(tracker.date, 'yyyy-MM-dd')}.xlsx`);
    toast.success('Tracker details exported to Excel!');
  };

  const getTrackerMinutesHistory = (days = 7) => {
    const history: {date: string; minutes: number}[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const trackersForDay = trackers.filter(t => format(t.date, 'yyyy-MM-dd') === dateStr);
      const totalMinutes = trackersForDay.reduce((sum, tracker) => sum + tracker.totalMinutes, 0);
      
      history.push({
        date: format(date, 'MMM dd'),
        minutes: totalMinutes
      });
    }
    
    return history;
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default: return 'bg-blue-50 text-blue-600 border-blue-200';
    }
  };

  const getTasksForTracker = (trackerId: string) => {
    return tasks.filter(task => task.trackerId === trackerId);
  };



  const stats = getStats();

  return (
    <div className="min-h-screen bg-white text-gray-800 p-2 sm:p-4 md:p-6">
      <div className="w-full px-4 sm:px-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Minute Tracker
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base">Track and manage team work time</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-500/20 text-green-600 rounded-lg sm:rounded-xl border border-green-500/30 hover:bg-green-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm sm:text-base">New Tracker</span>
          </motion.button>
        </div>

        {/* Stats Cards - Mobile Horizontal Scroll */}
        <div className="mb-4 sm:mb-6">
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`min-w-[160px] sm:min-w-0 backdrop-blur-xl border rounded-lg p-3 ${stat.color} hover:scale-[1.02] transition-transform`}
              >
                <p className="text-xs sm:text-sm text-gray-300">{stat.label}</p>
                <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Minutes History Chart */}
        <div className="backdrop-blur-xl bg-white shadow-md border border-blue-100 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3">Weekly Minutes History</h2>
          <div className="flex items-end h-28 sm:h-32 md:h-40 gap-1 sm:gap-2">
            {getTrackerMinutesHistory().map((day, index) => (
              <motion.div 
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(day.minutes / 10, 100)}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex-1 bg-gradient-to-t from-blue-300 to-blue-500 rounded-t flex items-end justify-center"
              >
                <div className="text-center mb-1">
                  <p className="text-[10px] sm:text-xs text-gray-300">{day.date}</p>
                  <p className="text-[10px] sm:text-xs font-semibold">{day.minutes}m</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trackers List */}
        <div className="space-y-2 sm:space-y-3">
          {trackers.length === 0 ? (
            <div className="backdrop-blur-xl bg-white shadow-md border border-blue-100 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-300">No time trackers yet</h3>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Create your first time tracker to get started</p>
            </div>
          ) : (
            trackers.map(tracker => (
              <motion.div 
                key={tracker.id}
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="backdrop-blur-xl bg-white shadow-md border border-blue-100 backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden"
              >
                <div 
                  className="flex items-center justify-between p-2 sm:p-3 cursor-pointer" 
                  onClick={() => setExpandedTracker(expandedTracker === tracker.id ? null : tracker.id)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${getPriorityColor(tracker.priority)}`}>
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{formatDate(tracker.date)}</h3>
                      <p className="text-gray-600 text-xs truncate">{tracker.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-2">
                    <div className="text-right">
                      <p className="font-semibold text-sm sm:text-base">{tracker.totalMinutes}m</p>
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        {getTasksForTracker(tracker.id).length} tasks
                      </p>
                    </div>
                    {expandedTracker === tracker.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </div>

                {expandedTracker === tracker.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="px-2 sm:px-3 pb-2 sm:pb-3"
                  >
                    <div className="border-t border-white/10 pt-2 sm:pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="bg-white shadow-md p-2 sm:p-3 rounded-lg">
                          <p className="text-gray-600 text-xs sm:text-sm">Priority</p>
                          <p className="capitalize text-xs sm:text-sm">{tracker.priority}</p>
                        </div>
                        <div className="bg-white shadow-md p-2 sm:p-3 rounded-lg">
                          <p className="text-gray-600 text-xs sm:text-sm">Created By</p>
                          <p className="text-xs sm:text-sm">{users.find(u => u.uid === tracker.createdBy)?.name || 'Unknown'}</p>
                        </div>
                        <div className="bg-white shadow-md p-2 sm:p-3 rounded-lg">
                          <p className="text-gray-600 text-xs sm:text-sm">Created On</p>
                          <p className="text-xs sm:text-sm">{format(tracker.createdAt, 'MMM dd, yyyy h:mm a')}</p>
                        </div>
                      </div>

                      {tracker.taskTemplate && (
                        <div className="mb-2 sm:mb-3">
                          <p className="text-gray-600 text-xs sm:text-sm mb-1">Task Template</p>
                          <p className="bg-white shadow-md p-2 rounded-lg text-xs sm:text-sm">{tracker.taskTemplate}</p>
                        </div>
                      )}

                      <div className="mb-2 sm:mb-3">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="text-gray-600 text-xs sm:text-sm">Tasks</p>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedTrackerId(tracker.id);
                              setShowTaskModal(true);
                            }}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-500/20 text-blue-600 rounded-lg border border-purple-500/30 hover:bg-blue-50 hover:shadow-lg-500/30 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Add Task
                          </motion.button>
                        </div>
                        
                        {getTasksForTracker(tracker.id).length === 0 ? (
                          <div className="text-center py-2 sm:py-3 bg-white shadow-md rounded-lg">
                            <p className="text-gray-600 text-xs sm:text-sm">No tasks added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1 sm:space-y-2">
                            {getTasksForTracker(tracker.id).map(task => {
                              const member = users.find(u => u.uid === task.memberId);
                              return (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-white shadow-md rounded-lg">
                                  <div className="flex items-center gap-2 sm:gap-2 flex-1 min-w-0">
                                    <button
                                      onClick={() => handleTaskComplete(task.id, !task.completed)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                        task.completed 
                                          ? 'bg-green-500 text-blue-800 border-green-500' 
                                          : 'border-gray-400 hover:border-green-500'
                                      }`}
                                    >
                                      {task.completed && <CheckCircle className="w-2 h-2 text-blue-800" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs sm:text-sm truncate transition-all duration-300 ${
                                                      task.completed
                                                        ? 'text-green-600 italic opacity-70'
                                                        : 'text-blue-800'}`}>
                                        {task.description}
                                      </p>
                                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600">
                                        {member && (
                                          <span className="flex items-center gap-1 truncate">
                                            <UserIcon className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                                            <span className="truncate">{member.name}</span>
                                          </span>
                                        )}
                                        <span>{task.minutes}m</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 ml-1">
                                    <button
                                      onClick={() => handleEditTask(task)}
                                      className="p-1 text-blue-400 hover:bg-blue-500/20 rounded"
                                    >
                                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                        {userData?.uid === tracker.createdBy && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEditTracker(tracker)}
                              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-xs sm:text-sm"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteTracker(tracker.id)}
                              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all text-xs sm:text-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </motion.button>
                          </>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => exportTrackerToExcel(tracker)}
                          className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-500/20 text-blue-600 rounded-lg border border-purple-500/30 hover:bg-blue-50 hover:shadow-lg-500/30 transition-all text-xs sm:text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Tracker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-gray-800 shadow-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 w-full max-w-md mx-2"
          >
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
              {editTracker ? 'Edit Time Tracker' : 'Create New Time Tracker'}
            </h3>
            
            <form onSubmit={handleCreateTracker} className="space-y-2 sm:space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={trackerForm.date}
                    onChange={(e) => setTrackerForm({...trackerForm, date: e.target.value})}
                    className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Priority</label>
                  <select
                    value={trackerForm.priority}
                    onChange={(e) => setTrackerForm({...trackerForm, priority: e.target.value as 'low' | 'medium' | 'high'})}
                    className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Total Minutes</label>
                <input
                  type="number"
                  min="1"
                  value={trackerForm.totalMinutes}
                  onChange={(e) => setTrackerForm({...trackerForm, totalMinutes: parseInt(e.target.value) || 0})}
                  className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Task Template (Optional)</label>
                <textarea
                  value={trackerForm.taskTemplate}
                  onChange={(e) => setTrackerForm({...trackerForm, taskTemplate: e.target.value})}
                  className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm h-16"
                  placeholder="Enter a default task that will be added for all selected members..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Description</label>
                <textarea
                  value={trackerForm.description}
                  onChange={(e) => setTrackerForm({...trackerForm, description: e.target.value})}
                  className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm h-16"
                  placeholder="Describe what this time tracker is for..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Select Members ({trackerForm.members.length} selected)</label>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-500 p-1 sm:p-2 rounded-lg">
                  <label className="flex items-center gap-1 p-1 hover:bg-gray-600/50 rounded transition-colors text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={trackerForm.members.length === users.length}
                      onChange={(e) => {
                        setTrackerForm({
                          ...trackerForm,
                          members: e.target.checked ? users.map(u => u.uid) : []
                        });
                      }}
                      className="rounded"
                    />
                    <span>All Members</span>
                  </label>
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-1 p-1 hover:bg-gray-600/50 rounded transition-colors text-xs sm:text-sm">
                      <input
                        type="checkbox"
                        checked={trackerForm.members.includes(user.uid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTrackerForm({...trackerForm, members: [...trackerForm.members, user.uid]});
                          } else {
                            setTrackerForm({...trackerForm, members: trackerForm.members.filter(id => id !== user.uid)});
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex items-center gap-1 truncate">
                        <span className="truncate">{user.name}</span>
                        <span className="text-[10px] sm:text-xs text-gray-600 truncate hidden sm:inline">({user.position})</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 sm:pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditTracker(null);
                  }}
                  className="flex-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-600 text-blue-800 rounded-lg hover:bg-blue-50 hover:shadow-lg transition-colors text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-600 text-blue-800 rounded-lg hover:bg-blue-50 hover:shadow-lg-700 transition-colors text-xs sm:text-sm"
                >
                  {editTracker ? 'Update' : 'Create'} Tracker
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-gray-800 shadow-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 w-full max-w-md mx-2"
          >
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
              {currentTask ? 'Edit Task' : 'Add New Task'}
            </h3>
            
            <form onSubmit={handleCreateTask} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm h-16"
                  placeholder="Describe the task..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Minutes</label>
                  <input
                    type="number"
                    min="1"
                    value={taskForm.minutes}
                    onChange={(e) => setTaskForm({...taskForm, minutes: parseInt(e.target.value) || 0})}
                    className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Member</label>
                  <select
                    value={taskForm.memberId}
                    onChange={(e) => setTaskForm({...taskForm, memberId: e.target.value})}
                    className="w-full px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-xs sm:text-sm"
                    required
                  >
                    <option value="">Select Member</option>
                    {users.map(user => (
                      <option key={user.id} value={user.uid}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {currentTask && (
                <div>
                  <label className="flex items-center gap-1 text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={taskForm.completed}
                      onChange={(e) => setTaskForm({...taskForm, completed: e.target.checked})}
                      className="rounded"
                    />
                    <span>Completed</span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2 sm:pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setCurrentTask(null);
                  }}
                  className="flex-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-600 text-blue-800 rounded-lg hover:bg-blue-50 hover:shadow-lg transition-colors text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-600 text-blue-800 rounded-lg hover:bg-blue-50 hover:shadow-lg-700 transition-colors text-xs sm:text-sm"
                >
                  {currentTask ? 'Update' : 'Add'} Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MinuteTracker;