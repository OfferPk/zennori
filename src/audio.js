/**
 * ZenNori Procedural Web Audio Synthesizer (海苔 Norinori & Bonshō)
 * Pure Web Audio API - zero external sound files.
 * Generates traditional Japanese seaweed pressing and bento acoustics:
 * - Crispy roasted nori press
 * - Soft rice grain dot tick
 * - Lacquerware bento slide on undo/reset
 * - Harmonic Koto chord on valid chamber / domino completion
 * - Resonant bronze temple bell (Bonshō 梵鐘) at 108 Hz fundamental
 */

class ZenAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('zennori_muted') === 'true';
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('zennori_muted', String(this.muted));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.45, now + 0.05);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Crispy roasted nori sheet press (crisp high-frequency snap with subtle paper resonance)
   */
  playNoriPress() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Smooth rice grain dot tick (tactile bamboo/marimba tick)
   */
  playDot() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Wooden lacquerware slide on undo/reset
   */
  playUndo() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Harmonic Koto chord when a chamber or domino is satisfied
   */
  playChime() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Japanese Yo pentatonic scale (D4, F4, G4, A4, C5)
    const notes = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33];
    const freq = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.frequency.exponentialRampToValueAtTime(360, now + 0.5);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * Resonant bronze Buddhist temple bell (Bonshō 梵鐘)
   * Fundamental ~108 Hz with sacred overtones and long decaying resonance
   */
  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const partials = [
      { ratio: 1.0, gain: 0.36, decay: 3.2 },
      { ratio: 1.98, gain: 0.22, decay: 2.6 },
      { ratio: 2.94, gain: 0.16, decay: 2.1 },
      { ratio: 4.18, gain: 0.11, decay: 1.7 },
      { ratio: 5.42, gain: 0.07, decay: 1.3 }
    ];

    const fundamental = 108.0;

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * p.ratio, now);

      gain.gain.setValueAtTime(p.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });
  }

  playNori() {
    this.playNoriPress();
  }

  playWoodTap() {
    this.playUndo();
  }

  playBell() {
    this.playVictory();
  }
}

const ZenNoriAudio = ZenAudio;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZenAudio;
  module.exports.ZenAudio = ZenAudio;
  module.exports.ZenNoriAudio = ZenNoriAudio;
}
if (typeof window !== 'undefined') {
  window.ZenAudio = ZenAudio;
  window.ZenNoriAudio = ZenNoriAudio;
}
