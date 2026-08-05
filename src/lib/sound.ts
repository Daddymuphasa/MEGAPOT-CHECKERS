"use client";

type SoundName =
  | "move"
  | "capture"
  | "king"
  | "select"
  | "invalid"
  | "win"
  | "lose"
  | "notify";

type SoundSkin = "classic" | "chrome";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private master: GainNode | null = null;
  private skin: SoundSkin = "classic";

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  setSkin(s: SoundSkin) {
    this.skin = s;
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
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
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

  /** Metallic resonant tone — the ringing you hear when metal slides or impacts. */
  private metalTone(
    freq: number,
    duration: number,
    gain = 0.12,
    when = 0,
    detune = 0,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + when;

    // Primary oscillator with slight detune for metallic shimmer
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(freq, t0);
    osc2.frequency.setValueAtTime(freq * 1.002 + detune, t0);
    osc1.frequency.exponentialRampToValueAtTime(freq * 0.97, t0 + duration);
    osc2.frequency.exponentialRampToValueAtTime(freq * 0.968, t0 + duration);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.setValueAtTime(gain * 0.8, t0 + duration * 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.master);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + duration + 0.02);
    osc2.stop(t0 + duration + 0.02);
  }

  /** High-frequency metallic scrape / sizzle for impacts. */
  private metalCrunch(
    when: number,
    duration: number,
    filterFreq: number,
    gain = 0.25,
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
    src.playbackRate.value = 1.2 + Math.random() * 0.4;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(filterFreq, t0);
    hp.Q.value = 0.7;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(filterFreq * 1.5, t0);
    bp.frequency.exponentialRampToValueAtTime(filterFreq * 0.6, t0 + duration);
    bp.Q.value = 2.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random() * 0.2, duration + 0.05);
  }

  play(name: SoundName) {
    if (!this.enabled) return;

    if (this.skin === "chrome") {
      this.playChrome(name);
      return;
    }

    switch (name) {
      case "select":
        this.blip(520, 0.08, "sine", 0.1);
        break;
      case "move":
        this.crunch(0, 0.06, 1800, 0.22, 2.5);
        this.blip(190, 0.09, "sine", 0.16, 0.004, 120);
        break;
      case "capture":
        this.crunch(0, 0.09, 2600, 0.4, 1.0);
        this.crunch(0.02, 0.12, 900, 0.34, 0.8);
        this.blip(110, 0.14, "square", 0.13, 0.015, 55);
        this.crunch(0.13, 0.1, 1400, 0.3, 1.1);
        this.crunch(0.16, 0.14, 600, 0.24, 0.7);
        this.blip(300, 0.22, "sine", 0.12, 0.3, 90);
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

  private playChrome(name: SoundName) {
    switch (name) {
      case "select":
        // Light metallic ping
        this.metalTone(1200, 0.12, 0.08);
        this.metalTone(1800, 0.08, 0.04, 0.01, 3);
        break;

      case "move":
        // Metal piece sliding on metal board — scrape + resonant ring
        this.metalCrunch(0, 0.05, 3000, 0.12);
        this.metalTone(440, 0.18, 0.10, 0.01);
        this.metalTone(660, 0.12, 0.05, 0.015, 2);
        this.metalTone(220, 0.22, 0.06, 0.02);
        break;

      case "capture":
        // Metal clash: sharp impact + ringing overtones + scraping debris
        this.metalCrunch(0, 0.06, 4000, 0.3);
        this.metalCrunch(0.01, 0.08, 2400, 0.25);
        this.metalTone(320, 0.28, 0.16, 0.005);
        this.metalTone(520, 0.22, 0.12, 0.01, 4);
        this.metalTone(780, 0.18, 0.08, 0.015, -3);
        this.metalTone(160, 0.35, 0.10, 0.02);
        // Secondary clash ring
        this.metalCrunch(0.08, 0.1, 3200, 0.15);
        this.metalTone(640, 0.25, 0.06, 0.1, 5);
        this.metalTone(960, 0.15, 0.04, 0.12);
        // Debris scatter
        this.metalCrunch(0.15, 0.12, 5000, 0.08);
        this.metalCrunch(0.18, 0.08, 6000, 0.05);
        break;

      case "king":
        // Majestic metallic chord — ascending resonant tones
        this.metalTone(440, 0.25, 0.10);
        this.metalTone(660, 0.25, 0.10, 0.08);
        this.metalTone(880, 0.3, 0.12, 0.16);
        this.metalTone(1320, 0.35, 0.08, 0.24, 2);
        this.metalCrunch(0.24, 0.06, 4000, 0.06);
        break;

      case "invalid":
        // Dull metal thud
        this.metalTone(120, 0.15, 0.10);
        this.metalCrunch(0, 0.04, 1500, 0.08);
        break;

      case "win":
        // Triumphant metal fanfare
        [440, 554, 660, 880, 1100].forEach((f, i) => {
          this.metalTone(f, 0.3, 0.12, i * 0.1, i % 2 ? 2 : -2);
        });
        this.metalCrunch(0.4, 0.08, 3000, 0.06);
        break;

      case "lose":
        // Descending metallic toll
        [440, 330, 220].forEach((f, i) => {
          this.metalTone(f, 0.35, 0.12, i * 0.15);
        });
        break;

      case "notify":
        // Quick metal chime
        this.metalTone(1174, 0.14, 0.10);
        this.metalTone(1568, 0.12, 0.08, 0.07, 3);
        break;
    }
  }
}

export const sound = new SoundEngine();

export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
