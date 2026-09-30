import React from 'react';
import { motion } from 'motion/react';
import { Video, FileText, HelpCircle, FolderLock, ExternalLink, Sparkles, Layers } from 'lucide-react';
import { CustomBlock } from '../types';

interface DashboardBlocksProps {
  onSelectBlock: (blockId: 'videos' | 'files' | 'exams' | 'folders' | string) => void;
  activeBlock: string;
  videosCount: number;
  filesCount: number;
  examsCount: number;
  foldersCount: number;
  customBlocks: CustomBlock[];
  onOpenCustomBlock: (block: CustomBlock) => void;
}

export const DashboardBlocks: React.FC<DashboardBlocksProps> = ({
  onSelectBlock,
  activeBlock,
  videosCount,
  filesCount,
  examsCount,
  foldersCount,
  customBlocks,
  onOpenCustomBlock,
}) => {
  const mainBlocks = [
    {
      id: 'videos',
      title: 'الفيديوهات',
      subtitle: 'محاضرات وشروحات الفيديو التفاعلية',
      icon: <Video className="w-8 h-8 text-amber-400" />,
      count: `${videosCount} فيديو`,
      tag: 'شروحات مسجلة',
      color: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
    },
    {
      id: 'files',
      title: 'الملفات',
      subtitle: 'مذكرات، تلخيصات وملفات PDF شاملة',
      icon: <FileText className="w-8 h-8 text-amber-400" />,
      count: `${filesCount} ملف`,
      tag: 'بنك المذكرات',
      color: 'from-yellow-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
    },
    {
      id: 'exams',
      title: 'الاختبارات',
      subtitle: 'اختبارات محاكاة مصحوبة بصور وتصحيح فوري',
      icon: <HelpCircle className="w-8 h-8 text-amber-400" />,
      count: `${examsCount} اختبار`,
      tag: 'محاكاة ذكية',
      color: 'from-amber-600/20 via-yellow-600/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
    },
    {
      id: 'folders',
      title: 'مجلداتي',
      subtitle: 'مجلداتك المخصصة لصناعة أسئلتك واختبار نفسك',
      icon: <FolderLock className="w-8 h-8 text-amber-400" />,
      count: `${foldersCount} مجلد`,
      tag: 'بنكي الخاص',
      color: 'from-amber-400/20 via-yellow-400/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
    },
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* 4 Primary Core Rectangles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {mainBlocks.map((block, idx) => {
          const isSelected = activeBlock === block.id;
          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectBlock(block.id)}
              className={`cursor-pointer rounded-3xl p-6 transition-all duration-300 relative overflow-hidden select-none border-2 ${
                isSelected
                  ? 'border-amber-400 bg-amber-500/15 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/30'
                  : `${block.borderColor} bg-black/60 dark:bg-black/60 light:bg-white/90 shadow-lg`
              }`}
            >
              {/* Corner decorative light */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${block.color} rounded-bl-full pointer-events-none`}
              />

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px] text-right">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {block.tag}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
                      {block.icon}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 group-hover:text-amber-400 transition-colors">
                    {block.title}
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mt-1 line-clamp-2">
                    {block.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 dark:text-amber-400 light:text-amber-600">
                    {block.count}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                    <span>فتح القسم</span>
                    <span className="text-amber-400 font-bold">←</span>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Admin Custom Blocks (الملحقات) */}
      {customBlocks && customBlocks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4 text-right">
            <Layers className="w-5 h-5 text-amber-400" />
            <h4 className="text-lg font-black text-amber-400 dark:text-amber-400 light:text-amber-700">
              الملحقات
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customBlocks.map((cBlock) => {
              const vCount = (cBlock.linkedVideoIds?.length || 0) + (cBlock.directVideos?.length || 0);
              const fCount = (cBlock.linkedFileIds?.length || 0) + (cBlock.directFiles?.length || 0);
              const eCount = (cBlock.linkedExamIds?.length || 0) + (cBlock.directExams?.length || 0);

              return (
                <motion.div
                  key={cBlock.id}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenCustomBlock(cBlock)}
                  className="cursor-pointer rounded-3xl p-6 border-2 border-amber-500/35 bg-black/60 dark:bg-black/60 light:bg-white/90 shadow-lg relative overflow-hidden text-right flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {cBlock.badge || 'ملحق'}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-1">
                      {cBlock.title}
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-2">
                      {cBlock.description || 'اضغط لعرض تفاصيل ومحتويات هذا الملحق'}
                    </p>
                  </div>

                  {/* Summary of attached contents (فيديوهات، ملفات، اختبارات) */}
                  <div className="mt-4 pt-3 border-t border-amber-500/20">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {vCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <Video className="w-3 h-3" />
                          <span>{vCount} فيديو</span>
                        </span>
                      )}
                      {fCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <FileText className="w-3 h-3" />
                          <span>{fCount} ملف</span>
                        </span>
                      )}
                      {eCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <HelpCircle className="w-3 h-3" />
                          <span>{eCount} اختبار</span>
                        </span>
                      )}
                      {vCount === 0 && fCount === 0 && eCount === 0 && (
                        <span className="text-[11px] text-zinc-500">
                          ملحق تفاعلي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                      <span>عرض المحتويات</span>
                      <span className="text-sm font-bold">←</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
