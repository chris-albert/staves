export function PianoRollScreenshot() {
  const noteNames = ['C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3'];
  const blackKeySet = new Set([2, 4, 6, 9, 11, 13, 15, 17]);

  const keyW = 48;
  const rowH = 18;
  const headerH = 40;
  const gridW = 640;
  const totalW = keyW + gridW;
  const totalH = headerH + noteNames.length * rowH + 40;
  const beatsVisible = 8;
  const pxPerBeat = gridW / beatsVisible;

  // Notes: [startBeat, pitch (row index), durationBeats]
  const notes: [number, number, number][] = [
    [0, 8, 1],     // E4
    [1, 6, 0.5],   // F#4
    [1.5, 5, 0.5], // G4
    [2, 3, 1.5],   // A4
    [3.5, 5, 0.5], // G4
    [4, 6, 1],     // F#4
    [5, 8, 1],     // E4
    [6, 10, 1],    // D4
    [7, 12, 1],    // C4
    [0, 12, 2],    // C4 (bass)
    [2, 8, 2],     // E4 (bass)
    [4, 5, 1.5],   // G4
    [5.5, 3, 0.5], // A4
    [6, 1, 2],     // B4
  ];

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect width={totalW} height={totalH} fill="#09090b" />

      {/* Header */}
      <rect width={totalW} height={headerH} fill="#18181b" />
      <line x1="0" y1={headerH} x2={totalW} y2={headerH} stroke="#27272a" />

      <text x="16" y="24" fill="#d4d4d8" fontSize="12" fontFamily="system-ui" fontWeight="600">Piano Roll</text>

      {/* Mode toggles */}
      <rect x="110" y="10" width="54" height="20" rx="4" fill="#3f3f46" />
      <text x="122" y="24" fill="#e4e4e7" fontSize="10" fontFamily="system-ui" fontWeight="500">Draw</text>

      <rect x="168" y="10" width="60" height="20" rx="4" fill="#27272a" />
      <text x="178" y="24" fill="#71717a" fontSize="10" fontFamily="system-ui">Select</text>

      {/* Snap setting */}
      <text x="260" y="24" fill="#52525b" fontSize="10" fontFamily="system-ui">Snap</text>
      <rect x="290" y="10" width="46" height="20" rx="4" fill="#27272a" />
      <text x="300" y="24" fill="#d4d4d8" fontSize="10" fontFamily="system-ui" fontWeight="500">1/16</text>

      {/* Velocity */}
      <text x="360" y="24" fill="#52525b" fontSize="10" fontFamily="system-ui">Vel</text>
      <rect x="384" y="18" width="50" height="4" rx="2" fill="#27272a" />
      <rect x="384" y="18" width="38" height="4" rx="2" fill="#06b6d4" fillOpacity="0.6" />
      <circle cx="422" cy="20" r="5" fill="#0891b2" />

      {/* Close */}
      <g transform={`translate(${totalW - 28}, 14)`}>
        <path d="M0 0l12 12M12 0L0 12" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Beat ruler */}
      {Array.from({ length: beatsVisible }, (_, i) => (
        <g key={i}>
          <line x1={keyW + i * pxPerBeat} y1={headerH} x2={keyW + i * pxPerBeat} y2={headerH + noteNames.length * rowH} stroke={i % 4 === 0 ? '#27272a' : '#1a1a1e'} strokeWidth="1" />
          {/* Sub-divisions (1/4 of beat) */}
          {[1, 2, 3].map((sub) => (
            <line
              key={sub}
              x1={keyW + i * pxPerBeat + sub * (pxPerBeat / 4)}
              y1={headerH}
              x2={keyW + i * pxPerBeat + sub * (pxPerBeat / 4)}
              y2={headerH + noteNames.length * rowH}
              stroke="#111114"
              strokeWidth="1"
            />
          ))}
        </g>
      ))}

      {/* Piano keyboard + rows */}
      {noteNames.map((name, row) => {
        const isBlack = blackKeySet.has(row);
        const y = headerH + row * rowH;
        return (
          <g key={row}>
            {/* Grid row background */}
            <rect x={keyW} y={y} width={gridW} height={rowH} fill={isBlack ? '#0c0c0f' : '#0f0f12'} />
            <line x1={keyW} y1={y + rowH} x2={keyW + gridW} y2={y + rowH} stroke="#111114" strokeWidth="0.5" />

            {/* Piano key */}
            <rect x="0" y={y} width={keyW} height={rowH} fill={isBlack ? '#1c1c20' : '#27272a'} stroke="#111114" strokeWidth="0.5" />
            <text
              x={keyW - 6}
              y={y + rowH / 2 + 3}
              fill={name.startsWith('C') && !name.includes('#') ? '#a1a1aa' : '#3f3f46'}
              fontSize="8"
              fontFamily="system-ui"
              textAnchor="end"
            >
              {name}
            </text>
          </g>
        );
      })}

      {/* Keyboard separator */}
      <line x1={keyW} y1={headerH} x2={keyW} y2={headerH + noteNames.length * rowH} stroke="#27272a" strokeWidth="1" />

      {/* Notes */}
      {notes.map(([startBeat, pitchRow, duration], i) => (
        <rect
          key={i}
          x={keyW + startBeat * pxPerBeat + 1}
          y={headerH + pitchRow * rowH + 2}
          width={duration * pxPerBeat - 2}
          height={rowH - 4}
          rx="2"
          fill="#06b6d4"
          fillOpacity="0.7"
          stroke="#0891b2"
          strokeWidth="1"
        />
      ))}

      {/* Playhead */}
      <line x1={keyW + 3.2 * pxPerBeat} y1={headerH} x2={keyW + 3.2 * pxPerBeat} y2={headerH + noteNames.length * rowH} stroke="#e4e4e7" strokeWidth="1.5" />

      {/* Bottom bar */}
      <rect x="0" y={headerH + noteNames.length * rowH} width={totalW} height="40" fill="#111113" />
      <line x1="0" y1={headerH + noteNames.length * rowH} x2={totalW} y2={headerH + noteNames.length * rowH} stroke="#1e1e22" />
      <text x="16" y={headerH + noteNames.length * rowH + 24} fill="#3f3f46" fontSize="10" fontFamily="system-ui">
        Synth Lead &mdash; Melody A &middot; 4 beats
      </text>

      {/* Synth patch info */}
      <text x={totalW - 120} y={headerH + noteNames.length * rowH + 24} fill="#52525b" fontSize="10" fontFamily="system-ui">
        Patch: Bright Pad
      </text>
    </svg>
  );
}
