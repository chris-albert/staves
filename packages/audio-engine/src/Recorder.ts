/** Records audio via MediaRecorder + AudioWorklet for live metering. */
export class Recorder {
  private context: AudioContext;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private _isRecording = false;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;

  constructor(context: AudioContext) {
    this.context = context;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  /** Set a callback for live level metering. */
  onLevel(callback: (level: number) => void): void {
    this.onLevelCallback = callback;
  }

  /** Request mic access and prepare to record. Optionally specify a device ID. */
  async prepare(deviceId?: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? { deviceId: { exact: deviceId } }
        : true,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    try {
      await this.context.audioWorklet.addModule('/worklets/recorder-processor.js');
    } catch {
      // Already registered or unavailable
    }
  }

  /** Start recording. */
  start(): void {
    if (!this.stream) throw new Error('Call prepare() first');
    this._isRecording = true;
    this.chunks = [];

    // Set up MediaRecorder for compressed audio capture
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/mp4';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100); // 100ms timeslice

    // Set up AudioWorklet for live metering
    try {
      this.sourceNode = this.context.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.context, 'recorder-processor');
      this.workletNode.port.onmessage = (e) => {
        if (this.onLevelCallback && typeof e.data.level === 'number') {
          this.onLevelCallback(e.data.level);
        }
      };
      this.sourceNode.connect(this.workletNode);
      // Connect to destination so the worklet processes (but it outputs silence)
      this.workletNode.connect(this.context.destination);
    } catch {
      // AudioWorklet not available, metering won't work
    }
  }

  /** Stop recording and return the recorded blob. */
  async stop(): Promise<{ blob: Blob; format: 'webm-opus' | 'mp4-aac' }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }

      const mr = this.mediaRecorder;

      mr.onstop = () => {
        this._isRecording = false;
        const mimeType = mr.mimeType;
        const blob = new Blob(this.chunks, { type: mimeType });
        const format = mimeType.includes('webm') ? 'webm-opus' as const : 'mp4-aac' as const;

        // Clean up audio graph nodes
        if (this.workletNode) {
          this.workletNode.disconnect();
          this.workletNode = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }

        resolve({ blob, format });
      };

      mr.stop();
    });
  }

  /** Release the mic stream. */
  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.mediaRecorder = null;
  }
}
