import React from 'react';

interface ContainerProps {
  children?: React.ReactNode;
  zIndex?: string;
  maxWidth?: string;
  className?: string; 
}

interface HeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  className?: string; 
  textColor?: string;
}

interface BodyProps {
  children?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

interface FooterProps {
  children?: React.ReactNode;
  className?: string;
}

export const BaseModal = {
  Container: ({ 
    children, 
    zIndex = 'z-50', 
    maxWidth = 'max-w-4xl', 
    className = 'border-stone-600' 
  }: ContainerProps) => (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 lg:p-4 animate-in fade-in duration-200`}>
      <div 
        className={`ventana w-full ${maxWidth} bg-[#1c1917] border border-stone-700 shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-lg flex flex-col relative overflow-hidden max-h-[94dvh] animate-in zoom-in duration-300 ${className}`}
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.9)' }}
      >
        {children}
      </div>
    </div>
  ),

  Header: ({ 
    title, 
    subtitle, 
    icon, 
    onClose, 
    className = 'bg-[#151413] border-b border-stone-800',
    textColor = 'text-stone-200'
  }: HeaderProps) => (
    <div className={`${className} px-4 py-2 lg:px-6 lg:py-4 flex justify-between items-center shrink-0 select-none relative z-10`}>
      <div className="flex items-center gap-2 lg:gap-3">
         {icon && <span className="text-lg lg:text-2xl opacity-80">{icon}</span>}
         <div className="flex flex-col">
            <h2 className={`text-base lg:text-xl diablo-font tracking-wide uppercase font-bold ${textColor} leading-none`}>{title}</h2>
            {subtitle && <p className="text-[10px] lg:text-[11px] text-stone-500 font-mono uppercase tracking-wider mt-0.5 lg:mt-1">{subtitle}</p>}
         </div>
      </div>
      <button 
        onClick={onClose} 
        className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center text-stone-400 hover:text-white bg-stone-900/80 hover:bg-stone-800 border border-stone-700/80 rounded-md transition-all active:scale-90 touch-manipulation cursor-pointer shadow-sm text-sm"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  ),

  Body: ({ children, className = '', noPadding = false }: BodyProps) => (
    <div className={`flex-grow min-h-0 overflow-y-auto relative custom-scrollbar ${noPadding ? '' : 'p-3 lg:p-6'} ${className}`}>
      {children}
    </div>
  ),

  Footer: ({ children, className = 'bg-[#151413] border-t border-stone-800' }: FooterProps) => (
    <div className={`${className} px-4 py-2 lg:px-6 lg:py-4 shrink-0 z-10`}>
      {children}
    </div>
  )
};