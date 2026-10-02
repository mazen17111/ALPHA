import React, { useState } from 'react';
import { StudentFolder, Question, Exam } from '../types';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from './AnimatedButton';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderPlus,
  Folder,
  Trash2,
  PlusCircle,
  HelpCircle,
  Play,
  ArrowRight,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Lock,
} from 'lucide-react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface FoldersSectionProps {
  folders: StudentFolder[];
  onTakeFolderExam: (folderAsExam: Exam) => void;
  onBack: () => void;
}

export const FoldersSection: React.FC<FoldersSectionProps> = ({
  folders,
  onTakeFolderExam,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<StudentFolder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Delete Confirmation in-app state (never use window.confirm!)
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'folder' | 'question' | 'clearQuestions';
    id: string;
    title: string;
  } | null>(null);

  // Add Question Modal state
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qNotes, setQNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync selectedFolder if folders update from Firestore
  React.useEffect(() => {
    if (selectedFolder) {
      const updated = folders.find((f) => f.id === selectedFolder.id);
      if (updated) {
        setSelectedFolder(updated);
      } else {
        setSelectedFolder(null);
      }
    }
  }, [folders]);

  // Handle Image Upload from device (FileReader)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير، يفضل اختيار صورة أقل من 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setQImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newFolderName.trim()) return;

    setIsSaving(true);
    try {
      const folderData: Omit<StudentFolder, 'id'> = {
        userId: currentUser.uid,
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        questions: [],
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'student_folders'), folderData);
      setNewFolderName('');
      setNewFolderDesc('');
      setShowCreateModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'student_folders');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm and Execute Delete
  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);

    try {
      if (itemToDelete.type === 'folder') {
        const target = folders.find((f) => f.id === itemToDelete.id);
        if (target?.name === 'مجلد الأخطاء' || target?.isPermanentMistakesFolder) {
          alert('مجلد الأخطاء هو مجلد دائم وتلقائي في حسابك ولا يمكن حذفه للحفاظ على بنك أخطائك');
          setItemToDelete(null);
          return;
        }
        await deleteDoc(doc(db, 'student_folders', itemToDelete.id));
        if (selectedFolder?.id === itemToDelete.id) {
          setSelectedFolder(null);
        }
      } else if (itemToDelete.type === 'question' && selectedFolder) {
        const updatedQuestions = selectedFolder.questions.filter((q) => q.id !== itemToDelete.id);
        await updateDoc(doc(db, 'student_folders', selectedFolder.id), {
          questions: updatedQuestions,
        });
      } else if (itemToDelete.type === 'clearQuestions' && selectedFolder) {
        await updateDoc(doc(db, 'student_folders', selectedFolder.id), {
          questions: [],
        });
      }
      setItemToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Question to Folder
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder || !qText.trim()) return;

    setIsSaving(true);
    try {
      const newQuestion: Question = {
        id: `q_${Date.now()}`,
        text: qText.trim(),
        imageUrl: qImage.trim() || undefined,
        options: qOptions.map((o, idx) => o.trim() || `الخيار ${idx + 1}`),
        correctOptionIndex: qCorrect,
        notes: qNotes.trim() || undefined,
      };

      const updatedQuestions = [...(selectedFolder.questions || []), newQuestion];
      await updateDoc(doc(db, 'student_folders', selectedFolder.id), {
        questions: updatedQuestions,
      });

      // Reset form
      setQText('');
      setQImage('');
      setQOptions(['', '', '', '']);
      setQCorrect(0);
      setQNotes('');
      setShowAddQuestionModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `student_folders/${selectedFolder.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Take Exam on Folder (الاختبار على المجلد)
  const handleStartFolderExam = () => {
    if (!selectedFolder || selectedFolder.questions.length === 0) {
      return;
    }

    const folderAsExam: Exam = {
      id: `folder_${selectedFolder.id}`,
      title: `اختبار مجلد: ${selectedFolder.name}`,
      description: selectedFolder.description || 'اختبار تفاعلي على أسئلة مجلدك الخاص',
      durationMinutes: Math.max(5, selectedFolder.questions.length * 2),
      passingPercentage: 60,
      questions: selectedFolder.questions,
      createdAt: new Date().toISOString(),
    };

    onTakeFolderExam(folderAsExam);
  };

  const sortedFolders = [...folders].sort((a, b) => {
    const isA = a.name === 'مجلد الأخطاء' || a.isPermanentMistakesFolder;
    const isB = b.name === 'مجلد الأخطاء' || b.isPermanentMistakesFolder;
    if (isA) return -1;
    if (isB) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 text-right pb-14">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
            قسم مجلداتي الخاصة
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
            أنشئ مجلداتك المخصصة، أضف أسئلتك، واحذفها، أو أجرِ اختباراً شاملاً على أي مجلد بضغطة زر
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AnimatedButton
            variant="gold"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            icon={<FolderPlus className="w-4 h-4 ml-1" />}
          >
            إنشاء مجلد جديد
          </AnimatedButton>

          <AnimatedButton variant="outline" size="sm" onClick={onBack} icon={<ArrowRight className="w-4 h-4 ml-1" />}>
            العودة للرئيسية
          </AnimatedButton>
        </div>
      </div>

      {/* Selected Folder View OR Folder Cards Grid */}
      {selectedFolder ? (
        /* Folder Details View */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border-2 border-amber-500/40 bg-black/80 dark:bg-black/80 light:bg-white shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Folder className="w-6 h-6 text-amber-400" />
                  <h3 className="text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                    {selectedFolder.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                    {selectedFolder.questions?.length || 0} سؤال
                  </span>
                </div>
                {selectedFolder.description && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    {selectedFolder.description}
                  </p>
                )}
              </div>

              {/* Action Buttons for this Folder */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Take Exam on this folder! */}
                <AnimatedButton
                  variant="gold"
                  size="md"
                  disabled={!selectedFolder.questions || selectedFolder.questions.length === 0}
                  onClick={handleStartFolderExam}
                  icon={<Play className="w-4 h-4 fill-current ml-1" />}
                  className="shadow-xl"
                >
                  الاختبار على المجلد
                </AnimatedButton>

                {/* Add Question Button */}
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddQuestionModal(true)}
                  icon={<PlusCircle className="w-4 h-4 ml-1" />}
                >
                  إضافة سؤال
                </AnimatedButton>

                {/* Clear all questions */}
                {selectedFolder.questions?.length > 0 && (
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItemToDelete({
                        type: 'clearQuestions',
                        id: selectedFolder.id,
                        title: `جميع أسئلة مجلد (${selectedFolder.name})`,
                      })
                    }
                    className="text-red-400 hover:bg-red-500/10"
                    icon={<Trash2 className="w-4 h-4 ml-1" />}
                  >
                    حذف كل الأسئلة
                  </AnimatedButton>
                )}

                {/* Back to folders list */}
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFolder(null)}
                >
                  إغلاق المجلد
                </AnimatedButton>
              </div>
            </div>

            {/* Questions List */}
            {selectedFolder.questions?.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-amber-500/30 bg-zinc-950/40">
                <HelpCircle className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-bold text-zinc-300 mb-1">المجلد فارغ حتى الآن</p>
                <p className="text-xs text-zinc-500 mb-4">
                  أضف أسئلتك الهامة أو التي واجهت صعوبة فيها لتتدرب عليها في أي وقت
                </p>
                <AnimatedButton
                  variant="gold"
                  size="sm"
                  onClick={() => setShowAddQuestionModal(true)}
                  icon={<PlusCircle className="w-4 h-4 ml-1" />}
                >
                  إضافة أول سؤال للمجلد
                </AnimatedButton>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-base font-black text-amber-400">
                  قائمة الأسئلة ({selectedFolder.questions.length}):
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {selectedFolder.questions.map((question, qIdx) => (
                    <motion.div
                      key={question.id || qIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl border border-amber-500/30 bg-zinc-950/70 dark:bg-zinc-950/70 light:bg-zinc-50 text-right flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center">
                            {qIdx + 1}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                            {question.text}
                          </span>
                        </div>

                        {/* Delete specific question button (حذف سؤال معين) */}
                        <button
                          onClick={() =>
                            setItemToDelete({
                              type: 'question',
                              id: question.id,
                              title: `السؤال رقم (${qIdx + 1})`,
                            })
                          }
                          title="حذف هذا السؤال"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {question.imageUrl && (
                        <div className="mb-4 max-w-xs rounded-xl overflow-hidden border border-amber-500/20">
                          <img src={question.imageUrl} alt="صورة السؤال" className="w-full object-contain max-h-48 bg-black" />
                        </div>
                      )}

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {question.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === question.correctOptionIndex;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                isCorrect
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold'
                                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>

                      {question.notes && (
                        <div className="mt-3 text-[11px] text-amber-400/90 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <span className="font-bold">ملاحظة: </span> {question.notes}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Folders List Grid */
        <div>
          {folders.length === 0 ? (
            <div className="p-14 text-center rounded-3xl border-2 border-dashed border-amber-500/30 bg-black/40">
              <FolderPlus className="w-14 h-14 text-amber-400 mx-auto mb-3 opacity-70" />
              <h3 className="text-xl font-black text-amber-400 mb-2">لا توجد مجلدات بعد</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                قم بإنشاء مجلداتك المخصصة لتجميع أسئلتك المفضلة أو الصعبة وإجراء اختبارات فورية عليها
              </p>
              <AnimatedButton
                variant="gold"
                size="md"
                onClick={() => setShowCreateModal(true)}
                icon={<FolderPlus className="w-5 h-5 ml-1" />}
              >
                إنشاء أول مجلد الآن
              </AnimatedButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedFolders.map((folder, idx) => {
                const isMistakes = folder.name === 'مجلد الأخطاء' || folder.isPermanentMistakesFolder;

                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02, y: -3 }}
                    className={`p-6 rounded-3xl flex flex-col justify-between text-right transition-all ${
                      isMistakes
                        ? 'border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/25 via-zinc-950 to-black shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : 'border-2 border-amber-500/30 bg-black/75 dark:bg-black/75 light:bg-white/95 shadow-xl'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {folder.questions?.length || 0} أسئلة
                          </span>
                          {isMistakes && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-red-400" />
                              <span>تجميع الأخطاء تلقائياً</span>
                            </span>
                          )}
                        </div>

                        {/* Delete or Protected Lock indicator */}
                        {isMistakes ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20" title="مجلد دائم لا يحذف">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>دائم</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete({
                                type: 'folder',
                                id: folder.id,
                                title: `مجلد (${folder.name})`,
                              });
                            }}
                            title="حذف المجلد نهائياً"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-2 flex items-center gap-2">
                        <span>{folder.name}</span>
                      </h3>

                      {folder.description && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-2 mb-4 font-normal">
                          {folder.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between gap-2">
                    {/* Open folder */}
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFolder(folder)}
                    >
                      تصفح الأسئلة
                    </AnimatedButton>

                    {/* Test on folder */}
                    <AnimatedButton
                      variant="gold"
                      size="sm"
                      disabled={!folder.questions || folder.questions.length === 0}
                      onClick={() => {
                        setSelectedFolder(folder);
                        const examObj: Exam = {
                          id: `folder_${folder.id}`,
                          title: `اختبار مجلد: ${folder.name}`,
                          description: folder.description || 'اختبار تفاعلي مخصص على أسئلة مجلدك',
                          durationMinutes: Math.max(5, folder.questions.length * 2),
                          passingPercentage: 60,
                          questions: folder.questions,
                          createdAt: new Date().toISOString(),
                        };
                        onTakeFolderExam(examObj);
                      }}
                      icon={<Play className="w-3.5 h-3.5 fill-current" />}
                    >
                      اختبار
                    </AnimatedButton>
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* In-App Delete Confirmation Modal (solves iframe window.confirm block) */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-3xl border border-red-500/40 bg-zinc-950 text-right shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-center text-zinc-100 mb-1">تأكيد الحذف النهائي</h4>
              <p className="text-xs text-center text-zinc-400 mb-5">
                هل أنت متأكد من حذف {itemToDelete.title}؟ لن يمكنك استرجاعه بعد الحذف.
              </p>

              <div className="flex gap-3">
                <AnimatedButton
                  variant="danger"
                  size="md"
                  disabled={isSaving}
                  onClick={handleExecuteDelete}
                  className="flex-1"
                >
                  {isSaving ? 'جاري الحذف...' : 'نعم، احذف الآن'}
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setItemToDelete(null)}
                >
                  إلغاء
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create Folder */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl border border-amber-500/40 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600 mb-4">
                إنشاء مجلد أسئلة جديد
              </h3>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    اسم المجلد:
                  </label>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="مثال: أسئلة صعبة في الفيزياء"
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    وصف المجلد (اختياري):
                  </label>
                  <textarea
                    rows={2}
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="تجميع لأهم المسائل والتمارين..."
                    className="w-full px-4 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <AnimatedButton
                    type="submit"
                    variant="gold"
                    size="md"
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'إنشاء المجلد'}
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowCreateModal(false)}
                  >
                    إلغاء
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add Question to Folder */}
      <AnimatePresence>
        {showAddQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl relative my-8"
            >
              <h3 className="text-xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600 mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <span>إضافة سؤال جديد لمجلد ({selectedFolder?.name})</span>
              </h3>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    نص السؤال:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="اكتب صيغة السؤال هنا..."
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                {/* Upload Image from device OR URL */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5 flex items-center justify-between">
                    <span>صورة السؤال (رفع من الجهاز أو رابط):</span>
                    {qImage && (
                      <button
                        type="button"
                        onClick={() => setQImage('')}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        إزالة الصورة
                      </button>
                    )}
                  </label>

                  <div className="flex gap-2 mb-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-400 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>رفع صورة من جهازك</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="url"
                    value={qImage}
                    onChange={(e) => setQImage(e.target.value)}
                    placeholder="أو ضع رابط صورة مباشر https://..."
                    className="w-full px-4 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />

                  {qImage && (
                    <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-amber-500/30 mx-auto">
                      <img src={qImage} alt="معاينة الصورة" className="w-full max-h-36 object-contain bg-black" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    الخيارات الأربعة (حدد الإجابة الصحيحة بالدائرة):
                  </label>
                  <div className="space-y-2">
                    {qOptions.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="folderCorrectChoice"
                          checked={qCorrect === optIdx}
                          onChange={() => setQCorrect(optIdx)}
                          className="w-4 h-4 accent-amber-500 cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...qOptions];
                            updated[optIdx] = e.target.value;
                            setQOptions(updated);
                          }}
                          placeholder={`الخيار ${optIdx + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                        />
                        <span className="text-xs font-bold text-amber-500 w-4">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1.5">
                    ملاحظات أو طريقة الحل (اختياري):
                  </label>
                  <input
                    type="text"
                    value={qNotes}
                    onChange={(e) => setQNotes(e.target.value)}
                    placeholder="ملاحظات تساعدك أثناء المراجعة..."
                    className="w-full px-4 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <AnimatedButton
                    type="submit"
                    variant="gold"
                    size="md"
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ السؤال في المجلد'}
                  </AnimatedButton>
                  <AnimatedButton
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowAddQuestionModal(false)}
                  >
                    إلغاء
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
