import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, Shield, Sparkles, LockKeyhole, ArrowLeft, Mail, X } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const user = auth.currentUser;

  

  const navigate = useNavigate();
const { login, userData } = useAuth(); 

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    await login(email, password);
    toast.success('Welcome back to ALT F4!');

    // ✅ wait for userData to load AFTER login
    let retries = 0;
    while (!userData && retries < 20) {
      await new Promise((r) => setTimeout(r, 100)); // 100ms delay
      retries++;
    }

    switch (userData?.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'staff':
        navigate('/staff');
        break;
      case 'student':
        navigate('/student');
        break;
      default:
        navigate('/');
    }

  } catch (error: any) {
    toast.error(error.message || 'Login failed');
  } finally {
    setIsLoading(false);
  }
};



// wait for userData to be loaded in AuthContext
const waitForUserData = async () => {
  let retries = 0;
  while (!userData && retries < 20) {
    await new Promise((r) => setTimeout(r, 100)); // wait 100ms
    retries++;
  }

  switch (userData?.role) {
    case 'admin':
      navigate('/admin');
      break;
    case 'staff':
      navigate('/staff');
      break;
    case 'student':
      navigate('/student');
      break;
    default:
      navigate('/');
  }
};



  

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  // Particle effects configuration
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 10 + 10
  }));

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Terms & Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-effect bg-white backdrop-blur-lg border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Terms & Conditions</h3>
              <button 
                onClick={() => setShowTerms(false)}
                className="p-1 text-[#2980B9] hover:text-[#1A237E] "
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="prose prose-invert text-[#2980B9]">
              <h4>1. Acceptance of Terms</h4>
              <p>By accessing and using the ALT F4 Task Management System, you accept and agree to be bound by these Terms and Conditions.</p>
              
              <h4>2. User Responsibilities</h4>
              <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.</p>
              
              <h4>3. Privacy Policy</h4>
              <p>Your use of our services is also subject to our Privacy Policy. Please review our Privacy Policy, which explains how we collect, use, and protect your information.</p>
              
              <h4>4. Prohibited Activities</h4>
              <p>You may not use our services for any illegal or unauthorized purpose nor may you violate any laws in your jurisdiction.</p>
              
              <h4>5. Account Security</h4>
              <p>You must notify us immediately of any unauthorized use of your account or any other breaches of security.</p>
              
              <h4>6. Changes to Terms</h4>
              <p>We reserve the right to modify these terms at any time. Your continued use of the service after changes constitutes acceptance.</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 bg-purple-600 text-[#1A237E]  rounded-lg hover:bg-purple-700 transition-colors"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-effect bg-white backdrop-blur-lg border border-white/10 rounded-2xl p-6 max-w-md w-full"
          >
            <button
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center gap-2 text-[#2980B9] hover:text-[#1A237E]  mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
            
            <h3 className="text-xl font-bold mb-4">Reset Password</h3>
            <p className="text-[#2980B9] mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2980B9] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E74C3C]" />
                  Email Address
                </label>
                <motion.div whileHover={{ scale: 1.01 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#BBDEFB] shadow-xl rounded-xl text-[#1A237E]  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your email"
                    required
                  />
                </motion.div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#2196F3] to-[#64B5F6] hover:from-[#1976D2] hover:to-[#42A5F5] text-[#1A237E]  font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Reset Link
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient circles */}
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            x: [0, 20, 0],
            y: [0, 20, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            x: [0, -20, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating particles */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-purple-400/30"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [0, -100],
                x: [0, (Math.random() - 0.5) * 50]
              }}
              transition={{
                delay: particle.delay,
                duration: particle.duration,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Main login card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glassmorphic container with border animation */}
        <motion.div
          className="backdrop-blur-xl bg-white border border-[#BBDEFB] shadow-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          whileHover={{ 
            boxShadow: "0 20px 50px rgba(139, 92, 246, 0.3)"
          }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated border gradient */}
          <motion.div 
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: `conic-gradient(
                from 0deg at 50% 50%,
                rgba(139, 92, 246, 0.5) 0deg,
                rgba(6, 182, 212, 0.5) 120deg,
                rgba(139, 92, 246, 0.5) 240deg
              )`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '1px'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* Logo/Header with sparkle effect */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="text-center mb-8 relative"
          >
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl mb-4 shadow-lg relative"
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Zap className="w-8 h-8 text-[#1A237E] " />
              {/* Sparkle effects */}
              <AnimatePresence>
                {[0, 90, 180, 270].map((angle) => (
                  <motion.div
                    key={angle}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    style={{
                      x: Math.cos(angle * (Math.PI / 180)) * 24,
                      y: Math.sin(angle * (Math.PI / 180)) * 24
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{
                      delay: 0.5 + angle/360 * 0.5,
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              ALT F4
            </h1>
            <motion.p 
              className="text-[#2980B9] mt-2"
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            >
              Task Management System
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-[#2980B9] mb-2 flex items-center gap-2">
                <LockKeyhole className="w-4 h-4 text-[#E74C3C]" />
                Email Address
              </label>
              <motion.div whileHover={{ scale: 1.01 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#BBDEFB] shadow-xl rounded-xl text-[#1A237E]  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-medium text-[#2980B9] mb-2 flex items-center gap-2">
                <LockKeyhole className="w-4 h-4 text-cyan-400" />
                Password
              </label>
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.01 }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#BBDEFB] shadow-xl rounded-xl text-[#1A237E]  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#2980B9] hover:text-[#1A237E]  transition-colors"
                  whileTap={{ scale: 0.9 }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </motion.button>
              </motion.div>
            </motion.div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#E74C3C] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <motion.button
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(168, 85, 247, 0.4)",
                background: [
                  'linear-gradient(to right, #8b5cf6, #06b6d4)',
                  'linear-gradient(to right, #06b6d4, #8b5cf6)',
                  'linear-gradient(to right, #8b5cf6, #06b6d4)'
                ]
              }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHovered(true)}
              onHoverEnd={() => setHovered(false)}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#2196F3] to-[#64B5F6] hover:from-[#1976D2] hover:to-[#42A5F5] text-[#1A237E]  font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg relative overflow-hidden"
            >
              {/* Button shine effect */}
              {hovered && (
                <motion.span
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.8 }}
                />
              )}
              
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Access System
                </>
              )}
              
              {/* Sparkle icon that appears on hover */}
              <AnimatePresence>
                {hovered && !isLoading && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center text-xs text-gray-500"
          >
            By logging in, you agree to our{' '}
            <button
              onClick={() => setShowTerms(true)}
              className="text-[#E74C3C] hover:underline"
            >
              Terms & Conditions
            </button>
          </motion.div>
        </motion.div>

        {/* Enhanced floating elements */}
        <motion.div
          animate={{ 
            y: [-10, 10, -10],
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-80 blur-[1px]"
        />
        <motion.div
          animate={{ 
            y: [10, -10, 10],
            rotate: [0, -5, 5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg opacity-80 blur-[1px]"
        />
      </motion.div>
    </div>
  );
};

export default Login;