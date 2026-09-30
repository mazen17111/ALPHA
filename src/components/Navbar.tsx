import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnimatedButton } from './AnimatedButton';
import { Sun, Moon, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import alphaLogo from '../assets/images/alpha_logo_1790678223903.jpg';

interface NavbarProps {
  onOpenAdminPrompt?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onLogoClick }) => {
  const { userProfile, currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [logoLoadError, setLogoLoadError] = useState(false);

  const handleLogoClick = () => {
    // Scroll window smoothly to the very top
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
      if (document.documentElement) {
        document.documentElement.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      }
      if (document.body) {
        document.body.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      }
    } catch {
      window.scrollTo(0, 0);
    }

    if (onLogoClick) {
      onLogoClick();
    } else if (setActiveTab) {
      setActiveTab('dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-200 border-amber-500/20 bg-black/85 dark:bg-black/85 light:bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo - Top Right in RTL */}
        <div 
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
          title="العودة لأول الصفحة"
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-95"
        >
          <motion.div 
            whileHover={{ scale: 1.08 }}
            className="w-13 h-13 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/30 border-2 border-amber-400/70 bg-black flex items-center justify-center shrink-0 ring-2 ring-amber-500/20"
          >
            {!logoLoadError ? (
              <img
                src={alphaLogo}
                alt="شعار منصة ALPHA التعليمية"
                className="w-full h-full object-cover"
                onError={() => setLogoLoadError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-black text-xl">
                ALPHA
              </div>
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent group-hover:from-yellow-300 group-hover:to-amber-400 transition-all">
                ALPHA
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                منصة ألفا
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-medium">
              طريقك نحو المئوية والإتقان
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'التحويل للوضع النهاري (أبيض وذهبي)' : 'التحويل للوضع الليلي (أسود وذهبي)'}
            className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-5 h-5 text-amber-600" />
            )}
          </motion.button>

          {/* User profile / Logout */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-bold text-sm">
                  {userProfile?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-zinc-200 dark:text-zinc-200 light:text-zinc-800 flex items-center gap-1">
                    <span>{userProfile?.name || 'طالب ألفا'}</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-amber-500 font-semibold">
                    {userProfile?.completedTestsCount || 0} اختبار منجز
                  </div>
                </div>
              </div>

              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={logout}
                icon={<LogOut className="w-4 h-4" />}
                title="تسجيل الخروج"
              >
                <span className="hidden sm:inline">خروج</span>
              </AnimatedButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
