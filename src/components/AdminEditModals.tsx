import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  VideoItem,
  FileResource,
  Exam,
  Question,
  CustomBlock,
  CustomBlockItem,
} from '../types';
import {
  X,
  Save,
  Trash2,
  PlusCircle,
  Video,
  FileText,
  HelpCircle,
  ExternalLink,
  Layers,
  Upload,
  Percent,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cleanFirestoreData } from '../utils/cleanFirestore';

// -------------------------------------------------------------
// 1. EDIT VIDEO MODAL
// -------------------------------------------------------------
interface EditVideoModalProps {
  isOpen: boolean;
  video: VideoItem | null;
  allFiles: FileResource[];
  allExams: Exam[];
  onClose: () => void;
  onSave: (updated: Partial<VideoItem>) => Promise<void>;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  isOpen,
  video,
  allFiles,
  allExams,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [linkedFileIds, setLinkedFileIds] = useState<string[]>([]);
  const [linkedExamIds, setLinkedExamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (video) {
      setTitle(video.title || '');
      setUrl(video.url || '');
      setDescription(video.description || '');
      setDuration(video.duration || '30 دقيقة');
      setLinkedFileIds(video.linkedFileIds || []);
      setLinkedExamIds(video.linkedExamIds || []);
      setErrorMsg('');
    }
  }, [video]);

  if (!isOpen || !video) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال عنوان الفيديو');
      return;
    }
    if (!url.trim()) {
      setErrorMsg('يرجى إدخال رابط الفيديو');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = cleanFirestoreData({
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        duration: duration.trim() || '30 دقيقة',
        linkedFileIds: linkedFileIds || [],
        linkedExamIds: linkedExamIds || [],
      });

      await onSave(dataToSave);
      onClose();
    } catch (err: any) {
      console.error('Error saving video edits:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  const toggleLinkedFile = (id: string) => {
    setLinkedFileIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleLinkedExam = (id: string) => {
    setLinkedExamIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-start sm:items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-zinc-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-right shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-400">تعديل بيانات الفيديو</h3>
              <p className="text-xs text-zinc-400">عدل اسم الفيديو، الرابط، المرفقات، والاختبارات المرتبطة به</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              عنوان الفيديو:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                رابط الفيديو (YouTube أو Embed أو مباشر):
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 text-left font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                مدة الفيديو (تقريبية):
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="مثال: 45 دقيقة"
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              وصف الفيديو وملاحظات الدرس:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفاً للدرس أو المحاور الأساسية..."
              className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
            />
          </div>

          {/* Linked Files Selection */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
              <span>ربط ملفات ومذكرات بهذا الفيديو:</span>
              <span className="text-[11px] text-amber-400 font-normal">
                {linkedFileIds.length} ملفات محددة
              </span>
            </label>
            {allFiles.length === 0 ? (
              <p className="text-xs text-zinc-500">لا توجد ملفات في المنصة لربطها.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-800 bg-black/40">
                {allFiles.map((f) => {
                  const isSelected = linkedFileIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleLinkedFile(f.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                          : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{f.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                        {isSelected ? '✓ مربوط' : '+ ربط'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked Exams Selection */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
              <span>ربط اختبارات بهذا الفيديو:</span>
              <span className="text-[11px] text-amber-400 font-normal">
                {linkedExamIds.length} اختبارات محددة
              </span>
            </label>
            {allExams.length === 0 ? (
              <p className="text-xs text-zinc-500">لا توجد اختبارات في المنصة لربطها.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-800 bg-black/40">
                {allExams.map((ex) => {
                  const isSelected = linkedExamIds.includes(ex.id);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => toggleLinkedExam(ex.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                          : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ex.title}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                        {isSelected ? '✓ مربوط' : '+ ربط'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <AnimatedButton type="button" variant="outline" size="sm" onClick={onClose}>
              إلغاء
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="gold"
              size="sm"
              disabled={loading}
              icon={<Save className="w-4 h-4 ml-1" />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ تعديلات الفيديو'}
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. EDIT FILE MODAL
// -------------------------------------------------------------
interface EditFileModalProps {
  isOpen: boolean;
  file: FileResource | null;
  onClose: () => void;
  onSave: (updated: Partial<FileResource>) => Promise<void>;
}

export const EditFileModal: React.FC<EditFileModalProps> = ({
  isOpen,
  file,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState('مذكرات');
  const [fileType, setFileType] = useState('PDF');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (file) {
      setTitle(file.title || '');
      setFileUrl(file.fileUrl || '');
      setCategory(file.category || 'مذكرات');
      setFileType(file.fileType || 'PDF');
      setDescription(file.description || '');
      setErrorMsg('');
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال اسم الملف');
      return;
    }
    if (!fileUrl.trim()) {
      setErrorMsg('يرجى إدخال رابط الملف');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = cleanFirestoreData({
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        category: category.trim() || 'عام',
        fileType: fileType.trim() || 'PDF',
        description: description.trim(),
      });

      await onSave(dataToSave);
      onClose();
    } catch (err: any) {
      console.error('Error saving file edits:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-start sm:items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-zinc-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-right shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-400">تعديل بيانات الملف</h3>
              <p className="text-xs text-zinc-400">تعديل اسم الملف، التصنيف، الرابط، والوصف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              اسم الملف أو المذكرة:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                تصنيف الملف:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-zinc-900 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              >
                <option value="مذكرات">مذكرات</option>
                <option value="تجميعات">تجميعات</option>
                <option value="ملخصات شاملة">ملخصات شاملة</option>
                <option value="شروحات">شروحات</option>
                <option value="عام">عام</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                نوع الملف (امتداده):
              </label>
              <input
                type="text"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="PDF, Word, صورة..."
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              رابط الملف (Google Drive أو مباشر):
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100 text-left font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              وصف مختصر للملف:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة عن محتويات هذا الملف..."
              className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <AnimatedButton type="button" variant="outline" size="sm" onClick={onClose}>
              إلغاء
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="gold"
              size="sm"
              disabled={loading}
              icon={<Save className="w-4 h-4 ml-1" />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ تعديلات الملف'}
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. EDIT EXAM MODAL (With questions: text optional if image exists, options optional)
// -------------------------------------------------------------
interface EditExamModalProps {
  isOpen: boolean;
  exam: Exam | null;
  allVideos: VideoItem[];
  onClose: () => void;
  onSave: (updated: Partial<Exam>, targetVideoId?: string) => Promise<void>;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({
  isOpen,
  exam,
  allVideos,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [examType, setExamType] = useState<'external' | 'platform'>('external');
  const [externalExamUrl, setExternalExamUrl] = useState('');
  const [linkedVideoId, setLinkedVideoId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (exam) {
      setTitle(exam.title || '');
      setDescription(exam.description || '');
      setDurationMinutes(exam.durationMinutes || 20);
      setPassingPercentage(exam.passingPercentage || 60);
      setExamType(exam.examType || (exam.externalExamUrl ? 'external' : 'platform'));
      setExternalExamUrl(exam.externalExamUrl || '');
      
      const directLinkedVideo = allVideos.find((v) => v.linkedExamIds?.includes(exam.id))?.id || exam.linkedVideoId || '';
      setLinkedVideoId(directLinkedVideo);

      setQuestions(
        exam.questions && exam.questions.length > 0
          ? exam.questions
          : [
              {
                id: `q_${Date.now()}`,
                text: '',
                imageUrl: '',
                options: ['', '', '', ''],
                correctOptionIndex: 0,
                explanation: '',
              },
            ]
      );
      setErrorMsg('');
    }
  }, [exam, allVideos]);

  if (!isOpen || !exam) return null;

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        text: '',
        imageUrl: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, val: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIndex].options];
      newOpts[optIndex] = val;
      copy[qIndex] = { ...copy[qIndex], options: newOpts };
      return copy;
    });
  };

  const handleImageUpload = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleQuestionChange(qIndex, 'imageUrl', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى كتابة عنوان الاختبار');
      return;
    }

    if (examType === 'external' && !externalExamUrl.trim()) {
      setErrorMsg('يرجى وضع رابط الاختبار الخارجي');
      return;
    }

    // REQUIREMENT: "خلي مش ضروري وانا بعمل الاختبار اني احط سؤال لو رافع صورة ومش ضروري اكتب حاجة في الاختيارات"
    // Question is valid if it has text OR has an uploaded image!
    if (examType === 'platform') {
      const validQuestions = questions.filter(
        (q) => q.text.trim().length > 0 || (q.imageUrl && q.imageUrl.trim().length > 0)
      );

      if (validQuestions.length === 0) {
        setErrorMsg('يرجى إضافة سؤال واحد على الأقل (يمكنك كتابة نص أو رفع صورة)');
        return;
      }
    }

    setLoading(true);
    try {
      const validQuestions = questions.filter(
        (q) => q.text.trim().length > 0 || (q.imageUrl && q.imageUrl.trim().length > 0)
      );

      const defaultLetterChoices = ['أ', 'ب', 'ج', 'د'];

      const cleanedExam: Partial<Exam> = cleanFirestoreData({
        title: title.trim(),
        description: description.trim(),
        durationMinutes: Number(durationMinutes) || 20,
        passingPercentage: Number(passingPercentage) || 60,
        examType,
        linkedVideoId: linkedVideoId || null,
        externalExamUrl: examType === 'external' ? externalExamUrl.trim() : '',
        questions:
          examType === 'platform'
            ? validQuestions.map((q, idx) => ({
                id: q.id || `q_${Date.now()}_${idx}`,
                text: q.text.trim() || `السؤال ${idx + 1}`,
                imageUrl: q.imageUrl || '',
                // If user didn't write anything in options, default to أ, ب, ج, د so student can choose the letter!
                options: (q.options || ['', '', '', '']).map(
                  (opt, i) => opt.trim() || defaultLetterChoices[i] || `الخيار ${i + 1}`
                ),
                correctOptionIndex: q.correctOptionIndex || 0,
                explanation: q.explanation || '',
              }))
            : [],
      });

      await onSave(cleanedExam, linkedVideoId);
      onClose();
    } catch (err: any) {
      console.error('Error saving exam edits:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الاختبار');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-start sm:items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-zinc-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-right shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/30"
      >
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-400">تعديل الاختبار والتحكم في الأسئلة</h3>
              <p className="text-xs text-zinc-400">تعديل عنوان الاختبار، ربطه بفيديو، إضافة أو حذف أو تعديل الأسئلة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Exam Type Tabs */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900 border border-amber-500/30">
            <button
              type="button"
              onClick={() => setExamType('external')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                examType === 'external'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              اختبار خارجي (Google Forms / رابط)
            </button>
            <button
              type="button"
              onClick={() => setExamType('platform')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                examType === 'platform'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              اختبار تفاعلي من المنصة (أسئلة واختيارات)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                عنوان الاختبار:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                ربط هذا الاختبار بفيديو معين (اختياري):
              </label>
              <select
                value={linkedVideoId}
                onChange={(e) => setLinkedVideoId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-zinc-900 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              >
                <option value="">بدون ربط بفيديو (اختبار عام)</option>
                {allVideos.map((v) => (
                  <option key={v.id} value={v.id}>
                    📹 {v.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>المدة الزمنية (بالدقائق):</span>
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                <span>نسبة النجاح (%):</span>
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                وصف الاختبار:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تعليمات أو محاور الاختبار..."
                className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          </div>

          {/* External Exam Link */}
          {examType === 'external' ? (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                <ExternalLink className="w-4 h-4" />
                <span>رابط الاختبار الخارجي (Google Form أو رابط الامتحان):</span>
              </label>
              <input
                type="text"
                value={externalExamUrl}
                onChange={(e) => setExternalExamUrl(e.target.value)}
                dir="ltr"
                placeholder="https://docs.google.com/forms/..."
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/40 bg-black/70 text-sm text-left font-mono focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          ) : (
            /* Platform Questions Editor */
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-amber-400">
                    أسئلة الاختبار التفاعلية ({questions.length} أسئلة)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    يمكنك كتابة نص أو الاكتفاء برفع صورة السؤال مباشرة، والاختيارات ستكون تلقائياً (أ، ب، ج، د) إذا لم تكتبها!
                  </p>
                </div>
                <AnimatedButton
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleAddQuestion}
                  icon={<PlusCircle className="w-4 h-4 ml-1" />}
                >
                  إضافة سؤال جديد
                </AnimatedButton>
              </div>

              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/30">
                {questions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 rounded-2xl border border-amber-500/25 bg-black/50 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        السؤال {qIndex + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف السؤال</span>
                        </button>
                      )}
                    </div>

                    {/* Question Image (Primary or supplementary) */}
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          <span>صورة السؤال (إذا رفعت صورة لا يشترط كتابة نص السؤال أو الاختيارات):</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer hover:bg-amber-500/30 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع صورة السؤال</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(qIndex, e)}
                            className="hidden"
                          />
                        </label>
                        {q.imageUrl && (
                          <div className="flex items-center gap-2">
                            <img
                              src={q.imageUrl}
                              alt="معاينة"
                              className="w-16 h-12 object-cover rounded-lg border border-amber-500/50 shadow"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIndex, 'imageUrl', '')}
                              className="text-xs text-red-400 hover:underline cursor-pointer"
                            >
                              إزالة الصورة
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        نص السؤال (اختياري إذا رفعت صورة):
                      </label>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                        placeholder="اكتب صيغة السؤال (أو اتركه فارغاً إذا كان السؤال في الصورة)..."
                        className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs focus:outline-none focus:border-amber-400 text-zinc-100"
                      />
                    </div>

                    {/* 4 Options */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        الاختيارات الأربعة (اضغط على الحرف لتحديد الإجابة الصحيحة):
                      </label>
                      <p className="text-[10px] text-zinc-400 mb-2">
                        إذا تركت الخيارات فارغة فستظهر تلقائياً كـ (أ، ب، ج، د) ليختار منها الطالب بناءً على الصورة.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {['أ', 'ب', 'ج', 'د'].map((letter, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          const currentOptVal = q.options?.[optIdx] || '';

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40'
                                  : 'border-zinc-800 bg-zinc-900/60'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(qIndex, 'correctOptionIndex', optIdx)
                                }
                                title="اضغط لجعل هذا الخيار هو الإجابة الصحيحة"
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer font-black text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'border border-zinc-600 text-zinc-400 hover:border-amber-500'
                                }`}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={currentOptVal}
                                onChange={(e) =>
                                  handleOptionChange(qIndex, optIdx, e.target.value)
                                }
                                placeholder={`الخيار (${letter}) - اختياري`}
                                className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, 'explanation', e.target.value)
                        }
                        placeholder="توضيح أو طريقة الحل للطالب عند التصحيح (اختياري)..."
                        className="w-full px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <AnimatedButton type="button" variant="outline" size="sm" onClick={onClose}>
              إلغاء
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="gold"
              size="sm"
              disabled={loading}
              icon={<Save className="w-4 h-4 ml-1" />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ تعديلات الاختبار بالكامل'}
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. EDIT CUSTOM BLOCK MODAL (الملحقات والمستطيلات الجديدة)
// -------------------------------------------------------------
interface EditBlockModalProps {
  isOpen: boolean;
  block: CustomBlock | null;
  allVideos: VideoItem[];
  allFiles: FileResource[];
  allExams: Exam[];
  onClose: () => void;
  onSave: (updated: Partial<CustomBlock>) => Promise<void>;
}

export const EditBlockModal: React.FC<EditBlockModalProps> = ({
  isOpen,
  block,
  allVideos,
  allFiles,
  allExams,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('ملحق جديد');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkedVideoIds, setLinkedVideoIds] = useState<string[]>([]);
  const [linkedFileIds, setLinkedFileIds] = useState<string[]>([]);
  const [linkedExamIds, setLinkedExamIds] = useState<string[]>([]);
  const [directVideos, setBlockDirectVideos] = useState<CustomBlockItem[]>([]);
  const [directFiles, setBlockDirectFiles] = useState<CustomBlockItem[]>([]);
  const [directExams, setBlockDirectExams] = useState<CustomBlockItem[]>([]);

  // Sub-tabs for editing attachments
  const [activeItemTab, setActiveItemTab] = useState<'videos' | 'files' | 'exams'>('videos');
  const [newDirectTitle, setNewDirectTitle] = useState('');
  const [newDirectUrl, setNewDirectUrl] = useState('');

  // Target exam to remove: asks "هل تود حذفه نهائياً أم عودته لقسم الاختبارات؟"
  const [examToRemove, setExamToRemove] = useState<{ id: string; title: string } | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (block) {
      setTitle(block.title || '');
      setBadge(block.badge || 'ملحق جديد');
      setDescription(block.description || '');
      setLinkUrl(block.linkUrl || '');
      setLinkedVideoIds(block.linkedVideoIds || []);
      setLinkedFileIds(block.linkedFileIds || []);

      // Include all exams linked to this block or with customBlockId === block.id
      const initialExamIds = Array.from(
        new Set([
          ...(block.linkedExamIds || []),
          ...allExams.filter((e) => e.customBlockId === block.id).map((e) => e.id),
        ])
      );
      setLinkedExamIds(initialExamIds);

      setBlockDirectVideos(block.directVideos || []);
      setBlockDirectFiles(block.directFiles || []);
      setBlockDirectExams(block.directExams || []);
      setErrorMsg('');
      setActionNotice('');
    }
  }, [block, allExams]);

  if (!isOpen || !block) return null;

  const handleToggleLinkedVideo = (id: string) => {
    setLinkedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleLinkedFile = (id: string) => {
    setLinkedFileIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // When adding exam to this block:
  const handleAddExamToBlock = (id: string) => {
    setLinkedExamIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActionNotice('تمت إضافة الاختبار للملحق (سيظهر هنا فقط ويختفي من قسم الاختبارات العام) ✓');
    setTimeout(() => setActionNotice(''), 3500);
  };

  // 1. Permanently delete exam from database
  const handlePermanentDeleteExam = async (examId: string) => {
    try {
      await deleteDoc(doc(db, 'exams', examId));
      setLinkedExamIds((prev) => prev.filter((id) => id !== examId));
      setExamToRemove(null);
      setActionNotice('تم حذف الاختبار نهائياً ولن يعود ✓');
      setTimeout(() => setActionNotice(''), 3500);
    } catch (err: any) {
      console.error('Failed to permanently delete exam:', err);
      setErrorMsg('حدث خطأ أثناء الحذف النهائي');
    }
  };

  // 2. Return exam to general platform exams section
  const handleReturnExamToSection = async (examId: string) => {
    try {
      await updateDoc(doc(db, 'exams', examId), { customBlockId: null });
      setLinkedExamIds((prev) => prev.filter((id) => id !== examId));
      setExamToRemove(null);
      setActionNotice('تمت إعادة الاختبار إلى قسم الاختبارات بنجاح ✓');
      setTimeout(() => setActionNotice(''), 3500);
    } catch (err: any) {
      console.error('Failed to return exam to section:', err);
      setErrorMsg('حدث خطأ أثناء إعادة الاختبار');
    }
  };

  const handleAddDirectItem = () => {
    if (!newDirectTitle.trim() || !newDirectUrl.trim()) {
      setErrorMsg('يرجى إدخال عنوان ورابط العنصر أولاً لإضافته');
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }
    const item: CustomBlockItem = {
      id: `item_${Date.now()}`,
      title: newDirectTitle.trim(),
      url: newDirectUrl.trim(),
    };
    if (activeItemTab === 'videos') {
      setBlockDirectVideos((prev) => [...prev, item]);
    } else if (activeItemTab === 'files') {
      setBlockDirectFiles((prev) => [...prev, { ...item, type: 'PDF' }]);
    } else {
      setBlockDirectExams((prev) => [...prev, item]);
    }
    setNewDirectTitle('');
    setNewDirectUrl('');
    setActionNotice('تمت إضافة العنصر المباشر للملحق بنجاح ✓');
    setTimeout(() => setActionNotice(''), 3500);
  };

  const handleRemoveDirectVideo = (id: string) => {
    setBlockDirectVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleRemoveDirectFile = (id: string) => {
    setBlockDirectFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRemoveDirectExam = (id: string) => {
    setBlockDirectExams((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال اسم الملحق');
      return;
    }

    setLoading(true);
    try {
      // 1. Assign customBlockId to all linked exams so they only exist in this block
      for (const examId of linkedExamIds) {
        await updateDoc(doc(db, 'exams', examId), {
          customBlockId: block.id,
        }).catch(() => {});
      }

      const dataToSave = cleanFirestoreData({
        title: title.trim(),
        badge: badge.trim() || 'ملحق',
        description: description.trim(),
        linkUrl: linkUrl.trim(),
        linkedVideoIds: linkedVideoIds || [],
        linkedFileIds: linkedFileIds || [],
        linkedExamIds: linkedExamIds || [],
        directVideos: directVideos || [],
        directFiles: directFiles || [],
        directExams: directExams || [],
      });

      await onSave(dataToSave);
      onClose();
    } catch (err: any) {
      console.error('Error saving block edits:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-start sm:items-center justify-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl bg-zinc-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 text-right shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/30"
      >
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-400">تعديل الملحق والمستطيل المخصص</h3>
              <p className="text-xs text-zinc-400">تعديل اسم المستطيل، الشارة، المحتويات المرفقة، والروابط</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                اسم المستطيل / الملحق:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                نص الشارة العلوية للملحق:
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="مثال: ملحق إضافي، هام، دورة مكثفة..."
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                رابط خارجي مباشر عند النقر على الملحق (اختياري):
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                dir="ltr"
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm text-left font-mono focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                وصف الملحق ومحتوياته:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب نبذة عن هذا المستطيل وما يحتويه..."
                className="w-full px-3 py-2.5 rounded-xl border border-amber-500/30 bg-black/60 text-sm focus:outline-none focus:border-amber-400 text-zinc-100"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-black/50 space-y-4">
            <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>إدارة المحتويات المربوطة داخل هذا الملحق</span>
            </h4>

            {/* Sub-tabs */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveItemTab('videos')}
                className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeItemTab === 'videos'
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                الفيديوهات ({linkedVideoIds.length + directVideos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveItemTab('files')}
                className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeItemTab === 'files'
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                الملفات ({linkedFileIds.length + directFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveItemTab('exams')}
                className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeItemTab === 'exams'
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                الاختبارات ({linkedExamIds.length + directExams.length})
              </button>
            </div>

            {/* TAB 1: VIDEOS */}
            {activeItemTab === 'videos' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-300">
                  فيديوهات المنصة الحالية:
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {allVideos.map((v) => {
                    const isSelected = linkedVideoIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleToggleLinkedVideo(v.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span className="truncate">📹 {v.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                          {isSelected ? '✓ مضاف' : '+ إضافة'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Videos List */}
                {directVideos.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      فيديوهات مباشرة مضافة للملحق:
                    </label>
                    <div className="space-y-1.5">
                      {directVideos.map((dv) => (
                        <div
                          key={dv.id}
                          className="p-2 rounded-lg border border-zinc-800 bg-black/60 text-xs flex items-center justify-between"
                        >
                          <span className="truncate text-zinc-200">{dv.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDirectVideo(dv.id)}
                            className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: FILES */}
            {activeItemTab === 'files' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-300">
                  ملفات المنصة الحالية:
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {allFiles.map((f) => {
                    const isSelected = linkedFileIds.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleToggleLinkedFile(f.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span className="truncate">📄 {f.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                          {isSelected ? '✓ مضاف' : '+ إضافة'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Files List */}
                {directFiles.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      ملفات مباشرة مضافة للملحق:
                    </label>
                    <div className="space-y-1.5">
                      {directFiles.map((df) => (
                        <div
                          key={df.id}
                          className="p-2 rounded-lg border border-zinc-800 bg-black/60 text-xs flex items-center justify-between"
                        >
                          <span className="truncate text-zinc-200">{df.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDirectFile(df.id)}
                            className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EXAMS */}
            {activeItemTab === 'exams' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    اختبارات المنصة الحالية:
                  </label>
                  <span className="text-[11px] text-amber-400">
                    (عند إضافة اختبار، يظهر هنا فقط ويختفي من قسم الاختبارات)
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {allExams.map((ex) => {
                    const isSelected = linkedExamIds.includes(ex.id);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          if (isSelected) {
                            setExamToRemove({ id: ex.id, title: ex.title });
                          } else {
                            handleAddExamToBlock(ex.id);
                          }
                        }}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span className="truncate">📝 {ex.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-black font-black' : 'bg-black/40'}`}>
                          {isSelected ? '✓ في الملحق (انقر للحذف أو العودة)' : '+ إضافة للملحق'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Exams List */}
                {directExams.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      اختبارات مباشرة مضافة للملحق:
                    </label>
                    <div className="space-y-1.5">
                      {directExams.map((de) => (
                        <div
                          key={de.id}
                          className="p-2 rounded-lg border border-zinc-800 bg-black/60 text-xs flex items-center justify-between"
                        >
                          <span className="truncate text-zinc-200">{de.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDirectExam(de.id)}
                            className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Add Direct Item form */}
            <div className="pt-2 border-t border-zinc-800/80">
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                + إضافة عنصر مباشر جديد لهذا الملحق:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newDirectTitle}
                  onChange={(e) => setNewDirectTitle(e.target.value)}
                  placeholder="عنوان العنصر الجديد..."
                  className="sm:col-span-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200"
                />
                <input
                  type="text"
                  value={newDirectUrl}
                  onChange={(e) => setNewDirectUrl(e.target.value)}
                  placeholder="رابط الفيديو أو الملف أو الامتحان..."
                  dir="ltr"
                  className="sm:col-span-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddDirectItem}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 ml-1" />
                  <span>إضافة للملحق</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <AnimatedButton type="button" variant="outline" size="sm" onClick={onClose}>
              إلغاء
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="gold"
              size="sm"
              disabled={loading}
              icon={<Save className="w-4 h-4 ml-1" />}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ تعديلات الملحق بالكامل'}
            </AnimatedButton>
          </div>
        </form>

        {/* User-Requested Confirmation Modal on Exam Removal from Block */}
        <AnimatePresence>
          {examToRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md p-6 rounded-3xl border-2 border-amber-500/50 bg-zinc-950 text-right shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-black">
                  <HelpCircle className="w-5 h-5" />
                  <span>إزالة الاختبار من الملحق</span>
                </div>
                <h4 className="text-base font-bold text-zinc-100 mb-2">
                  ({examToRemove.title})
                </h4>
                <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
                  هل تود حذفه نهائياً من المنصة بالكامل، أم ترغب في عودته إلى قسم الاختبارات ليظهر هناك مجدداً؟
                </p>

                <div className="space-y-2.5">
                  <AnimatedButton
                    type="button"
                    variant="danger"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => handlePermanentDeleteExam(examToRemove.id)}
                    icon={<Trash2 className="w-4 h-4 ml-1" />}
                  >
                    حذف نهائياً (لن يعود أبداً)
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    variant="green"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => handleReturnExamToSection(examToRemove.id)}
                    icon={<RotateCcw className="w-4 h-4 ml-1" />}
                  >
                    عودته لقسم الاختبارات
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center mt-2"
                    onClick={() => setExamToRemove(null)}
                  >
                    إلغاء
                  </AnimatedButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
