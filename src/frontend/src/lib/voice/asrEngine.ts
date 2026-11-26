/**
 * Интерфейс ASR-движка и реализации: заглушка для разработки и vosk-browser.
 *
 * Важный нюанс vosk-browser: модель и KaldiRecognizer создаются один раз и
 * живут всё время сессии. Включение/выключение прослушивания — флаг gate,
 * иначе теряются первые слова каждой фразы (аудио до загрузки модели
 * отбрасывается без буферизации).
 */

import { createModel } from 'vosk-browser';

export interface AsrHandlers {
  /** промежуточная расшифровка — для строки «что я слышу» */
  onPartial(text: string): void;
  /** финальный сегмент (пауза в речи) — подаём в парсер */
  onFinal(text: string): void;
}

export interface AsrEngine {
  start(handlers: AsrHandlers): Promise<void>;
  stop(): void;
  dispose(): void;
}

// ---------------------------------------------------------------- стаб

/** Движок-заглушка: без микрофона. Текст подаётся вручную методом emit(). */
export class StubAsrEngine implements AsrEngine {
  private handlers: AsrHandlers | null = null;

  start(handlers: AsrHandlers): Promise<void> {
    console.log('[stub] start: подписка установлена');
    this.handlers = handlers;
    return Promise.resolve();
  }

  stop(): void {
    this.handlers = null;
  }

  dispose(): void {
    this.handlers = null;
  }

  /** подать финальный текст (как будто сработала пауза) */
  emit(text: string): void {
    console.log('[stub] emit вызван, handlers =', this.handlers ? 'есть' : 'НЕТ');
    if (!this.handlers) {
      console.warn('[stub] ТЕКСТ ПОТЕРЯН: start() не вызывался или вызван stop()');
      return;
    }
    console.log('[stub] передаю в onFinal:', JSON.stringify(text));
    this.handlers.onFinal(text);
  }

  /** подать промежуточную расшифровку */
  emitPartial(text: string): void {
    this.handlers?.onPartial(text);
  }
}

// ---------------------------------------------------------------- vosk-browser

export class VoskAsrEngine implements AsrEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognizer: any = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private handlers: AsrHandlers | null = null;
  private gate = false;

  constructor(
    /** путь к модели, напр. '/models/vosk-model-small-ru-0.22.tar' */
    private modelUrl: string,
    private sampleRate = 16000,
  ) {}

  private ensureRecognizer(): void {
    if (!this.model) throw new Error('модель ASR не загружена');
    if (!this.recognizer) {
      this.recognizer = new this.model.KaldiRecognizer(this.sampleRate);
      this.recognizer.on('result', (m: { result?: { text?: string } }) => {
        const text = m.result?.text ?? '';
        if (text) this.handlers?.onFinal(text);
      });
      this.recognizer.on('partialresult', (m: { result?: { partial?: string } }) => {
        this.handlers?.onPartial(m.result?.partial ?? '');
      });
    }
  }

  async start(handlers: AsrHandlers): Promise<void> {
    // модель грузится один раз и живёт всё время — см. комментарий в шапке
    if (!this.model) this.model = await createModel(this.modelUrl);
    this.ensureRecognizer();
    this.handlers = handlers;

    // аудиоконвейер тоже один на всё время жизни движка
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: this.sampleRate,
        },
      });
      this.ctx = new AudioContext({ sampleRate: this.sampleRate });
      const source = this.ctx.createMediaStreamSource(this.stream);
      // ScriptProcessorNode устарел, но прост и работает везде; AudioWorklet — позже
      this.node = this.ctx.createScriptProcessor(4096, 1, 1);
      this.node.onaudioprocess = (e) => {
        if (!this.gate) return; // пауза: аудио не подаём, распознаватель живёт
        try {
          this.recognizer?.acceptWaveform(e.inputBuffer);
        } catch (err) {
          console.error('acceptWaveform failed', err);
        }
      };
      source.connect(this.node);
      this.node.connect(this.ctx.destination);
    }

    this.gate = true;
  }

  stop(): void {
    this.gate = false;
    this.handlers = null;
  }

  async dispose(): Promise<void> {
    this.stop();
    try {
      this.node?.disconnect();
      this.recognizer?.delete?.();
      this.stream?.getTracks().forEach((t) => t.stop());
      await this.ctx?.close();
      this.model?.terminate?.();
    } catch (e) {
      console.error('Ошибка высвобождения ASR:', e);
    }
    this.model = null;
    this.recognizer = null;
    this.ctx = null;
    this.stream = null;
    this.node = null;
  }
}
