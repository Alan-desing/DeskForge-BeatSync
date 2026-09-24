import { Howler } from 'howler';

/**
 * Audio Visualizer Engine using Web Audio API (AnalyserNode) + HTML5 Canvas
 * Tap into Howler's masterGain node so sound plays loudly through speakers
 * while feeding real-time audio data to the visualizer canvas.
 */
export class AudioVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.animId = null;

    this.mode = 'bars'; // 'bars' | 'waveform' | 'radial'
    this.audioCtx = null;
    this.analyser = null;

    this.frequencyData = null;
    this.timeDomainData = null;
    this.masterConnected = false;
  }

  init() {
    try {
      this.audioCtx = Howler.ctx || new (window.AudioContext || window.webkitAudioContext)();

      if (!this.analyser && this.audioCtx) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.82;

        const binCount = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(binCount);
        this.timeDomainData = new Uint8Array(binCount);

        // Tap into Howler's masterGain node safely without muting speaker output
        if (Howler.masterGain && !this.masterConnected) {
          Howler.masterGain.connect(this.analyser);
          this.masterConnected = true;
        }
      }
    } catch (err) {
      console.warn('[Visualizer] Init warning:', err);
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    this.init();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (Howler.masterGain && !this.masterConnected && this.analyser) {
      try {
        Howler.masterGain.connect(this.analyser);
        this.masterConnected = true;
      } catch (e) {
        // Connected
      }
    }

    this.stop();
    this.render();
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.clearCanvas();
  }

  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  resizeCanvas() {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.canvas.width = rect.width * (window.devicePixelRatio || 1);
        this.canvas.height = rect.height * (window.devicePixelRatio || 1);
      }
    }
  }

  render = () => {
    this.animId = requestAnimationFrame(this.render);

    if (!this.canvas || !this.ctx || !this.analyser) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) {
      this.resizeCanvas();
    }

    this.ctx.clearRect(0, 0, width, height);

    if (this.mode === 'bars') {
      this.renderBars(width, height);
    } else if (this.mode === 'waveform') {
      this.renderWaveform(width, height);
    } else if (this.mode === 'radial') {
      this.renderRadial(width, height);
    }
  };

  /**
   * Mode 1: Frequency Bars
   */
  renderBars(width, height) {
    this.analyser.getByteFrequencyData(this.frequencyData);

    const count = 64;
    const barWidth = width / count;
    let x = 0;

    for (let i = 0; i < count; i++) {
      const val = this.frequencyData[i * 2] || 0;
      const percent = val / 255;
      const barHeight = Math.max(4, percent * (height * 0.85));

      const hue = (i / count) * 260 + 210;
      this.ctx.fillStyle = `hsl(${hue}, 90%, 62%)`;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;

      this.ctx.beginPath();
      this.ctx.roundRect(x + 2, height - barHeight, barWidth - 4, barHeight, [4, 4, 0, 0]);
      this.ctx.fill();

      x += barWidth;
    }
    this.ctx.shadowBlur = 0;
  }

  /**
   * Mode 2: Oscilloscope Waveform Line
   */
  renderWaveform(width, height) {
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = '#0284c7';

    this.ctx.beginPath();
    const sliceWidth = width / this.timeDomainData.length;
    let x = 0;

    for (let i = 0; i < this.timeDomainData.length; i++) {
      const v = this.timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    this.ctx.lineTo(width, height);
    this.ctx.lineTo(0, height);
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  /**
   * Mode 3: Radial Spikes
   */
  renderRadial(width, height) {
    this.analyser.getByteFrequencyData(this.frequencyData);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.35;
    const barCount = 48;

    for (let i = 0; i < barCount; i++) {
      const val = this.frequencyData[i * 2] || 0;
      const percent = val / 255;
      const barLen = Math.max(2, percent * (height * 0.35));

      const angle = (i / barCount) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barLen);
      const y2 = centerY + Math.sin(angle) * (radius + barLen);

      const hue = (i / barCount) * 300 + 180;
      this.ctx.strokeStyle = `hsl(${hue}, 90%, 65%)`;
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;
  }
}
