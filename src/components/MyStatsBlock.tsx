import React from 'react';
import { UserProfile, ExamSubmission } from '../types';
import { motion } from 'motion/react';
import { Video, CheckCircle2, TrendingUp, Target, Award, Sparkles, Clock } from 'lucide-react';

interface MyStatsBlockProps {
  userProfile: UserProfile | null;
  recentSubmissions: ExamSubmission[];
  totalVideosCount: number;
}

export const MyStatsBlock: React.FC<MyStatsBlockProps> = ({
  userProfile,
  recentSubmissions,
  totalVideosCount,
}) => {
  const watchedCount = userProfile?.watchedVideoIds?.length || 0;
  const completedTests = userProfile?.completedTestsCount || 0;
  const averageScore = userProfile?.averageScore || 0;

  // Percentage of videos watched
  const videosRatio = totalVideosCount > 0 ? Math.min(100, Math.round((watchedCount / totalVideosCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-3xl border-2 border-amber-500/40 bg-black/75 dark:bg-black/75 light:bg-white/95 p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-12"
    >
      {/* Golden glow decorative accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-5 mb-6 text-right">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              إحصائياتي
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
              طريقي للمئوية 100%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
            متابعة دقيقة ومستمرة لنشاطك، تقدمك، ومعدل إنجازك في منصة ALPHA
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span className="text-xs font-black text-amber-400">
            طالب ألفا المتميز
          </span>
        </div>
      </div>

      {/* Divided Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        
        {/* Metric 1: Watched Videos */}
        <div className="rounded-2xl p-5 border border-amber-500/30 bg-zinc-950/60 dark:bg-zinc-950/60 light:bg-zinc-50/80 text-right">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400">تأكيد المشاهدة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Video className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
              {watchedCount}
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              فيديو مؤكد
            </span>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-3">
            عدد الفيديوهات التي ضغطت على «تم تأكيد المشاهدة» عليها
          </p>

          <div className="w-full bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${videosRatio}%` }}
            />
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-500 light:text-zinc-600 mt-1 flex justify-between">
            <span>نسبة الإنجاز</span>
            <span className="font-bold text-amber-400">{videosRatio}%</span>
          </div>
        </div>

        {/* Metric 2: Solved and Submitted Tests */}
        <div className="rounded-2xl p-5 border border-amber-500/30 bg-zinc-950/60 dark:bg-zinc-950/60 light:bg-zinc-50/80 text-right">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400">الاختبارات المنجزة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
              {completedTests}
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              اختبار محلول ومسلّم
            </span>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-3">
            إجمالي الاختبارات التي قمت بحلها داخل المنصة وتسليمها
          </p>

          <div className="w-full bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-amber-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, completedTests * 10)}%` }}
            />
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-500 light:text-zinc-600 mt-1 flex justify-between">
            <span>الاستمرارية</span>
            <span className="font-bold text-amber-400">
              {completedTests > 0 ? 'نشط ومستمر' : 'ابدأ أول اختبار'}
            </span>
          </div>
        </div>

        {/* Metric 3: Average Score */}
        <div className="rounded-2xl p-5 border border-amber-500/30 bg-zinc-950/60 dark:bg-zinc-950/60 light:bg-zinc-50/80 text-right">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400">المعدل العام</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-400">
              {averageScore}%
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              متوسط درجاتك
            </span>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-3">
            متوسطك في كل اختبار قمت بحله داخل المنصة
          </p>

          <div className="w-full bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${averageScore}%` }}
            />
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-500 light:text-zinc-600 mt-1 flex justify-between">
            <span>الهدف: 100% المئوية</span>
            <span className="font-bold text-amber-400">متبقي {Math.max(0, 100 - averageScore)}%</span>
          </div>
        </div>
      </div>

      {/* Submissions Log (if student solved tests) */}
      {recentSubmissions && recentSubmissions.length > 0 && (
        <div className="mt-6 pt-5 border-t border-amber-500/20 text-right">
          <h4 className="text-sm font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>سجل آخر الاختبارات المسلّمة ونتائجك:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSubmissions.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl border border-amber-500/20 bg-black/40 dark:bg-black/40 light:bg-zinc-100 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                    {sub.examTitle}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {new Date(sub.completedAt).toLocaleDateString('ar-SA')}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                      sub.percentage >= 90
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : sub.percentage >= 70
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {sub.score}/{sub.totalQuestions} ({sub.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
