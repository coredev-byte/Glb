"""Trilha original + sound design + mix do comercial LR Imports.

Tudo é sintetizado de forma determinística (seed fixa) a partir de src/config/timeline.json,
então cada impacto cai exatamente no frame do evento visual.

Saídas (48 kHz, estéreo, WAV 24-bit):
  public/audio/narration.wav   locução do Marcio editada na timeline
  public/audio/music.wav       trilha (ambient eletrônico de luxo)
  public/audio/sfx.wav         efeitos
  public/audio/mix.wav         mix final (música com ducking sob a voz)

uso: python3 tools/audio/build_audio.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
TL = json.loads((ROOT / "src/config/timeline.json").read_text())
SR = 48000
DUR = TL["duration"]
N = int(round(DUR * SR))
rng = np.random.default_rng(20261105)
OUT = ROOT / "public/audio"


# ── utilidades ──────────────────────────────────────────────────────────────
def t_axis(n):
    return np.arange(n) / SR


def env_ad(n, attack, decay, curve=4.0):
    t = t_axis(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-curve * np.clip(t - attack, 0, None) / max(decay, 1e-4))
    return a * d


def fade(x, fin=0.01, fout=0.05):
    n = len(x)
    i, o = int(fin * SR), int(fout * SR)
    if i:
        x[:i] *= np.linspace(0, 1, i) if x.ndim == 1 else np.linspace(0, 1, i)[:, None]
    if o:
        x[-o:] *= np.linspace(1, 0, o) if x.ndim == 1 else np.linspace(1, 0, o)[:, None]
    return x


def place(buf, x, t, gain=1.0, pan=0.0):
    """Soma o sinal mono/estéreo x no buffer estéreo em t segundos."""
    s = int(round(t * SR))
    if s >= len(buf):
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], axis=1)
    e = min(len(buf), s + len(x))
    buf[s:e] += x[: e - s] * gain


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def sweep_filter(x, f0, f1, q=1.2, block=256, kind="band"):
    """Filtro passa-banda/passa-baixa com frequência variando no tempo (blocos)."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        u = b / max(nb - 1, 1)
        f = f0 * (f1 / f0) ** u
        if kind == "band":
            lo, hi = f / (1 + 1 / q), min(f * (1 + 1 / q), SR / 2 - 100)
            sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        else:
            sos = signal.butter(2, min(f, SR / 2 - 100), btype="low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[b * block:(b + 1) * block]
        out[b * block:(b + 1) * block], zi = signal.sosfilt(sos, seg, zi=zi)
    return out


def reverb_ir(seconds=2.6, damp=3.2, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = t_axis(n)
    ir = np.zeros((n, 2))
    for c in range(2):
        noise = r.standard_normal(n)
        noise = lp(noise, 6000) * np.exp(-damp * t)
        ir[:, c] = noise
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0)).max()


IR_HALL = reverb_ir(3.2, 2.4, 3)
IR_ROOM = reverb_ir(1.4, 4.5, 4)


def add_reverb(st, ir, wet=0.25):
    out = np.zeros_like(st)
    for c in range(2):
        out[:, c] = signal.fftconvolve(st[:, c], ir[:, c])[: len(st)]
    return st * (1 - wet) + out * wet


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ── instrumentos ────────────────────────────────────────────────────────────
def pad_note(freq, dur, bright=0.5, detune=0.12, attack=1.2, release=1.5, seed=0):
    """Saw 'band-limited' por harmônicos, 3 vozes desafinadas, estéreo."""
    n = int((dur + release) * SR)
    t = t_axis(n)
    r = np.random.default_rng(seed)
    st = np.zeros((n, 2))
    nh = int(4 + bright * 14)
    for v, cents in enumerate((-detune * 100, 0, detune * 100)):
        f = freq * 2 ** (cents / 1200)
        ph = r.uniform(0, 2 * np.pi, nh)
        w = np.zeros(n)
        for h in range(1, nh + 1):
            if f * h > 12000:
                break
            w += np.sin(2 * np.pi * f * h * t + ph[h - 1]) / (h ** (1.6 - bright * 0.6))
        pan = (v - 1) * 0.6
        st[:, 0] += w * np.cos((pan + 1) * np.pi / 4)
        st[:, 1] += w * np.sin((pan + 1) * np.pi / 4)
    e = np.clip(t / attack, 0, 1) ** 1.5
    e *= np.where(t > dur, np.exp(-(t - dur) / (release / 4)), 1.0)
    # leve movimento de filtro (vibrato de amplitude lento)
    e *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.18 * t + seed)
    return st * e[:, None] * 0.08


