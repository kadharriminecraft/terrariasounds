/* sounds.js — zero-asset web sound effects via Web Audio API.
   Usage:  const s = Sound.init();  s.play('coin');
*/
const Sound = (() => {
  let ctx = null, master = null, volume = 0.5, muted = false;

  const defs = {
    coin() {
      return [[880, 0], [1320, 0.07]];
    },
    blip() {
      return [[440, 0]];
    },
    powerup() {
      return [[523, 0], [659, 0.06], [784, 0.12], [1047, 0.18]];
    },
    hurt() {
      return [[220, 0], [110, 0.08]];
    },
    click() {
      return [[1200, 0]];
    },
    drop() {
      return [[400, 0], [300, 0.05], [200, 0.1]];
    },
    whoosh() {
      return [[600, 0], [1200, 0.05]];
    },
    alarm() {
      return [[660, 0], [440, 0.15], [660, 0.3]];
    },
    eat() {
      return [[300, 0], [250, 0.05], [200, 0.1], [150, 0.15]];
    }
  };

  function init() {
    if (ctx) return Sound;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio not supported'); return Sound; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    return Sound;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone({ freq = 440, type = 'square', dur = 0.12, delay = 0, vol = 0.5, slideTo = null }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, delay = 0, vol = 0.4, filter = 1200 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = filter;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(bp).connect(g).connect(master);
    src.start(t0);
  }

  return {
    init, resume,
    get names() { return Object.keys(defs); },
    play(name, opts = {}) {
      if (!ctx) init();
      resume();
      const o = typeof opts === 'number' ? { vol: opts } : (opts || {});
      const spec = defs[name];
      if (spec) {
        spec().forEach(([freq, delay], i) => tone({
          freq, delay, dur: o.dur || 0.12,
          type: o.type || (name === 'hurt' || name === 'drop' ? 'sawtooth' : 'square'),
          vol: (o.vol ?? 0.5) * (1 - i * 0.12),
          slideTo: o.slideTo
        }));
      } else {
        noise({ dur: o.dur || 0.18, vol: o.vol ?? 0.3, filter: o.filter || 1400 });
      }
      return this;
    },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume; return this; },
    mute(m) { muted = !!m; return this; }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
