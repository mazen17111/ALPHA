import React, { useState, useEffect } from 'react';
import { UserProfile, Exam, Question, FriendChallenge, ChallengeParticipant } from '../types';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AnimatedButton } from './AnimatedButton';
import { motion, AnimatePresence } from 'motion/react';
import {
  Swords,
  Trophy,
  Users,
  Copy,
  Check,
  Shuffle,
  Play,
  ArrowRight,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Share2,
  Crown,
  RotateCcw,
} from 'lucide-react';

interface ChallengeSectionProps {
  currentUserProfile: UserProfile | null;
  allExams: Exam[];
  onBack: () => void;
  onUpdatePoints?: (addedPoints: number) => void;
}

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({
  currentUserProfile,
  allExams,
  onBack,
  onUpdatePoints,
}) => {
  // Navigation / Steps inside Challenge:
  // 'menu' | 'create' | 'join' | 'waiting' | 'in_game' | 'completed'
  const [viewState, setViewState] = useState<'menu' | 'create' | 'join' | 'waiting' | 'in_game' | 'completed'>('menu');

  // Create Challenge states
  const [customCode, setCustomCode] = useState('');
  const [examCount, setExamCount] = useState<number>(1);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Join Challenge states
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Active Challenge Session
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<FriendChallenge | null>(null);

  // In-Game local state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Helper to generate a random 5-character alphanumeric code
  const generateRandom5Code = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 5; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // When switching to create mode, generate a default 5-character code
  const handleOpenCreate = () => {
    setCustomCode(generateRandom5Code());
    setExamCount(1);
    setSelectedExamIds([]);
    setErrorMsg('');
    setViewState('create');
  };

  // Randomly pick exams based on examCount
  const handlePickRandomExams = () => {
    if (allExams.length === 0) return;
    const shuffled = [...allExams].sort(() => 0.5 - Math.random());
    const countToPick = Math.min(examCount, allExams.length);
    const picked = shuffled.slice(0, countToPick).map((e) => e.id);
    setSelectedExamIds(picked);
  };

  // Toggle single exam selection
  const handleToggleExam = (examId: string) => {
    if (selectedExamIds.includes(examId)) {
      setSelectedExamIds(selectedExamIds.filter((id) => id !== examId));
    } else {
      if (selectedExamIds.length >= examCount) {
        // Replace first
        setSelectedExamIds([...selectedExamIds.slice(1), examId]);
      } else {
        setSelectedExamIds([...selectedExamIds, examId]);
      }
    }
  };

  // Create Challenge in Firestore
  const handleCreateChallenge = async () => {
    if (!currentUserProfile) return;
    const cleanedCode = customCode.trim().toUpperCase();

    if (cleanedCode.length !== 5) {
      setErrorMsg('يجب أن يتكون الكود من 5 أرقام أو حروف بالضبط');
      return;
    }

    if (selectedExamIds.length === 0) {
      setErrorMsg('يرجى اختيار الاختبارات أو الضغط على «اختيار عشوائي»');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');

    try {
      // Gather questions from selected exams
      const chosenExams = allExams.filter((e) => selectedExamIds.includes(e.id));
      const aggregatedQuestions: (Question & { sourceExamTitle: string; questionIndex: number })[] = [];

      chosenExams.forEach((ex) => {
        (ex.questions || []).forEach((q, qIdx) => {
          aggregatedQuestions.push({
            ...q,
            sourceExamTitle: ex.title,
            questionIndex: qIdx + 1,
          });
        });
      });

      if (aggregatedQuestions.length === 0) {
        setErrorMsg('الاختبارات المختارة لا تحتوي على أسئلة');
        setIsCreating(false);
        return;
      }

      const challengeId = `chal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const hostState: ChallengeParticipant = {
        userId: currentUserProfile.id,
        name: currentUserProfile.name,
        score: 0,
        currentQuestionIndex: 0,
        answers: {},
        isFinished: false,
      };

      const newChallenge: FriendChallenge = {
        id: challengeId,
        code: cleanedCode,
        hostId: currentUserProfile.id,
        hostName: currentUserProfile.name,
        status: 'waiting',
        examCount: chosenExams.length,
        examTitles: chosenExams.map((e) => e.title),
        questions: aggregatedQuestions,
        hostState,
        participantId: null,
        participantName: null,
        participantState: null,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'challenges', challengeId), newChallenge);
      setActiveChallengeId(challengeId);
      setActiveChallenge(newChallenge);
      setViewState('waiting');
    } catch (err: any) {
      console.error('Error creating challenge:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء التحدي');
    } finally {
      setIsCreating(false);
    }
  };

  // Join an existing Challenge using 5-digit code
  const handleJoinChallenge = async () => {
    if (!currentUserProfile) return;
    const targetCode = joinCodeInput.trim().toUpperCase();

    if (targetCode.length !== 5) {
      setErrorMsg('يرجى كتابة كود التحدي المكون من 5 خانات');
      return;
    }

    setIsJoining(true);
    setErrorMsg('');

    try {
      const q = query(
        collection(db, 'challenges'),
        where('code', '==', targetCode),
        where('status', '==', 'waiting')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setErrorMsg('لم يتم العثور على تحدي نشط بهذا الكود، أو أن التحدي قد بدأ بالفعل');
        setIsJoining(false);
        return;
      }

      const challengeDoc = snapshot.docs[0];
      const challengeData = challengeDoc.data() as FriendChallenge;

      if (challengeData.hostId === currentUserProfile.id) {
        // You are the host returning to your own waiting room
        setActiveChallengeId(challengeDoc.id);
        setActiveChallenge(challengeData);
        setViewState('waiting');
        setIsJoining(false);
        return;
      }

      // Join as participant
      const participantState: ChallengeParticipant = {
        userId: currentUserProfile.id,
        name: currentUserProfile.name,
        score: 0,
        currentQuestionIndex: 0,
        answers: {},
        isFinished: false,
      };

      await updateDoc(doc(db, 'challenges', challengeDoc.id), {
        participantId: currentUserProfile.id,
        participantName: currentUserProfile.name,
        participantState,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });

      setActiveChallengeId(challengeDoc.id);
      setViewState('in_game');
    } catch (err: any) {
      console.error('Error joining challenge:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الانضمام للتحدي');
    } finally {
      setIsJoining(false);
    }
  };

  // Listen to the active challenge document in real-time
  useEffect(() => {
    if (!activeChallengeId) return;

    const unsub = onSnapshot(doc(db, 'challenges', activeChallengeId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FriendChallenge;
        setActiveChallenge(data);

        // When host is in 'waiting' and participant joins, transition to in_game
        if (viewState === 'waiting' && data.status === 'in_progress') {
          setViewState('in_game');
        }

        // When both players finish, transition to completed
        if (data.status === 'completed' && viewState !== 'completed') {
          setViewState('completed');
        }
      }
    });

    return () => unsub();
  }, [activeChallengeId, viewState]);

  // Handle answering a question during the live challenge
  const handleAnswerQuestion = async (qIdx: number, optIdx: number) => {
    if (!activeChallenge || !activeChallengeId || !currentUserProfile) return;
    if (selectedAnswers[qIdx] !== undefined) return; // already answered

    const question = activeChallenge.questions[qIdx];
    const isCorrect = optIdx === question.correctOptionIndex;

    const newAnswers = { ...selectedAnswers, [qIdx]: optIdx };
    setSelectedAnswers(newAnswers);

    const isHost = activeChallenge.hostId === currentUserProfile.id;
    const currentState = isHost
      ? { ...activeChallenge.hostState }
      : { ...(activeChallenge.participantState || ({} as ChallengeParticipant)) };

    const newScore = (currentState.score || 0) + (isCorrect ? 10 : 0);
    const isFinished = Object.keys(newAnswers).length === activeChallenge.questions.length;

    const updatedParticipantState: ChallengeParticipant = {
      userId: currentUserProfile.id,
      name: currentUserProfile.name,
      score: newScore,
      currentQuestionIndex: Math.min(qIdx + 1, activeChallenge.questions.length - 1),
      answers: newAnswers,
      isFinished,
      finishedAt: isFinished ? new Date().toISOString() : undefined,
    };

    const updatePayload: any = {};
    if (isHost) {
      updatePayload.hostState = updatedParticipantState;
    } else {
      updatePayload.participantState = updatedParticipantState;
    }

    // Check if the other player is also finished
    const otherPlayerFinished = isHost
      ? activeChallenge.participantState?.isFinished
      : activeChallenge.hostState.isFinished;

    if (isFinished && otherPlayerFinished) {
      updatePayload.status = 'completed';
      updatePayload.completedAt = new Date().toISOString();

      const hostFinalScore = isHost ? newScore : activeChallenge.hostState.score;
      const participantFinalScore = isHost
        ? activeChallenge.participantState?.score || 0
        : newScore;

      if (hostFinalScore > participantFinalScore) {
        updatePayload.winnerId = activeChallenge.hostId;
        updatePayload.winnerName = activeChallenge.hostName;
      } else if (participantFinalScore > hostFinalScore) {
        updatePayload.winnerId = activeChallenge.participantId;
        updatePayload.winnerName = activeChallenge.participantName;
      } else {
        updatePayload.winnerId = 'tie';
        updatePayload.winnerName = 'تعادل بطولي بين الصديقين!';
      }

      // Per user instruction: Friend challenges are purely friendly contests and do NOT award leaderboard points
      // (ولا يأخذ نقاط ضد صديقه لمنع التلاعب وتوحيد النقاط للاختبارات فقط)
    }

    try {
      await updateDoc(doc(db, 'challenges', activeChallengeId), updatePayload);
    } catch (err) {
      console.error('Error syncing challenge state:', err);
    }
  };

  const handleCopyCode = () => {
    if (!activeChallenge) return;
    navigator.clipboard.writeText(activeChallenge.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // -------------------------------------------------------------
  // RENDER: Menu (انشاء تحدي او انضمام لتحدي)
  // -------------------------------------------------------------
  if (viewState === 'menu') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-right pb-14">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Swords className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
                منافسة وتحدي الأصدقاء
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                تنافس مباشرة وبشكل حي مع صديقك على أسئلة المنصة (مبارزة تدريبية ودية ومباشرة بدون نقاط للوحة المتصدرين)
              </p>
            </div>
          </div>

          <AnimatedButton variant="outline" size="sm" onClick={onBack} icon={<ArrowRight className="w-4 h-4 ml-1" />}>
            العودة للرئيسية
          </AnimatedButton>
        </div>

        {/* 2 Big Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Card 1: انشاء تحدي */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            className="p-8 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-black/80 to-black/90 shadow-2xl flex flex-col justify-between text-right relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/20">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-amber-300 mb-2">
                إنشاء تحدي جديد
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                أنشئ كود غرفة خاص من 5 خانات، وحدد عدد الاختبارات أو اختر عشوائياً، ثم أرسل الكود لصديقك لبدء المبارزة!
              </p>
            </div>

            <AnimatedButton
              variant="gold"
              size="lg"
              onClick={handleOpenCreate}
              icon={<Play className="w-5 h-5 ml-1 fill-current" />}
              className="w-full text-base font-black py-4 shadow-xl"
            >
              إنشاء تحدي الآن
            </AnimatedButton>
          </motion.div>

          {/* Card 2: انضمام لتحدي */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            className="p-8 rounded-3xl border-2 border-zinc-800 hover:border-amber-500/40 bg-zinc-950/70 shadow-2xl flex flex-col justify-between text-right relative overflow-hidden"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-6 shadow-lg">
                <Users className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-zinc-100 mb-2">
                انضمام لتحدي
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                هل أرسل لك صديقك كود التحدي؟ اكتب الكود المكون من 5 خانات هنا للدخول فوراً في المنافسة الحية!
              </p>
            </div>

            <AnimatedButton
              variant="outline"
              size="lg"
              onClick={() => {
                setJoinCodeInput('');
                setErrorMsg('');
                setViewState('join');
              }}
              icon={<Users className="w-5 h-5 ml-1" />}
              className="w-full text-base font-black py-4 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            >
              انضمام للتحدي بكود
            </AnimatedButton>
          </motion.div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Create View (كود 5 خانات + عدد الاختبارات + عشوائي)
  // -------------------------------------------------------------
  if (viewState === 'create') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-right pb-14">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-amber-400">إعداد التحدي الجديد</h2>
          </div>
          <button
            onClick={() => setViewState('menu')}
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            إلغاء والعودة
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: 5-Character Code */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-black/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-amber-300">
                1. كود التحدي (مكون من 5 أرقام أو حروف ترسلها لصديقك):
              </label>
              <button
                type="button"
                onClick={() => setCustomCode(generateRandom5Code())}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>توليد كود آخر</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                maxLength={5}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="مثال: AL79K"
                className="w-full text-center text-3xl font-black tracking-widest px-4 py-3 rounded-xl border-2 border-amber-400/60 bg-black text-amber-300 uppercase focus:outline-none focus:border-amber-300"
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              يمكنك كتابة 5 أرقام أو حروف خاصة بك، أو ترك الكود المولد تلقائياً
            </p>
          </div>

          {/* Step 2: Number of Exams */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-black/60 space-y-3">
            <label className="block text-sm font-bold text-amber-300">
              2. عدد الاختبارات التي تريدون التحدي عليها:
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setExamCount(num);
                    if (selectedExamIds.length > num) {
                      setSelectedExamIds(selectedExamIds.slice(0, num));
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl border font-black text-sm transition-all cursor-pointer ${
                    examCount === num
                      ? 'border-amber-400 bg-amber-500/25 text-amber-300 ring-2 ring-amber-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-amber-500/40'
                  }`}
                >
                  {num} {num === 1 ? 'اختبار' : 'اختبارات'}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Exam Selection or Random */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-black/60 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-amber-300">
                  3. اختيار الاختبارات:
                </label>
                <p className="text-xs text-zinc-400">
                  حدد {examCount} اختبار يدوياً أو اضغط «اختيار عشوائي»
                </p>
              </div>

              {/* Requirement: او يضغطو عشوائي يأتي لهم اختبارات بالعدد الي اختاروه */}
              <AnimatedButton
                type="button"
                variant="gold"
                size="sm"
                onClick={handlePickRandomExams}
                icon={<Shuffle className="w-4 h-4 ml-1" />}
              >
                اختيار عشوائي ({examCount} اختبار)
              </AnimatedButton>
            </div>

            {/* List of existing exams */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {allExams.map((ex) => {
                const isSelected = selectedExamIds.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    onClick={() => handleToggleExam(ex.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-black'
                            : 'border-zinc-700 bg-black'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold block">{ex.title}</span>
                        <span className="text-[11px] text-zinc-400">
                          {ex.questions?.length || 0} أسئلة • {ex.durationMinutes} دقيقة
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/20">
                        محدد ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-zinc-400">
              تم تحديد ({selectedExamIds.length} من {examCount})
            </div>
          </div>

          {/* Action: Start / Create */}
          <div className="flex gap-4 pt-2">
            <AnimatedButton
              variant="gold"
              size="lg"
              disabled={isCreating}
              onClick={handleCreateChallenge}
              icon={<Play className="w-5 h-5 ml-1 fill-current" />}
              className="flex-1 py-4 text-base font-black shadow-xl"
            >
              {isCreating ? 'جاري إنشاء الغرفة...' : 'بدء التحدي وإنشاء الغرفة'}
            </AnimatedButton>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Join View (ادخال كود 5 خانات)
  // -------------------------------------------------------------
  if (viewState === 'join') {
    return (
      <div className="max-w-md mx-auto space-y-6 text-right pb-14">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-black text-amber-400">الانضمام لتحدي</h2>
          </div>
          <button
            onClick={() => setViewState('menu')}
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            إلغاء والعودة
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="p-6 rounded-3xl border-2 border-amber-500/30 bg-black/80 space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
            <Swords className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100">اكتب كود التحدي المكون من 5 خانات</h3>
            <p className="text-xs text-zinc-400 mt-1">
              الكود الذي أنشأه صديقك وأرسله إليك
            </p>
          </div>

          <input
            type="text"
            maxLength={5}
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 5))}
            placeholder="مثال: AL79K"
            className="w-full text-center text-3xl font-black tracking-widest px-4 py-3.5 rounded-2xl border-2 border-amber-400 bg-black text-amber-300 uppercase focus:outline-none focus:ring-4 focus:ring-amber-500/20"
          />

          <AnimatedButton
            variant="gold"
            size="lg"
            disabled={isJoining || joinCodeInput.trim().length !== 5}
            onClick={handleJoinChallenge}
            icon={<Play className="w-5 h-5 ml-1 fill-current" />}
            className="w-full py-4 text-base font-black shadow-xl"
          >
            {isJoining ? 'جاري التحقق والدخول...' : 'دخول التحدي الآن'}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Waiting Room (Host is waiting for friend to join)
  // -------------------------------------------------------------
  if (viewState === 'waiting' && activeChallenge) {
    return (
      <div className="max-w-xl mx-auto space-y-6 text-center pb-14">
        <div className="p-8 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-black to-black shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mx-auto mb-4 animate-bounce">
            <Clock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-amber-300 mb-2">
            الغرفة جاهزة، بانتظار انضمام صديقك!
          </h2>
          <p className="text-sm text-zinc-300 mb-6">
            أرسل هذا الكود المكون من 5 خانات لصديقك ليدخل به في خانة «انضمام لتحدي»
          </p>

          {/* Huge 5-character Code Display */}
          <div className="p-4 rounded-2xl bg-black border-2 border-amber-400 inline-flex items-center gap-4 mb-6 shadow-xl">
            <span className="text-4xl font-black tracking-widest text-amber-400">
              {activeChallenge.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-amber-500 text-black font-black text-xs flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer transition-all"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الكود</span>
                </>
              )}
            </button>
          </div>

          {/* Selected Exams summary */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-right text-xs text-zinc-300 space-y-1 mb-6">
            <span className="font-bold text-amber-400 block mb-1">تفاصيل التحدي:</span>
            <div>• عدد الاختبارات: {activeChallenge.examCount}</div>
            <div>• مجموع الأسئلة: {activeChallenge.questions.length} سؤال</div>
            <div>• الاختبارات: {activeChallenge.examTitles.join('، ')}</div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-amber-400 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>بمجرد أن يكتب صديقك الكود، ستبدأ المنافسة فورياً على شاشتكما معاً</span>
          </div>
        </div>

        <button
          onClick={() => {
            setViewState('menu');
            setActiveChallengeId(null);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
        >
          إلغاء التحدي والعودة
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: In-Game Arena (Live Head-to-Head match)
  // -------------------------------------------------------------
  if (viewState === 'in_game' && activeChallenge) {
    const isHost = activeChallenge.hostId === currentUserProfile?.id;
    const myState = isHost ? activeChallenge.hostState : activeChallenge.participantState;
    const opponentState = isHost ? activeChallenge.participantState : activeChallenge.hostState;

    const myScore = myState?.score || 0;
    const opponentScore = opponentState?.score || 0;
    const opponentName = isHost
      ? activeChallenge.participantName || 'الصديق'
      : activeChallenge.hostName;

    const currentQ = activeChallenge.questions[currentQIndex];
    const totalQ = activeChallenge.questions.length;
    const hasAnsweredCurrent = selectedAnswers[currentQIndex] !== undefined;

    return (
      <div className="max-w-4xl mx-auto space-y-6 text-right pb-14">
        {/* Head-to-Head Live Scoreboard Header */}
        <div className="p-4 sm:p-6 rounded-3xl border-2 border-amber-500/50 bg-black/85 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 (You) */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 font-black text-lg">
                {currentUserProfile?.name.charAt(0) || 'أ'}
              </div>
              <div className="text-right">
                <span className="text-xs text-amber-400 font-bold block">أنت ({currentUserProfile?.name})</span>
                <span className="text-2xl font-black text-white">{myScore} نقطة</span>
              </div>
            </div>

            {/* VS Badge */}
            <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-sm flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              <span>ضد</span>
            </div>

            {/* Player 2 (Opponent) */}
            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="text-xs text-zinc-400 font-bold block">صديقك ({opponentName})</span>
                <span className="text-2xl font-black text-white">{opponentScore} نقطة</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-300 font-black text-lg">
                {opponentName.charAt(0) || 'ص'}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center justify-between text-xs text-zinc-400">
            <span>
              السؤال {currentQIndex + 1} من {totalQ}
            </span>
            <span className="text-amber-400 font-bold">
              {currentQ?.sourceExamTitle}
            </span>
          </div>
        </div>

        {/* Current Question Card */}
        {currentQ && (
          <motion.div
            key={currentQIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 sm:p-8 rounded-3xl border-2 border-amber-500/40 bg-black/80 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                السؤال رقم ({currentQIndex + 1})
              </span>
              <span className="text-xs text-zinc-400">
                كود التحدي: {activeChallenge.code}
              </span>
            </div>

            {/* Question Image if present */}
            {currentQ.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-amber-500/30 bg-black max-w-xl mx-auto">
                <img
                  src={currentQ.imageUrl}
                  alt="صورة السؤال"
                  onClick={() => setZoomedImage(currentQ.imageUrl || null)}
                  className="w-full h-auto max-h-72 object-contain cursor-zoom-in"
                />
              </div>
            )}

            {/* Question Text */}
            {currentQ.text && currentQ.text.trim() && (
              <h3 className="text-lg sm:text-xl font-black text-zinc-100 leading-relaxed">
                {currentQ.text}
              </h3>
            )}

            {/* 4 Choices */}
            <div className="space-y-3">
              {(currentQ.options || ['أ', 'ب', 'ج', 'د']).map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQIndex] === optIdx;
                const isCorrect = currentQ.correctOptionIndex === optIdx;
                const arabicLetters = ['أ', 'ب', 'ج', 'د'];
                const letter = arabicLetters[optIdx] || String.fromCharCode(65 + optIdx);

                let btnClass = 'border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:border-amber-400';
                if (hasAnsweredCurrent) {
                  if (isSelected && isCorrect) {
                    btnClass = 'border-emerald-500 bg-emerald-500/20 text-white ring-2 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    btnClass = 'border-red-500 bg-red-500/20 text-white ring-2 ring-red-500';
                  } else if (isCorrect) {
                    btnClass = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={hasAnsweredCurrent}
                    onClick={() => handleAnswerQuestion(currentQIndex, optIdx)}
                    className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                        {letter}
                      </span>
                      <span className="text-sm sm:text-base font-bold">{opt}</span>
                    </div>

                    {hasAnsweredCurrent && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                    {hasAnsweredCurrent && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-amber-500/20">
              <button
                type="button"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                السابق
              </button>

              <button
                type="button"
                disabled={currentQIndex >= totalQ - 1}
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 disabled:opacity-30 cursor-pointer transition-all"
              >
                التالي
              </button>
            </div>
          </motion.div>
        )}

        {/* Zoomed Image modal */}
        <AnimatePresence>
          {zoomedImage && (
            <div
              onClick={() => setZoomedImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
            >
              <img src={zoomedImage} alt="تكبير" className="max-w-4xl max-h-[90vh] object-contain rounded-2xl" />
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Completed Screen (Winner declaration)
  // -------------------------------------------------------------
  if (viewState === 'completed' && activeChallenge) {
    const isHost = activeChallenge.hostId === currentUserProfile?.id;
    const isWinner = activeChallenge.winnerId === currentUserProfile?.id;
    const isTie = activeChallenge.winnerId === 'tie';

    return (
      <div className="max-w-xl mx-auto space-y-6 text-center pb-14">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 rounded-3xl border-2 border-amber-500/50 bg-black/90 shadow-2xl relative overflow-hidden"
        >
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mx-auto mb-4 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-black text-amber-300 mb-2">
            {isTie ? 'تعادل رائع ومبهر!' : isWinner ? '🎉 ألف مبروك! أنت الفائز بالتحدي!' : 'مبارزة قوية! حظاً أوفر في التحدي القادم'}
          </h2>

          <p className="text-sm text-zinc-300 mb-6">
            {isWinner
              ? 'حققت أعلى نتيجة وتفوقت في المبارزة الودية ضد صديقك!'
              : 'تنافس رائع يرفع من مستواك وخبرتك في حل المسائل'}
          </p>

          {/* Scores summary */}
          <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-950 border border-amber-500/30 mb-6">
            <div>
              <span className="text-xs text-zinc-400 block mb-1">
                {activeChallenge.hostName} {isHost && '(أنت)'}
              </span>
              <span className="text-2xl font-black text-amber-400">
                {activeChallenge.hostState.score} نقطة
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block mb-1">
                {activeChallenge.participantName} {!isHost && '(أنت)'}
              </span>
              <span className="text-2xl font-black text-amber-400">
                {activeChallenge.participantState?.score || 0} نقطة
              </span>
            </div>
          </div>

          <AnimatedButton
            variant="gold"
            size="lg"
            onClick={() => {
              setViewState('menu');
              setActiveChallengeId(null);
            }}
            icon={<RotateCcw className="w-5 h-5 ml-1" />}
            className="w-full py-4 text-base font-black shadow-xl"
          >
            العودة لقائمة التحديات
          </AnimatedButton>
        </motion.div>
      </div>
    );
  }

  return null;
};
