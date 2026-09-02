// Browser voice I/O for Igris — free, no backend, no API key.
//   • Speech-to-text  : Web Speech API (webkitSpeechRecognition)
//   • Text-to-speech  : Kokoro (82M neural model) running IN THE BROWSER via
//                       kokoro-js (WebGPU, WASM fallback). British male voice
//                       "bm_george" ≈ Igris. The old robotic speechSynthesis is
//                       kept ONLY as a stopgap while Kokoro's ~80MB model loads
//                       (cached after first visit) or if it fails entirely.
// Both degrade gracefully: if the browser lacks support, the feature is just off.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { KokoroTTS } from 'kokoro-js'

export const ttsSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

// ── Speech-to-text : Whisper in the browser (free, cross-browser) ────────────
// Web Speech API is Chrome/Safari-only and Brave kills its Google backend
// ("network" error), so instead we record the mic and transcribe LOCALLY with a
// Whisper model via transformers.js — works in Firefox, Brave, everywhere, no
// servers, no key. The model downloads once and the browser caches it.

import { pipeline } from '@huggingface/transformers'

const WHISPER_MODEL = 'onnx-community/whisper-base'   // multilingual (EN + Hindi)

let asr: any = null
let asrLoading: Promise<any> | null = null
let asrFailed = false

export function warmWhisper(): Promise<any> {
  if (asr) return Promise.resolve(asr)
  if (asrFailed) return Promise.resolve(null)
  if (!asrLoading) {
    asrLoading = pipeline('automatic-speech-recognition', WHISPER_MODEL, {
      dtype: 'q8',
      device: 'wasm',
    })
      .then((p) => { asr = p; return p })
      .catch((err) => {
        console.error('[Igris STT] Whisper load failed:', err)
        asrFailed = true
        return null
      })
  }
  return asrLoading
}

// Is the model still downloading (so the UI can show "preparing…" on first use)?
export const whisperReady = (): boolean => asr !== null

// STT now only needs mic access — available in every modern browser.
export const sttSupported = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

type ResultCb = (text: string, final: boolean) => void
type EndCb = () => void
type ErrCb = (err: string) => void

export class Listener {
  private media: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private audioCtx: AudioContext | null = null
  private silenceTimer: number | null = null

  // Begin recording. Resolves true once the mic is live. The transcript is
  // delivered later, after stop(), via onResult(text, true) → onEnd().
  async start(onResult: ResultCb, onEnd: EndCb, onError?: ErrCb): Promise<boolean> {
    if (!sttSupported()) { onError?.('unsupported'); return false }
    void warmWhisper()                          // start the model download early
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.stream = stream
      this.chunks = []
      const mr = new MediaRecorder(stream)
      this.media = mr
      mr.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data) }
      mr.onstop = () => void this.transcribe(onResult, onEnd, onError)
      mr.start()
      this.armSilenceStop(stream)               // auto-stop after a pause
      return true
    } catch (err: any) {
      this.cleanup()
      onError?.(err?.name === 'NotAllowedError' ? 'not-allowed' : 'mic-failed')
      return false
    }
  }

  stop(): void {
    if (this.media && this.media.state !== 'inactive') {
      try { this.media.stop() } catch { /* ignore */ }
    }
  }

  // Watch the input level; stop after ~1.5s of trailing silence (or a 15s cap),
  // so the user doesn't have to tap twice — mirrors the old auto-finalize feel.
  private armSilenceStop(stream: MediaStream): void {
    try {
      const ctx = new AudioContext()
      this.audioCtx = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      let lastVoice = Date.now()
      let spoke = false
      const begin = Date.now()
      const tick = () => {
        if (!this.media || this.media.state === 'inactive') return
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
        const rms = Math.sqrt(sum / buf.length)
        const now = Date.now()
        if (rms > 0.02) { lastVoice = now; spoke = true }
        if ((spoke && now - lastVoice > 1500) || now - begin > 15000) { this.stop(); return }
        this.silenceTimer = window.setTimeout(tick, 150)
      }
      this.silenceTimer = window.setTimeout(tick, 300)
    } catch { /* auto-stop is best-effort; tap again to stop manually */ }
  }

  private cleanup(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    if (this.audioCtx) { void this.audioCtx.close(); this.audioCtx = null }
  }

  private async transcribe(onResult: ResultCb, onEnd: EndCb, onError?: ErrCb): Promise<void> {
    const chunks = this.chunks
    const mime = this.media?.mimeType || 'audio/webm'
    this.cleanup()
    if (!chunks.length) { onEnd(); return }
    const pipe = await warmWhisper()
    if (!pipe) { onError?.('stt-unavailable'); onEnd(); return }
    try {
      const audio = await blobToMono16k(new Blob(chunks, { type: mime }))
      // task: 'translate' → Whisper outputs ENGLISH no matter the spoken language
      // (speak Hindi, get English text). All in-browser; only this text is sent.
      const out: any = await pipe(audio, { task: 'translate' })
      const text = (out?.text || '').trim()
      if (text) onResult(text, true)
      onEnd()
    } catch (err) {
      console.error('[Igris STT] transcription failed:', err)
      onError?.('transcribe-failed')
      onEnd()
    }
  }
}

