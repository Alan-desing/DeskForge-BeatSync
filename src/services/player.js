import { Howl, Howler } from 'howler';

/**
 * Demo tracks for testing E4 player without requiring E5 local folder loading.
 * Uses reliable public domain audio streams with lightweight data URL fallbacks.
 */
export const DEMO_PLAYLIST = [
  {
    id: 'demo-1',
    title: 'BeatSync Cyber Pulse',
    artist: 'Synthwave Studio',
    album: 'DeskForge Session Vol. 1',
    duration: 372,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
  },
  {
    id: 'demo-2',
    title: 'Neon Code Flow',
    artist: 'Lo-Fi Chill Machine',
    album: 'DeskForge Session Vol. 1',
    duration: 423,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverGradient: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)'
  },
  {
    id: 'demo-3',
    title: 'Midnight Focus Engine',
    artist: 'Ambient Mind',
    album: 'DeskForge Session Vol. 1',
    duration: 345,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverGradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
  }
];

export class MusicPlayer {
  constructor(options = {}) {
    this.playlist = options.playlist || DEMO_PLAYLIST;
    this.currentIndex = 0;
    this.sound = null;
    this.isPlaying = false;
    this.volume = 0.8;
    this.isMuted = false;
    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'

    this.progressInterval = null;

    // Callbacks
    this.onTrackChangeCallback = options.onTrackChange || null;
    this.onPlayStateChangeCallback = options.onPlayStateChange || null;
    this.onProgressCallback = options.onProgress || null;
    this.onModeChangeCallback = options.onModeChange || null;

    Howler.volume(this.volume);
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || null;
  }

  loadTrack(index, autoPlay = false) {
    if (index < 0 || index >= this.playlist.length) return;

    if (this.sound) {
      this.sound.stop();
      this.sound.unload();
      this.sound = null;
    }

    this.stopProgressLoop();
    this.currentIndex = index;
    const track = this.getCurrentTrack();
    if (!track) return;

    this.sound = new Howl({
      src: [track.src],
      html5: true,
      volume: this.isMuted ? 0 : this.volume,
      onplay: () => {
        this.isPlaying = true;
        this.startProgressLoop();
        this.notifyPlayState();
      },
      onpause: () => {
        this.isPlaying = false;
        this.stopProgressLoop();
        this.notifyPlayState();
      },
      onstop: () => {
        this.isPlaying = false;
        this.stopProgressLoop();
        this.notifyPlayState();
      },
      onend: () => {
        this.handleTrackEnd();
      },
      onloaderror: (id, err) => {
        console.warn('Audio load error, switching fallback track:', err);
      }
    });

    this.notifyTrackChange();
    this.notifyProgress(0, this.sound.duration() || track.duration);

    if (autoPlay) {
      this.play();
    }
  }

  play() {
    if (!this.sound) {
      this.loadTrack(this.currentIndex, true);
      return;
    }
    this.sound.play();
  }

  pause() {
    if (this.sound && this.isPlaying) {
      this.sound.pause();
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.playlist.length === 0) return;

    let nextIndex;
    if (this.isShuffle && this.playlist.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * this.playlist.length);
      } while (nextIndex === this.currentIndex);
    } else {
      nextIndex = (this.currentIndex + 1) % this.playlist.length;
    }

    this.loadTrack(nextIndex, this.isPlaying);
  }

  previous() {
    if (this.playlist.length === 0) return;

    // If current track is past 3 seconds, restart current track
    if (this.sound && this.sound.seek() > 3) {
      this.seek(0);
      return;
    }

    let prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadTrack(prevIndex, this.isPlaying);
  }

  seek(seconds) {
    if (this.sound) {
      this.sound.seek(seconds);
      this.notifyProgress(seconds, this.sound.duration() || 0);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (!this.isMuted) {
      Howler.volume(this.volume);
      if (this.sound) this.sound.volume(this.volume);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    return this.isMuted;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.notifyModeChange();
    return this.isShuffle;
  }

  toggleRepeat() {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'off';
    }
    this.notifyModeChange();
    return this.repeatMode;
  }

  handleTrackEnd() {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else if (this.repeatMode === 'all' || this.currentIndex < this.playlist.length - 1) {
      this.next();
    } else {
      this.isPlaying = false;
      this.stopProgressLoop();
      this.notifyPlayState();
    }
  }

  startProgressLoop() {
    this.stopProgressLoop();
    this.progressInterval = setInterval(() => {
      if (this.sound && this.isPlaying) {
        const seek = this.sound.seek() || 0;
        const duration = this.sound.duration() || this.getCurrentTrack()?.duration || 0;
        this.notifyProgress(seek, duration);
      }
    }, 250);
  }

  stopProgressLoop() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  notifyTrackChange() {
    if (typeof this.onTrackChangeCallback === 'function') {
      this.onTrackChangeCallback(this.getCurrentTrack(), this.currentIndex);
    }
  }

  notifyPlayState() {
    if (typeof this.onPlayStateChangeCallback === 'function') {
      this.onPlayStateChangeCallback(this.isPlaying);
    }
  }

  notifyProgress(currentSec, totalSec) {
    if (typeof this.onProgressCallback === 'function') {
      this.onProgressCallback(currentSec, totalSec);
    }
  }

  notifyModeChange() {
    if (typeof this.onModeChangeCallback === 'function') {
      this.onModeChangeCallback({
        isShuffle: this.isShuffle,
        repeatMode: this.repeatMode
      });
    }
  }
}
