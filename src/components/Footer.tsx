import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

interface FooterProps {
  onAdminClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onAdminClick }) => {
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (clickCount === 0) {
      setClickCount(1);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 1500);
    } else if (clickCount === 1) {
      // Second consecutive click within timeout -> Open admin password modal
      if (timerRef.current) clearTimeout(timerRef.current);
      setClickCount(0);
      onAdminClick();
    }
  };

  return (
    <footer className="w-full mt-auto border-t border-amber-500/15 py-8 px-4 text-center transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
        {/* Double-clickable phrase - placed at the very end of the platform */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
          title="منصة ألفا التعليمية - طريقك للمئوية"
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-500 light:text-zinc-500 hover:text-amber-400 dark:hover:text-amber-400 light:hover:text-amber-600 hover:bg-amber-500/5 transition-all cursor-pointer select-none"
        >
          <Shield className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
          <span>جميع محتويات المنصة محفوظة لمنصة الفا</span>
        </motion.button>
      </div>
    </footer>
  );
};