def bell(freq, dur=2.5, gain=1.0, bright=1.0):
    """Sino FM (metálico, elegante)."""
    n = int(dur * SR)
    t = t_axis(n)
    mod_env = np.exp(-t * 3.5)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * bright * mod_env
    car = np.sin(2 * np.pi * freq * t + mod)
    car += 0.3 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 6)
    return car * env_ad(n, 0.003, dur * 0.55, 3.5) * gain


def pluck(freq, dur=0.9, gain=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    w = sum(np.sin(2 * np.pi * freq * h * t) * np.exp(-t * (3 + h * 2.5)) / h for h in range(1, 7))
    return w * env_ad(n, 0.004, dur * 0.6, 4) * gain


def sub_hit(f0=58, f1=34, dur=1.4, click=0.3):
    n = int(dur * SR)
    t = t_axis(n)
    f = f1 + (f0 - f1) * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_ad(n, 0.002, dur * 0.7, 3.2)
    c = hp(rng.standard_normal(n), 2500) * np.exp(-t * 90) * click
    return x + c


def soft_kick(gain=1.0):
    return sub_hit(95, 45, 0.45, 0.08) * gain


def hat(gain=1.0):
    n = int(0.09 * SR)
    t = t_axis(n)
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * 60) * gain


# ── SFX ─────────────────────────────────────────────────────────────────────
def sfx_whoosh(dur=0.8):
    n = int(dur * SR)
    x = sweep_filter(rng.standard_normal(n), 300, 4500, q=1.6)
    t = t_axis(n)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    return x * e * 0.9


def sfx_glass_tick(pitch=1.0):
    n = int(0.6 * SR)
    t = t_axis(n)
    f = 2400 * pitch
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for a, r, d in ((1, 1, 18), (0.5, 2.41, 26), (0.3, 3.97, 34)))
    x += hp(rng.standard_normal(n), 5000) * np.exp(-t * 200) * 0.4
    return x * 0.35


def sfx_metal_click():
    n = int(0.35 * SR)
    t = t_axis(n)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for a, f, d in ((1, 1650, 40), (0.6, 3310, 55), (0.4, 5230, 70)))
    x += bp(rng.standard_normal(n), 2000, 9000) * np.exp(-t * 300) * 0.8
    return x * 0.4


def sfx_digit_roll(dur):
    n = int(dur * SR)
    out = np.zeros(n)
    t = 0.0
    k = 0
    while t < dur - 0.05:
        c = sfx_metal_click() * (0.35 + 0.25 * rng.random())
        s = int(t * SR)
        e = min(n, s + len(c))
        out[s:e] += c[: e - s]
        # acelera e depois desacelera (mecânico)
        u = t / dur
        rate = 9 + 9 * np.sin(np.pi * u)
        t += 1 / rate + rng.uniform(-0.006, 0.006)
        k += 1
    return out


def sfx_shimmer(dur):
    n = int(dur * SR)
    t = t_axis(n)
    x = hp(rng.standard_normal(n), 6500) * 0.15
    for f in (3520, 4186, 5274, 6272):
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * 0.04 * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 7) * t))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return x * e


def sfx_riser(dur):
    n = int(dur * SR)
    t = t_axis(n)
    u = t / dur
    x = sweep_filter(rng.standard_normal(n), 400, 7000, q=2.5) * 0.6
    f = 180 * (1 + 3 * u ** 2)
    x += np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    return x * u ** 2.2


