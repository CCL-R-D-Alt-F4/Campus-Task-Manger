import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { secondaryAuth } from '../lib/firebase';

import { 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  updateDoc,
  onSnapshot 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  updateEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Crown, 
  Star, 
  User,
  Mail,
  Briefcase,
  LockKeyhole,
  X
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  position: string;
  role: 'admin' | 'staff' | 'student';
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

interface MemberManagementProps {
  userData: {
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'staff' | 'student',
    position: string,
  };
}

  
const ReauthDialog = ({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void; 
  onCancel: () => void 
}) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      onSuccess();
      toast.success('Authentication successful');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Reauthentication Required</h3>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-400 mb-6">
          For security reasons, please enter your current password to continue.
        </p>
        
        <form onSubmit={handleReauth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <LockKeyhole className="w-4 h-4 text-purple-400" />
              Current Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 px-4 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Authenticate'
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const MemberManagement = ({ userData }: MemberManagementProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
  name: '',
  email: '',
  position: 'Student',
  role: 'student',
  password: '',
  studentDetails: {
    course: '',
    year: 0,
    studentId: ''
  },
  staffDetails: {
    department: '',
    designation: '',
    accessLevel: 1
  }
  
});

  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthCallback, setReauthCallback] = useState<() => void>(() => {});

  useEffect(() => {
    const unsubscribe = fetchMembers();
    return () => unsubscribe();
  }, []);

  const fetchMembers = () => {
    const membersRef = collection(db, 'users');
    
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastActive: doc.data().lastActive ? doc.data().lastActive.toDate() : null
      })) as Member[];
      setMembers(membersData);
    });

    return unsubscribe;
  };

  const isOnline = (lastActive?: Date | null) => {
    if (!lastActive) return false;
    const diff = (Date.now() - lastActive.getTime()) / (1000 * 60);
    return diff < 5;
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        memberForm.email, 
        memberForm.password
      );
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: memberForm.name,
        email: memberForm.email,
        position: memberForm.position,
        role: memberForm.role,
        createdAt: new Date(),
        lastActive: new Date(),
        studentDetails: memberForm.role === 'student' ? memberForm.studentDetails : {},
        staffDetails: memberForm.role === 'staff' ? memberForm.staffDetails : {},
        taskDeletePermission: memberForm.role === 'staff' && memberForm.staffDetails.accessLevel === 2
      });
      
      await updateDoc(doc(db, 'users', userData.uid), {
        lastActive: new Date()
      });
      await secondaryAuth.signOut();

      setMemberForm({
  name: '',
  email: '',
  position: 'Student',
  role: 'student',
  password: '',
  studentDetails: {
    course: '',
    year: 0,
    studentId: ''
  },
  staffDetails: {
    department: '',
    designation: '',
    accessLevel: 1
  }
});

      setShowModal(false);
      
      toast.success(`🎉 Welcome ${memberForm.name} to the team!`);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingMember.id), {
        name: memberForm.name,
        position: memberForm.position,
        role: memberForm.role,
        lastActive: new Date(),
        taskDeletePermission: memberForm.role === 'staff' && memberForm.staffDetails.accessLevel === 2
      });
      
      setEditingMember(null);
      setShowModal(false);
      toast.success('Member updated successfully!');
    } catch (error) {
      toast.error('Failed to update member');
    } finally {
      setIsLoading(false);
    }
  };

 const handleChangeEmail = async () => {
  if (!editingMember || !newEmail.trim()) {
    toast.error('Please enter a valid email');
    return;
  }

  setIsLoading(true);
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if email is verified (unless admin is making the change)
    if (userData.role !== 'admin' && !user.emailVerified) {
      throw new Error('Please verify your current email before changing it');
    }

    // First update Firestore
    await updateDoc(doc(db, 'users', editingMember.id), {
      email: newEmail.trim(),
      lastActive: new Date()
    });

    // Then attempt to update auth email
    try {
      await updateEmail(user, newEmail.trim());
      await sendEmailVerification(user); // Send verification to new email
      toast.success('Email updated successfully! Verification email sent to new address.');
      setShowEmailChange(false);
      setNewEmail('');
      setShowModal(false);
    } catch (authError: any) {
      if (authError.code === 'auth/requires-recent-login') {
        setReauthCallback(() => async () => {
          try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            await updateEmail(user, newEmail.trim());
            await sendEmailVerification(user);
            toast.success('Email updated successfully! Verification email sent.');
            setShowEmailChange(false);
            setNewEmail('');
            setShowModal(false);
          } catch (reauthError: any) {
            // Revert Firestore change
            await updateDoc(doc(db, 'users', editingMember.id), {
              email: editingMember.email,
              lastActive: new Date()
            });
            throw reauthError;
          }
        });
        setShowReauthDialog(true);
      } else {
        // Revert Firestore change for other errors
        await updateDoc(doc(db, 'users', editingMember.id), {
          email: editingMember.email,
          lastActive: new Date()
        });
        throw authError;
      }
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to update email');
  } finally {
    setIsLoading(false);
  }
};

  const handleDeleteMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'users', memberId));
        toast.success('Member removed successfully!');
      } catch (error) {
        toast.error('Failed to remove member');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'Leader': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'Co-Leader': return <Star className="w-4 h-4 text-blue-400" />;
      case 'Staff': return <Briefcase className="w-4 h-4 text-purple-400" />;
      default: return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Leader': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Co-Leader': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Staff': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {showReauthDialog && (
        <ReauthDialog
          onSuccess={() => {
            setShowReauthDialog(false);
            reauthCallback();
          }}
          onCancel={() => setShowReauthDialog(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Member Management</h2>
          <p className="text-gray-400 mt-1">Manage your team members and their roles</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingMember(null);
            setMemberForm({
  name: '',
  email: '',
  position: 'Student',
  role: 'student',
  password: '',
  studentDetails: {
    course: '',
    year: 0,
    studentId: ''
  },
  staffDetails: {
    department: '',
    designation: '',
     accessLevel: 1
  }
});

            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Members', 
            value: members.length, 
            color: 'from-purple-500 to-indigo-500',
            icon: Users
          },
          { 
            label: 'Leaders', 
            value: members.filter(m => m.position === 'Leader').length, 
            color: 'from-yellow-500 to-orange-500',
            icon: Crown
          },
          { 
            label: 'Co-Leaders', 
            value: members.filter(m => m.position === 'Co-Leader').length, 
            color: 'from-blue-500 to-cyan-500',
            icon: Star
          },
          { 
            label: 'Staff', 
            value: members.filter(m => m.position === 'Staff').length, 
            color: 'from-purple-500 to-pink-500',
            icon: Briefcase
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 text-black">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold mb-6">Team Members</h3>
        
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No members yet</p>
            <p className="text-gray-500 text-sm">Add your first team member to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      {getPositionIcon(member.position)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-black">{member.name}</h4>
                      <p className="text-gray-400 text-sm">{member.email}</p>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${isOnline(member.lastActive)
                      ? 'bg-green-400 animate-ping'
                      : 'bg-gray-500'}`}
                    title={isOnline(member.lastActive) ? 'Online' : 'Offline'}
                  ></span>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg border text-xs ${getPositionColor(member.position)}`}>
                      {member.position}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      member.role === 'admin' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMember(member);
                        setMemberForm({
                          name: '',
                          email: '',
                          position: 'Student',
                          role: 'student',
                          password: '',
                          studentDetails: {
                            course: '',
                            year: 0,
                            studentId: ''
                          },
                          staffDetails: {
                            department: '',
                            designation: '',
                             accessLevel: 1
                          }
                        });

                        setShowModal(true);
                      }}
                      className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(member.id);
                      }}
                      className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingMember ? (showEmailChange ? 'Change Email' : 'Edit Member') : 'Add New Member'}
            </h3>
            
            {showEmailChange ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Email
                  </label>
                  <div className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400">
                    {editingMember?.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter new email"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 px-4 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Update Email
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowEmailChange(false)}
                    className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <form onSubmit={editingMember ? handleUpdateMember : handleCreateMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={!!editingMember}
                    required
                  />
                </div>

                {!editingMember && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                      minLength={6}
                    />
                  </div>
                )}
                
               <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                <input
                  type="text"
                  value={memberForm.position}
                  onChange={(e) => setMemberForm({ ...memberForm, position: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
                  placeholder="Enter custom position"
                  required
                />
              </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as 'admin' | 'staff' | 'student' })}
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </select>
                </div>

                {memberForm.role === 'staff' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white mb-1">Access Level</label>
                        <select
                          value={memberForm.staffDetails.accessLevel}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              staffDetails: {
                                ...memberForm.staffDetails,
                                accessLevel: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                        >
                          <option value={1}>Level 1 - Basic Access</option>
                          <option value={2}>Level 2 - Full Access</option>
                        </select>
                      </div>
                    )}

                      {memberForm.role === 'student' && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">Course</label>
                          <input
                            type="text"
                            value={memberForm.studentDetails.course}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                studentDetails: {
                                  ...memberForm.studentDetails,
                                  course: e.target.value
                                }
                              })
                            }
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">Year</label>
                          <input
                            type="number"
                            value={memberForm.studentDetails.year}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                studentDetails: {
                                  ...memberForm.studentDetails,
                                  year: Number(e.target.value)
                                }
                              })
                            }
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">Student ID</label>
                          <input
                            type="text"
                            value={memberForm.studentDetails.studentId}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                studentDetails: {
                                  ...memberForm.studentDetails,
                                  studentId: e.target.value
                                }
                              })
                            }
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                      </div>
                    )}
                
                <div className="flex gap-3 pt-4">
                  {editingMember && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setNewEmail(editingMember.email);
                        setShowEmailChange(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      Change Email
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {editingMember ? (
                          <>
                            <Edit3 className="w-4 h-4" />
                            Update Member
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add Member
                          </>
                        )}
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MemberManagement;