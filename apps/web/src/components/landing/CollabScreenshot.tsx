export function CollabScreenshot() {
  return (
    <svg viewBox="0 0 960 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect width="960" height="400" fill="#09090b" />

      {/* Toolbar */}
      <rect width="960" height="44" fill="#18181b" />
      <line x1="0" y1="44" x2="960" y2="44" stroke="#27272a" />

      {/* Back + project */}
      <path d="M24 22l-4 0 4-4M20 22l4 4" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="36" y="26" fill="#a1a1aa" fontSize="12" fontFamily="system-ui" fontWeight="500">Jam Session</text>

      {/* Transport - centered */}
      <g transform="translate(420, 10)">
        <rect x="0" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <path d="M16 8l-5 4 5 4M10 8v8" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="32" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <path d="M44 8l8 4-8 4z" fill="#e4e4e7" />
        <rect x="64" y="0" width="28" height="24" rx="4" fill="#27272a" />
        <circle cx="78" cy="12" r="5" fill="#dc2626" />
        <text x="106" y="16" fill="#71717a" fontSize="10" fontFamily="system-ui">BPM</text>
        <text x="128" y="16" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="600">95</text>
      </g>

      {/* Connection status - top right */}
      <g transform="translate(820, 12)">
        <rect x="0" y="0" width="120" height="20" rx="10" fill="#052e16" stroke="#16a34a" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="12" cy="10" r="3" fill="#22c55e" />
        <text x="20" y="14" fill="#4ade80" fontSize="10" fontFamily="system-ui">2 connected</text>
      </g>

      {/* Track headers */}
      <rect x="0" y="44" width="200" height="356" fill="#0a0a0b" />
      <line x1="200" y1="44" x2="200" y2="400" stroke="#27272a" />

      {/* Timeline ruler */}
      <rect x="200" y="44" width="760" height="24" fill="#0f0f12" />
      <line x1="200" y1="68" x2="960" y2="68" stroke="#27272a" />
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((beat) => (
        <g key={beat}>
          <line x1={200 + (beat - 1) * 47.5} y1="60" x2={200 + (beat - 1) * 47.5} y2="68" stroke="#3f3f46" strokeWidth="1" />
          <text x={200 + (beat - 1) * 47.5 + 4} y="57" fill="#52525b" fontSize="9" fontFamily="system-ui">{beat}</text>
        </g>
      ))}

      {/* Grid lines */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map((beat) => (
        <line key={beat} x1={200 + (beat - 1) * 47.5} y1="68" x2={200 + (beat - 1) * 47.5} y2="368" stroke="#1a1a1e" strokeWidth="1" />
      ))}

      {/* Playhead - local user */}
      <line x1="510" y1="44" x2="510" y2="400" stroke="#e4e4e7" strokeWidth="1.5" />
      <polygon points="505,44 515,44 510,50" fill="#e4e4e7" />

      {/* Peer cursor - remote user */}
      <line x1="630" y1="44" x2="630" y2="400" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="625,44 635,44 630,50" fill="#f59e0b" />
      {/* Peer label */}
      <rect x="616" y="50" width="56" height="16" rx="3" fill="#f59e0b" fillOpacity="0.2" />
      <text x="622" y="61" fill="#fbbf24" fontSize="9" fontFamily="system-ui" fontWeight="500">Alex M.</text>

      {/* Track 1 - Guitar (local user) */}
      <rect x="0" y="68" width="200" height="100" fill="#111113" />
      <line x1="0" y1="168" x2="960" y2="168" stroke="#1e1e22" />
      <text x="16" y="96" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Guitar</text>
      <rect x="16" y="104" width="6" height="6" rx="1" fill="#22c55e" fillOpacity="0.7" />
      <text x="26" y="110" fill="#52525b" fontSize="9" fontFamily="system-ui">Armed</text>
      <rect x="16" y="126" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="126" width="42" height="4" rx="2" fill="#3f3f46" />
      <circle cx="58" cy="128" r="5" fill="#52525b" />
      <rect x="16" y="142" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="153" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="142" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="153" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Guitar clips */}
      <rect x="248" y="74" width="220" height="88" rx="4" fill="#1e3a5f" fillOpacity="0.6" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.4" />
      <text x="256" y="88" fill="#60a5fa" fontSize="9" fontFamily="system-ui" fontWeight="500">Riff 1</text>
      <g opacity="0.7">
        {Array.from({ length: 72 }, (_, i) => {
          const h = Math.abs(Math.sin(i * 0.35 + 0.5) * 20 + Math.sin(i * 0.9) * 14 + Math.sin(i * 1.8) * 5);
          return <rect key={i} x={256 + i * 2.9} y={118 - h / 2} width="2" height={Math.max(h, 2)} rx="1" fill="#3b82f6" fillOpacity="0.6" />;
        })}
      </g>

      {/* Clip being actively recorded - pulsing border */}
      <rect x="510" y="74" width="160" height="88" rx="4" fill="#1e3a5f" fillOpacity="0.3" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.7" />
      <text x="518" y="88" fill="#f87171" fontSize="9" fontFamily="system-ui" fontWeight="500">Recording...</text>
      <g opacity="0.5">
        {Array.from({ length: 48 }, (_, i) => {
          const h = Math.abs(Math.sin(i * 0.5 + 3) * 18 + Math.sin(i * 1.1) * 10);
          return <rect key={i} x={518 + i * 3} y={118 - h / 2} width="2" height={Math.max(h, 2)} rx="1" fill="#ef4444" fillOpacity="0.5" />;
        })}
      </g>

      {/* Track 2 - Keys (remote user - Alex) */}
      <rect x="0" y="168" width="200" height="100" fill="#0e0e10" />
      <line x1="0" y1="268" x2="960" y2="268" stroke="#1e1e22" />
      <text x="16" y="196" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Keys</text>
      {/* Remote user indicator */}
      <rect x="50" y="186" width="52" height="14" rx="7" fill="#f59e0b" fillOpacity="0.15" />
      <text x="58" y="196" fill="#fbbf24" fontSize="8" fontFamily="system-ui">Alex M.</text>
      <rect x="16" y="204" width="6" height="6" rx="3" fill="#06b6d4" fillOpacity="0.7" />
      <text x="26" y="210" fill="#52525b" fontSize="9" fontFamily="system-ui">MIDI</text>
      <rect x="16" y="226" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="226" width="38" height="4" rx="2" fill="#3f3f46" />
      <circle cx="54" cy="228" r="5" fill="#52525b" />
      <rect x="16" y="242" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="253" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="242" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="253" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Keys MIDI clips */}
      <rect x="248" y="174" width="180" height="88" rx="4" fill="#0e3a3a" fillOpacity="0.6" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.3" />
      <text x="256" y="188" fill="#22d3ee" fontSize="9" fontFamily="system-ui" fontWeight="500">Chords</text>
      {[
        { x: 256, y: 200, w: 30, h: 4 }, { x: 256, y: 208, w: 30, h: 4 }, { x: 256, y: 216, w: 30, h: 4 },
        { x: 300, y: 204, w: 24, h: 4 }, { x: 300, y: 212, w: 24, h: 4 }, { x: 300, y: 220, w: 24, h: 4 },
        { x: 340, y: 198, w: 28, h: 4 }, { x: 340, y: 206, w: 28, h: 4 }, { x: 340, y: 214, w: 28, h: 4 },
        { x: 384, y: 202, w: 32, h: 4 }, { x: 384, y: 210, w: 32, h: 4 }, { x: 384, y: 218, w: 32, h: 4 },
      ].map((n, i) => (
        <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx="1" fill="#06b6d4" fillOpacity="0.5" />
      ))}

      {/* New clip just added by Alex (highlighted) */}
      <rect x="580" y="174" width="140" height="88" rx="4" fill="#0e3a3a" fillOpacity="0.6" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.5" />
      <text x="588" y="188" fill="#fbbf24" fontSize="9" fontFamily="system-ui" fontWeight="500">Bridge</text>
      {/* Glow to indicate just-synced */}
      <rect x="580" y="174" width="140" height="88" rx="4" fill="#f59e0b" fillOpacity="0.03" />
      {[
        { x: 590, y: 200, w: 22, h: 4 }, { x: 590, y: 208, w: 22, h: 4 },
        { x: 620, y: 204, w: 18, h: 4 }, { x: 620, y: 212, w: 18, h: 4 },
        { x: 648, y: 198, w: 26, h: 4 }, { x: 648, y: 206, w: 26, h: 4 },
        { x: 682, y: 202, w: 20, h: 4 }, { x: 682, y: 210, w: 20, h: 4 },
      ].map((n, i) => (
        <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx="1" fill="#06b6d4" fillOpacity="0.5" />
      ))}

      {/* Track 3 - Drums */}
      <rect x="0" y="268" width="200" height="100" fill="#111113" />
      <line x1="0" y1="368" x2="960" y2="368" stroke="#1e1e22" />
      <text x="16" y="296" fill="#d4d4d8" fontSize="11" fontFamily="system-ui" fontWeight="500">Drums</text>
      <rect x="16" y="304" width="6" height="6" rx="3" fill="#a855f7" fillOpacity="0.7" />
      <text x="26" y="310" fill="#52525b" fontSize="9" fontFamily="system-ui">Pattern</text>
      <rect x="16" y="326" width="60" height="4" rx="2" fill="#27272a" />
      <rect x="16" y="326" width="46" height="4" rx="2" fill="#3f3f46" />
      <circle cx="62" cy="328" r="5" fill="#52525b" />
      <rect x="16" y="342" width="20" height="16" rx="3" fill="#27272a" />
      <text x="21" y="353" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">M</text>
      <rect x="40" y="342" width="20" height="16" rx="3" fill="#27272a" />
      <text x="45" y="353" fill="#71717a" fontSize="9" fontFamily="system-ui" fontWeight="600">S</text>

      {/* Drum pattern */}
      <rect x="200" y="274" width="570" height="88" rx="4" fill="#2e1a47" fillOpacity="0.5" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
      <text x="208" y="288" fill="#a78bfa" fontSize="9" fontFamily="system-ui" fontWeight="500">Groove</text>
      {Array.from({ length: 24 }, (_, step) => (
        <g key={step}>
          {[0,1,2,3].map((row) => {
            const active = (step % 4 === 0 && row === 0) || (step % 4 === 2 && row === 1) || (step % 2 === 0 && row === 2) || ((step === 3 || step === 7 || step === 11 || step === 19) && row === 3);
            return (
              <rect
                key={row}
                x={212 + step * 22}
                y={296 + row * 14}
                width="8"
                height="8"
                rx="2"
                fill={active ? '#a78bfa' : '#1c1c20'}
                fillOpacity={active ? 0.6 : 0.3}
              />
            );
          })}
        </g>
      ))}

      {/* Status bar */}
      <rect x="0" y="368" width="960" height="32" fill="#0c0c0e" />
      <line x1="0" y1="368" x2="960" y2="368" stroke="#1e1e22" />

      {/* Connection indicator */}
      <circle cx="16" cy="384" r="4" fill="#22c55e" />
      <text x="26" y="388" fill="#4ade80" fontSize="10" fontFamily="system-ui">Connected via WebRTC</text>

      {/* Room info */}
      <text x="200" y="388" fill="#3f3f46" fontSize="10" fontFamily="system-ui">Room: jam-session-x7k2</text>

      {/* Peers */}
      <g transform="translate(820, 376)">
        <circle cx="8" cy="8" r="8" fill="#3f3f46" />
        <text x="8" y="12" fill="#e4e4e7" fontSize="8" fontFamily="system-ui" textAnchor="middle" fontWeight="600">Y</text>
        <circle cx="24" cy="8" r="8" fill="#92400e" />
        <text x="24" y="12" fill="#fbbf24" fontSize="8" fontFamily="system-ui" textAnchor="middle" fontWeight="600">A</text>
        <text x="40" y="12" fill="#52525b" fontSize="10" fontFamily="system-ui">You + Alex M.</text>
      </g>
    </svg>
  );
}
