import React, { useState, useEffect } from 'react';
import { CustomBlock, VideoItem, FileResource, Exam } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  X,
  Sparkles,
  Video,
  FileText,
  HelpCircle,
  Play,
  Download,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { openOrDownloadFile } from '../utils/storage';

interface CustomBlockModalProps {
  block: CustomBlock | null;
  allVideos?: VideoItem[];
  allFiles?: FileResource[];
  allExams?: Exam[];
  onStartExam?: (exam: Exam) => void;
  onClose: () => void;
}

export const CustomBlockModal: React.FC<CustomBlockModalProps> = ({
  block,
  allVideos = [],
  allFiles = [],
  allExams = [],
  onStartExam,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'files' | 'exams'>('videos');
  const [activePlayingVideo, setActivePlayingVideo] = useState<{
    id: string;
    title: string;
    url: string;
    description?: string;
  } | null>(null);

  if (!block) return null;

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

  // Resolve linked + direct files
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

  // Resolve linked + direct exams
  const linkedExamIds = Array.isArray(block.linkedExamIds) ? block.linkedExamIds : [];
  const linkedExams = (allExams || []).filter(
    (e) => e && e.id && (linkedExamIds.includes(e.id) || e.customBlockId === block.id)
  );
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
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
      if (url.includes('youtube.com/shorts/')) {
        const videoId = url.split('shorts/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const isYoutube = (url: string) => url.includes('youtube') || url.includes('youtu.be');

  // Set default tab on block load
  useEffect(() => {
    if (block) {
      if (totalVideos.length > 0) {
        setActiveTab('videos');
      } else if (totalFiles.length > 0) {
        setActiveTab('files');
      } else if (totalExams.length > 0) {
        setActiveTab('exams');
      } else {
        setActiveTab('videos');
      }
    }
  }, [block?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        className="w-full max-w-3xl my-auto p-5 sm:p-7 rounded-3xl border-2 border-amber-500/40 bg-zinc-950 dark:bg-zinc-950 light:bg-white text-right shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            <span>{block.badge || 'ملحق'}</span>
          </span>
          <span className="text-xs text-zinc-400 font-semibold">
            محتويات الملحق
          </span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600 mb-2">
          {block.title}
        </h3>

        {block.description && (
          <p className="text-xs sm:text-sm text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed mb-4 font-normal">
            {block.description}
          </p>
        )}

        {block.content && (
          <div className="p-3.5 rounded-2xl bg-black/50 dark:bg-black/50 light:bg-zinc-100 border border-amber-500/20 text-xs sm:text-sm text-zinc-200 dark:text-zinc-200 light:text-zinc-800 leading-relaxed mb-4 whitespace-pre-wrap">
            {block.content}
          </div>
        )}

        {/* Sub-tabs for attached contents (فيديوهات، ملفات، اختبارات) */}
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('videos');
              setActivePlayingVideo(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>الفيديوهات</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-black">
              {totalVideos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('files');
              setActivePlayingVideo(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الملفات والمذكرات</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-black">
              {totalFiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('exams');
              setActivePlayingVideo(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>الاختبارات</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-black">
              {totalExams.length}
            </span>
          </button>
        </div>

        {/* Tab Contents Scrollable Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[200px]">
          {/* 1. VIDEOS TAB */}
          {activeTab === 'videos' && (
            <div>
              {/* Playing video inside modal */}
              {activePlayingVideo && (
                <div className="mb-4 p-3 rounded-2xl bg-black border border-amber-500/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 truncate">
                      {activePlayingVideo.title}
                    </span>
                    <button
                      onClick={() => setActivePlayingVideo(null)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800"
                    >
                      إغلاق المشغل
                    </button>
                  </div>

                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
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
                </div>
              )}

              {totalVideos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 text-zinc-400 text-xs">
                  لا توجد فيديوهات مضافة داخل هذا الملحق بعد.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {totalVideos.map((vid) => (
                    <div
                      key={vid.id}
                      className="p-3.5 rounded-2xl border border-amber-500/20 bg-zinc-900/60 dark:bg-zinc-900/60 light:bg-zinc-50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                            <Video className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-sm font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900 truncate">
                            {vid.title}
                          </h4>
                        </div>
                        {vid.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 font-normal">
                            {vid.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <button
                          onClick={() =>
                            setActivePlayingVideo({
                              id: vid.id,
                              title: vid.title,
                              url: vid.url,
                              description: vid.description,
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs transition-colors cursor-pointer border border-amber-500/30"
                        >
                          <Play className="w-3 h-3 fill-amber-400" />
                          <span>مشاهدة الفيديو</span>
                        </button>

                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>رابط خارجي</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. FILES TAB */}
          {activeTab === 'files' && (
            <div>
              {totalFiles.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 text-zinc-400 text-xs">
                  لا توجد ملفات أو مذكرات مضافة داخل هذا الملحق بعد.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {totalFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => openOrDownloadFile(file)}
                      className="p-3.5 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 bg-zinc-900/60 dark:bg-zinc-900/60 light:bg-zinc-50 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900 truncate">
                              {file.title}
                            </h4>
                            <span className="text-[10px] text-amber-500 font-medium">
                              {file.fileType || 'ملف PDF'}
                            </span>
                          </div>
                        </div>
                        {file.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 font-normal">
                            {file.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">انقر للفتح</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrDownloadFile(file);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>فتح / تحميل الملف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. EXAMS TAB */}
          {activeTab === 'exams' && (
            <div>
              {totalExams.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 text-zinc-400 text-xs">
                  لا توجد اختبارات مضافة داخل هذا الملحق بعد.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="p-3.5 rounded-2xl border border-amber-500/20 hover:border-emerald-500/50 bg-zinc-900/60 dark:bg-zinc-900/60 light:bg-zinc-50 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-zinc-100 dark:text-zinc-100 light:text-zinc-900 truncate">
                              {exam.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                              <span>⏱️ {exam.durationMinutes} دقيقة</span>
                              {exam.questions && exam.questions.length > 0 && (
                                <span>• {exam.questions.length} أسئلة</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {exam.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 font-normal">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">انقر للبدء</span>
                        {exam.examType === 'external' && exam.externalExamUrl ? (
                          <a
                            href={exam.externalExamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer"
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
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            <Play className="w-3 h-3 fill-black" />
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-amber-500/20 mt-4 shrink-0">
          {block.linkUrl ? (
            <AnimatedButton
              variant="gold"
              size="md"
              onClick={() => window.open(block.linkUrl, '_blank', 'noopener,noreferrer')}
              icon={<ExternalLink className="w-4 h-4 ml-1" />}
            >
              الانتقال للرابط المرفق
            </AnimatedButton>
          ) : (
            <div />
          )}

          <AnimatedButton variant="outline" size="md" onClick={onClose}>
            إغلاق
          </AnimatedButton>
        </div>
      </motion.div>
    </div>
  );
};
