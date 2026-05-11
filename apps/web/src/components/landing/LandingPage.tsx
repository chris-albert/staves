import { useNavigate } from '@tanstack/react-router';
import { DawScreenshot } from './DawScreenshot';
import { SequencerScreenshot } from './SequencerScreenshot';
import { PianoRollScreenshot } from './PianoRollScreenshot';
import { CollabScreenshot } from './CollabScreenshot';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="Staves" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Staves</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Features</a>
          <a href="#screenshots" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Screenshots</a>
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            Open Studio
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center px-6 pt-24 pb-16">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-gradient-to-b from-zinc-800/30 via-transparent to-transparent blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Open source &middot; No account required &middot; Runs in your browser
          </div>

          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            A recording studio{' '}
            <span className="bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              in your browser
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            Record, arrange, and collaborate on music with anyone &mdash; no installs, no accounts, no cloud.
            Everything runs locally in your browser with real-time peer-to-peer sync.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => navigate({ to: '/projects' })}
              className="group flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
            >
              Start Making Music
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M5 2l5 5-5 5" />
              </svg>
            </button>
            <a
              href="https://github.com/chris-albert/staves"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Hero screenshot */}
        <div className="mt-16 w-full max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-zinc-800 shadow-2xl shadow-black/40">
            <DawScreenshot />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to make music</h2>
            <p className="mt-4 text-zinc-400">Professional tools, zero setup. Just open your browser and start creating.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<MicIcon />}
              title="Multi-track Recording"
              description="Record audio from your microphone or line-in with track arming, monitoring, and waveform visualization."
            />
            <FeatureCard
              icon={<DrumIcon />}
              title="Drum Machine"
              description="Built-in step sequencer with multiple drum kits, adjustable step count, and velocity control."
            />
            <FeatureCard
              icon={<PianoIcon />}
              title="Synth & Piano Roll"
              description="Polyphonic synthesizer with a full piano roll editor. Draw notes, adjust velocity, and shape your sound."
            />
            <FeatureCard
              icon={<CollabIcon />}
              title="Real-time Collaboration"
              description="Invite another musician with a link. Edits sync instantly via WebRTC &mdash; no server in the middle."
            />
            <FeatureCard
              icon={<StorageIcon />}
              title="Local-first Storage"
              description="Projects are saved in your browser's IndexedDB. No cloud, no account. Export and import anytime."
            />
            <FeatureCard
              icon={<DesktopIcon />}
              title="Desktop App"
              description="Also available as a native Electron app for macOS with dock icon and system chrome."
            />
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section id="screenshots" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight">See it in action</h2>
            <p className="mt-4 text-zinc-400">A familiar DAW workflow, right in your browser.</p>
          </div>

          <div className="space-y-20">
            <ScreenshotRow
              title="Arrange & Record"
              description="Multi-track timeline with audio clips, waveform display, playhead, loop regions, and a transport bar that feels like home."
              screenshot={<DawScreenshot />}
            />
            <ScreenshotRow
              title="Program Beats"
              description="Step sequencer with multiple drum kits. Toggle steps, adjust velocity, and hear your patterns loop in real time."
              screenshot={<SequencerScreenshot />}
              reverse
            />
            <ScreenshotRow
              title="Write Melodies"
              description="Piano roll editor with snap-to-grid, note drawing, and a polyphonic synth engine. Compose and preview instantly."
              screenshot={<PianoRollScreenshot />}
            />
            <ScreenshotRow
              title="Collaborate Live"
              description="Share a room link and jam together. See your collaborator's cursor, edits sync in real time via peer-to-peer WebRTC."
              screenshot={<CollabScreenshot />}
              reverse
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to make music?</h2>
          <p className="mt-4 text-zinc-400">
            No downloads, no sign-ups. Open the studio and start recording in seconds.
          </p>
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="group mt-8 flex items-center gap-2 rounded-lg bg-zinc-100 px-8 py-3.5 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
          >
            Open Studio
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 2l5 5-5 5" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <img src="/icon.svg" alt="" className="h-5 w-5 rounded" />
            Staves &mdash; Browser-based recording studio
          </div>
          <a
            href="https://github.com/chris-albert/staves"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Feature Card ---------- */

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/80">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}

/* ---------- Screenshot Row ---------- */

function ScreenshotRow({
  title,
  description,
  screenshot,
  reverse,
}: {
  title: string;
  description: string;
  screenshot: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
      <div className="flex-1 lg:max-w-sm">
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
      <div className="flex-1">
        <div className="overflow-hidden rounded-xl border border-zinc-800 shadow-xl shadow-black/30">
          {screenshot}
        </div>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="1" width="6" height="10" rx="3" />
      <path d="M3 8a6 6 0 0012 0" />
      <path d="M9 14v3M6 17h6" />
    </svg>
  );
}

function DrumIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="9" cy="7" rx="7" ry="3" />
      <path d="M2 7v5c0 1.66 3.13 3 7 3s7-1.34 7-3V7" />
      <path d="M2 10c0 1.66 3.13 3 7 3s7-1.34 7-3" />
    </svg>
  );
}

function PianoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="16" height="12" rx="1" />
      <path d="M5 3v12M9 3v12M13 3v12" />
      <path d="M4 3v7M7 3v7M10 3v7M12 3v7M15 3v7" />
    </svg>
  );
}

function CollabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="12" cy="6" r="3" />
      <path d="M1 16a5 5 0 0110 0" />
      <path d="M7 16a5 5 0 0110 0" />
    </svg>
  );
}

function StorageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="4" rx="1" />
      <rect x="2" y="8" width="14" height="4" rx="1" />
      <rect x="2" y="14" width="14" height="2" rx="1" />
      <circle cx="5" cy="4" r="0.5" fill="currentColor" />
      <circle cx="5" cy="10" r="0.5" fill="currentColor" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="16" height="11" rx="2" />
      <path d="M6 16h6M9 13v3" />
    </svg>
  );
}
