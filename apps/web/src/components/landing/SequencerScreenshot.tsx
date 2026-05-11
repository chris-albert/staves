export function SequencerScreenshot() {
  const drumNames = ['Kick', 'Snare', 'HiHat', 'Open HH', 'Tom Hi', 'Tom Lo', 'Clap', 'Rim'];

  // Pattern data: 1 = active, 0 = inactive
  const pattern = [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // Kick
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // Snare
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // HiHat
    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], // Open HH
    [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0], // Tom Hi
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,1,0,0], // Tom Lo
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // Clap
    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], // Rim
  ];

  const cellW = 36;
  const cellH = 32;
  const labelW = 80;
  const headerH = 36;
  const panelPad = 12;
  const gridW = 16 * cellW;
  const gridH = 8 * cellH;
  const totalW = labelW + gridW + panelPad * 2;
  const totalH = headerH + gridH + panelPad * 2 + 40;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect width={totalW} height={totalH} fill="#09090b" />

      {/* Header bar */}
      <rect x="0" y="0" width={totalW} height={headerH} fill="#18181b" />
      <line x1="0" y1={headerH} x2={totalW} y2={headerH} stroke="#27272a" />

      <text x="16" y="22" fill="#d4d4d8" fontSize="12" fontFamily="system-ui" fontWeight="600">Step Sequencer</text>

      {/* Kit selector */}
      <rect x="140" y="8" width="80" height="20" rx="4" fill="#27272a" />
      <text x="152" y="22" fill="#a1a1aa" fontSize="10" fontFamily="system-ui">808 Kit</text>
      <path d="M208 16l4 4 4-4" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />

      {/* Steps selector */}
      <text x="260" y="22" fill="#52525b" fontSize="10" fontFamily="system-ui">Steps</text>
      <rect x="296" y="8" width="40" height="20" rx="4" fill="#27272a" />
      <text x="308" y="22" fill="#d4d4d8" fontSize="10" fontFamily="system-ui" fontWeight="600">16</text>

      {/* Duration selector */}
      <text x="360" y="22" fill="#52525b" fontSize="10" fontFamily="system-ui">Duration</text>
      <rect x="410" y="8" width="50" height="20" rx="4" fill="#27272a" />
      <text x="422" y="22" fill="#d4d4d8" fontSize="10" fontFamily="system-ui" fontWeight="500">1/16</text>

      {/* Close button */}
      <g transform={`translate(${totalW - 30}, 10)`}>
        <path d="M0 0l12 12M12 0L0 12" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Step number header */}
      {Array.from({ length: 16 }, (_, i) => (
        <text
          key={i}
          x={panelPad + labelW + i * cellW + cellW / 2}
          y={headerH + panelPad + 10}
          fill="#3f3f46"
          fontSize="9"
          fontFamily="system-ui"
          textAnchor="middle"
        >
          {i + 1}
        </text>
      ))}

      {/* Grid */}
      {drumNames.map((name, row) => (
        <g key={name}>
          {/* Row background */}
          <rect
            x={panelPad}
            y={headerH + panelPad + 16 + row * cellH}
            width={labelW + gridW}
            height={cellH}
            fill={row % 2 === 0 ? '#0c0c0e' : '#0a0a0b'}
          />

          {/* Label */}
          <text
            x={panelPad + 8}
            y={headerH + panelPad + 16 + row * cellH + cellH / 2 + 4}
            fill="#71717a"
            fontSize="10"
            fontFamily="system-ui"
          >
            {name}
          </text>

          {/* Steps */}
          {pattern[row]!.map((active, col) => (
            <rect
              key={col}
              x={panelPad + labelW + col * cellW + 4}
              y={headerH + panelPad + 16 + row * cellH + 4}
              width={cellW - 8}
              height={cellH - 8}
              rx="4"
              fill={active ? '#a78bfa' : '#1c1c20'}
              fillOpacity={active ? 0.85 : 1}
              stroke={active ? '#7c3aed' : '#27272a'}
              strokeWidth="1"
            />
          ))}

          {/* Beat group separators */}
          {[4, 8, 12].map((col) => (
            <line
              key={col}
              x1={panelPad + labelW + col * cellW}
              y1={headerH + panelPad + 16 + row * cellH}
              x2={panelPad + labelW + col * cellW}
              y2={headerH + panelPad + 16 + row * cellH + cellH}
              stroke="#27272a"
              strokeWidth="1"
            />
          ))}
        </g>
      ))}

      {/* Bottom controls */}
      <rect x="0" y={totalH - 40} width={totalW} height="40" fill="#111113" />
      <line x1="0" y1={totalH - 40} x2={totalW} y2={totalH - 40} stroke="#1e1e22" />

      {/* Playback indicator */}
      <rect x="16" y={totalH - 30} width="20" height="20" rx="4" fill="#27272a" />
      <path d={`M22 ${totalH - 24}l8 4-8 4z`} fill="#a1a1aa" />

      <text x="46" y={totalH - 16} fill="#52525b" fontSize="10" fontFamily="system-ui">Pattern loops with transport</text>
    </svg>
  );
}
