/**
 * Pomodoro Timer Logic Engine
 * Separates core timer mechanics from the UI interface.
 */
export class PomodoroTimer {
  constructor(options = {}) {
    this.workDuration = options.workDuration || 25 * 60; // 25 min default
    this.breakDuration = options.breakDuration || 5 * 60; // 5 min default

    this.mode = 'work'; // 'work' | 'break'
    this.timeRemaining = this.workDuration;
    this.isRunning = false;
    this.timerId = null;

    this.completedCycles = 0;

    // Callbacks
    this.onTickCallback = options.onTick || null;
    this.onStateChangeCallback = options.onStateChange || null;
    this.onFinishCallback = options.onFinish || null;
  }

  setDurations(workSeconds, breakSeconds) {
    this.pause();
    this.workDuration = workSeconds;
    this.breakDuration = breakSeconds;
    this.timeRemaining = this.mode === 'work' ? this.workDuration : this.breakDuration;
    this.notifyTick();
    this.notifyStateChange();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.notifyStateChange();

    this.timerId = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.notifyTick();
      } else {
        this.handlePhaseComplete();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyStateChange();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    this.pause();
    this.timeRemaining = this.mode === 'work' ? this.workDuration : this.breakDuration;
    this.notifyTick();
  }

  switchMode(newMode) {
    this.pause();
    this.mode = newMode;
    this.timeRemaining = this.mode === 'work' ? this.workDuration : this.breakDuration;
    this.notifyTick();
    this.notifyStateChange();
  }

  handlePhaseComplete() {
    this.pause();
    const completedMode = this.mode;

    if (completedMode === 'work') {
      this.completedCycles++;
      this.mode = 'break';
      this.timeRemaining = this.breakDuration;
    } else {
      this.mode = 'work';
      this.timeRemaining = this.workDuration;
    }

    this.notifyTick();
    this.notifyStateChange();

    if (typeof this.onFinishCallback === 'function') {
      this.onFinishCallback(completedMode, this.completedCycles);
    }
  }

  getFormattedTime() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  getProgressPercentage() {
    const total = this.mode === 'work' ? this.workDuration : this.breakDuration;
    if (total === 0) return 0;
    return Math.round(((total - this.timeRemaining) / total) * 100);
  }

  notifyTick() {
    if (typeof this.onTickCallback === 'function') {
      this.onTickCallback({
        timeRemaining: this.timeRemaining,
        formattedTime: this.getFormattedTime(),
        progressPercentage: this.getProgressPercentage(),
        mode: this.mode
      });
    }
  }

  notifyStateChange() {
    if (typeof this.onStateChangeCallback === 'function') {
      this.onStateChangeCallback({
        isRunning: this.isRunning,
        mode: this.mode,
        completedCycles: this.completedCycles
      });
    }
  }
}
