/**
 * Audio Synthesizer & Speech Assistant
 * Uses Web Audio API oscillator nodes for zero-asset latency-free sound effects
 * and SpeechSynthesis for real-time voice announcements.
 */

let audioCtx: AudioContext | null = null;
let soundMuted = false;
let voiceEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    } catch {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTone(
  freq: number,
  delay: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.18
) {
  if (soundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const start = ctx.currentTime + delay;
    const end = start + duration;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.05);
  } catch (e) {
    // Audio context may require user interaction
  }
}

export const sfx = {
  click() {
    playTone(700, 0, 0.09, 'sine', 0.15);
    playTone(1050, 0.06, 0.1, 'sine', 0.12);
  },
  notify() {
    playTone(880, 0, 0.12, 'triangle', 0.14);
    playTone(1174, 0.12, 0.16, 'triangle', 0.12);
  },
  throw() {
    playTone(300, 0, 0.25, 'sawtooth', 0.06);
    playTone(600, 0.1, 0.2, 'sawtooth', 0.05);
  },
  pick() {
    playTone(523, 0, 0.1, 'triangle', 0.16);
    playTone(659, 0.09, 0.1, 'triangle', 0.16);
    playTone(784, 0.18, 0.22, 'triangle', 0.18);
  },
  win() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((freq, idx) => {
      playTone(freq, idx * 0.11, 0.32, 'triangle', 0.2);
    });
    playTone(1568, 0.58, 0.5, 'sine', 0.18);
  },
  loss() {
    playTone(392, 0, 0.3, 'triangle', 0.16);
    playTone(330, 0.22, 0.3, 'triangle', 0.15);
    playTone(262, 0.44, 0.55, 'sine', 0.16);
  },
  error() {
    playTone(250, 0, 0.15, 'sawtooth', 0.18);
    playTone(180, 0.12, 0.25, 'sawtooth', 0.18);
  },
  predict() {
    playTone(600, 0, 0.08, 'sine', 0.12);
    playTone(900, 0.07, 0.12, 'sine', 0.15);
  },
};

export function speakNotification(text: string) {
  if (!voiceEnabled || soundMuted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    // Ignore speech errors
  }
}

export function toggleMute(): boolean {
  soundMuted = !soundMuted;
  return soundMuted;
}

export function getMuted(): boolean {
  return soundMuted;
}

export function toggleVoice(): boolean {
  voiceEnabled = !voiceEnabled;
  return voiceEnabled;
}

export function getVoiceEnabled(): boolean {
  return voiceEnabled;
}
