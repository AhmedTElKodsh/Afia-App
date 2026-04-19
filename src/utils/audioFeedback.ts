/**
 * Audio Feedback Utility
 * 
 * Manages UI sound effects using the Web Audio API.
 * Designed to be non-blocking and memory efficient.
 */

class AudioFeedback {
  private static instance: AudioFeedback;
  private ctx: AudioContext | null = null;

  private constructor() {}

  public static getInstance(): AudioFeedback {
    if (!AudioFeedback.instance) {
      AudioFeedback.instance = new AudioFeedback();
    }
    return AudioFeedback.instance;
  }

  private initContext() {
    if (!this.ctx) {
      // @ts-expect-error - Vendor prefix support
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        this.ctx = new AudioContextCtor();
      }
    }
    
    // Resume context if suspended (browser security policy)
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('Audio resume failed', e));
    }
    
    return this.ctx;
  }

  /**
   * Play a synthetic shutter sound
   */
  public playShutter(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Part 1: Shutter open (high to low sweep)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gain1.gain.setValueAtTime(0.05, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.05);

      // Part 2: Shutter close (slightly delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(800, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain2.gain.setValueAtTime(0.05, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.start(now + 0.1);
      osc2.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }
}

export const audioFeedback = AudioFeedback.getInstance();
