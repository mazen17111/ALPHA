import React, { useState } from 'react';
import { Exam, Question, StudentFolder } from '../types';
import { useAuth, calculateExamPointsEarned } from '../context/AuthContext';
import { AnimatedButton } from './AnimatedButton';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Percent,
  BookmarkPlus,
  FolderPlus,
  Check,
  Lock,
  PenTool,
  Layers,
  AlertTriangle,
  Star,
  Play,
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamWhiteboard } from './ExamWhiteboard';

interface ExamsSectionProps {
  exams: Exam[];
  studentFolders: StudentFolder[];
  activeExamToTake?: Exam | null;
  onClearActiveExam?: () => void;
  onBack: () => void;
}

export const ExamsSection: React.FC<ExamsSectionProps> = ({
  exams,
  studentFolders,
  activeExamToTake,
  onClearActiveExam,
  onBack,
}) => {
  const { recordExamSubmission, currentUser } = useAuth();
  const [currentExam, setCurrentExam] = useState<Exam | null>(activeExamToTake || null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  // Requirement: "قبل ان يبدا الشخص الاختبار يظهر له ملحوظة اذا جاب فوق 50 فالمية فسيتم اخذ نقاط على حسب درجته واذا جاب اقل من 50 فالمية يخصم منه تلقائيا 20 نقطة"
  const [examToPrompt, setExamToPrompt] = useState<Exam | null>(null);

  // Requirement: "ميزة الاختبار المجمع تكون موجودة داخل خانة الاختبارات الطالب لما يضغط عليها يقدر يختار اقسام يختبر عليهم مع بعض حتى لو هيختبر على كل الاختبارات الموجودة عالمنصة"
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [selectedCombinedExamIds, setSelectedCombinedExamIds] = useState<string[]>([]);

  // Mistakes auto-transferred notification state
  const [transferredMistakesNotice, setTransferredMistakesNotice] = useState('');

  // Folder save modal state
  const [saveModalQuestion, setSaveModalQuestion] = useState<Question | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(true);

  React.useEffect(() => {
    if (activeExamToTake) {
      handleRequestStartExam(activeExamToTake);
    }
  }, [activeExamToTake]);

  // Prompt the user before starting exam
  const handleRequestStartExam = (exam: Exam) => {
    if (exam.externalExamUrl || exam.examType === 'external') {
      window.open(exam.externalExamUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Show pre-test notice modal
    setExamToPrompt(exam);
  };

  // Actually start the exam after student confirms the points notice
  const handleActuallyStartExam = (exam: Exam) => {
    setCurrentExam(exam);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setExamResult(null);
    setTransferredMistakesNotice('');
    setExamToPrompt(null);
    if (onClearActiveExam) onClearActiveExam();
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSubmitExam = async () => {
    if (!currentExam) return;

    let score = 0;
    const wrongQuestions: Question[] = [];

    currentExam.questions.forEach((q, idx) => {
      const studentAns = selectedAnswers[idx];
      if (studentAns === q.correctOptionIndex) {
        score++;
      } else {
        wrongQuestions.push({
          id: `mistake_${Date.now()}_${idx}`,
          text: q.text || `سؤال في ${currentExam.title}`,
          imageUrl: q.imageUrl || '',
          options: q.options || [],
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation || '',
          notes: `سؤال أخطأت به في (${currentExam.title}) • إجابتك: ${q.options?.[studentAns] || 'لم تجب'} | الإجابة الصحيحة: ${q.options?.[q.correctOptionIndex] || ''}`,
        });
      }
    });

    const total = currentExam.questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passThreshold = currentExam.passingPercentage || 60;
    const passed = percentage >= passThreshold;

    setExamResult({ score, total, percentage, passed });
    setIsSubmitted(true);

    // 1. Record Submission in student history
    await recordExamSubmission(
      currentExam.id,
      currentExam.title,
      score,
      total,
      passed
    );

    // 2. AUTOMATIC TRANSFER OF MISTAKES:
    // If the student made any mistakes, automatically transfer them to "مجلد الأخطاء"
    if (wrongQuestions.length > 0 && currentUser) {
      try {
        const mistakesFolder = studentFolders.find(
          (f) => f.name === 'مجلد الأخطاء' || f.isPermanentMistakesFolder
        );

        if (mistakesFolder) {
          const existing = mistakesFolder.questions || [];
          // Avoid duplicate question text / image if student already made this exact mistake previously
          const newMistakes = wrongQuestions.filter(
            (wq) =>
              !existing.some(
                (eq) =>
                  (eq.text && wq.text && eq.text.trim() === wq.text.trim()) ||
                  (eq.imageUrl && wq.imageUrl && eq.imageUrl === wq.imageUrl)
              )
          );

          if (newMistakes.length > 0) {
            await updateDoc(doc(db, 'student_folders', mistakesFolder.id), {
              questions: [...existing, ...newMistakes],
            });
            setTransferredMistakesNotice(
              `تم تحويل (${newMistakes.length}) أسئلة أخطأت بها تلقائياً إلى «مجلد الأخطاء» لمراجعتها وإتقانها! ✓`
            );
          } else {
            setTransferredMistakesNotice(
              `جميع أخطاء هذا الاختبار مسجلة مسبقاً في «مجلد الأخطاء» وجاهزة للمراجعة! ✓`
            );
          }
        } else {
          // If mistakes folder wasn't ready yet, create it on the spot with these questions
          await addDoc(collection(db, 'student_folders'), {
            userId: currentUser.uid,
            name: 'مجلد الأخطاء',
            description: 'المجلد الدائم لحفظ الأسئلة التي أخطأت بها تلقائياً لمراجعتها والوصول للمئوية 100%',
            isPermanentMistakesFolder: true,
            questions: wrongQuestions,
            createdAt: new Date().toISOString(),
          });
          setTransferredMistakesNotice(
            `تم حفظ (${wrongQuestions.length}) أسئلة أخطأت بها تلقائياً في «مجلد الأخطاء» لمراجعتها وإتقانها! ✓`
          );
        }
      } catch (err) {
        console.error('Failed to auto-transfer mistakes to folder:', err);
      }
    } else {
      setTransferredMistakesNotice('');
    }
  };

  const handleReset = () => {
    setCurrentExam(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setExamResult(null);
    setTransferredMistakesNotice('');
    if (onClearActiveExam) onClearActiveExam();
  };

  // Save question to selected folder
  const handleSaveToFolder = async (folder: StudentFolder) => {
    if (!saveModalQuestion) return;

    try {
      const qToAdd: Question = {
        ...saveModalQuestion,
        id: `q_saved_${Date.now()}`,
      };

      const updated = [...(folder.questions || []), qToAdd];
      await updateDoc(doc(db, 'student_folders', folder.id), {
        questions: updated,
      });

      setSaveSuccessNotice(`تمت إضافة السؤال بنجاح إلى مجلد (${folder.name}) ✓`);
      setTimeout(() => {
        setSaveSuccessNotice('');
        setSaveModalQuestion(null);
      }, 1500);
    } catch (e) {
      console.error('Error saving question to folder:', e);
    }
  };

  // If currently taking an exam
  if (currentExam) {
    const q = currentExam.questions[currentQuestionIndex];
    const totalQ = currentExam.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const passingRequired = currentExam.passingPercentage || 60;

    return (
      <div className="max-w-7xl mx-auto space-y-6 text-right pb-24">
        {/* Exam Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
                {currentExam.title}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                نسبة النجاح: {passingRequired}%
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              السؤال {currentQuestionIndex + 1} من {totalQ} • تم حل ({answeredCount}/{totalQ})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Whiteboard Toggle (قفل / فتح السبورة) */}
            <button
              type="button"
              onClick={() => setIsWhiteboardOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isWhiteboardOpen
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-amber-400 hover:text-white'
              }`}
            >
              {isWhiteboardOpen ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>قفل السبورة</span>
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5 text-amber-400" />
                  <span>فتح السبورة (مسودة الحل)</span>
                </>
              )}
            </button>

            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={handleReset}
              icon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              إنهاء والخروج
            </AnimatedButton>
          </div>
        </div>

        {/* Results Screen if submitted */}
        {isSubmitted && examResult ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl border-2 border-amber-500/40 bg-black/85 dark:bg-black/85 light:bg-white text-center shadow-2xl relative overflow-hidden"
          >
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 shadow-xl ${
                examResult.passed
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/40 text-red-400 shadow-red-500/20'
              }`}
            >
              <Award className="w-10 h-10" />
            </div>

            <div className="mb-2">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-black border ${
                  examResult.passed
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {examResult.passed
                  ? 'تم اجتياز الاختبار بنجاح ✓'
                  : `لم يتم اجتياز الاختبار (حد النجاح ${passingRequired}%)`}
              </span>
            </div>

            <h3 className="text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600 mb-2">
              {examResult.passed ? 'مبارك! إنجاز متميز نحو المئوية' : 'حاول مجدداً للوصول للمئوية'}
            </h3>

            <div className="inline-flex items-center gap-6 p-6 rounded-2xl bg-zinc-950/70 dark:bg-zinc-950/70 light:bg-zinc-100 border border-amber-500/30 mb-8">
              <div>
                <div className="text-4xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                  {examResult.score} / {examResult.total}
                </div>
                <div className="text-xs text-zinc-400 mt-1">الأسئلة الصحيحة</div>
              </div>
              <div className="h-10 w-px bg-amber-500/30" />
              <div>
                <div className="text-4xl font-black text-amber-400">
                  {examResult.percentage}%
                </div>
                <div className="text-xs text-zinc-400 mt-1">النسبة المئوية</div>
              </div>
            </div>

            {/* Points Awarded or Deducted Banner */}
            {(() => {
              const delta = calculateExamPointsEarned(examResult.percentage);
              return (
                <div className="mb-6 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 shadow-lg max-w-lg mx-auto text-sm font-black">
                  {delta > 0 ? (
                    <div className="text-emerald-300 bg-emerald-500/15 border-emerald-500/30 border p-3.5 rounded-2xl w-full flex items-center justify-center gap-2">
                      <Star className="w-5 h-5 fill-emerald-400 text-emerald-400 shrink-0" />
                      <span>+{delta} نقطة تمت إضافتها إلى رصيدك في لوحة المتصدرين! 🌟</span>
                    </div>
                  ) : (
                    <div className="text-red-300 bg-red-500/15 border-red-500/30 border p-3.5 rounded-2xl w-full flex items-center justify-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      <span>تم خصم 20 نقطة من رصيدك لأن نتيجتك أقل من 50%! ⚠️</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Automatic Mistakes Transferred Notification Banner */}
            {transferredMistakesNotice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xl"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{transferredMistakesNotice}</span>
                </div>
              </motion.div>
            )}

            {/* Questions Review list with Folder Bookmark */}
            <div className="space-y-5 text-right mt-6 border-t border-amber-500/20 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-black text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                  مراجعة إجاباتك بالتفصيل:
                </h4>
                <span className="text-xs text-amber-400">
                  يمكنك حفظ أي سؤال في مجلداتك الخاصة للمراجعة لاحقاً
                </span>
              </div>

              {currentExam.questions.map((question, qIdx) => {
                const studentAns = selectedAnswers[qIdx];
                const isCorrect = studentAns === question.correctOptionIndex;

                return (
                  <div
                    key={question.id || qIdx}
                    className={`p-5 rounded-2xl border text-right transition-all ${
                      isCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-red-500/40 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-amber-500">
                        السؤال {qIdx + 1}
                      </span>
                      
                      <div className="flex items-center gap-3">
                        {/* Bookmark into student folder! */}
                        <button
                          type="button"
                          onClick={() => setSaveModalQuestion(question)}
                          className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>حفظ في مجلداتي</span>
                        </button>

                        <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                          {isCorrect ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              إجابة صحيحة
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              إجابة خاطئة
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-3">
                      {question.text}
                    </p>

                    {question.imageUrl && (
                      <div className="mb-4 max-w-sm rounded-xl overflow-hidden border border-amber-500/30">
                        <img src={question.imageUrl} alt="صورة السؤال" className="w-full object-contain max-h-56 bg-black" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {question.options.map((opt, oIdx) => {
                        const isStudentChoice = studentAns === oIdx;
                        const isTheCorrectOne = oIdx === question.correctOptionIndex;

                        let optClass = 'border-zinc-800 bg-zinc-900/50 text-zinc-400';
                        if (isTheCorrectOne) {
                          optClass = 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold';
                        } else if (isStudentChoice && !isCorrect) {
                          optClass = 'border-red-500 bg-red-500/20 text-red-300 line-through';
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${optClass}`}
                          >
                            <span>{opt}</span>
                            {isTheCorrectOne && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        <span className="font-bold ml-1">توضيح المعلم:</span>
                        {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <AnimatedButton
                variant="gold"
                size="lg"
                onClick={handleReset}
                icon={<RotateCcw className="w-5 h-5 ml-1" />}
              >
                العودة لقائمة الاختبارات
              </AnimatedButton>
            </div>
          </motion.div>
        ) : (
          /* Active Question & Whiteboard 2-Column Layout */
          /* Requirement: "يكون صورة السؤال عاليمين وتحتيه الاختيارات والسبورة عاليسار مع التاكد الكامل من سلامتها" */
          q && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Right Column: Question Details, Image at top, Choices underneath it */}
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${
                  isWhiteboardOpen ? 'lg:col-span-7' : 'lg:col-span-12 max-w-4xl mx-auto w-full'
                } order-1 rounded-3xl border-2 border-amber-500/35 bg-black/80 dark:bg-black/80 light:bg-white/95 p-6 sm:p-7 shadow-2xl relative transition-all duration-300`}
              >
                {/* Question Badge, Folder Save, and Progress Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      السؤال رقم ({currentQuestionIndex + 1})
                    </span>

                    {/* Requirement: الطالب يمكنه اثناء الاختبار اضافة اي سؤال لاي مجلد */}
                    <button
                      type="button"
                      onClick={() => setSaveModalQuestion(q)}
                      className="px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>حفظ السؤال في مجلداتي</span>
                    </button>
                  </div>

                  <span className="text-xs text-zinc-400 font-bold">
                    {currentQuestionIndex + 1} / {totalQ}
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-200 h-2 rounded-full overflow-hidden mb-5">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / totalQ) * 100}%` }}
                  />
                </div>

                {/* Question Image (صورة السؤال عاليمين) */}
                {q.imageUrl && (
                  <div className="mb-5 rounded-2xl overflow-hidden border-2 border-amber-500/35 bg-black/90 shadow-xl relative group">
                    <img
                      src={q.imageUrl}
                      alt="صورة السؤال"
                      onClick={() => setZoomedImage(q.imageUrl || null)}
                      className="w-full h-auto max-h-80 object-contain mx-auto cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div 
                      onClick={() => setZoomedImage(q.imageUrl || null)}
                      className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 border border-amber-500/40 text-[11px] text-amber-300 font-bold flex items-center gap-1 cursor-pointer opacity-90 hover:opacity-100"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>انقر لتكبير صورة السؤال</span>
                    </div>
                  </div>
                )}

                {/* Question Text (Optional) */}
                {q.text && q.text.trim() && (
                  <h3 className="text-base sm:text-xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-5 leading-relaxed">
                    {q.text}
                  </h3>
                )}

                {/* Choices (وتحتيه الاختيارات) */}
                <div className="space-y-3 mb-6">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
                    const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
                    const letterLabel = arabicLetters[optIdx] || String.fromCharCode(65 + optIdx);

                    return (
                      <motion.button
                        key={optIdx}
                        type="button"
                        whileHover={{ scale: 1.012, x: -3 }}
                        whileTap={{ scale: 0.988 }}
                        onClick={() => handleSelectOption(currentQuestionIndex, optIdx)}
                        className={`w-full p-3.5 sm:p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                            : 'border-zinc-800 dark:border-zinc-800 light:border-zinc-200 bg-zinc-950/60 dark:bg-zinc-950/60 light:bg-zinc-50 text-zinc-200 dark:text-zinc-200 light:text-zinc-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                              isSelected
                                ? 'bg-amber-500 text-black shadow-md'
                                : 'bg-zinc-800 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {letterLabel}
                          </div>
                          <span className="text-xs sm:text-sm font-semibold">{opt}</span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-amber-400 bg-amber-400' : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-amber-500/20">
                  <AnimatedButton
                    variant="outline"
                    size="md"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    icon={<ArrowRight className="w-4 h-4 ml-1" />}
                  >
                    السابق
                  </AnimatedButton>

                  {currentQuestionIndex < totalQ - 1 ? (
                    <AnimatedButton
                      variant="gold"
                      size="md"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                      icon={<ArrowLeft className="w-4 h-4 mr-1" />}
                    >
                      السؤال التالي
                    </AnimatedButton>
                  ) : (
                    <AnimatedButton
                      variant="green"
                      size="lg"
                      onClick={handleSubmitExam}
                      icon={<CheckCircle2 className="w-5 h-5 ml-1" />}
                      className="shadow-xl"
                    >
                      تسليم الاختبار واعتماد النتيجة
                    </AnimatedButton>
                  )}
                </div>
              </motion.div>

              {/* Left Column: The Whiteboard (السبورة عاليسار) */}
              <div
                className={`lg:col-span-5 order-2 sticky top-24 transition-all duration-300 ${
                  isWhiteboardOpen ? 'block' : 'hidden'
                }`}
              >
                <ExamWhiteboard
                  isOpen={isWhiteboardOpen}
                  onClose={() => setIsWhiteboardOpen(false)}
                />
              </div>
            </div>
          )
        )}

        {/* Floating Quick Open Whiteboard Button when closed */}
        {!isWhiteboardOpen && !isSubmitted && currentExam && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            type="button"
            onClick={() => setIsWhiteboardOpen(true)}
            className="fixed bottom-6 left-6 z-40 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-2xl shadow-amber-500/30 cursor-pointer border-2 border-amber-300 transition-transform hover:scale-105"
          >
            <PenTool className="w-4 h-4 fill-black" />
            <span>فتح السبورة (مسودة الحل)</span>
          </motion.button>
        )}

        {/* Modal: Save Question into a Student Folder */}
        <AnimatePresence>
          {saveModalQuestion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-3xl border border-amber-500/40 bg-zinc-950 text-right shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-black">
                  <BookmarkPlus className="w-5 h-5" />
                  <span>حفظ السؤال في أحد مجلداتك</span>
                </div>
                <p className="text-xs text-zinc-400 mb-4">
                  اختر المجلد الذي ترغب في إضافة هذا السؤال إليه ليبقى في بنك أسئلتك:
                </p>

                {saveSuccessNotice && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    {saveSuccessNotice}
                  </div>
                )}

                {studentFolders.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-amber-500/30 bg-black/40 text-xs text-zinc-400 mb-4">
                    ليس لديك أي مجلد بعد! يمكنك الانتقال إلى قسم مجلداتي لإنشاء مجلد أولاً.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 mb-5">
                    {studentFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleSaveToFolder(folder)}
                        className="w-full p-3 rounded-xl border border-amber-500/30 bg-zinc-900/60 hover:bg-amber-500/20 hover:border-amber-400 transition-all flex items-center justify-between text-right cursor-pointer"
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-zinc-200">
                            {folder.name}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {folder.questions?.length || 0} أسئلة حالية
                          </div>
                        </div>
                        <span className="text-xs text-amber-400 font-bold">
                          إضافة هنا +
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveModalQuestion(null)}
                  >
                    إغلاق
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Modal: Zoom Question Image */}
        <AnimatePresence>
          {zoomedImage && (
            <div 
              onClick={() => setZoomedImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-black p-2 shadow-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/80 border border-amber-400/50 text-amber-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-lg"
                >
                  ✕
                </button>
                <img
                  src={zoomedImage}
                  alt="صورة السؤال مكبرة"
                  className="w-full max-h-[85vh] object-contain rounded-2xl mx-auto"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Exams List View (Exams assigned to custom blocks only appear inside their block)
  const visibleExams = exams.filter((e) => !e.customBlockId);

  // Helper for Combined Exam selection
  const handleToggleCombinedExamId = (examId: string) => {
    if (selectedCombinedExamIds.includes(examId)) {
      setSelectedCombinedExamIds(selectedCombinedExamIds.filter((id) => id !== examId));
    } else {
      setSelectedCombinedExamIds([...selectedCombinedExamIds, examId]);
    }
  };

  const handleSelectAllCombinedExams = () => {
    if (selectedCombinedExamIds.length === visibleExams.length) {
      setSelectedCombinedExamIds([]);
    } else {
      setSelectedCombinedExamIds(visibleExams.map((e) => e.id));
    }
  };

  const handleBuildCombinedExam = () => {
    const chosen = visibleExams.filter((e) => selectedCombinedExamIds.includes(e.id));
    if (chosen.length === 0) return;

    const aggregatedQuestions: Question[] = [];
    chosen.forEach((ex) => {
      (ex.questions || []).forEach((q, qIdx) => {
        aggregatedQuestions.push({
          ...q,
          text: q.text ? `[${ex.title}] ${q.text}` : `سؤال رقم (${qIdx + 1}) في ${ex.title}`,
        });
      });
    });

    if (aggregatedQuestions.length === 0) {
      alert('الأقسام المختارة لا تحتوي على أسئلة');
      return;
    }

    const combinedExam: Exam = {
      id: `combined_${Date.now()}`,
      title: selectedCombinedExamIds.length === visibleExams.length
        ? 'الاختبار المجمع الشامل (جميع اختبارات المنصة)'
        : `اختبار مجمع (${chosen.length} أقسام مختارة)`,
      description: `اختبار مجمع شامل يضم ${aggregatedQuestions.length} سؤالاً من الأقسام المختارة`,
      durationMinutes: Math.max(15, Math.round(aggregatedQuestions.length * 1.5)),
      passingPercentage: 60,
      questions: aggregatedQuestions,
      createdAt: new Date().toISOString(),
    };

    setIsCombinedModalOpen(false);
    // Requirement: Show points briefing notice before starting!
    setExamToPrompt(combinedExam);
  };

  return (
    <div className="space-y-6 text-right pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
            قسم الاختبارات التفاعلية
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
            اختبارات محاكاة ذكية وخارجية مع نسب نجاح وتصحيح فوري لحساب نتيجتك ونسبتك نحو المئوية 100%
          </p>
        </div>

        <AnimatedButton variant="outline" size="sm" onClick={onBack} icon={<ArrowRight className="w-4 h-4 ml-1" />}>
          العودة للرئيسية
        </AnimatedButton>
      </div>

      {/* Requirement: "ضيف ميزة الاختبار المجمع تكون موجودة داخل خانة الاختبارات الطالب لما يضغط عليها يقدر يختار اقسام يختبر عليهم مع بعض حتى لو هيختبر على كل الاختبارات الموجودة عالمنصة" */}
      <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-zinc-950 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-amber-300">
                ميزة الاختبار المجمع الشامل
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                ميزة مميزة
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              يمكنك اختيار عدة أقسام واختبارات لدمجها وحلها معاً، أو اختبار نفسك في جميع اختبارات المنصة دفعة واحدة!
            </p>
          </div>
        </div>

        <AnimatedButton
          variant="gold"
          size="md"
          onClick={() => {
            setSelectedCombinedExamIds(visibleExams.map((e) => e.id));
            setIsCombinedModalOpen(true);
          }}
          icon={<Layers className="w-4 h-4 ml-1" />}
          className="shadow-xl shrink-0"
        >
          صناعة اختبار مجمع
        </AnimatedButton>
      </div>

      {visibleExams.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-amber-500/20 bg-black/40">
          <p className="text-zinc-400 text-sm">لا توجد اختبارات عامة مضافة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleExams.map((exam, idx) => {
            const isExt = exam.examType === 'external' || !!exam.externalExamUrl;

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -3 }}
                className="p-6 rounded-3xl border-2 border-amber-500/30 bg-black/75 dark:bg-black/75 light:bg-white/95 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {isExt ? 'اختبار خارجي' : `${exam.questions?.length || 0} أسئلة`}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        نجاح: {exam.passingPercentage || 60}%
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-2">
                    {exam.title}
                  </h3>

                  {exam.description && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-3 mb-4 font-normal">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{exam.durationMinutes || 15} دقيقة</span>
                  </span>

                  <AnimatedButton
                    variant="gold"
                    size="md"
                    onClick={() => handleRequestStartExam(exam)}
                    icon={isExt ? <ExternalLink className="w-4 h-4 ml-1" /> : <Sparkles className="w-4 h-4 ml-1" />}
                  >
                    {isExt ? 'فتح الاختبار الخارجي' : 'بدء الاختبار'}
                  </AnimatedButton>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Requirement: "قبل ان يبدا الشخص الاختبار يظهر له ملحوظة اذا جاب فوق 50 فالمية فسيتم اخذ نقاط على حسب درجته واذا جاب اقل من 50 فالمية يخصم منه تلقائيا 20 نقطة" */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {examToPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg p-6 sm:p-7 rounded-3xl border-2 border-amber-500/50 bg-zinc-950 text-right shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-lg">
                <AlertTriangle className="w-7 h-7 animate-pulse text-amber-400" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-center text-amber-300 mb-1">
                تنبيه هام لنظام النقاط قبل البدء
              </h3>
              <p className="text-xs text-center text-zinc-400 mb-5 font-bold">
                الاختبار: {examToPrompt.title}
              </p>

              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 mb-6 text-xs text-zinc-200 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="font-black text-emerald-400 block mb-0.5">إذا حققت نسبة 50% أو أعلى:</span>
                    <span>ستحصل على نقاط إضافية في رصيدك بحسب درجتك المئوية (تصل حتى 20 نقطة كحد أقصى عند تحقيق 100%).</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-amber-500/20">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ✕
                  </div>
                  <div>
                    <span className="font-black text-red-400 block mb-0.5">إذا حققت نسبة أقل من 50%:</span>
                    <span>سيتم خصم 20 نقطة تلقائياً من رصيدك في لوحة المتصدرين!</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <AnimatedButton
                  variant="gold"
                  size="md"
                  onClick={() => handleActuallyStartExam(examToPrompt)}
                  icon={<Play className="w-4 h-4 ml-1 fill-current" />}
                  className="flex-1 py-3 text-sm font-black shadow-xl"
                >
                  فهمت ذلك، ابدأ الاختبار الآن
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setExamToPrompt(null)}
                >
                  إلغاء والعودة
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* Requirement: Modal: الاختبار المجمع الشامل                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCombinedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-3xl border-2 border-amber-500/50 bg-zinc-950 text-right shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-amber-300">
                      صناعة اختبار مجمع شامل
                    </h3>
                    <p className="text-xs text-zinc-400">
                      حدد الأقسام والاختبارات التي تريد دمجها واختبار نفسك عليها معاً
                    </p>
                  </div>
                </div>

                {/* Select All Toggle */}
                <button
                  type="button"
                  onClick={handleSelectAllCombinedExams}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-all cursor-pointer"
                >
                  {selectedCombinedExamIds.length === visibleExams.length ? 'إلغاء تحديد الكل' : 'تحديد جميع اختبارات المنصة'}
                </button>
              </div>

              {/* List of Exams with Checkboxes */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar mb-4">
                {visibleExams.map((ex) => {
                  const isChecked = selectedCombinedExamIds.includes(ex.id);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => handleToggleCombinedExamId(ex.id)}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'border-amber-400 bg-amber-500/20 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isChecked ? 'bg-amber-400 border-amber-400 text-black' : 'border-zinc-700 bg-black'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold block">{ex.title}</span>
                          <span className="text-[11px] text-zinc-400">
                            {ex.questions?.length || 0} أسئلة • {ex.category || 'عام'}
                          </span>
                        </div>
                      </div>

                      {isChecked && (
                        <span className="text-xs text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/20">
                          مضاف للاختبار ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected stats summary */}
              {(() => {
                const chosen = visibleExams.filter((e) => selectedCombinedExamIds.includes(e.id));
                const totalQ = chosen.reduce((acc, curr) => acc + (curr.questions?.length || 0), 0);

                return (
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 flex items-center justify-between text-xs text-zinc-300 mb-4">
                    <span>
                      الأقسام المحددة: <b className="text-amber-400">{chosen.length} من {visibleExams.length}</b>
                    </span>
                    <span>
                      إجمالي الأسئلة المجمعة: <b className="text-amber-400">{totalQ} سؤالاً</b>
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <AnimatedButton
                  variant="gold"
                  size="md"
                  disabled={selectedCombinedExamIds.length === 0}
                  onClick={handleBuildCombinedExam}
                  icon={<Play className="w-4 h-4 ml-1 fill-current" />}
                  className="flex-1 py-3 text-sm font-black shadow-xl"
                >
                  بدء الاختبار المجمع الآن
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setIsCombinedModalOpen(false)}
                >
                  إلغاء
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

