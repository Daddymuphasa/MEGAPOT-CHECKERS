"use client";

/**
 * Tiny zero-asset sound engine built on the Web Audio API. Generates soft,
 * pleasant UI blips procedurally so there are no audio files to ship and no
 * network cost. Respects the user's sound toggle via `setEnabled`.
 */
type SoundName =
  | "move"
  | "capture"
  | "king"
  | "select"
  | "invalid"
  | "win"
  | "lose"
  | "notify";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private master: GainNode | null = null;

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.18,
    when = 0,
    sweepTo?: number,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo)
      osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBuffer: AudioBuffer | null = null;

  /** Filtered white-noise burst — the basis of crunches, thuds and chomps. */
  private crunch(
    when: number,
    duration: number,
    filterFreq: number,
    gain = 0.3,
    q = 1.2,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.7 + Math.random() * 0.6; // organic variation
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, filterFreq * 0.4),
      t0 + duration,
    );
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random() * 0.2, duration + 0.05);
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    switch (name) {
      case "select":
        this.blip(520, 0.08, "sine", 0.1);
        break;
      case "move":
        // Warm wooden "tock": noise tick + low body knock.
        this.crunch(0, 0.06, 1800, 0.22, 2.5);
        this.blip(190, 0.09, "sine", 0.16, 0.004, 120);
        break;
      case "capture":
        // Monstrous CHOMP: two crunchy bites, a low jaw thud and a gulp.
        this.crunch(0, 0.09, 2600, 0.4, 1.0); // teeth snap
        this.crunch(0.02, 0.12, 900, 0.34, 0.8); // crunchy body
        this.blip(110, 0.14, "square", 0.13, 0.015, 55); // jaw thud
        this.crunch(0.13, 0.1, 1400, 0.3, 1.1); // second bite
        this.crunch(0.16, 0.14, 600, 0.24, 0.7);
        this.blip(300, 0.22, "sine", 0.12, 0.3, 90); // gulp (pitch drop)
        break;
      case "king":
        this.blip(660, 0.1, "sine", 0.14);
        this.blip(880, 0.12, "sine", 0.14, 0.09);
        this.blip(1174, 0.16, "sine", 0.12, 0.18);
        break;
      case "invalid":
        this.blip(140, 0.14, "square", 0.12);
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) =>
          this.blip(f, 0.24, "triangle", 0.16, i * 0.11),
        );
        break;
      case "lose":
        [440, 349, 262].forEach((f, i) =>
          this.blip(f, 0.3, "sine", 0.14, i * 0.14),
        );
        break;
      case "notify":
        this.blip(880, 0.1, "sine", 0.12);
        this.blip(1174, 0.12, "sine", 0.12, 0.08);
        break;
    }
  }
}

export const sound = new SoundEngine();

/** Fire a haptic pulse on supported mobile devices. */
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
