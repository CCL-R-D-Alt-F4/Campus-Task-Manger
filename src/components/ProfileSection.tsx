import React from 'react';
import { motion } from 'framer-motion';
import { Book, CalendarDays,Building, Briefcase } from 'lucide-react';
import { BadgeCheck } from 'lucide-react';
import { 
  User, 
  Mail, 
  Calendar as CalendarIcon,
  Crown,
  Star,
  Shield,
  Clock,
  Edit,
  Save,
  X,
  Lock,
  Key
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  position: string;
  role: 'admin' | 'member' | 'staff' | 'student';
  createdAt: Date;
  lastActive?: Date;
  studentDetails?: {
    course?: string;
    year?: number;
    studentId?: string;
  };
  staffDetails?: {
    department?: string;
    designation?: string;
  };
}

const ProfileSection = ({ userData }: { userData: UserProfile }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedName, setEditedName] = React.useState(userData.name);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        name: editedName.trim()
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!userData.email) {
      toast.error('No email associated with this account');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, userData.email);
      toast.success('Password reset email sent! Check your inbox.');
      setShowChangePassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
      console.error('Error sending password reset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionIcon = () => {
    switch (userData.position) {
      case 'Leader': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'Co-Leader': return <Star className="w-5 h-5 text-blue-400" />;
      case 'Admin': return <Shield className="w-5 h-5 text-purple-400" />;
      default: return <User className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#2980B9]">My Profile</h2>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                >
                  <Save className="w-5 h-5 text-green-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
              >
                <Edit className="w-5 h-5 text-blue-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-32 h-32 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center"
            >
              <User className="w-16 h-16 text-white" />
            </motion.div>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-sm text-gray-400 mb-1">Full Name</h3>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-gray-800/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-xl font-semibold text-black">{userData.name}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm text-gray-400 mb-1">Email</h3>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-400" />
                <p className="text-black">{userData.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Position</h3>
                <div className="flex items-center gap-2">
                  {getPositionIcon()}
                  <span className={`px-3 py-1 rounded-lg ${
                    userData.position === 'Leader' ? 'bg-yellow-500/20 text-yellow-400' :
                    userData.position === 'Co-Leader' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {userData.position}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-400 mb-1">Role</h3>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span className={`px-3 py-1 rounded-lg ${
                    userData.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {userData.role}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-400 mb-1">Member Since</h3>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <p className="text-black">
                    {format(userData.createdAt, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-400 mb-1">Last Active</h3>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <p className="text-black">
                    {userData.lastActive ? 
                      format(userData.lastActive, 'MMM d, yyyy h:mm a') : 
                      'Unknown'}
                  </p>
                </div>
              </div>
            </div>
                      {userData.role === 'student' && (
  <>
    <p>Course: {userData.studentDetails?.course || 'N/A'}</p>
    <p>Year: {userData.studentDetails?.year || 'N/A'}</p>
    <p>ID: {userData.studentDetails?.studentId || 'N/A'}</p>
  </>
)}


{(userData.role === 'staff' && userData.staffDetails) && (
  <>
    <div>
      <h3 className="text-sm text-gray-400 mb-1">Department</h3>
      <div className="flex items-center gap-2">
        <Building className="w-5 h-5 text-gray-400" />
        <p className="text-black">{userData.staffDetails.department || 'Not specified'}</p>
      </div>
    </div>
    <div>
      <h3 className="text-sm text-gray-400 mb-1">Designation</h3>
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-gray-400" />
        <p className="text-black">{userData.staffDetails.designation || 'Not specified'}</p>
      </div>
    </div>
  </>
)}

            {/* Change Password Section */}
            <div className="pt-4">
              {showChangePassword ? (
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Key className="w-5 h-5 text-purple-400" />
                      Change Password
                    </h3>
                    <button 
                      onClick={() => setShowChangePassword(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    We'll send a password reset link to your email address.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowChangePassword(false)}
                      className="px-4 py-2 text-sm rounded-lg bg-gray-600/50 hover:bg-gray-600/70 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-purple-600/80 hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      Send Reset Link
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 transition-colors"
                >
                  <Lock className="w-5 h-5 text-purple-400" />
                  <span>Change Password</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSection;