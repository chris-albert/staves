export interface DrumKitSound {
  name: string;
  /** Relative URL to the sample file (served from public/). */
  url: string;
  /** GM MIDI note number (for future MIDI integration). */
  midiNote: number;
}

export const DEFAULT_DRUM_KIT: DrumKitSound[] = [
  { name: 'Kick',       url: '/drums/kick.wav',      midiNote: 36 },
  { name: 'Snare',      url: '/drums/snare.wav',     midiNote: 38 },
  { name: 'Closed HH',  url: '/drums/closed-hh.wav', midiNote: 42 },
  { name: 'Open HH',    url: '/drums/open-hh.wav',   midiNote: 46 },
  { name: 'Tom 1',      url: '/drums/tom1.wav',      midiNote: 50 },
  { name: 'Tom 2',      url: '/drums/tom2.wav',      midiNote: 47 },
  { name: 'Tom 3',      url: '/drums/tom3.wav',      midiNote: 45 },
  { name: 'Crash',      url: '/drums/crash.wav',     midiNote: 49 },
  { name: 'Ride',       url: '/drums/ride.wav',      midiNote: 51 },
  { name: 'Clap',       url: '/drums/clap.wav',      midiNote: 39 },
  { name: 'Rimshot',    url: '/drums/rimshot.wav',   midiNote: 37 },
  { name: 'Cowbell',    url: '/drums/cowbell.wav',   midiNote: 56 },
];
