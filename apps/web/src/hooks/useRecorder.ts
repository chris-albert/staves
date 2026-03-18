import { useCallback, useRef, useState } from 'react';
import { AudioEngine, Recorder } from '@staves/audio-engine';
import { audioBlobStore } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useTransportStore } from '@/stores/transportStore';

export function useRecorder() {
  const recorderRef = useRef<Recorder | null>(null);
  const [level, setLevel] = useState(0);
  const startBeatRef = useRef(0);

  const startRecording = useCallback(async (trackId: string, inputDeviceId?: string) => {
    const engine = AudioEngine.getInstance();
    await engine.init();

    const recorder = new Recorder(engine.context);
    await recorder.prepare(inputDeviceId);
    recorder.onLevel(setLevel);

    startBeatRef.current = engine.transport.currentBeat;
    recorder.start();
    engine.transport.record();

    recorderRef.current = recorder;
    useTransportStore.getState().setRecording(true);
    useTransportStore.getState().setPlaying(true);

    return recorder;
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    // Capture the current beat BEFORE stopping transport (stop resets to 0)
    const engine = AudioEngine.getInstance();
    const endBeat = engine.transport.currentBeat;

    const { blob, format } = await recorder.stop();
    recorder.dispose();
    recorderRef.current = null;

    engine.transport.stop();
    useTransportStore.getState().setRecording(false);
    useTransportStore.getState().setPlaying(false);
    setLevel(0);

    // Store the audio blob
    const projectId = useProjectStore.getState().project?.id;
    if (!projectId) return;

    // Decode to get actual sample rate and duration
    const tempContext = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error('Failed to decode recorded audio:', e);
      await tempContext.close();
      return;
    }
    await tempContext.close();

    const stored = await audioBlobStore.store(
      projectId,
      blob,
      format,
      audioBuffer.sampleRate,
      audioBuffer.duration,
    );

    // Use the decoded audio duration (in seconds) converted to beats as the
    // authoritative clip length — this is more accurate than transport beat
    // delta because the transport may have been stopped slightly before/after.
    const bpm = useTransportStore.getState().bpm;
    const durationBeatsFromAudio = (audioBuffer.duration / 60) * bpm;

    // Fall back to transport-based duration if audio-based one looks wrong
    const transportDuration = endBeat - startBeatRef.current;
    const durationBeats = durationBeatsFromAudio > 0 ? durationBeatsFromAudio : transportDuration;

    return {
      audioBlobId: stored.id,
      startBeat: startBeatRef.current,
      durationBeats: Math.max(0.25, durationBeats),
    };
  }, []);

  return { startRecording, stopRecording, isRecording: !!recorderRef.current, level };
}
