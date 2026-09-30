import React, { useState } from 'react';
import { FileResource } from '../types';
import { AnimatedButton } from './AnimatedButton';
import { motion } from 'motion/react';
import { FileText, Download, ExternalLink, Search, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { openOrDownloadFile } from '../utils/storage';

interface FilesSectionProps {
  files: FileResource[];
  onBack: () => void;
}

export const FilesSection: React.FC<FilesSectionProps> = ({ files, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(files.map((f) => f.category || 'عام')))];

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || (f.category || 'عام') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-right">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-400 dark:text-amber-400 light:text-amber-600">
            قسم الملفات والمذكرات
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
            تحميل وتصفح المذكرات، التلاخيص والواجبات المعتمدة لمنصة ALPHA
          </p>
        </div>

        <AnimatedButton variant="outline" size="sm" onClick={onBack} icon={<ArrowRight className="w-4 h-4 ml-1" />}>
          العودة للرئيسية
        </AnimatedButton>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-amber-400 absolute right-3 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن ملف أو مذكرة..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-amber-500/30 bg-black/50 dark:bg-black/50 light:bg-white text-sm focus:outline-none focus:border-amber-400 text-zinc-100 dark:text-zinc-100 light:text-zinc-900"
          />
        </div>

        {/* Categories chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 dark:bg-zinc-900 light:bg-zinc-100 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 border border-amber-500/20'
              }`}
            >
              {cat === 'all' ? 'جميع الملفات' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-amber-500/20 bg-black/40">
          <p className="text-zinc-400 text-sm">لا توجد ملفات متطابقة مع البحث.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFiles.map((file, idx) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-5 rounded-3xl border-2 border-amber-500/30 bg-black/70 dark:bg-black/70 light:bg-white/95 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {file.fileType || 'PDF'}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-lg font-black text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-2">
                  {file.title}
                </h3>
                {file.description && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 line-clamp-3 mb-4 font-normal">
                    {file.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-semibold">
                  {file.category || 'عام'}
                </span>

                <AnimatedButton
                  size="sm"
                  variant="gold"
                  onClick={() => openOrDownloadFile(file)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  فتح / تحميل
                </AnimatedButton>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
