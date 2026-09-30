import React, { useState } from 'react';
import {
  VideoItem,
  FileResource,
  Exam,
  Question,
  CustomBlock,
  LiveStreamConfig,
  UserProfile,
  PlatformLockConfig,
} from '../types';
import { AnimatedButton } from './AnimatedButton';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  FileText,
  HelpCircle,
  Tv,
  Users,
  Layers,
  PlusCircle,
  Trash2,
  Save,
  Check,
  X,
  Radio,
  ExternalLink,
  ArrowRight,
  Upload,
  Percent,
  CheckCircle,
  UserX,
  Globe,
  Monitor,
  Lock,
  Unlock,
  Wrench,
  Clock,
  Search,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { saveMediaItem, deleteMediaItem } from '../utils/storage';

interface AdminPanelProps {
  videos: VideoItem[];
  files: FileResource[];
  exams: Exam[];
  customBlocks: CustomBlock[];
  liveStream: LiveStreamConfig | null;
  students: UserProfile[];
  platformLock: PlatformLockConfig;
  onExitAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  videos,
  files,
  exams,
  customBlocks,
  liveStream,
  students,
  platformLock,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'files' | 'exams' | 'blocks' | 'live' | 'students' | 'platformLock'>('videos');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Platform Lock state
  const [platformLockState, setPlatformLockState] = useState<PlatformLockConfig>(
    platformLock || {
      isLocked: false,
      lockType: 'maintenance',
      whitelistedStudentIds: [],
      blacklistedStudentIds: [],
      lockTitle: '',
      lockMessage: '',
      updatedAt: new Date().toISOString(),
    }
  );

  React.useEffect(() => {
    if (platformLock) {
      setPlatformLockState(platformLock);
    }
  }, [platformLock]);

  // Student Individual Lock Target Modal & search queries
  const [studentLockModalTarget, setStudentLockModalTarget] = useState<UserProfile | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [lockSearchQuery, setLockSearchQuery] = useState('');

