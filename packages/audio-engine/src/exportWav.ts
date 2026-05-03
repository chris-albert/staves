import { TempoMap } from './TempoMap';
import type { ScheduledClip, ScheduledDrumClip } from './Transport';

interface ExportOptions {
  sampleRate: number;
  durationBeats: number;
  tempoMap: TempoMap;
  clips: ScheduledClip[];
  drumClips: ScheduledDrumClip[];
  drumSampleBuffers: Map<string, AudioBuffer>;
  trackVolumes: Map<string, number>;
  trackPans: Map<string, number>;
  trackMuted: Map<string, boolean>;
  masterVolume: number;
}

export async function exportToWav(options: ExportOptions): Promise<Blob> {
  const {
    sampleRate,
    durationBeats,
    tempoMap,
    clips,
    drumClips,
    drumSampleBuffers,
    trackVolumes,
    trackPans,
    trackMuted,
    masterVolume,
  } = options;

  const durationSeconds = tempoMap.beatsToSeconds(durationBeats);
  const totalFrames = Math.ceil(durationSeconds * sampleRate);

  const offline = new OfflineAudioContext(2, totalFrames, sampleRate);

  // Master gain
  const masterGain = offline.createGain();
  masterGain.gain.value = masterVolume;
  masterGain.connect(offline.destination);

  // Schedule audio clips
  for (const clip of clips) {
    const trackVol = trackVolumes.get(clip.trackId) ?? 1;
    const trackPan = trackPans.get(clip.trackId) ?? 0;
    const isMuted = trackMuted.get(clip.trackId) ?? false;
    if (isMuted) continue;

    const trackGain = offline.createGain();
    trackGain.gain.value = trackVol;
    const panner = offline.createStereoPanner();
    panner.pan.value = trackPan;
    trackGain.connect(panner);
    panner.connect(masterGain);

    const source = offline.createBufferSource();
    source.buffer = clip.buffer;

    const clipGain = offline.createGain();
    clipGain.gain.value = Math.pow(10, clip.gainDb / 20);
    source.connect(clipGain);
    clipGain.connect(trackGain);

    const startSeconds = tempoMap.beatsToSeconds(clip.startBeat);
    const tempoAtClip = tempoMap.tempoAtBeat(clip.startBeat);
    const offsetSeconds = clip.offsetBeats * 60 / tempoAtClip;
    const clipDurationSeconds = clip.durationBeats * 60 / tempoAtClip;

    source.start(startSeconds, offsetSeconds, clipDurationSeconds);
  }

  // Schedule drum hits
  for (const dc of drumClips) {
    const trackVol = trackVolumes.get(dc.trackId) ?? 1;
    const trackPan = trackPans.get(dc.trackId) ?? 0;
    const isMuted = trackMuted.get(dc.trackId) ?? false;
    if (isMuted) continue;

    for (const hit of dc.hits) {
      const buffer = drumSampleBuffers.get(hit.sampleKey);
      if (!buffer) continue;

      const trackGain = offline.createGain();
      trackGain.gain.value = trackVol * hit.velocity;
      const panner = offline.createStereoPanner();
      panner.pan.value = trackPan;
      trackGain.connect(panner);
      panner.connect(masterGain);

      const source = offline.createBufferSource();
      source.buffer = buffer;
      source.connect(trackGain);

      const hitTime = tempoMap.beatsToSeconds(hit.beat);
      source.start(hitTime);
    }
  }

  // Render
  const renderedBuffer = await offline.startRendering();

  // Convert to WAV
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch]![i]!));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
