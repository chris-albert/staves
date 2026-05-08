/**
 * Wraps the Web MIDI API to provide note-on/note-off callbacks from an
 * external MIDI controller.  Handles hotplug and velocity normalization.
 */
export class MidiInput {
  private access: MIDIAccess | null = null;
  private activePort: MIDIInput | null = null;

  onNoteOn: ((note: number, velocity: number) => void) | null = null;
  onNoteOff: ((note: number) => void) | null = null;

  /** Request MIDI access.  Returns true if the browser supports Web MIDI. */
  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.addEventListener('statechange', this.handleStateChange);
      return true;
    } catch {
      return false;
    }
  }

  /** List currently-connected MIDI input ports. */
  getInputs(): { id: string; name: string }[] {
    if (!this.access) return [];
    const result: { id: string; name: string }[] = [];
    this.access.inputs.forEach((port) => {
      result.push({ id: port.id, name: port.name ?? port.id });
    });
    return result;
  }

  /** Start listening on the given port (stops any previous port). */
  selectInput(portId: string): void {
    this.detachPort();
    if (!this.access) return;

    const port = this.access.inputs.get(portId);
    if (!port) return;

    this.activePort = port;
    port.addEventListener('midimessage', this.handleMidiMessage as EventListener);
  }

  /** Disconnect from the current port and clean up all listeners. */
  dispose(): void {
    this.detachPort();
    if (this.access) {
      this.access.removeEventListener('statechange', this.handleStateChange);
      this.access = null;
    }
    this.onNoteOn = null;
    this.onNoteOff = null;
  }

  // ── Internal ────────────────────────────────────────────────────────

  private detachPort(): void {
    if (this.activePort) {
      this.activePort.removeEventListener('midimessage', this.handleMidiMessage as EventListener);
      this.activePort = null;
    }
  }

  private handleMidiMessage = (event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0]! & 0xf0;
    const note = data[1]!;
    const velocity = data[2]!;

    if (status === 0x90 && velocity > 0) {
      this.onNoteOn?.(note, velocity / 127);
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.onNoteOff?.(note);
    }
  };

  private handleStateChange = (): void => {
    // Re-select the active port if it was disconnected & reconnected
    if (this.activePort && this.access) {
      const stillThere = this.access.inputs.get(this.activePort.id);
      if (!stillThere) {
        this.detachPort();
      }
    }
  };
}
