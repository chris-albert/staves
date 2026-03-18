import { useEffect, useState, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

const STORAGE_KEY_INPUT = 'staves:inputDeviceId';
const STORAGE_KEY_OUTPUT = 'staves:outputDeviceId';

/**
 * Enumerates audio input and output devices.
 * Persists selected devices in localStorage.
 *
 * Note: Device labels are only available after the user has granted
 * microphone permission at least once.
 */
export function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_INPUT) ?? '',
  );
  const [selectedOutputId, setSelectedOutputId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_OUTPUT) ?? '',
  );
  const [permissionGranted, setPermissionGranted] = useState(false);

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs: AudioDevice[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
          kind: 'audioinput' as const,
        }));

      const audioOutputs: AudioDevice[] = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
          kind: 'audiooutput' as const,
        }));

      setInputs(audioInputs);
      setOutputs(audioOutputs);

      // If we have labels, permission was granted
      if (devices.some((d) => d.label)) {
        setPermissionGranted(true);
      }
    } catch {
      // enumerateDevices not available
    }
  }, []);

  // Request mic permission to get device labels, then enumerate
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionGranted(true);
      await enumerate();
    } catch {
      // Permission denied
    }
  }, [enumerate]);

  // Enumerate on mount and when devices change
  useEffect(() => {
    enumerate();
    navigator.mediaDevices?.addEventListener('devicechange', enumerate);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerate);
    };
  }, [enumerate]);

  // Persist selections
  const selectInput = useCallback((deviceId: string) => {
    setSelectedInputId(deviceId);
    localStorage.setItem(STORAGE_KEY_INPUT, deviceId);
  }, []);

  const selectOutput = useCallback((deviceId: string) => {
    setSelectedOutputId(deviceId);
    localStorage.setItem(STORAGE_KEY_OUTPUT, deviceId);
  }, []);

  return {
    inputs,
    outputs,
    selectedInputId,
    selectedOutputId,
    selectInput,
    selectOutput,
    permissionGranted,
    requestPermission,
  };
}
