

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  // Ultra Theme Variants
  const variants = {
    // Intense Ultra Gold/Amber gradient with glow
    primary: `
      bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600
      hover:from-yellow-300 hover:via-amber-400 hover:to-orange-500
      text-gray-950 font-extrabold tracking-wide
      focus:ring-amber-500 
      shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]
      border border-yellow-200/50
      relative overflow-hidden
    `,
    // Updated Secondary for Light/Dark Mode
    secondary: `
      bg-white dark:bg-gray-900/80 
      hover:bg-gray-50 dark:hover:bg-gray-800 
      text-gray-700 dark:text-gray-200 
      border border-gray-300 dark:border-gray-700/50 
      focus:ring-gray-400 dark:focus:ring-gray-500 
      hover:border-gray-400 dark:hover:border-gray-500 
      shadow-sm hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]
    `,
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent",
    danger: "bg-red-600/90 hover:bg-red-500 text-white focus:ring-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="mr-2 relative z-10">{icon}</span>
      ) : null}
      
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;