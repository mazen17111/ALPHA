import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Wrench, Clock, ShieldAlert, LogOut, Shield } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface LockScreenProps {
  reason: 'maintenance' | 'subscription' | 'banned' | 'account_locked';
  customMessage?: string;
  onLogout?: () => void;
  onAdminClick: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  reason,
  customMessage,
  onLogout,
  onAdminClick,
}) => {
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAdminPhraseClick = () => {
    if (clickCount === 0) {
      setClickCount(1);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 1500);
    } else if (clickCount === 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setClickCount(0);
      onAdminClick();
    }
  };

  const getDetails = () => {
    switch (reason) {
      case 'maintenance':
        return {
          icon: <Wrench className="w-12 h-12 text-amber-400 animate-bounce" />,
          badge: 'وضع الصيانة والتحديثات',
          title: 'المنصة مقفلة حالياً بداعي الصيانة',
          desc:
            customMessage ||
            'يجري حالياً تحديث خوادم ومحتوى منصة ALPHA التعليمية لتقديم أفضل جودة دراسية وسرعة فائقة. سنعود للعمل بكامل طاقتنا قريباً جداً، نشكر تفهمكم!',
          color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
        };
      case 'subscription':
        return {
          icon: <Clock className="w-12 h-12 text-yellow-400 animate-pulse" />,
          badge: 'انتهاء فترة الاشتراك',
          title: 'المنصة مقفلة بداعي انتهاء الاشتراك',
          desc:
            customMessage ||
            'عذراً، لقد انتهت صلاحية اشتراكك في منصة ALPHA التعليمية. يرجى التواصل مع إدارة المنصة لتجديد الاشتراك والاستمرار في طريقك للمئوية.',
          color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
        };
      case 'banned':
      case 'account_locked':
      default:
        return {
          icon: <ShieldAlert className="w-12 h-12 text-red-400" />,
          badge: 'تم إيقاف الحساب',
          title: 'تم إغلاق المنصة لهذا الحساب',
          desc:
            customMessage ||
            'عذراً، لقد تم إيقاف أو حذف هذا الحساب من قِبل إدارة منصة ALPHA. لا يمكنك الوصول للمحتوى حالياً.',
          color: 'border-red-500/40 bg-red-500/10 text-red-400',
        };
    }
  };

  const info = getDetails();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 dark:bg-zinc-950 light:bg-[#fcfbf9] text-zinc-100 dark:text-zinc-100 light:text-zinc-900 p-4 transition-colors">
      <div />

      {/* Main Locked Card */}
      <div className="max-w-md w-full mx-auto my-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="p-8 sm:p-10 rounded-3xl border-2 border-amber-500/30 bg-black/80 dark:bg-black/80 light:bg-white text-center shadow-2xl backdrop-blur-xl relative overflow-hidden"
        >
          {/* Subtle Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          {/* Icon Box */}
          <div className="w-24 h-24 rounded-3xl bg-zinc-900 dark:bg-zinc-900 light:bg-zinc-100 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl">
            {info.icon}
          </div>

          {/* Badge */}
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border mb-4 ${info.color}`}>
            <span>{info.badge}</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-3">
            {info.title}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed mb-8 font-normal">
            {info.desc}
          </p>

          {/* Action button */}
          {onLogout && (
            <AnimatedButton
              variant="outline"
              size="md"
              onClick={onLogout}
              icon={<LogOut className="w-4 h-4 ml-1" />}
              className="w-full justify-center text-xs sm:text-sm font-bold border-amber-500/40"
            >
              تسجيل الخروج والعودة للرئيسية
            </AnimatedButton>
          )}
        </motion.div>
      </div>

      {/* Secret double-click footer at the very end */}
      <footer className="w-full py-6 text-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdminPhraseClick}
          title="منصة ألفا التعليمية - طريقك للمئوية"
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-600 light:text-zinc-500 hover:text-amber-400 dark:hover:text-amber-400 light:hover:text-amber-600 hover:bg-amber-500/5 transition-all cursor-pointer select-none"
        >
          <Shield className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
          <span>جميع محتويات المنصة محفوظة لمنصة الفا</span>
        </motion.button>
      </footer>
    </div>
  );
};