def sfx_shatter(dur):
    n = int(dur * SR)
    out = np.zeros(n)
    t = t_axis(n)
    out += lp(rng.standard_normal(n), 3000) * np.exp(-t * 9) * 0.5
    for _ in range(140):
        s = int(abs(rng.normal(0, 0.18)) * SR)
        if s >= n:
            continue
        c = sfx_glass_tick(rng.uniform(0.7, 2.2)) * rng.uniform(0.1, 0.45)
        e = min(n, s + len(c))
        out[s:e] += c[: e - s]
    sh = sub_hit(70, 40, 0.8, 0.2)[:n] * 0.7
    out[: len(sh)] += sh
    return out


def sfx_boom():
    x = sub_hit(52, 26, 3.2, 0.5) * 1.1
    n = len(x)
    t = t_axis(n)
    x += lp(rng.standard_normal(n), 400) * np.exp(-t * 2.4) * 0.6
    return x


def sfx_drop():
    n = int(1.6 * SR)
    t = t_axis(n)
    f = 420 + 900 * (1 - np.exp(-t * 28))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.7
    x += bp(rng.standard_normal(n), 1500, 7000) * np.exp(-t * 22) * 0.35
    sh = sub_hit(70, 38, 1.2, 0.0)[:n] * 0.5
    x[: len(sh)] += sh
    return x


def sfx_reveal():
    n = int(4.0 * SR)
    x = np.zeros(n)
    x[: int(2.2 * SR)] += sub_hit(60, 32, 2.2, 0.2) * 0.9
    for f, d in ((midi(62), 0), (midi(69), 0.03), (midi(74), 0.06), (midi(77), 0.09)):
        b = bell(f, 3.8, 0.22, 0.7)
        s = int(d * SR)
        x[s:s + len(b)] += b[: n - s]
    x += sfx_shimmer(4.0) * 1.2
    return x


def sfx_chime(note):
    return bell(midi(74 + note), 2.2, 0.35, 0.8)


def sfx_signature():
    n = int(3.2 * SR)
    x = np.zeros(n)
    for i, (m, d) in enumerate(((62, 0.0), (69, 0.22), (77, 0.44))):
        b = bell(midi(m + 12), 2.6, 0.32 - i * 0.03, 0.9)
        s = int(d * SR)
        x[s:s + len(b)] += b[: n - s]
    x[: int(1.4 * SR)] += sub_hit(62, 36, 1.4, 0.1) * 0.6
    return x


def sfx_sting():
    n = int(2.4 * SR)
    x = np.zeros(n)
    for m in (50, 57, 62, 65, 69):
        b = bell(midi(m + 12), 2.4, 0.13, 0.5)
        x[: len(b)] += b
    x[: int(1.2 * SR)] += sub_hit(55, 32, 1.2, 0.1) * 0.7
    return x


