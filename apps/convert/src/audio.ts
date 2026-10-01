/**
 * Audio conversion in the browser with Mediabunny: it reads MP3, AAC/M4A, Ogg,
 * FLAC, WAV, WebM and MP4 (taking the audio out of videos), and writes through the
 * browser's own encoders (WebCodecs) or small WebAssembly ones for MP3 and FLAC.
 * Anything else the browser can play is decoded by the Web Audio API first.
 */
import type {
  AudioCodec,
  BufferTarget,
  ConversionAudioOptions,
  Output,
  OutputFormat,
} from "mediabunny";
import { ConvertError } from "./image";
import { audioTarget, type AudioOptions, type AudioTarget } from "./targets";

const CODECS: Readonly<Record<AudioTarget, AudioCodec>> = {
  mp3: "mp3",
  wav: "pcm-s16",
  flac: "flac",
  ogg: "opus",
  m4a: "aac",
};

let encodersReady: Promise<void> | undefined;

/** MP3 and FLAC have no WebCodecs encoder in most browsers: register the WebAssembly ones. */
function registerEncoders(): Promise<void> {
  encodersReady ??= (async () => {
    const { canEncodeAudio } = await import("mediabunny");
    if (!(await canEncodeAudio("mp3"))) {
      const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
      registerMp3Encoder();
    }
    if (!(await canEncodeAudio("flac"))) {
      const { registerFlacEncoder } = await import("@mediabunny/flac-encoder");
      registerFlacEncoder();
    }
  })();
  return encodersReady;
}

/** The audio formats this browser can write (MP3, FLAC and WAV always). */
export async function writableAudio(): Promise<Set<AudioTarget>> {
  await registerEncoders();
  const { canEncodeAudio } = await import("mediabunny");
  const writable = new Set<AudioTarget>();
  for (const [target, codec] of Object.entries(CODECS) as [
    AudioTarget,
    AudioCodec,
  ][]) {
    if (await canEncodeAudio(codec).catch(() => false)) writable.add(target);
  }
  return writable;
}

async function outputFor(
  target: AudioTarget,
): Promise<Output<OutputFormat, BufferTarget>> {
  const mb = await import("mediabunny");
  const format: OutputFormat = {
    mp3: () => new mb.Mp3OutputFormat(),
    wav: () => new mb.WavOutputFormat(),
    flac: () => new mb.FlacOutputFormat(),
    ogg: () => new mb.OggOutputFormat(),
    m4a: () => new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
  }[target]();
  return new mb.Output({ format, target: new mb.BufferTarget() });
}

function channelCount(options: AudioOptions): number | undefined {
  return options.channels === "mono"
    ? 1
    : options.channels === "stereo"
      ? 2
      : undefined;
}

/**
 * The fallback: decode the whole file with the Web Audio API, apply trim, channels
 * and sample rate with an OfflineAudioContext, then encode.
 */
async function convertDecoded(
  file: File,
  options: AudioOptions,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const decoder = new OfflineAudioContext(1, 1, 44100);
  let decoded: AudioBuffer;
  try {
    decoded = await decoder.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new ConvertError("This browser can't read this audio file.");
  }
  const start = Math.min(options.trimStart ?? 0, decoded.duration);
  const end = Math.min(options.trimEnd ?? decoded.duration, decoded.duration);
  if (end <= start)
    throw new ConvertError("The trim range is outside this file.");
  const rate = options.sampleRate ?? decoded.sampleRate;
  const channels = channelCount(options) ?? decoded.numberOfChannels;
  const render = new OfflineAudioContext(
    channels,
    Math.ceil((end - start) * rate),
    rate,
  );
  const node = render.createBufferSource();
  node.buffer = decoded;
  node.connect(render.destination);
  node.start(0, start, end - start);
  const buffer = await render.startRendering();
  onProgress(0.5);

  const { AudioBufferSource } = await import("mediabunny");
  const target = audioTarget(options.target);
  const output = await outputFor(options.target);
  const source = new AudioBufferSource({
    codec: CODECS[options.target],
    ...(target.lossy ? { bitrate: options.bitrate * 1000 } : {}),
  });
  output.addAudioTrack(source);
  await output.start();
  await source.add(buffer);
  await output.finalize();
  onProgress(1);
  if (!output.target.buffer)
    throw new ConvertError("Encoding produced nothing.");
  return new Blob([output.target.buffer], { type: target.mime });
}

export interface AudioJob {
  promise: Promise<Blob>;
  cancel: () => void;
}

/** Converts one audio (or video) file's audio with the given options. */
export function convertAudio(
  file: File,
  options: AudioOptions,
  onProgress: (progress: number) => void,
): AudioJob {
  let cancel = () => {
    // Replaced once the conversion has started.
  };
  const promise = (async () => {
    await registerEncoders();
    const mb = await import("mediabunny");
    const target = audioTarget(options.target);
    const input = new mb.Input({
      formats: mb.ALL_FORMATS,
      source: new mb.BlobSource(file),
    });
    try {
      if (!(await input.canRead()) || !(await input.getPrimaryAudioTrack())) {
        return await convertDecoded(file, options, onProgress);
      }
      const output = await outputFor(options.target);
      const channels = channelCount(options);
      const audio: ConversionAudioOptions = {
        codec: CODECS[options.target],
        forceTranscode: true,
        ...(target.lossy ? { bitrate: options.bitrate * 1000 } : {}),
        ...(channels ? { numberOfChannels: channels } : {}),
        // Opus only runs at 48 kHz; Mediabunny resamples to whatever is asked.
        ...(options.target === "ogg"
          ? { sampleRate: 48000 }
          : options.sampleRate
            ? { sampleRate: options.sampleRate }
            : {}),
      };
      const conversion = await mb.Conversion.init({
        input,
        output,
        tracks: "primary",
        video: { discard: true },
        audio,
        ...(options.trimStart !== null || options.trimEnd !== null
          ? {
              trim: {
                ...(options.trimStart !== null
                  ? { start: options.trimStart }
                  : {}),
                ...(options.trimEnd !== null ? { end: options.trimEnd } : {}),
              },
            }
          : {}),
      });
      if (!conversion.isValid) {
        // A codec Mediabunny can't decode here: let the browser decode it instead.
        return await convertDecoded(file, options, onProgress);
      }
      cancel = () => void conversion.cancel();
      conversion.onProgress = (progress) => {
        onProgress(progress);
      };
      await conversion.execute();
      if (!output.target.buffer)
        throw new ConvertError("Encoding produced nothing.");
      return new Blob([output.target.buffer], { type: target.mime });
    } finally {
      input.dispose();
    }
  })();
  return {
    promise,
    cancel: () => {
      cancel();
    },
  };
}
