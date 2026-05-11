export function DawScreenshot() {
  return (
    <svg viewBox="0 0 960 540" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Background */}
      <rect width="960" height="540" fill="#09090b" />

      {/* Toolbar */}
      <rect width="960" height="44" fill="#18181b" />
      <line x1="0" y1="44" x2="960" y2="44" stroke="#27272a" strokeWidth="1" />

      {/* Back arrow */}
      <path d="M24 22l-4 0 4-4M20 22l4 4" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Project name */}
      <text x="36" y="26" fill="#a1a1aa" fontSize="12" fontFamily="system-ui" fontWeight="500">My First Song</text>

      {/* Transport controls - centered */}
      <g transform="translate(420, 10)">
        {/* Rewind */}
        <rect x="0" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <path d="M16 8l-5 4 5 4M10 8v8" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Play */}
        <rect x="32" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <path d="M44 8l8 4-8 4z" fill="#e4e4e7" />
        {/* Record */}
        <rect x="64" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <circle cx="78" cy="12" r="5" fill="#dc2626" />
        {/* BPM */}
        <text x="106" y="16" fill="#71717a" fontSize="10" fontFamily="system-ui">BPM</text>
        <text x="128" y="16" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="600">120</text>
      </g>

      {/* Settings gear */}
      <circle cx="932" cy="22" r="8" stroke="#52525b" strokeWidth="1.5" fill="none" />
      <circle cx="932" cy="22" r="2" stroke="#52525b" strokeWidth="1.5" fill="none" />

      {/* Track headers area */}
      <rect x="0" y="44" width="200" height="496" fill="#0a0a0b" />
      <line x1="200" y1="44" x2="200" y2="540" stroke="#27272a" strokeWidth="1" />

      {/* Timeline ruler */}
      <rect x="200" y="44" width="760" height="24" fill="#0f0f12" />
      <line x1="200" y1="68" x2="960" y2="68" stroke="#27272a" strokeWidth="1" />
      {/* Beat numbers */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((beat) => (
        <g key={beat}>
          <line x1={200 + (beat - 1) * 47.5} y1="60" x2={200 + (beat - 1) * 47.5} y2="68" stroke="#3f3f46" strokeWidth="1" />
          <text x={200 + (beat - 1) * 47.5 + 4} y="57" fill="#52525b" fontSize="9" fontFamily="system-ui">{beat}</text>
        </g>
      ))}

      {/* Loop region indicator */}
      <rect x="390" y="44" width="190" height="24" fill="#d97706" fillOpacity="0.15" rx="2" />
      <rect x="390" y="44" width="190" height="2" fill="#d97706" rx="1" />

      {/* Playhead */}
      <line x1="438" y1="44" x2="438" y2="540" stroke="#e4e4e7" strokeWidth="1.5" />
      <polygon points="433,44 443,44 438,50" fill="#e4e4e7" />

      {/* Track 1 - Audio */}
      <rect x="0" y="68" width="200" height="100" fill="#111113" />
      <line x1="0" y1="168" x2="960" y2="168" stroke="#1e1e22" strokeWidth="1" />
      {/* Track name & controls */}
      <text x="16" y="96" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Vocals</text>
      <rect x="16" y="104" width="6" height="6" rx="1" fill="#22c55e" fillOpacity="0.7" />
      <text x="26" y="110" fill="#52525b" fontSize="9" fontFamily="system-ui">Armed</text>
      {/* Volume fader */}
      <rect x="16" y="126" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="126" width="42" height="4" rx="2" fill="#3f3f46" />
      <circle cx="58" cy="128" r="5" fill="#52525b" />
      {/* Mute / Solo */}
      <rect x="16" y="142" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="153" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="142" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="153" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Audio clip on track 1 */}
      <rect x="248" y="74" width="180" height="88" rx="4" fill="#1e3a5f" fillOpacity="0.6" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.4" />
      <text x="256" y="88" fill="#60a5fa" fontSize="9" fontFamily="system-ui" fontWeight="500">Take 1</text>
      {/* Waveform visualization */}
      <g opacity="0.7">
        {Array.from({ length: 60 }, (_, i) => {
          const h = Math.abs(Math.sin(i * 0.4 + 1) * 28 + Math.sin(i * 0.8) * 12 + Math.sin(i * 1.6) * 6);
          const x = 256 + i * 2.8;
          return <rect key={i} x={x} y={118 - h / 2} width="2" height={Math.max(h, 2)} rx="1" fill="#3b82f6" fillOpacity="0.6" />;
        })}
      </g>

      {/* Second audio clip on track 1 */}
      <rect x="580" y="74" width="240" height="88" rx="4" fill="#1e3a5f" fillOpacity="0.6" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.4" />
      <text x="588" y="88" fill="#60a5fa" fontSize="9" fontFamily="system-ui" fontWeight="500">Take 2</text>
      <g opacity="0.7">
        {Array.from({ length: 80 }, (_, i) => {
          const h = Math.abs(Math.sin(i * 0.3 + 2) * 22 + Math.sin(i * 0.7 + 1) * 14 + Math.sin(i * 2.1) * 8);
          const x = 588 + i * 2.8;
          return <rect key={i} x={x} y={118 - h / 2} width="2" height={Math.max(h, 2)} rx="1" fill="#3b82f6" fillOpacity="0.6" />;
        })}
      </g>

      {/* Track 2 - Drums */}
      <rect x="0" y="168" width="200" height="100" fill="#0e0e10" />
      <line x1="0" y1="268" x2="960" y2="268" stroke="#1e1e22" strokeWidth="1" />
      <text x="16" y="196" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Drums</text>
      <rect x="16" y="204" width="6" height="6" rx="3" fill="#a855f7" fillOpacity="0.7" />
      <text x="26" y="210" fill="#52525b" fontSize="9" fontFamily="system-ui">Pattern</text>
      <rect x="16" y="226" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="226" width="36" height="4" rx="2" fill="#3f3f46" />
      <circle cx="52" cy="228" r="5" fill="#52525b" />
      <rect x="16" y="242" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="253" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="242" width="20" height="16" rx="3" fill="#eab308" fillOpacity="0.3" />
      <text x="45" y="253" fill="#eab308" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Drum pattern clip */}
      <rect x="200" y="174" width="380" height="88" rx="4" fill="#2e1a47" fillOpacity="0.5" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
      <text x="208" y="188" fill="#a78bfa" fontSize="9" fontFamily="system-ui" fontWeight="500">Beat Pattern</text>
      {/* Drum pattern dots */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((step) => (
        <g key={step}>
          {[0,1,2,3].map((row) => {
            const active = (step % 4 === 0 && row === 0) || (step % 2 === 0 && row === 1) || ((step === 2 || step === 6 || step === 10 || step === 14) && row === 2) || ((step === 4 || step === 12) && row === 3);
            return (
              <rect
                key={row}
                x={212 + step * 22}
                y={196 + row * 14}
                width="8"
                height="8"
                rx="2"
                fill={active ? '#a78bfa' : '#27272a'}
                fillOpacity={active ? 0.7 : 0.5}
              />
            );
          })}
        </g>
      ))}

      {/* Track 3 - Synth */}
      <rect x="0" y="268" width="200" height="100" fill="#111113" />
      <line x1="0" y1="368" x2="960" y2="368" stroke="#1e1e22" strokeWidth="1" />
      <text x="16" y="296" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Synth Lead</text>
      <rect x="16" y="304" width="6" height="6" rx="3" fill="#06b6d4" fillOpacity="0.7" />
      <text x="26" y="310" fill="#52525b" fontSize="9" fontFamily="system-ui">MIDI</text>
      <rect x="16" y="326" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="326" width="48" height="4" rx="2" fill="#3f3f46" />
      <circle cx="64" cy="328" r="5" fill="#52525b" />
      <rect x="16" y="342" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="353" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="342" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="353" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* MIDI clip */}
      <rect x="390" y="274" width="190" height="88" rx="4" fill="#0e3a3a" fillOpacity="0.6" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.3" />
      <text x="398" y="288" fill="#22d3ee" fontSize="9" fontFamily="system-ui" fontWeight="500">Melody A</text>
      {/* Mini piano roll notes */}
      {[
        { x: 400, y: 300, w: 30, h: 4 },
        { x: 436, y: 308, w: 20, h: 4 },
        { x: 460, y: 296, w: 24, h: 4 },
        { x: 490, y: 312, w: 16, h: 4 },
        { x: 510, y: 304, w: 28, h: 4 },
        { x: 544, y: 292, w: 18, h: 4 },
        { x: 400, y: 320, w: 14, h: 4 },
        { x: 420, y: 316, w: 24, h: 4 },
        { x: 450, y: 324, w: 16, h: 4 },
        { x: 520, y: 318, w: 36, h: 4 },
      ].map((n, i) => (
        <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx="1" fill="#06b6d4" fillOpacity="0.6" />
      ))}

      {/* Track 4 - Bass */}
      <rect x="0" y="368" width="200" height="100" fill="#0e0e10" />
      <line x1="0" y1="468" x2="960" y2="468" stroke="#1e1e22" strokeWidth="1" />
      <text x="16" y="396" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Bass</text>
      <rect x="16" y="404" width="6" height="6" rx="3" fill="#06b6d4" fillOpacity="0.7" />
      <text x="26" y="410" fill="#52525b" fontSize="9" fontFamily="system-ui">MIDI</text>
      <rect x="16" y="426" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="426" width="30" height="4" rx="2" fill="#3f3f46" />
      <circle cx="46" cy="428" r="5" fill="#52525b" />
      <rect x="16" y="442" width="20" height="16" rx="3" fill="#dc2626" fillOpacity="0.3" />
      <text x="21" y="453" fill="#f87171" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="442" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="453" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Bass MIDI clip */}
      <rect x="200" y="374" width="380" height="88" rx="4" fill="#0e3a3a" fillOpacity="0.4" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.2" />
      <text x="208" y="388" fill="#22d3ee" fillOpacity="0.5" fontSize="9" fontFamily="system-ui" fontWeight="500">Bass Line</text>
      {/* Muted appearance - dimmer notes */}
      {[
        { x: 210, y: 410, w: 40, h: 4 },
        { x: 260, y: 418, w: 30, h: 4 },
        { x: 300, y: 406, w: 36, h: 4 },
        { x: 346, y: 422, w: 26, h: 4 },
        { x: 380, y: 414, w: 44, h: 4 },
        { x: 434, y: 410, w: 28, h: 4 },
        { x: 470, y: 420, w: 34, h: 4 },
        { x: 514, y: 406, w: 24, h: 4 },
        { x: 546, y: 416, w: 28, h: 4 },
      ].map((n, i) => (
        <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx="1" fill="#06b6d4" fillOpacity="0.2" />
      ))}

      {/* Metronome track */}
      <rect x="0" y="468" width="200" height="36" fill="#09090b" />
      <line x1="0" y1="504" x2="960" y2="504" stroke="#1e1e22" strokeWidth="1" />
      <text x="16" y="490" fill="#52525b" fontSize="10" fontFamily="system-ui">Metronome</text>
      <rect x="160" y="478" width="24" height="16" rx="3" fill="#27272a" />
      <text x="167" y="489" fill="#52525b" fontSize="8" fontFamily="system-ui">ON</text>

      {/* Master track */}
      <rect x="0" y="504" width="960" height="36" fill="#0c0c0e" />
      <text x="16" y="526" fill="#52525b" fontSize="10" fontFamily="system-ui">Master</text>
      {/* Level meter */}
      <rect x="100" y="516" width="80" height="6" rx="3" fill="#1c1c20" />
      <rect x="100" y="516" width="52" height="6" rx="3" fill="#22c55e" fillOpacity="0.5" />
      <rect x="100" y="524" width="80" height="6" rx="3" fill="#1c1c20" />
      <rect x="100" y="524" width="44" height="6" rx="3" fill="#22c55e" fillOpacity="0.5" />

      {/* Timeline grid lines */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((beat) => (
        <line key={beat} x1={200 + (beat - 1) * 47.5} y1="68" x2={200 + (beat - 1) * 47.5} y2="468" stroke="#1a1a1e" strokeWidth="1" />
      ))}
    </svg>
  );
}
