import { Howl, Howler } from 'howler';

// Offline generated 44.1kHz WAV chime for demo tracks (avoids external network 404 errors)
const DEMO_CHIME_AUDIO = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVBvT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsCnAKcApsC';

/**
 * Demo tracks for initial testing of E4 player.
 */
export const DEMO_PLAYLIST = [
  {
    id: 'demo-1',
    title: 'BeatSync Cyber Pulse',
    artist: 'Synthwave Studio',
    album: 'DeskForge Session Vol. 1',
    format: 'WAV',
    duration: 5,
    src: DEMO_CHIME_AUDIO,
    coverGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
  },
  {
    id: 'demo-2',
    title: 'Neon Code Flow',
    artist: 'Lo-Fi Chill Machine',
    album: 'DeskForge Session Vol. 1',
    format: 'WAV',
    duration: 5,
    src: DEMO_CHIME_AUDIO,
    coverGradient: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)'
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

  setPlaylist(tracks, autoPlay = true) {
    if (!tracks || tracks.length === 0) return;
    if (this.sound) {
      this.sound.stop();
      this.sound.unload();
      this.sound = null;
    }
    this.stopProgressLoop();
    this.playlist = tracks;
    this.currentIndex = 0;
    this.loadTrack(0, autoPlay);
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

    const ext = track.format ? track.format.toLowerCase() : 'mp3';

    // Set html5: false so Web Audio API routes audio directly to Howler.masterGain -> Speakers & Analyser
    this.sound = new Howl({
      src: [track.src],
      format: [ext],
      html5: false,
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
      onload: () => {
        const dur = this.sound ? this.sound.duration() : 0;
        if (dur && dur > 0) {
          track.duration = dur;
          this.notifyProgress(this.sound.seek() || 0, dur);
        }
      },
      onloaderror: (id, err) => {
        console.warn('Howler error loading track:', track.title, err);
      }
    });

    this.notifyTrackChange();
    this.notifyProgress(0, this.sound.duration() || track.duration || 0);

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