# ── música ──────────────────────────────────────────────────────────────────
def build_music():
    st = np.zeros((N, 2))
    m = TL["music"]
    beat = 60 / m["bpm"]
    cut0, cut1 = m["cut"]["from"], m["cut"]["to"]
    reveal = m["reveal"]

    # A/B/C — tensão (Ré menor, harmonias fechadas)
    tension = [
        (0.0, 7.2, [38, 50, 57, 64], 0.25),        # Dm(add9) grave, escuro
        (7.2, 12.0, [34, 50, 53, 60, 65], 0.35),   # Bb(add9)
        (12.0, 17.8, [31, 46, 53, 58, 62], 0.40),  # Gm9
        (17.8, cut0, [33, 49, 55, 58, 64], 0.30),  # A7(b9) sus — instável
    ]
    for i, (a, b, notes, br) in enumerate(tension):
        for j, nn in enumerate(notes):
            p = pad_note(midi(nn), b - a + 0.4, bright=br, attack=0.8 if i else 1.6, release=0.6 if b == cut0 else 1.6, seed=i * 10 + j)
            place(st, p, a, 0.9 if nn > 40 else 1.3)
    # pulso grave (batida de coração) até o corte
    t = 0.6
    while t < cut0 - 0.2:
        g = 0.32 if t < 7.2 else 0.42
        place(st, sub_hit(64, 40, 0.5, 0.0) * g, t)
        t += beat * 2
    # arpejo metálico discreto na seção de dados
    arp = [62, 65, 69, 74, 69, 65]
    t, k = 7.2, 0
    while t < 17.6:
        g = 0.05 + 0.04 * (t - 7.2) / 10
        place(st, pluck(midi(arp[k % len(arp)] + 12), 0.7, g), t, pan=0.5 * np.sin(k))
        t += beat / 2
        k += 1

    # D — após o boom: suspensão etérea
    for j, nn in enumerate([50, 57, 64, 69]):
        place(st, pad_note(midi(nn), reveal - cut1 + 0.6, bright=0.2, attack=2.2, release=1.0, seed=40 + j), cut1 + 0.3, 0.8)

    # E — revelação (Bb maj9 → F/A → Dm9 → C6/9), percussão mínima
    bar = beat * 4
    prog = [[46, 53, 57, 60, 62, 65], [45, 53, 57, 60, 64, 69], [38, 53, 57, 60, 64, 65], [36, 52, 55, 57, 62, 64]]
    t, k = reveal, 0
    end_body = 42.95
    while t < end_body - 0.1:
        chord = prog[k % len(prog)]
        d = min(bar, end_body - t)
        for j, nn in enumerate(chord):
            place(st, pad_note(midi(nn), d + 0.2, bright=0.55, attack=0.5 if k else 0.15, release=1.4, seed=60 + k * 7 + j), t, 0.75)
        place(st, pad_note(midi(chord[0] - 12), d, bright=0.15, attack=0.3, release=0.8, seed=99 + k), t, 1.4)
        t += bar
        k += 1
    t = reveal + beat * 2
    i = 0
    while t < end_body - 0.2:
        place(st, soft_kick(0.42), t)
        if i % 2 == 1:
            place(st, hat(0.10), t + beat / 2, pan=0.3)
        place(st, hat(0.05), t + beat * 0.75, pan=-0.3)
        t += beat
        i += 1
    arp2 = [74, 77, 81, 84, 81, 77, 72, 76]
    t, k = reveal + 0.2, 0
    while t < end_body:
        place(st, bell(midi(arp2[k % len(arp2)]), 1.2, 0.045, 0.6), t, pan=0.6 * np.sin(k * 1.3))
        t += beat / 2
        k += 1

    # F — final: acorde resolvido, cauda curta (sem fade longo)
    for j, nn in enumerate([38, 50, 57, 62, 65, 69]):
        place(st, pad_note(midi(nn), 3.3, bright=0.45, attack=0.3, release=0.9, seed=200 + j), 42.95, 0.8)

    # silêncio do corte (ruptura)
    a, b = int(cut0 * SR), int(cut1 * SR)
    ramp = int(0.08 * SR)
    st[a - ramp:a] *= np.linspace(1, 0, ramp)[:, None]
    st[a:b] = 0
    st = add_reverb(st, IR_HALL, 0.32)
    st[a:b] *= 0.0
    st[b:b + ramp] *= np.linspace(0, 1, ramp)[:, None]
    return st


