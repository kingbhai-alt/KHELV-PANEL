import React from 'react';

export interface ToastItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  animation?: 'from-top' | 'from-left' | 'from-right';
}

interface ToastZoneProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastZone: React.FC<ToastZoneProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-2 inset-x-0 z-[700] flex flex-col items-center gap-2 px-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="pointer-events-auto w-[min(380px,94vw)] flex items-center gap-3 p-3 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-sky-950/95 via-sky-900/90 to-slate-900/95 border border-sky-400/40 shadow-[0_18px_42px_rgba(2,132,199,0.38)] cursor-pointer select-none transition-transform active:scale-98 animate-[toastTop_0.5s_cubic-bezier(0.2,1.3,0.3,1)_both]"
        >
          <span className="text-2xl flex-shrink-0">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <b className="block text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
              {t.title}
            </b>
            {t.subtitle && (
              <span className="block text-[11px] text-sky-200 mt-0.5 leading-snug">
                {t.subtitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
