import React, { useState, useEffect } from 'react';
import { CustomBlock, VideoItem, FileResource, Exam } from '../types';
import { AnimatedButton } from './AnimatedButton';
import { motion } from 'motion/react';
import {
  Video,
  FileText,
  HelpCircle,
  Play,
  Download,
  ExternalLink,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { openOrDownloadFile } from '../utils/storage';

interface CustomBlockSectionProps {
  block: CustomBlock;
  allVideos: VideoItem[];
  allFiles: FileResource[];
  allExams: Exam[];
  onStartExam: (exam: Exam) => void;
  onBack: () => void;
}

export const CustomBlockSection: React.FC<CustomBlockSectionProps> = ({
  block,
  allVideos = [],
  allFiles = [],
  allExams = [],
  onStartExam,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'files' | 'exams'>('videos');
  const [activePlayingVideo, setActivePlayingVideo] = useState<{
    id: string;
    title: string;
    url: string;
    description?: string;
  } | null>(null);

  // Safe data resolution
  const linkedVideoIds = Array.isArray(block.linkedVideoIds) ? block.linkedVideoIds : [];
  const linkedVideos = (allVideos || []).filter((v) => v && v.id && linkedVideoIds.includes(v.id));
  const directVideos = (Array.isArray(block.directVideos) ? block.directVideos : []).map((dv) => ({
    id: dv?.id || `dv_${Math.random()}`,
    title: dv?.title || 'فيديو',
    url: dv?.url || '',
    description: dv?.description || '',
    duration: '',
    createdAt: '',
  }));
  const totalVideos = [...linkedVideos, ...directVideos];

  const linkedFileIds = Array.isArray(block.linkedFileIds) ? block.linkedFileIds : [];
  const linkedFiles = (allFiles || []).filter((f) => f && f.id && linkedFileIds.includes(f.id));
  const directFiles = (Array.isArray(block.directFiles) ? block.directFiles : []).map((df) => ({
    id: df?.id || `df_${Math.random()}`,
    title: df?.title || 'ملف',
    fileUrl: df?.url || '',
    description: df?.description || '',
    fileType: df?.type || 'PDF',
    createdAt: '',
  }));
  const totalFiles = [...linkedFiles, ...directFiles];

  const linkedExamIds = Array.isArray(block.linkedExamIds) ? block.linkedExamIds : [];
  const linkedExams = (allExams || []).filter((e) => e && e.id && linkedExamIds.includes(e.id));
  const directExams = (Array.isArray(block.directExams) ? block.directExams : []).map((de) => ({
    id: de?.id || `de_${Math.random()}`,
    title: de?.title || 'اختبار',
    description: de?.description || '',
    durationMinutes: 20,
    examType: 'external' as const,
    externalExamUrl: de?.url || '',
    questions: [],
    createdAt: '',
  }));
  const totalExams = [...linkedExams, ...directExams];

  // Auto-select tab with contents on load
  useEffect(() => {
    if (totalVideos.length > 0) {
      setActiveTab('videos');
    } else if (totalFiles.length > 0) {
      setActiveTab('files');
    } else if (totalExams.length > 0) {
      setActiveTab('exams');
    } else {
      setActiveTab('videos');
    }
  }, [block.id]);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      if (url.includes('youtube.com/shorts/')) {
        const videoId = url.split('shorts/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
      return url;
    } catch {
      return url;
    }
  };

  const isYoutube = (url: string) => url.includes('youtube') || url.includes('youtu.be');

  return (
    <div className="space-y-6 text-right pb-12">
      {/* Top Header */}
      <div className="p-6 rounded-3xl border-2 border-amber-500/40 bg-zinc-950/80 dark:bg-zinc-950/80 light:bg-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{block.badge || 'ملحق'}</span>
            </span>
            <span className="text-xs text-zinc-400 font-semibold">
              قسم الملحقات المتكامل
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
            {block.title}
          </h2>

          {block.description && (
            <p className="text-xs sm:text-sm text-zinc-300 dark:text-zinc-300 light:text-zinc-600 mt-1 max-w-2xl">
              {block.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {block.linkUrl && (
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => window.open(block.linkUrl, '_blank', 'noopener,noreferrer')}
              icon={<ExternalLink className="w-4 h-4 ml-1" />}
            >
              الرابط الخارجي
            </AnimatedButton>
          )}

          <AnimatedButton
            variant="gold"
            size="md"
            onClick={onBack}
            icon={<ArrowRight className="w-4 h-4 ml-1" />}
          >
            العودة للرئيسية
          </AnimatedButton>
        </div>
      </div>

      {/* Content description box if present */}
      {block.content && (
        <div className="p-4 rounded-2xl bg-black/40 dark:bg-black/40 light:bg-zinc-50 border border-amber-500/20 text-xs sm:text-sm text-zinc-200 dark:text-zinc-200 light:text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {block.content}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('videos')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'videos'
              ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
              : 'border-amber-500/20 bg-zinc-950/60 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">الفيديوهات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mt-2">
            {totalVideos.length}
          </div>
          <span className="text-[11px] text-amber-400 font-bold">شروحات ومحاضرات الملحق</span>
        </div>

        <div
          onClick={() => setActiveTab('files')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'files'
              ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
              : 'border-amber-500/20 bg-zinc-950/60 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">الملفات والمذكرات</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mt-2">
            {totalFiles.length}
          </div>
          <span className="text-[11px] text-amber-400 font-bold">مذكرات وتلخيصات PDF</span>
        </div>

        <div
          onClick={() => setActiveTab('exams')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'exams'
              ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
              : 'border-amber-500/20 bg-zinc-950/60 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">الاختبارات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mt-2">
            {totalExams.length}
          </div>
          <span className="text-[11px] text-emerald-400 font-bold">اختبارات ومحاكاة فورية</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/80 border border-amber-500/30">
        <button
          type="button"
          onClick={() => {
            setActiveTab('videos');
            setActivePlayingVideo(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'videos'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>الفيديوهات ({totalVideos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('files');
            setActivePlayingVideo(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'files'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الملفات والمذكرات ({totalFiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('exams');
            setActivePlayingVideo(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>الاختبارات والتمارين ({totalExams.length})</span>
        </button>
      </div>

      {/* Tab 1: Videos Content */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Active video player */}
          {activePlayingVideo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-black border-2 border-amber-500/40 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-amber-400">
                  {activePlayingVideo.title}
                </span>
                <button
                  onClick={() => setActivePlayingVideo(null)}
                  className="px-3 py-1 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  إغلاق المشغل ✕
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                {isYoutube(activePlayingVideo.url) ? (
                  <iframe
                    src={getEmbedUrl(activePlayingVideo.url)}
                    title={activePlayingVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activePlayingVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </motion.div>
          )}

          {totalVideos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-amber-500/20 bg-zinc-950/40">
              <Video className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-bold">لا توجد فيديوهات مضافة داخل هذا الملحق بعد.</p>
              <p className="text-xs text-zinc-500 mt-1">يمكن للمشرف إضافة فيديوهات لهذا الملحق من لوحة التحكم.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {totalVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="p-5 rounded-3xl border-2 border-amber-500/30 bg-black/60 dark:bg-black/60 light:bg-white shadow-xl flex flex-col justify-between transition-all hover:border-amber-400"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                      <h4 className="text-base font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 truncate">
                        {vid.title}
                      </h4>
                    </div>

                    {vid.description && (
                      <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                        {vid.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePlayingVideo({
                          id: vid.id,
                          title: vid.title,
                          url: vid.url,
                          description: vid.description,
                        })
                      }
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>مشاهدة الفيديو</span>
                    </button>

                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>رابط خارجي</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Files Content */}
      {activeTab === 'files' && (
        <div>
          {totalFiles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-amber-500/20 bg-zinc-950/40">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-bold">لا توجد ملفات أو مذكرات مضافة داخل هذا الملحق بعد.</p>
              <p className="text-xs text-zinc-500 mt-1">يمكن للمشرف إضافة مذكرات وملفات لهذا الملحق من لوحة التحكم.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {totalFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => openOrDownloadFile(file)}
                  className="p-5 rounded-3xl border-2 border-amber-500/30 hover:border-amber-400 bg-black/60 dark:bg-black/60 light:bg-white shadow-xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {file.fileType || 'PDF'}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>

                    <h4 className="text-base font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-2 truncate">
                      {file.title}
                    </h4>

                    {file.description && (
                      <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-semibold">تحميل مباشر</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrDownloadFile(file);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>فتح / تحميل الملف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Exams Content */}
      {activeTab === 'exams' && (
        <div>
          {totalExams.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-amber-500/20 bg-zinc-950/40">
              <HelpCircle className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-bold">لا توجد اختبارات مضافة داخل هذا الملحق بعد.</p>
              <p className="text-xs text-zinc-500 mt-1">يمكن للمشرف ربط اختبارات تفاعلية بهذا الملحق من لوحة التحكم.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {totalExams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => {
                    if (exam.examType === 'external' && exam.externalExamUrl) {
                      window.open(exam.externalExamUrl, '_blank', 'noopener,noreferrer');
                    } else if (onStartExam) {
                      onStartExam(exam as Exam);
                    }
                  }}
                  className="p-5 rounded-3xl border-2 border-amber-500/30 hover:border-emerald-500/60 bg-black/60 dark:bg-black/60 light:bg-white shadow-xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {exam.examType === 'external' ? 'اختبار خارجي' : 'اختبار تفاعلي'}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                    </div>

                    <h4 className="text-base font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-2 truncate">
                      {exam.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                      <span>⏱️ {exam.durationMinutes} دقيقة</span>
                      {exam.questions && exam.questions.length > 0 && (
                        <span>• {exam.questions.length} أسئلة محاكاة</span>
                      )}
                    </div>

                    {exam.description && (
                      <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                        {exam.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">تصحيح فوري</span>
                    {exam.examType === 'external' && exam.externalExamUrl ? (
                      <a
                        href={exam.externalExamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الاختبار الخارجي</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onStartExam) {
                            onStartExam(exam as Exam);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        <span>بدء الاختبار الآن</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
