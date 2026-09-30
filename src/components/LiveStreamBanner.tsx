import React from 'react';
import { LiveStreamConfig } from '../types';
import { motion } from 'motion/react';
import { Radio, ExternalLink, Play } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface LiveStreamBannerProps {
  streamConfig: LiveStreamConfig | null;
}

export const LiveStreamBanner: React.FC<LiveStreamBannerProps> = ({ streamConfig }) => {
  if (!streamConfig || !streamConfig.isActive || !streamConfig.streamUrl) {
    return null;
  }

  const handleJoin = () => {
    // Take student directly to YouTube, Zoom, or the streaming platform
    window.open(streamConfig.streamUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleJoin}
      className="w-full cursor-pointer rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white p-6 sm:p-8 shadow-2xl shadow-emerald-500/30 border-2 border-emerald-400 relative overflow-hidden group mb-8"
    >
      {/* Animated Background pulse & shimmer */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-right">
        
        {/* Right info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs font-black tracking-widest uppercase bg-black/30 px-3 py-0.5 rounded-full border border-white/20">
                البث المباشر الآن • مباشر
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              البث: {streamConfig.title || 'درس البث المباشر التفاعلي'}
            </h2>

            {streamConfig.description && (
              <p className="text-emerald-100 text-sm mt-1 max-w-2xl line-clamp-1">
                {streamConfig.description}
              </p>
            )}
          </div>
        </div>

        {/* Left Join Action -> Directly opens YouTube / Zoom */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <AnimatedButton
            variant="gold"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              handleJoin();
            }}
            className="w-full sm:w-auto shadow-xl text-black font-black"
            icon={<ExternalLink className="w-5 h-5 ml-1" />}
          >
            الانضمام للبث المباشر فوراً
          </AnimatedButton>
        </div>
      </div>
    </motion.div>
  );
};
