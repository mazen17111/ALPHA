import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from './AnimatedButton';
import { motion, AnimatePresence } from 'motion/react';
import alphaLogo from '../assets/images/alpha_logo_1790678223903.jpg';
import {
  Video,
  FileText,
  HelpCircle,
  FolderLock,
  Tv,
  Award,
  Sparkles,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور');
          setLoading(false);
          return;
        }
        await loginWithEmail(email, password);
      } else {
        if (!name.trim() || !email.trim() || !password) {
          setErrorMsg('يرجى كتابة اسم الطالب والبريد الإلكتروني وكلمة المرور');
          setLoading(false);
          return;
        }
        await registerWithEmail(name, email, password);
      }
    } catch (err: any) {
      console.warn('Auth submit notice:', err?.message || err);
      if (err.message?.includes('البريد الإلكتروني غير مسجل')) {
        setAuthMode('register');
        setErrorMsg('يرجى كتابة اسمك لإتمام تسجيل حسابك الجديد مجاناً');
      } else if (err.message && !err.code) {
        setErrorMsg(err.message);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة');
      } else if (err.code === 'auth/user-not-found') {
        setAuthMode('register');
        setErrorMsg('هذا البريد جديد، يرجى كتابة اسمك لإنشاء حسابك مجاناً');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('هذا البريد مسجل بالفعل، يمكنك التبديل إلى تسجيل الدخول');
      } else {
        setErrorMsg(err.message || 'تعذر إتمام العملية، يرجى التحقق من البيانات');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Video className="w-6 h-6 text-amber-400" />,
      title: 'فيديوهات تفاعلية احترافية',
      desc: 'شروحات دقيقة ومركزة مع ميزة تأكيد المشاهدة وربط الملفات والاختبارات مباشرة بكل فيديو.',
    },
    {
      icon: <FileText className="w-6 h-6 text-amber-400" />,
      title: 'مكتبة الملفات والمذكرات',
      desc: 'ملفات PDF ومذكرات تلخيصية منظمة وشاملة لكل موضوع لتسهيل المراجعة السريعة.',
    },
    {
      icon: <HelpCircle className="w-6 h-6 text-amber-400" />,
      title: 'اختبارات محاكاة ذكية',
      desc: 'اختبارات تدريبية مع نسب نجاح وصور توضيحية للاسئلة وتصحيح فوري يحسب نتيجتك ونسبتك.',
    },
    {
      icon: <FolderLock className="w-6 h-6 text-amber-400" />,
      title: 'مجلداتي الخاصة بالأسئلة',
      desc: 'ابنِ بنك أسئلتك الخاص في مجلداتك، وأجرِ اختبارات فورية مخصصة على أي مجلد بضغطة زر.',
    },
    {
      icon: <Tv className="w-6 h-6 text-amber-400" />,
      title: 'بثوث تفاعلية مباشرة',
      desc: 'انضم لبث المعلم المباشر فور تفعيله عبر مستطيل البث الأخضر المتميز لتجربة حية لحظية.',
    },
    {
      icon: <Award className="w-6 h-6 text-amber-400" />,
      title: 'إحصائيات دقيقة نحو المئوية',
      desc: 'لوحة قياس فورية ترصد عدد الفيديوهات المؤكدة والاختبارات المنجزة ومتوسط درجاتك.',
    },
  ];

  return (
    <div className="flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center mt-4">
        
        {/* Glowing Badge & Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-3 mb-6"
        >
          <div 
            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}
            role="button"
            tabIndex={0}
            title="العودة لأول الصفحة"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/40 border-2 border-amber-400/80 p-0.5 bg-black ring-4 ring-amber-500/20 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            <img
              src={alphaLogo}
              alt="شعار منصة ALPHA"
              className="w-full h-full object-contain p-1 rounded-[22px]"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-black tracking-wide">
              المنصة التعليمية الأولى المتكاملة
            </span>
          </div>
        </motion.div>

        {/* Big Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4"
        >
          <span className="bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            ALPHA
          </span>{' '}
          <span className="text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
            منصة ألفا التعليمية
          </span>
        </motion.h1>

        <p className="text-lg sm:text-xl text-zinc-300 dark:text-zinc-300 light:text-zinc-700 max-w-3xl mx-auto font-medium leading-relaxed mb-8">
          تجربة تعليمية استثنائية مصممة بأعلى معايير الفخامة والذكاء، تدعم رحلتك العلمية بالفيديوهات التفاعلية، الاختبارات الدقيقة، مجلدات الأسئلة، والبثوث المباشرة.
        </p>

        {/* Call To Action Buttons - Clean gold and black, NO green message */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <AnimatedButton
            size="lg"
            variant="gold"
            onClick={() => {
              setAuthMode('login');
              setShowAuthModal(true);
            }}
            icon={<ArrowLeft className="w-5 h-5 ml-1" />}
          >
            تسجيل الدخول الآن
          </AnimatedButton>

          <AnimatedButton
            size="lg"
            variant="outline"
            onClick={() => {
              setAuthMode('register');
              setShowAuthModal(true);
            }}
          >
            إنشاء حساب طالب جديد
          </AnimatedButton>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-right mb-14">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-6 rounded-2xl border border-amber-500/25 bg-black/60 dark:bg-black/60 light:bg-white/90 shadow-xl backdrop-blur-sm hover:border-amber-500/60 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-amber-400 dark:text-amber-400 light:text-amber-700 mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed font-normal">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Slogan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-8 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/40 dark:from-black dark:to-zinc-950 light:from-amber-50 light:to-yellow-50 shadow-2xl shadow-amber-500/10 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-extrabold block mb-2">
              شعارنا الأسمى
            </span>
            <h2 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              أقسام الفا طريقك للمئوية
            </h2>
            <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-2 text-sm sm:text-base">
              كل درس، اختبار، ومجلد مصمم بدقة لتمكينك من حصد الدرجة الكاملة 100% بثقة وتميز.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-start sm:items-center justify-center py-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md max-h-[88vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl relative my-auto scrollbar-thin scrollbar-thumb-amber-500/40"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-5 left-5 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg shadow-amber-500/30 flex items-center justify-center mx-auto mb-3 bg-black">
                  <img
                    src={alphaLogo}
                    alt="شعار ALPHA"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
                  {authMode === 'login' ? 'تسجيل الدخول إلى ALPHA' : 'إنشاء حساب طالب جديد'}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1">
                  أقسام ألفا طريقك للمئوية
                </p>
              </div>

              {/* Tabs Switch */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 dark:bg-zinc-900 light:bg-zinc-100 border border-amber-500/20 mb-5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                  className={`py-2 font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  تسجيل دخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                  className={`py-2 font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                      اسم الطالب الكامل:
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-amber-500 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: أحمد محمد"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    البريد الإلكتروني:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-amber-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@alpha.edu"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    كلمة المرور:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                    />
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  variant="gold"
                  size="md"
                  disabled={loading}
                  className="w-full mt-2"
                >
                  {loading
                    ? 'جاري الدخول...'
                    : authMode === 'login'
                    ? 'دخول للمنصة'
                    : 'إنشاء الحساب وبدء التعلم'}
                </AnimatedButton>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