// Decode a recorded blob to a 16kHz mono Float32Array (what Whisper expects).
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer()
  const tmp = new AudioContext()
  const decoded = await tmp.decodeAudioData(arrayBuf)
  void tmp.close()
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000)
  const node = offline.createBufferSource()
  node.buffer = decoded
  node.connect(offline.destination)
  node.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

// ── Text-to-speech : Kokoro neural voice (free, in-browser) ──────────────────

const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const IGRIS_VOICE = 'bm_george'   // British male — mature, commanding, knightly

let kokoro: KokoroTTS | null = null     // set once the model is ready
let kokoroLoading: Promise<KokoroTTS | null> | null = null
let kokoroFailed = false

// Lazily download + init the model ONCE. We force WASM + q8 (~86MB) rather than
// WebGPU: WASM runs in EVERY browser (Chrome, Brave, Firefox, Safari), while the
// WebGPU path pulls a ~326MB fp32 model (network errors on Brave) and is flaky/
// off in Firefox. q8 over WASM is the reliable, small, universal choice. Any
// failure flips kokoroFailed so we permanently fall back to the browser voice.
export function warmKokoro(): Promise<KokoroTTS | null> {
  if (kokoro) return Promise.resolve(kokoro)
  if (kokoroFailed) return Promise.resolve(null)
  if (!kokoroLoading) {
    kokoroLoading = KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype: 'q8',
      device: 'wasm',
    })
      .then((tts) => { kokoro = tts; return tts })
      .catch((err) => {
        console.error('[Igris TTS] Kokoro load failed — using browser voice:', err)
        kokoroFailed = true
        return null
      })
  }
  return kokoroLoading
}

// ── playback state (shared so stopSpeaking can cut whatever is sounding) ──────
let speakSeq = 0                         // bumps on every stop/new speak
let currentAudio: HTMLAudioElement | null = null

export const stopSpeaking = (): void => {
  speakSeq++                             // invalidates any in-flight generation
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (ttsSupported()) window.speechSynthesis.cancel()
}

export const speak = (text: string, onEnd?: () => void): void => {
  const clean = text.trim()
  if (!clean) { onEnd?.(); return }
  stopSpeaking()
  const mySeq = ++speakSeq

  // Model already loaded → speak in the neural Igris voice.
  if (kokoro) {
    const tts = kokoro
    void (async () => {
      try {
        const audio = await tts.generate(clean, { voice: IGRIS_VOICE as any })
        if (mySeq !== speakSeq) return   // superseded while generating
        const url = URL.createObjectURL(audio.toBlob())
        const el = new Audio(url)
        currentAudio = el
        const finish = () => {
          URL.revokeObjectURL(url)
          if (currentAudio === el) currentAudio = null
          if (mySeq === speakSeq) onEnd?.()
        }
        el.onended = finish
        el.onerror = finish
        await el.play()
      } catch (err) {
        console.error('[Igris TTS] Kokoro synth failed:', err)
        if (mySeq === speakSeq) browserSpeak(clean, mySeq, onEnd)
      }
    })()
    return
  }

  // Not ready yet → speak this line with the browser voice, and warm Kokoro so
  // the NEXT reply uses the good voice. (Avoids a long silence on first use.)
  if (!kokoroFailed) void warmKokoro()
  browserSpeak(clean, mySeq, onEnd)
}

// ── fallback: the old robotic browser voice ──────────────────────────────────
let cachedVoice: SpeechSynthesisVoice | null = null

const pickVoice = (): SpeechSynthesisVoice | null => {
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  cachedVoice =
    voices.find(v => /en-GB/i.test(v.lang) && /(male|daniel|arthur|george)/i.test(v.name)) ||
    voices.find(v => /en-GB/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    voices[0]
  return cachedVoice
}

function browserSpeak(text: string, mySeq: number, onEnd?: () => void): void {
  if (!ttsSupported()) { onEnd?.(); return }
  const u = new SpeechSynthesisUtterance(text)
  const v = pickVoice()
  if (v) u.voice = v
  u.lang = v?.lang || 'en-GB'
  u.rate = 0.98
  u.pitch = 0.82          // a touch lower — commanding, knightly
  u.onend = () => { if (mySeq === speakSeq) onEnd?.() }
  u.onerror = () => { if (mySeq === speakSeq) onEnd?.() }
  window.speechSynthesis.speak(u)
}

// Voice list loads async in some browsers — warm the cache when it arrives.
if (typeof window !== 'undefined' && ttsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice() }
}
