export interface DrumKitSound {
  name: string;
  /** Relative URL to the sample file (served from public/). */
  url: string;
  /** GM MIDI note number (for future MIDI integration). */
  midiNote: number;
}

export interface DrumKitBank {
  /** Unique identifier for this kit (e.g. 'default', '808'). */
  id: string;
  /** Display name (e.g. 'Standard', 'TR-808'). */
  name: string;
  /** The 12 sounds in this kit. */
  sounds: DrumKitSound[];
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
  { name: 'Cowbell',    url: '/drums/cowbell.wav',    midiNote: 56 },
];

export const DRUM_KIT_808: DrumKitSound[] = [
  { name: '808 Kick',     url: '/drums/808/kick.wav',      midiNote: 36 },
  { name: '808 Snare',    url: '/drums/808/snare.wav',     midiNote: 38 },
  { name: '808 CH',       url: '/drums/808/closed-hh.wav', midiNote: 42 },
  { name: '808 OH',       url: '/drums/808/open-hh.wav',   midiNote: 46 },
  { name: '808 Tom 1',    url: '/drums/808/tom1.wav',      midiNote: 50 },
  { name: '808 Tom 2',    url: '/drums/808/tom2.wav',      midiNote: 47 },
  { name: '808 Tom 3',    url: '/drums/808/tom3.wav',      midiNote: 45 },
  { name: '808 Cymbal',   url: '/drums/808/cymbal.wav',    midiNote: 49 },
  { name: '808 Cowbell',  url: '/drums/808/cowbell.wav',   midiNote: 56 },
  { name: '808 Clap',     url: '/drums/808/clap.wav',      midiNote: 39 },
  { name: '808 Rimshot',  url: '/drums/808/rimshot.wav',   midiNote: 37 },
  { name: '808 Maracas',  url: '/drums/808/maracas.wav',   midiNote: 70 },
];

export const DRUM_KIT_909: DrumKitSound[] = [
  { name: '909 Kick',     url: '/drums/909/kick.wav',      midiNote: 36 },
  { name: '909 Snare',    url: '/drums/909/snare.wav',     midiNote: 38 },
  { name: '909 CH',       url: '/drums/909/closed-hh.wav', midiNote: 42 },
  { name: '909 OH',       url: '/drums/909/open-hh.wav',   midiNote: 46 },
  { name: '909 Tom 1',    url: '/drums/909/tom1.wav',      midiNote: 50 },
  { name: '909 Tom 2',    url: '/drums/909/tom2.wav',      midiNote: 47 },
  { name: '909 Tom 3',    url: '/drums/909/tom3.wav',      midiNote: 45 },
  { name: '909 Crash',    url: '/drums/909/crash.wav',     midiNote: 49 },
  { name: '909 Ride',     url: '/drums/909/ride.wav',      midiNote: 51 },
  { name: '909 Clap',     url: '/drums/909/clap.wav',      midiNote: 39 },
  { name: '909 Rimshot',  url: '/drums/909/rimshot.wav',   midiNote: 37 },
  { name: '909 Conga',    url: '/drums/909/conga.wav',     midiNote: 62 },
];

export const DRUM_KIT_LOFI: DrumKitSound[] = [
  { name: 'Lo-Fi Kick',   url: '/drums/lofi/kick.wav',     midiNote: 36 },
  { name: 'Lo-Fi Snare',  url: '/drums/lofi/snare.wav',    midiNote: 38 },
  { name: 'Lo-Fi CH',     url: '/drums/lofi/closed-hh.wav', midiNote: 42 },
  { name: 'Lo-Fi OH',     url: '/drums/lofi/open-hh.wav',  midiNote: 46 },
  { name: 'Lo-Fi Tom',    url: '/drums/lofi/tom.wav',      midiNote: 50 },
  { name: 'Lo-Fi Shaker', url: '/drums/lofi/shaker.wav',   midiNote: 70 },
  { name: 'Lo-Fi Snap',   url: '/drums/lofi/snap.wav',     midiNote: 37 },
  { name: 'Lo-Fi Clap',   url: '/drums/lofi/clap.wav',     midiNote: 39 },
  { name: 'Lo-Fi Rim',    url: '/drums/lofi/rim.wav',      midiNote: 37 },
  { name: 'Lo-Fi Crackle', url: '/drums/lofi/crackle.wav', midiNote: 49 },
  { name: 'Lo-Fi Sub',    url: '/drums/lofi/sub.wav',      midiNote: 36 },
  { name: 'Lo-Fi Brush',  url: '/drums/lofi/brush.wav',    midiNote: 51 },
];

export const DRUM_KIT_PERC: DrumKitSound[] = [
  { name: 'Clave',        url: '/drums/perc/clave.wav',        midiNote: 75 },
  { name: 'Woodblock Hi', url: '/drums/perc/woodblock-hi.wav', midiNote: 76 },
  { name: 'Woodblock Lo', url: '/drums/perc/woodblock-lo.wav', midiNote: 77 },
  { name: 'Bongo Hi',     url: '/drums/perc/bongo-hi.wav',     midiNote: 60 },
  { name: 'Bongo Lo',     url: '/drums/perc/bongo-lo.wav',     midiNote: 61 },
  { name: 'Conga Hi',     url: '/drums/perc/conga-hi.wav',     midiNote: 62 },
  { name: 'Conga Lo',     url: '/drums/perc/conga-lo.wav',     midiNote: 63 },
  { name: 'Tambourine',   url: '/drums/perc/tambourine.wav',   midiNote: 54 },
  { name: 'Shaker',       url: '/drums/perc/shaker.wav',       midiNote: 70 },
  { name: 'Guiro',        url: '/drums/perc/guiro.wav',        midiNote: 73 },
  { name: 'Triangle',     url: '/drums/perc/triangle.wav',     midiNote: 81 },
  { name: 'Agogo',        url: '/drums/perc/agogo.wav',        midiNote: 67 },
];

/** All available drum kit banks. */
export const DRUM_KIT_BANKS: DrumKitBank[] = [
  { id: 'default', name: 'Standard',   sounds: DEFAULT_DRUM_KIT },
  { id: '808',     name: 'TR-808',     sounds: DRUM_KIT_808 },
  { id: '909',     name: 'TR-909',     sounds: DRUM_KIT_909 },
  { id: 'lofi',    name: 'Lo-Fi',      sounds: DRUM_KIT_LOFI },
  { id: 'perc',    name: 'Percussion', sounds: DRUM_KIT_PERC },
];

/** Flat list of every available drum sound across all kits. */
export const ALL_DRUM_SOUNDS: DrumKitSound[] = DRUM_KIT_BANKS.flatMap((b) => b.sounds);
