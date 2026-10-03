import React, { useState, useEffect } from 'react';
import { VideoItem, FileResource, Exam } from '../types';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from './AnimatedButton';
import {
  Play,
  CheckCircle,
  FileText,
  HelpCircle,
  ExternalLink,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { getMediaItem, resolveFastMediaUrl } from '../utils/storage';

interface VideosSectionProps {
  videos: VideoItem[];
  allFiles: FileResource[];
  allExams: Exam[];
  onStartExam: (exam: Exam) => void;
  onBack: () => void;
}

export const VideosSection: React.FC<VideosSectionProps> = ({
  videos,
  allFiles,
  allExams,
  onStartExam,
  onBack,
}) => {
  const { userProfile, recordWatchVideo } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(videos[0] || null);
  const [confirmingWatch, setConfirmingWatch] = useState(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');

  useEffect(() => {
    if (!selectedVideo && videos.length > 0) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, selectedVideo]);

  // Resolve video URL (checks if stored in IndexedDB or direct URL)
  useEffect(() => {
    let isMounted = true;
    async function loadUrl() {
      if (!selectedVideo) {
        setResolvedVideoUrl('');
        return;
      }

      // Instant synchronous assignment for server and remote URLs (no delay)
      if (selectedVideo.url.startsWith('/api/media/') || selectedVideo.url.startsWith('http')) {
        setResolvedVideoUrl(selectedVideo.url);
        return;
      }

      try {
        const fastUrl = await resolveFastMediaUrl(selectedVideo.url, selectedVideo.id);
        if (isMounted) {
          setResolvedVideoUrl(fastUrl || selectedVideo.url);
        }
      } catch (err) {
        console.warn('Fast video resolve fallback:', err);
        if (isMounted) {
          setResolvedVideoUrl(selectedVideo.url);
        }
      }
    }
    loadUrl();
    return () => {
      isMounted = false;
    };
  }, [selectedVideo]);

  const isWatched = (videoId: string) => {
    return userProfile?.watchedVideoIds?.includes(videoId) || false;
  };

  const handleConfirmWatch = async (videoId: string) => {
    setConfirmingWatch(true);
    await recordWatchVideo(videoId);
    setConfirmingWatch(false);
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
      return url;
    } catch {
      return url;
    }
  };

  const isYoutube = selectedVideo?.url.includes('youtube') || selectedVideo?.url.includes('youtu.be');

  // Linked items for selected video
  const linkedFiles = allFiles.filter((f) => selectedVideo?.linkedFileIds?.includes(f.id));
  const linkedExams = allExams.filter((e) => selectedVideo?.linkedExamIds?.includes(e.id));

  return (
    <div className="space-y-6 text-right pb-24">
      {/* Header with back button */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
            قسم الفيديوهات التعليمية
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
            شاهد الشروحات وأكد المشاهدة لتسجيل تقدمك في إحصائياتك نحو المئوية
          </p>
        </div>

        <AnimatedButton variant="outline" size="sm" onClick={onBack} icon={<ArrowRight className="w-4 h-4 ml-1" />}>
          العودة للرئيسية
        </AnimatedButton>
      </div>

      {videos.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-amber-500/20 bg-black/40">
          <p className="text-zinc-400 text-sm">لا توجد فيديوهات مضافة حالياً. سيقوم المعلم بإضافتها قريباً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Video Player & Details */}
          <div className="lg:col-span-2 space-y-5">
            {selectedVideo && (
              <div className="rounded-3xl border-2 border-amber-500/30 bg-black/80 dark:bg-black/80 light:bg-white/95 p-5 sm:p-6 shadow-2xl">
                
                {/* Embedded Video Area */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-amber-500/20 shadow-xl mb-5">
                  {isYoutube ? (
                    <iframe
                      src={getEmbedUrl(selectedVideo.url)}
                      title={selectedVideo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : resolvedVideoUrl ? (
                    <video
                      key={selectedVideo.id}
                      src={resolvedVideoUrl}
                      controls
                      preload="metadata"
                      playsInline
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      autoPlay={false}
                      className="w-full h-full object-contain bg-black select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                      <p className="text-xs sm:text-sm font-bold text-amber-400 mb-1">
                        جاري تجهيز وبث الفيديو من خادم المنصة...
                      </p>
                      <p className="text-[11px] text-zinc-500 mb-3">
                        إذا لم يبدأ الفيديو تلقائياً، يمكنك النقر لإعادة التحميل
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setResolvedVideoUrl('');
                          if (selectedVideo) {
                            resolveFastMediaUrl(selectedVideo.url, selectedVideo.id).then((u) => setResolvedVideoUrl(u || selectedVideo.url));
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-bold cursor-pointer"
                      >
                        إعادة تحميل المشغل
                      </button>
                    </div>
                  )}
                </div>

                {/* Video Info and Confirmation Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-5 mb-5">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900">
                      {selectedVideo.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {selectedVideo.duration && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>المدة: {selectedVideo.duration}</span>
                        </span>
                      )}
                      {selectedVideo.isUploadedFile && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                          مرفوع ومحفوظ بالمنصة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Watch Confirmation Button */}
                  <div>
                    {isWatched(selectedVideo.id) ? (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-sm shadow-md">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span>تم تأكيد المشاهدة بنجاح ✓</span>
                      </div>
                    ) : (
                      <AnimatedButton
                        variant="gold"
                        size="md"
                        disabled={confirmingWatch}
                        onClick={() => handleConfirmWatch(selectedVideo.id)}
                        icon={<CheckCircle className="w-5 h-5" />}
                        className="shadow-xl"
                      >
                        {confirmingWatch ? 'جاري التأكيد...' : 'تم تأكيد المشاهدة'}
                      </AnimatedButton>
                    )}
                  </div>
                </div>

                {/* Video Description */}
                {selectedVideo.description && (
                  <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed mb-6 font-normal">
                    {selectedVideo.description}
                  </p>
                )}

                {/* Linked Files and Exams */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-base font-black text-amber-400 dark:text-amber-400 light:text-amber-700">
                    المرفقات والاختبارات المرتبطة بهذا الفيديو:
                  </h4>

                  {linkedFiles.length === 0 && linkedExams.length === 0 ? (
                    <p className="text-xs text-zinc-500">لا توجد ملفات أو اختبارات مرتبطة بهذا الفيديو تحديداً.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {linkedFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15 flex items-center justify-between transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                                {file.title}
                              </div>
                              <div className="text-[10px] text-amber-500">{file.fileType || 'ملف مرفق'}</div>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-amber-400" />
                        </a>
                      ))}

                      {linkedExams.map((exam) => (
                        <div
                          key={exam.id}
                          onClick={() => onStartExam(exam)}
                          className="p-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/15 flex items-center justify-between transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-200 dark:text-zinc-200 light:text-zinc-800">
                                {exam.title}
                              </div>
                              <div className="text-[10px] text-amber-500">
                                {exam.examType === 'external' ? 'اختبار خارجي' : `${exam.questions?.length || 0} أسئلة`}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-400 group-hover:underline">
                            بدء الاختبار ←
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Videos Playlist Sidebar */}
          <div className="space-y-3">
            <h4 className="text-lg font-black text-amber-400 dark:text-amber-400 light:text-amber-700 mb-2">
              قائمة الفيديوهات ({videos.length})
            </h4>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {videos.map((vid, idx) => {
                const active = selectedVideo?.id === vid.id;
                const watched = isWatched(vid.id);

                return (
                  <div
                    key={vid.id}
                    onClick={() => setSelectedVideo(vid)}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 shadow-lg'
                        : 'border-amber-500/20 bg-black/50 dark:bg-black/50 light:bg-white/90 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          watched
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {watched ? <CheckCircle className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                      </div>

                      <div>
                        <div className="text-xs sm:text-sm font-bold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 line-clamp-1">
                          {vid.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          {vid.duration && <span>{vid.duration}</span>}
                          {watched && <span className="text-emerald-400 font-bold">مؤكد</span>}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-black text-amber-400">
                      #{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
