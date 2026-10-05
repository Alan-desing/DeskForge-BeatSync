import { Howler } from 'howler';

const STORAGE_KEY = 'deskforge_equalizer';

export class AudioEqualizer {
  constructor() {
    this.audioCtx = null;
    this.lowFilter = null;
    this.midFilter = null;
    this.highFilter = null;
    this.initialized = false;
    this.values = this.loadValues();
  }

  loadValues() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        low: Number.isFinite(saved.low) ? saved.low : 0,
        mid: Number.isFinite(saved.mid) ? saved.mid : 0,
        high: Number.isFinite(saved.high) ? saved.high : 0
      };
    } catch {
      return { low: 0, mid: 0, high: 0 };
    }
  }

  init() {
    if (this.initialized) return true;

    this.audioCtx = Howler.ctx;
    if (!this.audioCtx || !Howler.masterGain) return false;

    this.lowFilter = this.audioCtx.createBiquadFilter();
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 200;

    this.midFilter = this.audioCtx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1;

    this.highFilter = this.audioCtx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 3500;

    try {
      // Replace Howler's direct output with the EQ chain.
      Howler.masterGain.disconnect();
    } catch {
      // It may already be disconnected while Howler is initializing.
    }

    Howler.masterGain.connect(this.lowFilter);
    this.lowFilter.connect(this.midFilter);
    this.midFilter.connect(this.highFilter);
    this.highFilter.connect(this.audioCtx.destination);

    this.initialized = true;
    this.applyValues();
    return true;
  }

  applyValues() {
    if (!this.initialized) return;
    const now = this.audioCtx.currentTime;
    this.lowFilter.gain.setTargetAtTime(this.values.low, now, 0.01);
    this.midFilter.gain.setTargetAtTime(this.values.mid, now, 0.01);
    this.highFilter.gain.setTargetAtTime(this.values.high, now, 0.01);
  }

  setBand(band, value) {
    if (!['low', 'mid', 'high'].includes(band)) return;
    const gain = Math.max(-12, Math.min(12, Number(value) || 0));
    this.values[band] = gain;
    this.init();
    this.applyValues();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
  }

  reset() {
    this.values = { low: 0, mid: 0, high: 0 };
    this.init();
    this.applyValues();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    return { ...this.values };
  }

  getValues() {
    return { ...this.values };
  }
}