def build_sfx():
    st = np.zeros((N, 2))
    pan_cycle = [-0.3, 0.3, 0.0]
    for i, c in enumerate(TL["sfx"]):
        typ, g, t = c["type"], c.get("gain", 1.0), c["t"]
        d = c.get("dur", 1.0)
        if typ == "subImpact":
            x = sub_hit(60, 33, 1.6, 0.35)
        elif typ == "shimmer":
            x = sfx_shimmer(d)
        elif typ == "whoosh":
            x = sfx_whoosh(d)
        elif typ == "glassTick":
            x = sfx_glass_tick(c.get("pitch", 1.0))
        elif typ == "metalClick":
            x = sfx_metal_click()
        elif typ == "digitRoll":
            x = sfx_digit_roll(d)
        elif typ == "tonal":
            scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15]
            f = midi(62 + scale[c.get("note", 0) % len(scale)])
            x = bell(f, 1.4, 0.5, 0.4)
            if c.get("accent"):
                sh = sub_hit(62, 40, 0.6, 0.0) * 0.5
                x[: len(sh)] += sh
        elif typ == "riser":
            x = sfx_riser(d)
        elif typ == "shatter":
            x = sfx_shatter(d)
        elif typ == "boom":
            x = sfx_boom()
        elif typ == "drop":
            x = sfx_drop()
        elif typ == "reveal":
            x = sfx_reveal()
        elif typ == "chime":
            x = sfx_chime(c.get("note", 0))
        elif typ == "signature":
            x = sfx_signature()
        elif typ == "sting":
            x = sfx_sting()
        else:
            raise ValueError(typ)
        place(st, fade(np.asarray(x, dtype=float), 0.002, 0.02), t, g, pan=pan_cycle[i % 3] if typ in ("glassTick", "metalClick") else 0.0)
    return add_reverb(st, IR_ROOM, 0.22)


def load_narration():
    src = ROOT / TL["narration"]["source"]
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(src), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(float)
    out = np.zeros(N)
    for seg in TL["narration"]["edit"]:
        a, b = int(seg["from"] * SR), min(len(v), int(seg["to"] * SR))
        s = int(seg["at"] * SR)
        chunk = v[a:b].copy()
        fl = int(0.015 * SR)
        chunk[:fl] *= np.linspace(0, 1, fl)
        chunk[-fl:] *= np.linspace(1, 0, fl)
        e = min(N, s + len(chunk))
        out[s:e] += chunk[: e - s]
    # limpeza leve: passa-alta + presença
    out = hp(out, 75)
    pres = bp(out, 2500, 6000)
    out = out + pres * 0.15
    st = np.stack([out, out], axis=1)
    return add_reverb(st, IR_ROOM, 0.06)


def rms_env(x, win=0.05):
    m = x.mean(axis=1) if x.ndim == 2 else x
    w = int(win * SR)
    e = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, mode="same"))
    return e


def norm_peak(x, peak_db=-1.0):
    p = np.abs(x).max()
    return x * (10 ** (peak_db / 20) / p) if p > 0 else x


def write_wav(path, st):
    data = np.clip(st, -1, 1)
    pcm = (data * (2 ** 23 - 1)).astype(np.int32)
    b = np.zeros((len(pcm), 2 * 3), dtype=np.uint8)
    for c in range(2):
        v = pcm[:, c].astype(np.int64) & 0xFFFFFF
        b[:, c * 3] = v & 0xFF
        b[:, c * 3 + 1] = (v >> 8) & 0xFF
        b[:, c * 3 + 2] = (v >> 16) & 0xFF
    import wave
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b.tobytes())


def main():
    vo = load_narration()
    music = build_music()
    sfx = build_sfx()

    vo = norm_peak(vo, -3.0)
    music = norm_peak(music, -3.0)
    sfx = norm_peak(sfx, -3.0)

    # ducking: música cai ~7 dB sob a voz (envelope suavizado)
    ve = rms_env(vo, 0.08)
    duck_amt = np.clip(ve / (ve.max() * 0.25), 0, 1)
    duck_amt = np.convolve(duck_amt, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
    duck = 1 - 0.55 * duck_amt

    mix = vo * 1.0 + music * 0.42 * duck[:, None] + sfx * 0.55
    # cauda: sem fade longo — só 120 ms no último frame
    mix = fade(mix, 0.0, 0.12)
    mix = norm_peak(mix, -1.0)

    OUT.mkdir(parents=True, exist_ok=True)
    write_wav(OUT / "narration.wav", vo)
    write_wav(OUT / "music.wav", music)
    write_wav(OUT / "sfx.wav", sfx)
    write_wav(OUT / "mix.wav", mix)
    print("ok", {k: f"{len(v) / SR:.2f}s" for k, v in dict(vo=vo, music=music, sfx=sfx, mix=mix).items()})


if __name__ == "__main__":
    main()
