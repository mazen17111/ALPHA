import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'green';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'gold',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm font-bold rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-base font-extrabold rounded-2xl gap-2.5',
  }[size];

  const variantClasses = {
    gold: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 border border-amber-300 font-bold',
    outline: 'border-2 border-amber-500/60 text-amber-500 hover:bg-amber-500/10 hover:border-amber-400 dark:text-amber-400',
    ghost: 'text-amber-500 dark:text-amber-400 hover:bg-amber-500/10',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40',
    green: 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-400 font-bold',
  }[variant];

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97, y: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      className={`inline-flex items-center justify-center cursor-pointer transition-colors duration-200 select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};
