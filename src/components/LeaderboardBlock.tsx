import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardUser, UserProfile } from '../types';
import { Trophy, Medal, Crown, Flame, Sparkles, User, Award, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardBlockProps {
  currentUserProfile: UserProfile | null;
}

export const LeaderboardBlock: React.FC<LeaderboardBlockProps> = ({ currentUserProfile }) => {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [myRankNumber, setMyRankNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for users to build live leaderboard
    const usersCol = collection(db, 'users');
    const q = query(usersCol, limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersList: LeaderboardUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const completedTests = data.completedTestsCount || 0;
          const avgScore = data.averageScore || 0;
          const totalScoreSum = data.totalScoreSum || 0;

          // Points calculation: explicit points if present, or computed from tests and scores (reduced scale)
          let points = data.points;
          if (points === undefined || points === null) {
            points = Math.round(totalScoreSum / 10) + completedTests * 2;
          }

          usersList.push({
            id: docSnap.id,
            name: data.name || 'طالب متميز',
            email: data.email || '',
            points: points,
            completedTestsCount: completedTests,
            averageScore: avgScore,
          });
        });

        // Sort descending by points
        usersList.sort((a, b) => b.points - a.points);

        // Assign ranks to everyone
        const ranked = usersList.map((u, idx) => ({
          ...u,
          rank: idx + 1,
        }));

        setTotalStudentsCount(ranked.length);
        setTopUsers(ranked.slice(0, 15)); // First 15 students

        // Find current user's rank across all students
        if (currentUserProfile?.id) {
          const foundIndex = ranked.findIndex((u) => u.id === currentUserProfile.id);
          if (foundIndex !== -1) {
            setMyRankNumber(foundIndex + 1);
          } else {
            // If current user is not in the snapshot yet, calculate their theoretical rank
            const myCurrentPoints = currentUserProfile.points ?? (
              Math.round((currentUserProfile.totalScoreSum || 0) / 10) + ((currentUserProfile.completedTestsCount || 0) * 2)
            );
            const higherCount = ranked.filter((u) => u.points > myCurrentPoints).length;
            setMyRankNumber(higherCount + 1);
          }
        }

        setLoading(false);
      },
      (error) => {
        console.warn('Leaderboard snapshot notice:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserProfile]);

  const myPoints = currentUserProfile?.points ?? (
    Math.round((currentUserProfile?.totalScoreSum || 0) / 10) + ((currentUserProfile?.completedTestsCount || 0) * 2)
  );

  const isInTop15 = myRankNumber !== null && myRankNumber <= 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full min-h-[560px] rounded-3xl border-2 border-amber-500/40 bg-black/80 dark:bg-black/80 light:bg-white/95 p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between text-right"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header: لوحة المتصدرين */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                لوحة المتصدرين (أول 15 طالباً)
              </h2>
              <p className="text-xs text-zinc-400">
                ترتيب الطلاب وعدد نقاطهم المكتسبة بعد كل اختبار على حسب درجاتهم
              </p>
            </div>
          </div>

          <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>تحديث فوري</span>
          </span>
        </div>

        {/* Top 15 Scrollable List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar mb-4">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>جاري تحميل لوحة المتصدرين المباشرة...</span>
            </div>
          ) : topUsers.length === 0 ? (
            <div className="py-10 text-center text-zinc-400 text-sm">
              لا توجد بيانات كافية حالياً. ابدأ أول اختبار لتتصدر اللوحة!
            </div>
          ) : (
            topUsers.map((student, idx) => {
              const isCurrentUser = student.id === currentUserProfile?.id;
              const rank = idx + 1;

              // Distinct styling for top 3
              let rankBadge = (
                <span className="w-7 h-7 rounded-xl bg-zinc-800/80 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {rank}
                </span>
              );

              let cardBorder = isCurrentUser
                ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/15 ring-2 ring-amber-400'
                : 'border-zinc-800 bg-zinc-950/60 hover:border-amber-500/30';

              if (rank === 1) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/40 shrink-0">
                    <Crown className="w-4 h-4 fill-black" />
                  </span>
                );
                cardBorder = isCurrentUser
                  ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400'
                  : 'border-amber-500/50 bg-amber-500/10 hover:border-amber-400';
              } else if (rank === 2) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-300 to-zinc-100 text-black font-black text-xs flex items-center justify-center shadow-md shrink-0">
                    <Medal className="w-4 h-4 fill-black" />
                  </span>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                    <Medal className="w-4 h-4 fill-white" />
                  </span>
                );
              }

              return (
                <div
                  key={student.id || idx}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-right ${cardBorder}`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {rankBadge}

                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                      {student.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900 truncate max-w-[140px] sm:max-w-[200px]">
                          {student.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-black shrink-0">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {student.completedTestsCount} اختبار مكتمل • معدل {student.averageScore}%
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-sm sm:text-base font-black text-amber-400">
                        {student.points.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">نقطة</span>
                    </div>
                    <span className="text-[10px] text-amber-400/80 block">
                      {rank === 1 ? '🌟 المركز الأول' : rank <= 3 ? '🏆 المراكز الأولى' : `المركز #${rank}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT: تحت المركز الخامس عشر كلمة «ترتيبك هو» ويكون مكتوب ترتيب الطالب سواء في 15 طالب او خارجهم */}
      {/* ========================================================================= */}
      <div className="mt-3 pt-3 border-t-2 border-amber-500/30">
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
            isInTop15
              ? 'border-amber-400 bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/10 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
              : 'border-amber-500/40 bg-zinc-950/90 shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-400 shrink-0">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-amber-300">
                  ترتيبك هو:
                </span>
                <span className="text-base sm:text-lg font-black text-white bg-amber-500/30 border border-amber-400 px-2.5 py-0.5 rounded-lg shadow-sm">
                  المركز #{myRankNumber !== null ? myRankNumber : '—'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-300 mt-0.5">
                {isInTop15
                  ? '🌟 أنت ضمن قائمة الـ 15 طالباً الأوائل في المنصة! استمر في التألق!'
                  : `أنت في المركز #${myRankNumber || '—'} من إجمالي ${totalStudentsCount || 1} طالباً — حل المزيد من الاختبارات لدخول قائمة الـ 15!`}
              </p>
            </div>
          </div>

          <div className="text-left shrink-0">
            <span className="text-xs text-zinc-400 block mb-0.5">رصيد نقاطك:</span>
            <span className="text-sm sm:text-base font-black text-amber-400">
              {myPoints.toLocaleString()} نقطة
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
