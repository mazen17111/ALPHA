import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, AlertCircle, X } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsVerifying(true);

    // Exact admin password validation as instructed by user
    if (password === 'ishhd882gk#') {
      setTimeout(() => {
        setIsVerifying(false);
        setPassword('');
        setErrorMsg('');
        onSuccess();
      }, 300);
    } else {
      setTimeout(() => {
        setIsVerifying(false);
        setErrorMsg('كلمة المرور الإدارية غير صحيحة');
      }, 200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl border-2 border-amber-500/50 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-2xl font-black text-center text-amber-400 dark:text-amber-400 light:text-amber-600 mb-1">
          بوابة قسم التحكم الإداري
        </h3>
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6">
          يرجى إدخال كلمة المرور المعتمدة لإدارة محتويات منصة ALPHA
        </p>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
              كلمة مرور المشرف:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-500/40 bg-black/60 dark:bg-black/60 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <AnimatedButton
              type="submit"
              variant="gold"
              size="md"
              disabled={isVerifying}
              className="flex-1"
            >
              {isVerifying ? 'جاري التحقق...' : 'دخول لوحة التحكم'}
            </AnimatedButton>
            <AnimatedButton
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
            >
              إلغاء
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
