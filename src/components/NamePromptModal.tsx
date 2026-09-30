import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from './AnimatedButton';
import { motion } from 'motion/react';
import { UserCheck, Sparkles } from 'lucide-react';

export const NamePromptModal: React.FC = () => {
  const { userProfile, updateName, needsNamePrompt, setNeedsNamePrompt } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [submitting, setSubmitting] = useState(false);

  if (!needsNamePrompt) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await updateName(name.trim());
      setNeedsNamePrompt(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <UserCheck className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-center text-amber-400 dark:text-amber-400 light:text-amber-600 mb-2">
          مرحباً بك في منصة ALPHA!
        </h3>
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6">
          لقد قمت بالتسجيل عبر Google. يرجى تأكيد اسمك ليظهر في شهاداتك وإحصائياتك نحو المئوية.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
              اسمك المعروض في المنصة:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك الثلاثي أو المفضل"
              className="w-full px-4 py-3 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <AnimatedButton
              type="submit"
              variant="gold"
              size="md"
              disabled={submitting}
              className="flex-1"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {submitting ? 'حفظ...' : 'تأكيد الاسم والمتابعة'}
            </AnimatedButton>
            <AnimatedButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => setNeedsNamePrompt(false)}
            >
              لاحقاً
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
