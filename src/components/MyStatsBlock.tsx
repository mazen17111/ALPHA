import React, { useState } from 'react';
import { UserProfile, ExamSubmission } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  HelpCircle,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Star,
  Target,
  ChevronLeft,
} from 'lucide-react';

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
  // خانتين: 'videos' (خانة الفيديوهات) أو 'exams' (خانة الاختبارات)
  const [activeTab, setActiveTab] = useState<'videos' | 'exams'>('videos');

  const watchedCount = userProfile?.watchedVideoIds?.length || 0;
  const completedTests = userProfile?.completedTestsCount || 0;
  const averageScore = userProfile?.averageScore || 0;

  // Total points (reduced scale)
  const myPoints = userProfile?.points ?? (
    Math.round((userProfile?.totalScoreSum || 0) / 10) + (completedTests * 2)
  );

  // Percentage of videos watched
  const videosRatio = totalVideosCount > 0 ? Math.min(100, Math.round((watchedCount / totalVideosCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full min-h-[560px] rounded-3xl border-2 border-amber-500/40 bg-black/80 dark:bg-black/80 light:bg-white/95 p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between text-right"
    >
      {/* Decorative Glow Background */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header: إحصائياتي */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                إحصائياتي
              </h2>
              <p className="text-xs text-zinc-400">
                متابعة دقيقة لمسيرتك التعليمية نحو المئوية 100%
              </p>
            </div>
          </div>

          <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
            طالب ألفا
          </span>
        </div>

        {/* الخانتين: خانة فيديوهات وخانة اختبارات (Requirement: الطالب يختار واحد ويشوف احصائياته) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 mb-6">
          {/* خانة الفيديوهات */}
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>خانة الفيديوهات</span>
          </button>

          {/* خانة الاختبارات */}
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>خانة الاختبارات</span>
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'videos' ? (
            /* ========================================================================= */
            /* 1. خانة الفيديوهات                                                        */
            /* ========================================================================= */
            <motion.div
              key="videos-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Primary Video Stat Card */}
              <div className="p-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-zinc-950/80 to-black">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span>الفيديوهات المؤكدة المشاهدة</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md">
                    تأكيد المشاهدة
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400">
                    {watchedCount}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    من أصل {totalVideosCount} فيديو في المنصة
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-700"
                    style={{ width: `${videosRatio}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-1.5 font-bold">
                  <span>نسبة الإنجاز في الشروحات:</span>
                  <span className="text-amber-400">{videosRatio}%</span>
                </div>
              </div>

              {/* Video Insights grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/60">
                  <span className="text-[11px] text-zinc-400 block mb-1">
                    فيديوهات متبقية
                  </span>
                  <span className="text-xl font-black text-zinc-100">
                    {Math.max(0, totalVideosCount - watchedCount)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    شاهدها لترفع معدلك
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/60">
                  <span className="text-[11px] text-zinc-400 block mb-1">
                    حالة المتابعة
                  </span>
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {videosRatio >= 80 ? 'متقدم ممتاز' : videosRatio >= 40 ? 'مستمر بنشاط' : 'في بداية المسار'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    تأكيد المشاهدة نشط
                  </span>
                </div>
              </div>

              {/* Helpful Notice */}
              <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300/90 leading-relaxed">
                💡 <span className="font-bold">نصيحة المنصة:</span> عند مشاهدة أي شرح فيديو، اضغط على زر «تم تأكيد المشاهدة» أسفل الفيديو ليتم تسجيله تلقائياً في خانة إحصائياتك.
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* 2. خانة الاختبارات                                                        */
            /* ========================================================================= */
            <motion.div
              key="exams-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Primary Exam Stat Card */}
              <div className="p-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-zinc-950/80 to-black">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>المعدل العام ونقاط الاختبارات</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{myPoints.toLocaleString()} نقطة</span>
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400">
                    {averageScore}%
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    متوسط درجاتك في جميع الاختبارات
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${averageScore}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-1.5 font-bold">
                  <span>الهدف: المئوية 100%</span>
                  <span className="text-amber-400">{completedTests} اختبار محلول ومسلّم</span>
                </div>
              </div>

              {/* Exam Submissions Insights */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-300 block">
                  آخر الاختبارات التي قمت بحلها:
                </span>

                {recentSubmissions && recentSubmissions.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                    {recentSubmissions.slice(0, 4).map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-zinc-200 block truncate max-w-[180px]">
                            {sub.examTitle}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {sub.score} من {sub.totalQuestions} سؤال
                          </span>
                        </div>

                        <div className="text-left">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              sub.passed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {sub.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 text-center text-xs text-zinc-400">
                    لم تقم بحل اختبارات بعد. اختر أي اختبار من قسم الاختبارات لبدء تسجيل درجاتك ونقاطك!
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Motivational Footer */}
      <div className="mt-5 pt-3.5 border-t border-amber-500/15 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1.5 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span>كل اختبار تكمله يمنحك نقاطاً لرفع ترتيبك في الصدارة</span>
        </span>
        <span className="font-black text-amber-400 text-xs">
          {myPoints.toLocaleString()} نقطة
        </span>
      </div>
    </motion.div>
  );
};