  // In-app deletion target (never use window.confirm!)
  const [deleteTarget, setDeleteTarget] = useState<{
    collectionName: string;
    id: string;
    title: string;
    isStudentBan?: boolean;
  } | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Perform safe in-app delete or student ban
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      if (deleteTarget.isStudentBan) {
        // Delete student from Firestore so platform locks on that specific student only
        const userRef = doc(db, 'users', deleteTarget.id);
        await deleteDoc(userRef);
        showNotification(`تم حذف حساب الطالب (${deleteTarget.title}) وإغلاق المنصة عليه فورياً`);
      } else {
        await deleteDoc(doc(db, deleteTarget.collectionName, deleteTarget.id));
        if (deleteTarget.collectionName === 'videos' || deleteTarget.collectionName === 'files') {
          await deleteMediaItem(deleteTarget.id);
        }
        showNotification(`تم حذف (${deleteTarget.title}) نهائياً`);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('حدث خطأ أثناء تنفيذ الحذف');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply individual student lock / unlock
  const handleApplyStudentLock = async (
    studentId: string,
    shouldLock: boolean,
    reason?: 'maintenance' | 'subscription'
  ) => {
    setIsSaving(true);
    try {
      const studentRef = doc(db, 'users', studentId);
      if (shouldLock) {
        await updateDoc(studentRef, {
          isLocked: true,
          lockReason: reason || 'maintenance',
        });
        showNotification(
          `تم قفل المنصة على الطالب (${reason === 'maintenance' ? 'بداعي الصيانة' : 'بداعي انتهاء الاشتراك'}) بنجاح`
        );
      } else {
        await updateDoc(studentRef, {
          isLocked: false,
          lockReason: null,
        });
        showNotification('تم فتح المنصة وإلغاء القفل عن الطالب بنجاح ✓');
      }
      setStudentLockModalTarget(null);
    } catch (err) {
      console.error('Student lock update error:', err);
      showNotification('حدث خطأ أثناء تحديث حالة الطالب');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Platform Lock Settings
  const handleSavePlatformLock = async () => {
    setIsSaving(true);
    try {
      const lockDocRef = doc(db, 'settings', 'platform_lock');
      const updatedConfig: PlatformLockConfig = {
        ...platformLockState,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(lockDocRef, updatedConfig);
      showNotification('تم حفظ إعدادات قفل المنصة وتطبيقها فورياً على جميع الطلاب بنجاح ✓');
    } catch (err) {
      console.error('Save platform lock error:', err);
      showNotification('حدث خطأ أثناء حفظ إعدادات قفل المنصة');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 1. Video Form State (Link OR Upload) ---
  const [videoTitle, setVideoTitle] = useState('');
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUploadedFile, setVideoUploadedFile] = useState<string>('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [selectedFileLinks, setSelectedFileLinks] = useState<string[]>([]);
  const [selectedExamLinks, setSelectedExamLinks] = useState<string[]>([]);

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setVideoUploadedFile(res);
        if (!videoTitle) setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = videoMode === 'url' ? videoUrl.trim() : 'indexeddb';
    if (!videoTitle.trim() || (videoMode === 'url' && !videoUrl.trim()) || (videoMode === 'upload' && !videoUploadedFile)) {
      alert('يرجى تحديد عنوان ورابط أو رفع ملف الفيديو');
      return;
    }

    setIsSaving(true);
    try {
      const newVideoData: any = {
        title: videoTitle.trim(),
        url: finalUrl,
        isUploadedFile: videoMode === 'upload',
        description: videoDesc.trim() || '',
        duration: videoDuration.trim() || '30 دقيقة',
        linkedFileIds: selectedFileLinks || [],
        linkedExamIds: selectedExamLinks || [],
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'videos'), newVideoData);
      
      // If uploaded from device, save to IndexedDB permanently so it never disappears
      if (videoMode === 'upload' && videoUploadedFile) {
        await saveMediaItem(docRef.id, videoUploadedFile);
      }

      setVideoTitle('');
      setVideoUrl('');
      setVideoUploadedFile('');
      setVideoDesc('');
      setVideoDuration('');
      setSelectedFileLinks([]);
      setSelectedExamLinks([]);
      showNotification('تم حفظ الفيديو بنجاح وربطه بالملفات والاختبارات!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'videos');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 2. File Form State (Link OR Upload) ---
  const [fileTitle, setFileTitle] = useState('');
  const [fileMode, setFileMode] = useState<'url' | 'upload'>('url');
  const [fileUrl, setFileUrl] = useState('');
  const [fileUploadedData, setFileUploadedData] = useState<string>('');
  const [fileDesc, setFileDesc] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileCat, setFileCat] = useState('مذكرات');

  const handleFileUploadDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileUploadedData(event.target?.result as string);
        if (!fileTitle) setFileTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const isHeavy = fileMode === 'upload' && fileUploadedData.length > 400000;
    const finalFileUrl = fileMode === 'url' ? fileUrl.trim() : (isHeavy ? 'indexeddb' : fileUploadedData);
    if (!fileTitle.trim() || (fileMode === 'url' && !fileUrl.trim()) || (fileMode === 'upload' && !fileUploadedData)) {
      alert('يرجى تحديد اسم الملف ورابطه أو رفع الملف');
      return;
    }

    setIsSaving(true);
    try {
      const newFileData: any = {
        title: fileTitle.trim(),
        fileUrl: finalFileUrl,
        isUploadedFile: fileMode === 'upload',
        description: fileDesc.trim() || '',
        fileType: fileType.trim() || 'PDF',
        category: fileCat.trim() || 'عام',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'files'), newFileData);

      if (fileMode === 'upload' && isHeavy) {
        await saveMediaItem(docRef.id, fileUploadedData);
      }

      setFileTitle('');
      setFileUrl('');
      setFileUploadedData('');
      setFileDesc('');
      showNotification('تمت إضافة الملف بنجاح وحفظه في المنصة!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'files');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Exam Form State: 2 Distinct Modes (External Exam VS Platform Exam) ---
  // Requirement: "عند اضافة الاختبار اجعل خيارين خيار اضافة اختبار خارجي والخانة الثانية اختبار من المنصة"
  const [examCreationType, setExamCreationType] = useState<'external' | 'platform'>('external');
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examDuration, setExamDuration] = useState(20);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [externalExamUrl, setExternalExamUrl] = useState('');
  const [examQuestions, setExamQuestions] = useState<Question[]>([
    {
      id: 'q_1',
      text: '',
      imageUrl: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
    },
  ]);

  const handleAddQuestionRow = () => {
    setExamQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length}`,
        text: '',
        imageUrl: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestionRow = (index: number) => {
    if (examQuestions.length <= 1) return;
    setExamQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    setExamQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    setExamQuestions((prev) => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = val;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  const handleQuestionImageUpload = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleQuestionChange(qIndex, 'imageUrl', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    if (examCreationType === 'external') {
      if (!externalExamUrl.trim()) {
        alert('يرجى وضع رابط الاختبار الخارجي (مثل Google Form أو رابط الامتحان)');
        return;
      }
    } else {
      const validQuestions = examQuestions.filter((q) => q.text.trim().length > 0);
      if (validQuestions.length === 0) {
        alert('يرجى كتابة سؤال واحد على الأقل في اختبار المنصة');
        return;
      }
    }

    setIsSaving(true);
    try {
      const validQuestions = examQuestions.filter((q) => q.text.trim().length > 0);
      const newExamData: any = {
        title: examTitle.trim(),
        description: examDesc.trim() || '',
        durationMinutes: Number(examDuration) || 20,
        passingPercentage: Number(passingPercentage) || 60,
        examType: examCreationType,
        createdAt: new Date().toISOString(),
        questions: examCreationType === 'platform'
          ? validQuestions.map((q) => ({
              id: q.id || `q_${Date.now()}`,
              text: q.text.trim(),
              imageUrl: q.imageUrl || '',
              options: q.options.map((opt, i) => opt.trim() || `الخيار ${i + 1}`),
              correctOptionIndex: q.correctOptionIndex || 0,
              explanation: q.explanation || '',
            }))
          : [],
      };

      if (examCreationType === 'external' && externalExamUrl.trim()) {
        newExamData.externalExamUrl = externalExamUrl.trim();
      }

      await addDoc(collection(db, 'exams'), newExamData);
      setExamTitle('');
      setExamDesc('');
      setExternalExamUrl('');
      setExamQuestions([
        {
          id: `q_${Date.now()}`,
          text: '',
          imageUrl: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        },
      ]);
      showNotification(
        examCreationType === 'external'
          ? 'تمت إضافة الاختبار الخارجي بنجاح!'
          : 'تم نشر اختبار المنصة التفاعلي بنجاح!'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'exams');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. Custom Blocks (الملحقات) ---
  const [blockTitle, setBlockTitle] = useState('');
  const [blockDesc, setBlockDesc] = useState('');
  const [blockBadge, setBlockBadge] = useState('ملحق جديد');
  const [blockLink, setBlockLink] = useState('');

  // Selected existing platform items
  const [blockSelectedVideos, setBlockSelectedVideos] = useState<string[]>([]);
  const [blockSelectedFiles, setBlockSelectedFiles] = useState<string[]>([]);
  const [blockSelectedExams, setBlockSelectedExams] = useState<string[]>([]);

  // Direct items attached to this block
  const [blockDirectVideos, setBlockDirectVideos] = useState<{ id: string; title: string; url: string }[]>([]);
  const [blockDirectFiles, setBlockDirectFiles] = useState<{ id: string; title: string; url: string; type?: string }[]>([]);
  const [blockDirectExams, setBlockDirectExams] = useState<{ id: string; title: string; url: string }[]>([]);

  // Active sub-tab inside the creation form
  const [blockItemTab, setBlockItemTab] = useState<'videos' | 'files' | 'exams'>('videos');

  // Direct items input states
  const [directVideoTitle, setDirectVideoTitle] = useState('');
  const [directVideoUrl, setDirectVideoUrl] = useState('');

  const [directFileTitle, setDirectFileTitle] = useState('');
  const [directFileUrl, setDirectFileUrl] = useState('');
  const [directFileType, setDirectFileType] = useState('PDF');

  const [directExamTitle, setDirectExamTitle] = useState('');
  const [directExamUrl, setDirectExamUrl] = useState('');

  const handleAddDirectVideo = () => {
    if (!directVideoTitle.trim() || !directVideoUrl.trim()) return;
    setBlockDirectVideos((prev) => [
      ...prev,
      { id: `dv_${Date.now()}`, title: directVideoTitle.trim(), url: directVideoUrl.trim() },
    ]);
    setDirectVideoTitle('');
    setDirectVideoUrl('');
  };

  const handleAddDirectFile = () => {
    if (!directFileTitle.trim() || !directFileUrl.trim()) return;
    setBlockDirectFiles((prev) => [
      ...prev,
      {
        id: `df_${Date.now()}`,
        title: directFileTitle.trim(),
        url: directFileUrl.trim(),
        type: directFileType.trim() || 'PDF',
      },
    ]);
    setDirectFileTitle('');
    setDirectFileUrl('');
  };

  const handleAddDirectExam = () => {
    if (!directExamTitle.trim() || !directExamUrl.trim()) return;
    setBlockDirectExams((prev) => [
      ...prev,
      { id: `de_${Date.now()}`, title: directExamTitle.trim(), url: directExamUrl.trim() },
    ]);
    setDirectExamTitle('');
    setDirectExamUrl('');
  };

  const handleAddCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;

    setIsSaving(true);
    try {
      const newBlock: any = {
        title: blockTitle.trim(),
        description: blockDesc.trim() || '',
        badge: blockBadge.trim() || 'ملحق',
        linkedVideoIds: blockSelectedVideos,
        linkedFileIds: blockSelectedFiles,
        linkedExamIds: blockSelectedExams,
        directVideos: blockDirectVideos,
        directFiles: blockDirectFiles,
        directExams: blockDirectExams,
        createdAt: new Date().toISOString(),
      };
      if (blockLink.trim()) {
        newBlock.linkUrl = blockLink.trim();
      }

      await addDoc(collection(db, 'custom_blocks'), newBlock);
      setBlockTitle('');
      setBlockDesc('');
      setBlockBadge('ملحق جديد');
      setBlockLink('');
      setBlockSelectedVideos([]);
      setBlockSelectedFiles([]);
      setBlockSelectedExams([]);
      setBlockDirectVideos([]);
      setBlockDirectFiles([]);
      setBlockDirectExams([]);
      showNotification('تم إنشاء الملحق وحفظ كافة الملفات والفيديوهات والاختبارات التابعة له بنجاح!');
    } catch (err) {
      console.error('Failed to add custom block:', err);
      showNotification('حدث خطأ أثناء إضافة الملحق');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 5. Live Stream Management ---
  const [streamActive, setStreamActive] = useState<boolean>(liveStream?.isActive || false);
  const [streamTitle, setStreamTitle] = useState(liveStream?.title || 'بث المراجعة المباشرة');
  const [streamUrl, setStreamUrl] = useState(liveStream?.streamUrl || '');
  const [streamDesc, setStreamDesc] = useState(liveStream?.description || 'انضم الآن لطرح أسئلتك والمتابعة مع المعلم');

  const handleSaveLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const streamData: LiveStreamConfig = {
        isActive: streamActive,
        title: streamTitle.trim() || 'البث المباشر',
        streamUrl: streamUrl.trim(),
        description: streamDesc.trim() || '',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'live_stream', 'current'), streamData);
      showNotification(
        streamActive
          ? 'تم تفعيل البث وحفظه! سيظهر الآن المستطيل الأخضر للطلاب ليفتح يوتيوب/زوم مباشرة.'
          : 'تم حفظ إعدادات البث بنجاح.'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'live_stream/current');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-right pb-24">
      
      {/* Admin Header */}
      <div className="p-6 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/50 via-zinc-950 to-amber-950/50 dark:from-black dark:to-zinc-950 light:from-amber-50 light:to-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              لوحة الإدارة والتحكم
            </span>
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            قسم التحكم - منصة ALPHA
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            إدارة كاملة للفيديوهات، الملفات، الاختبارات، وحظر الطلاب، مع حفظ دائم في Firebase
          </p>
        </div>

        <AnimatedButton
          variant="outline"
          size="md"
          onClick={onExitAdmin}
          icon={<ArrowRight className="w-4 h-4 ml-1" />}
        >
          العودة للمنصة
        </AnimatedButton>
      </div>

      {/* Success Notification Bar */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/80 dark:bg-zinc-950/80 light:bg-zinc-100 border border-amber-500/30">
        {[
          { id: 'videos', label: 'الفيديوهات', icon: <Video className="w-4 h-4" />, count: videos.length },
          { id: 'files', label: 'الملفات والمذكرات', icon: <FileText className="w-4 h-4" />, count: files.length },
          { id: 'exams', label: 'الاختبارات والأسئلة', icon: <HelpCircle className="w-4 h-4" />, count: exams.length },
          { id: 'blocks', label: 'الملحقات', icon: <Layers className="w-4 h-4" />, count: customBlocks.length },
          { id: 'live', label: 'البث المباشر', icon: <Tv className="w-4 h-4" />, active: liveStream?.isActive },
          { id: 'students', label: 'الطلاب والتحكم بالحسابات', icon: <Users className="w-4 h-4" />, count: students.length },
          {
            id: 'platformLock',
            label: 'قفل المنصة',
            icon: <Lock className="w-4 h-4" />,
            badge: platformLockState.isLocked ? 'مقفل' : 'مفتوح',
            badgeColor: platformLockState.isLocked ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400',
          },
        ].map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/30 font-black">
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            )}
            {tab.active && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        ))}
      </div>

      {/* --- TAB 1: VIDEOS MANAGEMENT --- */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Video Form */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/35 bg-black/80 dark:bg-black/80 light:bg-white shadow-xl">
            <h3 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>إضافة فيديو (رابط أو رفع من المنصة)</span>
            </h3>

            {/* Video Input Mode Switch */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-amber-500/20 mb-4">
              <button
                type="button"
                onClick={() => setVideoMode('url')}
                className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  videoMode === 'url' ? 'bg-amber-500 text-black' : 'text-zinc-400'
                }`}
              >
                رابط (YouTube/Vimeo)
              </button>
              <button
                type="button"
                onClick={() => setVideoMode('upload')}
                className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  videoMode === 'upload' ? 'bg-amber-500 text-black' : 'text-zinc-400'
                }`}
              >
                رفع فيديو من المنصة
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                  عنوان الفيديو:
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="مثال: شرح الدرس الأول - الرياضيات"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              {videoMode === 'url' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    رابط الفيديو:
                  </label>
                  <input
                    type="url"
                    required={videoMode === 'url'}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    رفع ملف الفيديو (يبقى محفوظاً دائماً):
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer text-xs text-amber-400">
                    <Upload className="w-6 h-6 mb-1" />
                    <span>{videoUploadedFile ? 'تم اختيار وتثبيت الفيديو بنجاح ✓' : 'انقر لاختيار فيديو من جهازك'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                  المدة (مثال: 45 دقيقة):
                </label>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  placeholder="40 دقيقة"
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                  وصف الفيديو:
                </label>
                <textarea
                  rows={2}
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  placeholder="وصف تفصيلي لمحتوى المحاضرة..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              {/* Linked Files & Exams */}
              <div className="pt-2 border-t border-amber-500/20">
                <label className="block text-xs font-black text-amber-400 mb-2">
                  ربط ملفات بهذا الفيديو:
                </label>
                {files.length === 0 ? (
                  <p className="text-[11px] text-zinc-500">لا توجد ملفات مضافة بعد لربطها.</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {files.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFileLinks.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFileLinks((prev) => [...prev, f.id]);
                            } else {
                              setSelectedFileLinks((prev) => prev.filter((id) => id !== f.id));
                            }
                          }}
                          className="accent-amber-500"
                        />
                        <span className="line-clamp-1">{f.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-amber-500/20">
                <label className="block text-xs font-black text-amber-400 mb-2">
                  ربط اختبارات بهذا الفيديو:
                </label>
                {exams.length === 0 ? (
                  <p className="text-[11px] text-zinc-500">لا توجد اختبارات مضافة بعد لربطها.</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {exams.map((ex) => (
                      <label key={ex.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedExamLinks.includes(ex.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExamLinks((prev) => [...prev, ex.id]);
                            } else {
                              setSelectedExamLinks((prev) => prev.filter((id) => id !== ex.id));
                            }
                          }}
                          className="accent-amber-500"
                        />
                        <span className="line-clamp-1">{ex.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <AnimatedButton
                type="submit"
                variant="gold"
                size="md"
                disabled={isSaving}
                className="w-full mt-2"
                icon={<Save className="w-4 h-4 ml-1" />}
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ الفيديو والروابط'}
              </AnimatedButton>
            </form>
          </div>

          {/* Videos List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-black text-amber-400">
              الفيديوهات المسجلة بالمنصة ({videos.length})
            </h3>

            {videos.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-amber-500/30 bg-black/40 text-zinc-400 text-xs">
                لا توجد فيديوهات بعد.
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="p-4 rounded-2xl border border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {vid.isUploadedFile && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            مرفوع من المنصة
                          </span>
                        )}
                        <span className="text-sm font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                          {vid.title}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        {vid.description || vid.url}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-amber-500 mt-2">
                        <span>المدة: {vid.duration || '30 د'}</span>
                        <span>• ملفات مربوطة: {vid.linkedFileIds?.length || 0}</span>
                        <span>• اختبارات مربوطة: {vid.linkedExamIds?.length || 0}</span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          collectionName: 'videos',
                          id: vid.id,
                          title: vid.title,
                        })
                      }
                      title="حذف الفيديو نهائياً"
                      className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: FILES MANAGEMENT --- */}
      {activeTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add File Form */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/35 bg-black/80 dark:bg-black/80 light:bg-white shadow-xl">
            <h3 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>إضافة ملف (رابط أو رفع من المنصة)</span>
            </h3>

            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-amber-500/20 mb-4">
              <button
                type="button"
                onClick={() => setFileMode('url')}
                className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  fileMode === 'url' ? 'bg-amber-500 text-black' : 'text-zinc-400'
                }`}
              >
                رابط ملف خارجي
              </button>
              <button
                type="button"
                onClick={() => setFileMode('upload')}
                className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  fileMode === 'upload' ? 'bg-amber-500 text-black' : 'text-zinc-400'
                }`}
              >
                رفع ملف من جهازك
              </button>
            </div>

            <form onSubmit={handleAddFile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                  اسم الملف:
                </label>
                <input
                  type="text"
                  required
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="مثال: مذكرة مراجعة ليلة الامتحان"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              {fileMode === 'url' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    رابط الملف المباشر أو Google Drive:
                  </label>
                  <input
                    type="url"
                    required={fileMode === 'url'}
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    رفع الملف (PDF, صور, مستندات):
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer text-xs text-amber-400">
                    <Upload className="w-6 h-6 mb-1" />
                    <span>{fileUploadedData ? 'تم اختيار الملف بنجاح ✓' : 'انقر لاختيار ملف من جهازك'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                      onChange={handleFileUploadDevice}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    النوع:
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  >
                    <option value="PDF">PDF</option>
                    <option value="مذكرة">مذكرة</option>
                    <option value="ملخص">ملخص</option>
                    <option value="واجب">واجب</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                    التصنيف:
                  </label>
                  <input
                    type="text"
                    value={fileCat}
                    onChange={(e) => setFileCat(e.target.value)}
                    placeholder="مثال: مراجعة نهائية"
                    className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                  وصف مختصر:
                </label>
                <textarea
                  rows={2}
                  value={fileDesc}
                  onChange={(e) => setFileDesc(e.target.value)}
                  placeholder="تفاصيل عن محتوى الملف..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              <AnimatedButton
                type="submit"
                variant="gold"
                size="md"
                disabled={isSaving}
                className="w-full mt-2"
                icon={<Save className="w-4 h-4 ml-1" />}
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ الملف في المنصة'}
              </AnimatedButton>
            </form>
          </div>

          {/* Files List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-black text-amber-400">
              الملفات المتاحة بالمنصة ({files.length})
            </h3>

            {files.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-amber-500/30 bg-black/40 text-zinc-400 text-xs">
                لا توجد ملفات بعد.
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl border border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {file.fileType}
                        </span>
                        {file.isUploadedFile && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            مرفوع من المنصة
                          </span>
                        )}
                        <span className="text-sm font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                          {file.title}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 line-clamp-1">
                        {file.description || file.fileUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            collectionName: 'files',
                            id: file.id,
                            title: file.title,
                          })
                        }
                        title="حذف الملف نهائياً"
                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: EXAMS (Option 1: External Exam | Option 2: Platform Exam) --- */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border-2 border-amber-500/35 bg-black/80 dark:bg-black/80 light:bg-white shadow-xl">
            <h3 className="text-xl font-black text-amber-400 mb-3 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>إضافة اختبار جديد</span>
            </h3>

            {/* The 2 distinct choices requested by user */}
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900 border-2 border-amber-500/30 mb-6">
              <button
                type="button"
                onClick={() => setExamCreationType('external')}
                className={`py-3 px-4 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  examCreationType === 'external'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>الخيار الأول: إضافة اختبار خارجي</span>
              </button>
              <button
                type="button"
                onClick={() => setExamCreationType('platform')}
                className={`py-3 px-4 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  examCreationType === 'platform'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>الخانة الثانية: اختبار من المنصة</span>
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-6">
              {/* Common Exam Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">عنوان الاختبار:</label>
                  <input
                    type="text"
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="مثال: الاختبار الشامل للوحدة الأولى"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">المدة بالدقائق:</label>
                  <input
                    type="number"
                    min="1"
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-400 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>نسبة النجاح (%):</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">وصف الاختبار (اختياري):</label>
                <input
                  type="text"
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  placeholder="ملاحظات وتوجيهات للطلاب..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              {/* Branch 1: External Exam Input */}
              {examCreationType === 'external' ? (
                <div className="p-5 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Globe className="w-5 h-5" />
                    <span>رابط الاختبار الخارجي المتكامل</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    ضع رابط الاختبار المجهز مسبقاً (مثل نماذج Google Forms، Microsoft Forms، LiveQuiz، Quizizz وغيرها).
                  </p>
                  <input
                    type="url"
                    required={examCreationType === 'external'}
                    value={externalExamUrl}
                    onChange={(e) => setExternalExamUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/... أو رابط الاختبار"
                    className="w-full px-4 py-3 rounded-xl border border-amber-500/40 bg-black/60 dark:bg-black/60 light:bg-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>
              ) : (
                /* Branch 2: Platform Interactive Exam Builder */
                <div className="space-y-6 pt-4 border-t border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-amber-400">
                      أسئلة الاختبار من المنصة ({examQuestions.length}):
                    </h4>

                    <AnimatedButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddQuestionRow}
                      icon={<PlusCircle className="w-4 h-4 ml-1" />}
                    >
                      إضافة سؤال آخر
                    </AnimatedButton>
                  </div>

                  {examQuestions.map((question, qIdx) => (
                    <div
                      key={question.id || qIdx}
                      className="p-5 rounded-2xl border-2 border-amber-500/30 bg-zinc-950/70 dark:bg-zinc-950/70 light:bg-zinc-50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          السؤال {qIdx + 1}
                        </span>

                        {examQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionRow(qIdx)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف السؤال</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">صيغة السؤال:</label>
                        <input
                          type="text"
                          required={examCreationType === 'platform'}
                          value={question.text}
                          onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                          placeholder="اكتب منطوق السؤال هنا..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-white text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                        />
                      </div>

                      {/* Question Image (Upload from device OR paste link) */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center justify-between">
                          <span>صورة السؤال (رفع من الجهاز أو رابط مباشر):</span>
                          {question.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIdx, 'imageUrl', '')}
                              className="text-[10px] text-red-400 hover:underline cursor-pointer"
                            >
                              إزالة الصورة
                            </button>
                          )}
                        </label>

                        <div className="flex gap-2 mb-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-400 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>رفع صورة السؤال من جهازك</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleQuestionImageUpload(qIdx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <input
                          type="url"
                          value={question.imageUrl || ''}
                          onChange={(e) => handleQuestionChange(qIdx, 'imageUrl', e.target.value)}
                          placeholder="أو ضع رابط صورة مباشر https://..."
                          className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-white text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                        />

                        {question.imageUrl && (
                          <div className="mt-2 max-w-xs rounded-lg overflow-hidden border border-amber-500/30 mx-auto">
                            <img src={question.imageUrl} alt="معاينة" className="w-full h-28 object-contain bg-black" />
                          </div>
                        )}
                      </div>

                      {/* 4 Choices */}
                      <div>
                        <label className="block text-xs font-black text-amber-400 mb-2">
                          الخيارات الأربعة (حدد الإجابة الصحيحة بالدائرة):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {question.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                question.correctOptionIndex === oIdx
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : 'border-zinc-800 bg-black/40'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct_admin_${qIdx}`}
                                checked={question.correctOptionIndex === oIdx}
                                onChange={() => handleQuestionChange(qIdx, 'correctOptionIndex', oIdx)}
                                className="accent-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                              />
                              <input
                                type="text"
                                required={examCreationType === 'platform'}
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                placeholder={`الخيار (${String.fromCharCode(65 + oIdx)})`}
                                className="flex-1 bg-transparent text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900 focus:outline-none"
                              />
                              {question.correctOptionIndex === oIdx && (
                                <span className="text-[10px] font-black text-emerald-400 shrink-0">
                                  صحيحة ✓
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <AnimatedButton
                  type="submit"
                  variant="gold"
                  size="lg"
                  disabled={isSaving}
                  className="flex-1"
                  icon={<Save className="w-5 h-5 ml-1" />}
                >
                  {isSaving
                    ? 'جاري الحفظ...'
                    : examCreationType === 'external'
                    ? 'حفظ ونشر الاختبار الخارجي'
                    : 'حفظ ونشر اختبار المنصة'}
                </AnimatedButton>
              </div>
            </form>
          </div>

          {/* Existing Exams list */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-amber-400">
              الاختبارات المنشورة ({exams.length})
            </h3>

            {exams.length === 0 ? (
              <p className="text-xs text-zinc-400">لا توجد اختبارات منشورة حتى الآن.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-4 rounded-2xl border border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                          {ex.examType === 'external' ? 'اختبار خارجي' : 'من المنصة'}
                        </span>
                        <div className="text-base font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                          {ex.title}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        المدة: {ex.durationMinutes} د • نسبة النجاح: {ex.passingPercentage || 60}%
                        {ex.examType === 'platform' && ` • ${ex.questions?.length || 0} أسئلة`}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          collectionName: 'exams',
                          id: ex.id,
                          title: ex.title,
                        })
                      }
                      title="حذف الاختبار نهائياً"
                      className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: CUSTOM BLOCKS (الملحقات) --- */}
      {activeTab === 'blocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add Custom Block Form */}
          <div className="lg:col-span-6 p-6 rounded-3xl border-2 border-amber-500/35 bg-black/80 dark:bg-black/80 light:bg-white shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                الملحقات
              </span>
            </div>
            <h3 className="text-xl font-black text-amber-400 mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>إنشاء مستطيل ملحق جديد</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              يمكنك ربط وإضافة ملفات، فيديوهات، واختبارات داخل هذا المستطيل ليتمكن الطلاب من تصفحها وخوض اختباراتها عند فتح الملحق.
            </p>

            <form onSubmit={handleAddCustomBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">اسم الملحق / المستطيل: *</label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="مثال: تجميعات النماذج الشاملة"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">وصف الملحق:</label>
                <textarea
                  rows={2}
                  value={blockDesc}
                  onChange={(e) => setBlockDesc(e.target.value)}
                  placeholder="وصف لما يحتويه هذا الملحق..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">الشارة التوضيحية (Badge):</label>
                  <input
                    type="text"
                    value={blockBadge}
                    onChange={(e) => setBlockBadge(e.target.value)}
                    placeholder="مثال: مميز، جديد، تجميعات"
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">رابط خارجي عام (اختياري):</label>
                  <input
                    type="url"
                    value={blockLink}
                    onChange={(e) => setBlockLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
                  />
                </div>
              </div>

              {/* Items Attachment Area (ملفات، فيديوهات، اختبارات) */}
              <div className="mt-5 pt-4 border-t border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-amber-400">
                    محتويات الملحق (اختر أو أضف ملفات وفيديوهات واختبارات):
                  </span>
                </div>

                {/* Sub-tabs selector for items */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-amber-500/30 mb-3">
                  <button
                    type="button"
                    onClick={() => setBlockItemTab('videos')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      blockItemTab === 'videos'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>فيديوهات ({blockSelectedVideos.length + blockDirectVideos.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockItemTab('files')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      blockItemTab === 'files'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ملفات ({blockSelectedFiles.length + blockDirectFiles.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockItemTab('exams')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      blockItemTab === 'exams'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>اختبارات ({blockSelectedExams.length + blockDirectExams.length})</span>
                  </button>
                </div>

                {/* --- VIDEOS TAB --- */}
                {blockItemTab === 'videos' && (
                  <div className="space-y-3">
                    {/* Pick existing videos */}
                    <div>
                      <div className="text-[11px] font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                        <span>اختر من فيديوهات المنصة الحالية:</span>
                        <span className="text-amber-400 font-bold">{blockSelectedVideos.length} محددة</span>
                      </div>
                      {videos.length === 0 ? (
                        <div className="text-[11px] text-zinc-500 p-2 bg-zinc-900/40 rounded-lg">لا توجد فيديوهات مسجلة في المنصة بعد.</div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-zinc-800">
                          {videos.map((vid) => {
                            const isChecked = blockSelectedVideos.includes(vid.id);
                            return (
                              <label
                                key={vid.id}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBlockSelectedVideos((prev) => [...prev, vid.id]);
                                    } else {
                                      setBlockSelectedVideos((prev) => prev.filter((id) => id !== vid.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-amber-500"
                                />
                                <span className="truncate flex-1">{vid.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add direct video specifically to this block */}
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                      <span className="text-[11px] font-bold text-zinc-300 block">أو أضف فيديو جديد برابط مباشر خاص بهذا الملحق:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={directVideoTitle}
                          onChange={(e) => setDirectVideoTitle(e.target.value)}
                          placeholder="عنوان الفيديو..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                        <input
                          type="url"
                          value={directVideoUrl}
                          onChange={(e) => setDirectVideoUrl(e.target.value)}
                          placeholder="رابط الفيديو (YouTube/MP4)..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDirectVideo}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة الفيديو للملحق</span>
                      </button>

                      {blockDirectVideos.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {blockDirectVideos.map((dv) => (
                            <div key={dv.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                              <span className="truncate">{dv.title}</span>
                              <button
                                type="button"
                                onClick={() => setBlockDirectVideos((prev) => prev.filter((item) => item.id !== dv.id))}
                                className="text-red-400 hover:text-red-300 mr-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- FILES TAB --- */}
                {blockItemTab === 'files' && (
                  <div className="space-y-3">
                    {/* Pick existing files */}
                    <div>
                      <div className="text-[11px] font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                        <span>اختر من ملفات ومذكرات المنصة:</span>
                        <span className="text-amber-400 font-bold">{blockSelectedFiles.length} محددة</span>
                      </div>
                      {files.length === 0 ? (
                        <div className="text-[11px] text-zinc-500 p-2 bg-zinc-900/40 rounded-lg">لا توجد ملفات مسجلة في المنصة بعد.</div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-zinc-800">
                          {files.map((f) => {
                            const isChecked = blockSelectedFiles.includes(f.id);
                            return (
                              <label
                                key={f.id}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBlockSelectedFiles((prev) => [...prev, f.id]);
                                    } else {
                                      setBlockSelectedFiles((prev) => prev.filter((id) => id !== f.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-amber-500"
                                />
                                <span className="truncate flex-1">{f.title}</span>
                                <span className="text-[10px] text-zinc-500">{f.fileType}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add direct file */}
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                      <span className="text-[11px] font-bold text-zinc-300 block">أو أضف ملفاً برابط مباشر خاص بهذا الملحق:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={directFileTitle}
                          onChange={(e) => setDirectFileTitle(e.target.value)}
                          placeholder="اسم الملف / المذكرة..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                        <input
                          type="url"
                          value={directFileUrl}
                          onChange={(e) => setDirectFileUrl(e.target.value)}
                          placeholder="رابط الملف (PDF)..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={directFileType}
                          onChange={(e) => setDirectFileType(e.target.value)}
                          placeholder="النوع: PDF، مذكرة..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDirectFile}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة الملف للملحق</span>
                      </button>

                      {blockDirectFiles.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {blockDirectFiles.map((df) => (
                            <div key={df.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                              <span className="truncate">{df.title} ({df.type})</span>
                              <button
                                type="button"
                                onClick={() => setBlockDirectFiles((prev) => prev.filter((item) => item.id !== df.id))}
                                className="text-red-400 hover:text-red-300 mr-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- EXAMS TAB --- */}
                {blockItemTab === 'exams' && (
                  <div className="space-y-3">
                    {/* Pick existing exams */}
                    <div>
                      <div className="text-[11px] font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                        <span>اختر من اختبارات المنصة الحالية:</span>
                        <span className="text-amber-400 font-bold">{blockSelectedExams.length} محددة</span>
                      </div>
                      {exams.length === 0 ? (
                        <div className="text-[11px] text-zinc-500 p-2 bg-zinc-900/40 rounded-lg">لا توجد اختبارات مسجلة في المنصة بعد.</div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-zinc-800">
                          {exams.map((ex) => {
                            const isChecked = blockSelectedExams.includes(ex.id);
                            return (
                              <label
                                key={ex.id}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBlockSelectedExams((prev) => [...prev, ex.id]);
                                    } else {
                                      setBlockSelectedExams((prev) => prev.filter((id) => id !== ex.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-amber-500"
                                />
                                <span className="truncate flex-1">{ex.title}</span>
                                <span className="text-[10px] text-zinc-500">{ex.durationMinutes} دقيقة</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add direct exam */}
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                      <span className="text-[11px] font-bold text-zinc-300 block">أو أضف اختباراً برابط خارجي (Google Forms أو غيره):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={directExamTitle}
                          onChange={(e) => setDirectExamTitle(e.target.value)}
                          placeholder="عنوان الاختبار..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                        <input
                          type="url"
                          value={directExamUrl}
                          onChange={(e) => setDirectExamUrl(e.target.value)}
                          placeholder="رابط الاختبار الخارجي..."
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-black/50 text-xs text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDirectExam}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إضافة الاختبار للملحق</span>
                      </button>

                      {blockDirectExams.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {blockDirectExams.map((de) => (
                            <div key={de.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                              <span className="truncate">{de.title}</span>
                              <button
                                type="button"
                                onClick={() => setBlockDirectExams((prev) => prev.filter((item) => item.id !== de.id))}
                                className="text-red-400 hover:text-red-300 mr-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <AnimatedButton
                type="submit"
                variant="gold"
                size="md"
                disabled={isSaving}
                className="w-full mt-4"
                icon={<Save className="w-4 h-4 ml-1" />}
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ ونشر الملحق في المنصة'}
              </AnimatedButton>
            </form>
          </div>

          {/* Custom Blocks List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-amber-400">
                قائمة الملحقات الحالية ({customBlocks.length})
              </h3>
              <span className="text-xs text-zinc-400 font-medium">
                تظهر للطلاب في الصفحة الرئيسية
              </span>
            </div>

            {customBlocks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-amber-500/30 bg-black/40 text-zinc-400 text-xs">
                لا توجد ملحقات مضافة بعد. أنشئ ملحقاً وضع بداخله ما تشاء من ملفات وفيديوهات واختبارات.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customBlocks.map((b) => {
                  const vCount = (b.linkedVideoIds?.length || 0) + (b.directVideos?.length || 0);
                  const fCount = (b.linkedFileIds?.length || 0) + (b.directFiles?.length || 0);
                  const eCount = (b.linkedExamIds?.length || 0) + (b.directExams?.length || 0);

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            {b.badge || 'ملحق'}
                          </span>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                collectionName: 'custom_blocks',
                                id: b.id,
                                title: b.title,
                              })
                            }
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-base font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                          {b.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {b.description || 'ملحق تعليمي تفاعلي'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                          {vCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              {vCount} فيديو
                            </span>
                          )}
                          {fCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {fCount} ملف
                            </span>
                          )}
                          {eCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {eCount} اختبار
                            </span>
                          )}
                          {vCount === 0 && fCount === 0 && eCount === 0 && (
                            <span className="text-zinc-500">لا توجد محتويات مرفقة</span>
                          )}
                        </div>

                        {b.linkUrl && (
                          <div className="text-[11px] text-amber-400 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{b.linkUrl}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 5: LIVE STREAM MANAGEMENT --- */}
      {activeTab === 'live' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border-2 border-amber-500/40 bg-black/80 dark:bg-black/80 light:bg-white shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-amber-400">
                إدارة البث المباشر (المستطيل الأخضر)
              </h3>
              <p className="text-xs text-zinc-400">
                بمجرد تفعيل البث، سيظهر فوراً لجميع الطلاب مستطيل كبير أخضر يأخذهم مباشرة لليوتيوب أو الزوم
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveLiveStream} className="space-y-5">
            <div className="p-4 rounded-2xl border-2 border-amber-500/30 bg-zinc-950/60 dark:bg-zinc-950/60 light:bg-zinc-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                  حالة البث المباشر
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {streamActive ? 'البث فعال الآن (المستطيل الأخضر ظاهر للطلاب)' : 'البث متوقف حالياً'}
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={streamActive}
                  onChange={(e) => setStreamActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                عنوان البث:
              </label>
              <input
                type="text"
                required
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="مثال: البث المباشر لحل التجميعات النهائية"
                className="w-full px-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                رابط البث (YouTube Live أو Zoom أو Teams):
              </label>
              <input
                type="url"
                required
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/... أو https://zoom.us/j/..."
                className="w-full px-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                وصف البث (اختياري):
              </label>
              <textarea
                rows={2}
                value={streamDesc}
                onChange={(e) => setStreamDesc(e.target.value)}
                placeholder="ملاحظات للطلاب قبل الانضمام..."
                className="w-full px-4 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>

            <AnimatedButton
              type="submit"
              variant={streamActive ? 'green' : 'gold'}
              size="lg"
              disabled={isSaving}
              className="w-full"
              icon={<Save className="w-5 h-5 ml-1" />}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات البث وتحديث حالة الطلاب'}
            </AnimatedButton>
          </form>
        </div>
      )}

      {/* --- TAB 6: STUDENTS CONTROL & ACCOUNT DELETION --- */}
      {/* Requirement: "عند دخول كل طالب للمنصة وتسجيل دخوله يمكنني قفل عليه المنصة بداعي الصيانة او انتهاء الاشتراك ويمكنني فتحه مرة اخرى" */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-amber-400">
                سجل الطلاب والتحكم بحساباتهم ({students.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                يمكنك قفل المنصة على أي طالب فردي بداعي الصيانة أو الاشتراك وفتحها مجدداً، أو حذف حسابه نهائياً
              </p>
            </div>

            {/* Student Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب أو بريده..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-amber-500/20 bg-black/40 text-zinc-400 text-xs">
              لم يقم أي طالب بتسجيل الدخول بعد.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border-2 border-amber-500/30 bg-black/70 dark:bg-black/70 light:bg-white shadow-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 font-black">
                  <tr>
                    <th className="p-4">اسم الطالب</th>
                    <th className="p-4">البريد الإلكتروني</th>
                    <th className="p-4">حالة الدخول للمنصة</th>
                    <th className="p-4">الفيديوهات المؤكدة</th>
                    <th className="p-4">الاختبارات المنجزة</th>
                    <th className="p-4">المعدل العام</th>
                    <th className="p-4 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 dark:divide-zinc-800 light:divide-zinc-200">
                  {students
                    .filter((s) => {
                      if (!studentSearchQuery.trim()) return true;
                      const q = studentSearchQuery.toLowerCase();
                      return (
                        s.name?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((student) => (
                      <tr key={student.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="p-4 font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                          {student.name || 'طالب ألفا'}
                        </td>
                        <td className="p-4 text-zinc-400 font-mono">
                          {student.email || '—'}
                        </td>
                        <td className="p-4">
                          {student.isLocked ? (
                            student.lockReason === 'subscription' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-bold text-[11px]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>مقفل (انتهاء اشتراك)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[11px]">
                                <Wrench className="w-3.5 h-3.5" />
                                <span>مقفل (صيانة)</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>نشط ومتاح للدخول</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">
                            {student.watchedVideoIds?.length || 0} فيديو
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold border border-yellow-500/20">
                            {student.completedTestsCount || 0} اختبار
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-lg font-black ${
                              (student.averageScore || 0) >= 90
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : (student.averageScore || 0) >= 70
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {student.averageScore || 0}%
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Lock / Unlock Toggle Button */}
                            {student.isLocked ? (
                              <button
                                onClick={() => handleApplyStudentLock(student.id, false)}
                                title="إلغاء القفل وفتح المنصة للطالب"
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all font-bold flex items-center gap-1 text-[11px] cursor-pointer shadow-sm"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>فتح المنصة</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setStudentLockModalTarget(student)}
                                title="قفل المنصة على هذا الطالب"
                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-all font-bold flex items-center gap-1 text-[11px] cursor-pointer shadow-sm"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>قفل المنصة</span>
                              </button>
                            )}

                            {/* Delete Student Button */}
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  collectionName: 'users',
                                  id: student.id,
                                  title: student.name || student.email,
                                  isStudentBan: true,
                                })
                              }
                              title="حذف حساب الطالب نهائياً"
                              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 7: GLOBAL PLATFORM LOCK (قفل المنصة) --- */}
      {/* Requirement: "ضيفلي زر في قسم التحكم اسمه قفل المنصة ويكون في خيارين قفل المنصة بداعي الصيانة وقفلها بداعي الاشتراك ويمكنني قفلها على الجميع وافتحها على اشخاص معينين ويمكنني فتحها عالجميع وقفلها على اشخاص معينين" */}
      {activeTab === 'platformLock' && (
        <div className="space-y-6">
          {/* Header Status Card */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/40 bg-zinc-950/80 dark:bg-zinc-950/80 light:bg-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  platformLockState.isLocked
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                {platformLockState.isLocked ? (
                  <Lock className="w-7 h-7 animate-pulse" />
                ) : (
                  <Unlock className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                    نظام قفل المنصة والتحكم في الدخول
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${
                      platformLockState.isLocked
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    }`}
                  >
                    {platformLockState.isLocked ? 'المنصة مقفلة حالياً' : 'المنصة مفتوحة للجميع'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1">
                  يمكنك قفل المنصة على الجميع واستثناء أشخاص معينين، أو فتحها للجميع وقفلها على أشخاص معينين بداعي الصيانة أو الاشتراك.
                </p>
              </div>
            </div>

            {/* Quick Save Header Button */}
            <AnimatedButton
              type="button"
              variant={platformLockState.isLocked ? 'danger' : 'gold'}
              size="md"
              disabled={isSaving}
              onClick={handleSavePlatformLock}
              icon={<Save className="w-4 h-4 ml-1" />}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ وتطبيق التغييرات فورياً'}
            </AnimatedButton>
          </div>

          {/* 1. Main Mode Selector (Card A vs Card B) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode 1: Open for all */}
            <div
              onClick={() =>
                setPlatformLockState((prev) => ({
                  ...prev,
                  isLocked: false,
                }))
              }
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                !platformLockState.isLocked
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/10'
                  : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    !platformLockState.isLocked
                      ? 'border-emerald-400 bg-emerald-500'
                      : 'border-zinc-600'
                  }`}
                >
                  {!platformLockState.isLocked && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <h4 className="text-lg font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-1">
                الخيار 1: فتح المنصة للجميع
              </h4>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed">
                المنصة مفتوحة لكافة الطلاب كالمعتاد، مع إمكانية تحديد وقفل المنصة على أشخاص معينين بالأسفل.
              </p>
            </div>

            {/* Mode 2: Locked for all */}
            <div
              onClick={() =>
                setPlatformLockState((prev) => ({
                  ...prev,
                  isLocked: true,
                }))
              }
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                platformLockState.isLocked
                  ? 'border-red-500 bg-red-500/10 shadow-xl shadow-red-500/10'
                  : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    platformLockState.isLocked
                      ? 'border-red-400 bg-red-500'
                      : 'border-zinc-600'
                  }`}
                >
                  {platformLockState.isLocked && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <h4 className="text-lg font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-1">
                الخيار 2: قفل المنصة على الجميع
              </h4>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed">
                إغلاق المنصة أمام الطلاب كافة، مع إمكانية استثناء وفتح المنصة لأشخاص محددين فقط بالأسفل.
              </p>
            </div>
          </div>

          {/* 2. Lock Reason Selection */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white shadow-xl space-y-4">
            <h4 className="text-base font-black text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>سبب القفل المعتمد (الرسالة التي ستظهر للطالب المقفول عليه):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Maintenance */}
              <div
                onClick={() =>
                  setPlatformLockState((prev) => ({
                    ...prev,
                    lockType: 'maintenance',
                  }))
                }
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  platformLockState.lockType === 'maintenance'
                    ? 'border-amber-500 bg-amber-500/15'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                    قفل المنصة بداعي الصيانة
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    يعرض شاشة تفيد بأعمال الصيانة والترقية الدورية
                  </div>
                </div>
              </div>

              {/* Option B: Subscription */}
              <div
                onClick={() =>
                  setPlatformLockState((prev) => ({
                    ...prev,
                    lockType: 'subscription',
                  }))
                }
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  platformLockState.lockType === 'subscription'
                    ? 'border-yellow-500 bg-yellow-500/15'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                    قفل المنصة بداعي انتهاء الاشتراك
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    يعرض شاشة تفيد بضرورة تجديد الاشتراك الدراسي
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Explanation Message */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-zinc-300 dark:text-zinc-300 light:text-zinc-700 mb-1">
                رسالة توضيحية إضافية تظهر للطلاب في شاشة القفل (اختياري):
              </label>
              <textarea
                rows={2}
                value={platformLockState.lockMessage || ''}
                onChange={(e) =>
                  setPlatformLockState((prev) => ({
                    ...prev,
                    lockMessage: e.target.value,
                  }))
                }
                placeholder={
                  platformLockState.lockType === 'maintenance'
                    ? 'مثال: يجري حالياً تحديث بنك أسئلة الرياضيات وسنعود للعمل خلال ساعة...'
                    : 'مثال: يرجى التواصل مع إدارة منصة ألفا عبر الواتساب لتجديد الاشتراك للفصل الجديد...'
                }
                className="w-full px-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>
          </div>

          {/* 3. Exceptions & Target Selection List */}
          <div className="p-6 rounded-3xl border-2 border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h4 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>
                    {platformLockState.isLocked
                      ? 'الطلاب المستثنون المسموح لهم بالدخول (فتح المنصة لهم فقط رغم قفلها على الجميع):'
                      : 'الطلاب المقفول عليهم تحديداً (قفل المنصة على هؤلاء فقط وفتحها للبقية):'}
                  </span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {platformLockState.isLocked
                    ? `محدد حالياً ${platformLockState.whitelistedStudentIds?.length || 0} طالب مستثنى سيتمكنون من الدخول بحرية`
                    : `محدد حالياً ${platformLockState.blacklistedStudentIds?.length || 0} طالب سيتم قفل المنصة عليهم تحديداً`}
                </p>
              </div>

              {/* Action Buttons: Select All / Deselect All */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = students.map((s) => s.id);
                    if (platformLockState.isLocked) {
                      setPlatformLockState((prev) => ({
                        ...prev,
                        whitelistedStudentIds: allIds,
                      }));
                    } else {
                      setPlatformLockState((prev) => ({
                        ...prev,
                        blacklistedStudentIds: allIds,
                      }));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (platformLockState.isLocked) {
                      setPlatformLockState((prev) => ({
                        ...prev,
                        whitelistedStudentIds: [],
                      }));
                    } else {
                      setPlatformLockState((prev) => ({
                        ...prev,
                        blacklistedStudentIds: [],
                      }));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-bold cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Search in exceptions */}
            <div className="relative">
              <Search className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
              <input
                type="text"
                value={lockSearchQuery}
                onChange={(e) => setLockSearchQuery(e.target.value)}
                placeholder="ابحث عن طالب بالاسم أو البريد لتحديده..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-zinc-50 text-xs text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
              />
            </div>

            {/* Students List for Exceptions */}
            {students.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                لا يوجد طلاب مسجلون بالمنصة بعد.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/60">
                {students
                  .filter((s) => {
                    if (!lockSearchQuery.trim()) return true;
                    const q = lockSearchQuery.toLowerCase();
                    return (
                      s.name?.toLowerCase().includes(q) ||
                      s.email?.toLowerCase().includes(q)
                    );
                  })
                  .map((student) => {
                    const isChecked = platformLockState.isLocked
                      ? platformLockState.whitelistedStudentIds?.includes(student.id)
                      : platformLockState.blacklistedStudentIds?.includes(student.id);

                    const toggleStudent = () => {
                      if (platformLockState.isLocked) {
                        const current = platformLockState.whitelistedStudentIds || [];
                        const updated = current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id];
                        setPlatformLockState((prev) => ({
                          ...prev,
                          whitelistedStudentIds: updated,
                        }));
                      } else {
                        const current = platformLockState.blacklistedStudentIds || [];
                        const updated = current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id];
                        setPlatformLockState((prev) => ({
                          ...prev,
                          blacklistedStudentIds: updated,
                        }));
                      }
                    };

                    return (
                      <div
                        key={student.id}
                        onClick={toggleStudent}
                        className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? platformLockState.isLocked
                              ? 'bg-emerald-500/15 border border-emerald-500/40'
                              : 'bg-red-500/15 border border-red-500/40'
                            : 'hover:bg-zinc-900/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                              {student.name || 'طالب ألفا'}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {student.email || '—'}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-bold">
                          {isChecked ? (
                            platformLockState.isLocked ? (
                              <span className="text-emerald-400 font-bold text-[11px]">
                                مستثنى (مفتوح له ✓)
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold text-[11px]">
                                مقفول عليه ✕
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-500 text-[11px]">غير محدد</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Big Submit Button */}
          <AnimatedButton
            type="button"
            variant="gold"
            size="lg"
            disabled={isSaving}
            onClick={handleSavePlatformLock}
            className="w-full text-sm font-black shadow-2xl py-4"
            icon={<Save className="w-5 h-5 ml-1" />}
          >
            {isSaving
              ? 'جاري حفظ الإعدادات في Firebase...'
              : 'حفظ وتطبيق إعدادات قفل المنصة فورياً على جميع الطلاب ✓'}
          </AnimatedButton>
        </div>
      )}

      {/* Modal: Individual Student Lock Reason */}
      <AnimatePresence>
        {studentLockModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-zinc-950 text-right shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>

              <h4 className="text-lg font-black text-center text-zinc-100 mb-1">
                قفل المنصة على الطالب
              </h4>
              <p className="text-xs text-center text-amber-400 font-bold mb-4">
                {studentLockModalTarget.name} ({studentLockModalTarget.email})
              </p>
              <p className="text-xs text-zinc-400 text-center mb-6">
                اختر سبب قفل المنصة على هذا الطالب؛ ستظهر له الشاشة المناسبة مباشرة فور محاولة الدخول:
              </p>

              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleApplyStudentLock(studentLockModalTarget.id, true, 'maintenance')
                  }
                  className="w-full p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>قفل المنصة بداعي الصيانة</span>
                  </div>
                  <span className="text-[10px] text-amber-500">شاشة صيانة ←</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    handleApplyStudentLock(studentLockModalTarget.id, true, 'subscription')
                  }
                  className="w-full p-3.5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span>قفل المنصة بداعي انتهاء الاشتراك</span>
                  </div>
                  <span className="text-[10px] text-yellow-500">شاشة تجديد ←</span>
                </button>
              </div>

              <div className="flex justify-end">
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setStudentLockModalTarget(null)}
                  className="w-full"
                >
                  إلغاء
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-app Deletion Modal for Admin */}
      <AnimatePresence>
        {deleteTarget && (
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
              <h4 className="text-lg font-black text-center text-zinc-100 mb-1">
                {deleteTarget.isStudentBan ? 'تأكيد حذف حساب الطالب' : 'تأكيد الحذف النهائي'}
              </h4>
              <p className="text-xs text-center text-zinc-400 mb-5">
                {deleteTarget.isStudentBan
                  ? `هل أنت متأكد من حذف حساب (${deleteTarget.title})؟ سيتم قفل المنصة عليه فوراً وإيقاف صلاحياته دون التأثير على الآخرين.`
                  : `هل أنت متأكد من حذف (${deleteTarget.title}) نهائياً؟`}
              </p>

              <div className="flex gap-3">
                <AnimatedButton
                  variant="danger"
                  size="md"
                  disabled={isSaving}
                  onClick={handleExecuteDelete}
                  className="flex-1"
                >
                  {isSaving ? 'جاري التنفيذ...' : 'نعم، نفّذ الحذف'}
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="md"
                  onClick={() => setDeleteTarget(null)}
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

