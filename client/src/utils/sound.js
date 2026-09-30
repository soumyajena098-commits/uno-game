/**
 * Synthesized Web Audio API Sound Engine for UNO Royale
 *
 * Generates crisp, zero-latency sound effects for:
 * - Card Play (snappy swoosh/pop)
 * - Card Draw (soft slide)
 * - UNO Call (energetic ascending siren/chime)
 * - Timer Warning (<10s remaining tick)
 * - Illegal Move / Penalty (low buzz)
 * - Round / Game Win (triumphant arpeggio fanfare)
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('uno_sound_enabled') !== 'false';
  }

  initContext() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    localStorage.setItem('uno_sound_enabled', String(this.enabled));
  }

  playTone(freq, type = 'sine', duration = 0.12, volume = 0.15, delay = 0) {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Ignore audio errors if browser autoplay blocked
    }
  }

  playCard() {
    this.playTone(520, 'triangle', 0.08, 0.18, 0);
    this.playTone(780, 'sine', 0.1, 0.14, 0.04);
  }

  drawCard() {
    this.playTone(340, 'sine', 0.09, 0.14, 0);
    this.playTone(440, 'triangle', 0.08, 0.1, 0.05);
  }

  callUno() {
    // Energetic 3-note UNO fanfare
    this.playTone(587.33, 'sawtooth', 0.14, 0.16, 0); // D5
    this.playTone(880.0, 'sawtooth', 0.14, 0.18, 0.12); // A5
    this.playTone(1174.66, 'triangle', 0.32, 0.22, 0.24); // D6
  }

  timerTick(isUrgent = false) {
    this.playTone(isUrgent ? 880 : 660, 'sine', 0.05, isUrgent ? 0.14 : 0.07, 0);
  }

  errorBuzz() {
    this.playTone(160, 'sawtooth', 0.15, 0.16, 0);
    this.playTone(130, 'sawtooth', 0.18, 0.16, 0.1);
  }

  winFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((n, idx) => {
      this.playTone(n, 'triangle', 0.24, 0.2, idx * 0.11);
    });
  }

  chatPing() {
    this.playTone(659.25, 'sine', 0.08, 0.08, 0); // E5 soft ping
    this.playTone(987.77, 'sine', 0.12, 0.07, 0.06); // B5
  }
}

export const soundEngine = new SoundEngine();
