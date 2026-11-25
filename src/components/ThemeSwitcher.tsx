import React, { useState, useRef, useEffect } from 'react';
import { THEME_PRESETS, ThemePreset, useTheme } from '../context/ThemeContext';
import { sfx } from '../utils/audio';

interface ThemeSwitcherProps {
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = true }) => {
  const { theme, themeId, isDark, setThemeId, toggleLightDark } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const darkThemes = THEME_PRESETS.filter((t) => t.mode === 'dark');
  const lightThemes = THEME_PRESETS.filter((t) => t.mode === 'light');

  const handleSelect = (preset: ThemePreset) => {
    sfx.click();
    setThemeId(preset.id);
    setOpen(false);
  };

  if (!compact) {
    return (
      <div className="space-y-3">
        {/* Quick Light / Dark Segmented Toggle */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--kp-surface)] border border-[var(--kp-border)]">
          <button
            type="button"
            onClick={() => {
              if (!isDark) {
                sfx.click();
                toggleLightDark();
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isDark
                ? 'bg-[var(--kp-accent)] text-slate-950 shadow-sm'
                : 'text-[var(--kp-muted)] hover:text-[var(--kp-text)]'
            }`}
          >
            <span>🌙</span>
            <span>Dark Themes (4)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDark) {
                sfx.click();
                toggleLightDark();
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isDark
                ? 'bg-[var(--kp-accent)] text-white shadow-sm'
                : 'text-[var(--kp-muted)] hover:text-[var(--kp-text)]'
            }`}
          >
            <span>☀️</span>
            <span>Light Themes (4)</span>
          </button>
        </div>

        {/* All 8 Theme Cards */}
        <div className="space-y-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--kp-muted)] mb-1.5 px-0.5">
              Dark Mode Collection
            </div>
            <div className="grid grid-cols-2 gap-2">
              {darkThemes.map((preset) => {
                const active = preset.id === themeId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[var(--kp-accent)] ring-2 ring-[var(--kp-accent)]/35 bg-[var(--kp-surface)]'
                        : 'border-[var(--kp-border)] bg-[var(--kp-surface)]/70 hover:border-[var(--kp-accent)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[var(--kp-text)] truncate">
                        {preset.name}
                      </span>
                      {active && (
                        <span className="text-[10px] font-black text-[var(--kp-accent-text)]">✓</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--kp-muted)] truncate mb-1.5">
                      {preset.tagline}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preset.swatches.map((hex, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-slate-500/30"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--kp-muted)] mb-1.5 px-0.5">
              Light Mode Collection
            </div>
            <div className="grid grid-cols-2 gap-2">
              {lightThemes.map((preset) => {
                const active = preset.id === themeId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[var(--kp-accent)] ring-2 ring-[var(--kp-accent)]/35 bg-[var(--kp-surface)]'
                        : 'border-[var(--kp-border)] bg-[var(--kp-surface)]/70 hover:border-[var(--kp-accent)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-[var(--kp-text)] truncate">
                        {preset.name}
                      </span>
                      {active && (
                        <span className="text-[10px] font-black text-[var(--kp-accent-text)]">✓</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--kp-muted)] truncate mb-1.5">
                      {preset.tagline}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preset.swatches.map((hex, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-slate-500/30"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => {
          sfx.click();
          toggleLightDark();
        }}
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        className="px-2 py-1 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)] text-[var(--kp-text)] hover:border-[var(--kp-accent)] text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
      >
        <span>{isDark ? '🌙' : '☀️'}</span>
        <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          sfx.click();
          setOpen((v) => !v);
        }}
        title="Choose Color Theme"
        className="px-2 py-1 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)] text-[var(--kp-accent-text)] hover:border-[var(--kp-accent)] text-[10.5px] font-mono font-bold cursor-pointer transition-colors flex items-center gap-1.5"
      >
        <span
          className="w-2.5 h-2.5 rounded-full border border-current"
          style={{ backgroundColor: theme.swatches[2] }}
        />
        <span>Themes</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-[1200] w-64 rounded-2xl bg-[var(--kp-card)] border border-[var(--kp-border)] shadow-2xl p-2.5 text-[var(--kp-text)]">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--kp-border)]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--kp-accent-text)]">
              Select Theme (Light & Dark)
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-[var(--kp-muted)] hover:text-[var(--kp-text)] px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--kp-muted)] mb-1">
            🌙 Dark Modes
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            {darkThemes.map((preset) => {
              const active = preset.id === themeId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset)}
                  className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[var(--kp-accent)] bg-[var(--kp-surface)] ring-1 ring-[var(--kp-accent)]'
                      : 'border-[var(--kp-border)] bg-[var(--kp-surface)]/60 hover:border-[var(--kp-accent)]/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: preset.swatches[2] }}
                    />
                    <span className="text-[10.5px] font-bold truncate">{preset.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--kp-muted)] mb-1">
            ☀️ Light Modes
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {lightThemes.map((preset) => {
              const active = preset.id === themeId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset)}
                  className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[var(--kp-accent)] bg-[var(--kp-surface)] ring-1 ring-[var(--kp-accent)]'
                      : 'border-[var(--kp-border)] bg-[var(--kp-surface)]/60 hover:border-[var(--kp-accent)]/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-slate-900/20"
                      style={{ backgroundColor: preset.swatches[2] }}
                    />
                    <span className="text-[10.5px] font-bold truncate">{preset.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
