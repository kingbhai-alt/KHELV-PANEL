import React from 'react';
import { sfx } from '../utils/audio';

interface GameFrameProps {
  gameUrl: string;
  isBlurred: boolean;
  onRegisteredClick: () => void;
  showLoginFab: boolean;
}

export const GameFrame: React.FC<GameFrameProps> = ({
  gameUrl,
  isBlurred,
  onRegisteredClick,
  showLoginFab,
}) => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto">
      {/* Background Iframe */}
      <iframe
        id="gameFrame"
        src={gameUrl}
        title="WinGo Game Portal"
        className={`w-full h-full border-0 transition-all duration-700 ${
          isBlurred
            ? 'filter blur-sm brightness-75 scale-[1.02]'
            : 'filter-none scale-100'
        }`}
        allow="fullscreen"
      />

      {/* Dim veil */}
      <div
        className={`absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] transition-opacity duration-700 pointer-events-none ${
          isBlurred ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Login FAB button from original HTML */}
      {showLoginFab && (
        <button
          onClick={() => {
            sfx.click();
            onRegisteredClick();
          }}
          className="fixed left-3.5 bottom-24 z-[650] flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 shadow-[0_12px_28px_rgba(5,150,105,0.4)] active:scale-95 transition-all duration-150 animate-btn-breath cursor-pointer"
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold">
            ✓
          </span>
          <span>I Registered / Logged In</span>
        </button>
      )}
    </div>
  );
};
