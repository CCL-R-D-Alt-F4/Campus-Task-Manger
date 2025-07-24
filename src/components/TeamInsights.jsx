import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subDays } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const TeamInsights = () => {
  const [taskTrends, setTaskTrends] = useState([]);
  const [trackerTrends, setTrackerTrends] = useState([]);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const taskQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'desc'));
      const taskSnap = await getDocs(taskQuery);
      const taskData = taskSnap.docs.map(doc => ({
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
        completedBy: doc.data().completedBy || [],
      }));

      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayLabel = format(date, 'MM/dd');
        const completed = taskData.filter(
          t => format(t.dueDate, 'MM/dd') === dayLabel && t.completedBy.length > 0
        ).length;
        return { date: dayLabel, completed };
      });

      setTaskTrends(last7Days);

      const trackerQuery = query(collection(db, 'minuteTrackers'), orderBy('date', 'desc'));
      const trackerSnap = await getDocs(trackerQuery);
      const trackerData = trackerSnap.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate(),
      }));

      const trackerSummary = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayLabel = format(date, 'MM/dd');
        const totalMinutes = trackerData
          .filter(t => format(t.date, 'MM/dd') === dayLabel)
          .reduce((sum, t) => sum + t.totalMinutes, 0);
        return { date: dayLabel, minutes: totalMinutes };
      });

      setTrackerTrends(trackerSummary);

      const usersSnap = await getDocs(collection(db, 'users'));
      const now = new Date();
      const silent = usersSnap.docs
        .map(doc => ({
          ...doc.data(),
          lastActive: doc.data().lastActive?.toDate() || new Date(0),
          name: doc.data().name || 'Unnamed',
        }))
        .filter(user => {
          const diff = (now.getTime() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 5;
        });

      setInactiveMembers(silent);
    } finally {
      setLoading(false);
    }
  };

  const chartAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, x: -20 },
    visible: i => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 md:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <h2
  className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400"
  style={{
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
>
  Team Insights
</h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 mt-2 text-lg"
        >
          Visual breakdown of team activity and trends
        </motion.p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <>
          <motion.div
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20"
          >
            <motion.div
              variants={chartAnimation}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-lg hover:shadow-purple-400/20 transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-8 text-purple-400">Task Completion (7 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={taskTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#ccc" />
                  <YAxis stroke="#ccc" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderColor: '#7e22ce',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#7e22ce' }}
                    activeDot={{ r: 8, stroke: '#a78bfa', strokeWidth: 2, fill: '#581c87' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              variants={chartAnimation}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-lg hover:shadow-cyan-400/20 transition-shadow duration-300"
            >
              <h3 className="text-xl font-semibold mb-8 text-cyan-400">Tracker Minutes (7 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trackerTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#ccc" />
                  <YAxis stroke="#ccc" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#083344',
                      borderColor: '#0e7490',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="minutes" fill="#22d3ee" radius={[4, 4, 0, 0]} animationDuration={2000} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-lg hover:shadow-red-400/20 transition-shadow duration-300 mb-10"
          >
            <h3 className="text-xl font-semibold mb-8 text-red-400">Inactive Members (5+ Days)</h3>
            {inactiveMembers.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-gray-400 text-lg"
              >
                🎉 All members are recently active!
              </motion.p>
            ) : (
              <motion.ul className="space-y-6">
                <AnimatePresence>
                  {inactiveMembers.map((user, i) => (
                    <motion.li
                      key={i}
                      custom={i}
                      variants={itemAnimation}
                      initial="hidden"
                      animate="visible"
                      className="text-base text-gray-300 bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-colors duration-200"
                      whileHover={{ x: 5 }}
                    >
                      <span className="font-medium text-white">{user.name}</span> — Last active on{' '}
                      {format(user.lastActive, 'MMM dd, yyyy')}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default TeamInsights;
