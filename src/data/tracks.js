/* Pistas de música: secuencias de semicorcheas escritas como texto.
 * '.' = silencio; cada compás son 16 pasos. Añadir una pista = añadir una entrada. */
export const TRACKS = {
  /* Menú: ambiente lento, acordes largos y "pings" de sonar. */
  menu: {
    bpm: 60,
    voices: [
      { wave: 'triangle', gain: 0.11, len: 17, attack: 1.4, notes: [
        'A2 . . . . . . . . . . . . . . .', 'F2 . . . . . . . . . . . . . . .',
        'C3 . . . . . . . . . . . . . . .', 'G2 . . . . . . . . . . . . . . .' ] },
      { wave: 'sine', gain: 0.07, len: 17, attack: 1.8, notes: [
        'E3 . . . . . . . . . . . . . . .', 'C3 . . . . . . . . . . . . . . .',
        'G3 . . . . . . . . . . . . . . .', 'D3 . . . . . . . . . . . . . . .' ] },
      { wave: 'sine', gain: 0.09, len: 7, notes: [
        '. . . . E5 . . . . . A5 . . . . .', '. . C5 . . . . . F5 . . . . . . .',
        '. . . . G5 . . . E5 . . . . . C5 .', '. . D5 . . . . . . . B4 . . . . .' ] },
    ],
    drums: {},
  },
  /* Jefe, fase 1: pulso grave y amenazante. */
  boss: {
    bpm: 104,
    voices: [
      { wave: 'sawtooth', gain: 0.16, len: 2, cutoff: 480, notes: [
        'D2 . . D2 . . D2 . D2 . . D2 . . F2 .', 'D2 . . D2 . . D2 . C2 . . C2 . . C#2 .' ] },
      { wave: 'square', gain: 0.035, len: 3, cutoff: 1600, notes: [
        '. . . . . . . . A4 . G#4 . A4 . . .', '. . . . . . . . F4 . E4 . D4 . . .' ] },
    ],
    drums: { kick: 'x . . . . . . . x . . . . . x .', hat: '. . x . . . x . . . x . . . x .' },
  },
  /* Jefe, fase 2: persecución. */
  frenzy: {
    bpm: 156,
    voices: [
      { wave: 'sawtooth', gain: 0.17, len: 1.2, cutoff: 900, notes: [
        'D2 D2 . D2 D2 . D2 D2 . D2 D2 . D2 . D3 .', 'F2 F2 . F2 F2 . F2 F2 . E2 E2 . E2 . E3 .',
        'D2 D2 . D2 D2 . D2 D2 . D2 D2 . D2 . D3 .', 'A#1 A#1 . A#1 A#1 . C2 C2 . C2 C2 . C#2 . C#3 .' ] },
      { wave: 'square', gain: 0.055, len: 2, cutoff: 2600, notes: [
        'D5 . . A4 . . F4 . D5 . . A4 . . G#4 .', 'F5 . . C5 . . A4 . E5 . . C5 . . G#4 .',
        'D5 . F5 . A5 . G#5 . A5 . . . F5 . E5 .', 'D5 . A#4 . G4 . A#4 . E5 . C#5 . A4 . C#5 .' ] },
    ],
    drums: { kick: 'x . . . x . . . x . . . x . . .', snare: '. . . . x . . . . . . . x . . x', hat: '. . x . . . x . . . x . . . x x' },
  },
  /* Difícil, antes del drop: tensión que se va cerrando. */
  hardBuild: {
    bpm: 156,
    voices: [
      { wave: 'sawtooth', gain: 0.13, len: 3, cutoff: 420, notes: [
        'E2 . . . E2 . . . E2 . . . E2 . E2 .', 'E2 . . . E2 . . . E2 . E2 . E2 E2 E2 E2' ] },
      { wave: 'square', gain: 0.03, len: 1, cutoff: 2200, notes: [
        'B5 . B5 . B5 . B5 . B5 . B5 . B5 . B5 .', 'C6 . C6 . C6 . C6 . C6 C6 C6 C6 C6 C6 C6 C6' ] },
    ],
    drums: { kick: 'x . . . . . . . x . . . . . x .', hat: '. . x . . . x . . . x . . . x .' },
  },
  /* Difícil, persecución: pista sintetizada alternativa a la canción grabada. */
  hardFrenzy: {
    bpm: 156,
    voices: [
      { wave: 'sawtooth', gain: 0.16, len: 1.1, cutoff: 1000, notes: [
        'E2 E2 E3 E2 E2 E3 E2 E2 E3 E2 E2 E3 E2 E3 E2 E3', 'F2 F2 F3 F2 F2 F3 F2 F2 F3 F2 F2 F3 F2 F3 F2 F3',
        'G2 G2 G3 G2 G2 G3 G2 G2 G3 G2 G2 G3 G2 G3 G2 G3', 'F2 F2 F3 F2 F2 F3 F2 F2 D#2 D#2 D#3 D#2 B1 B2 B1 B2' ] },
      { wave: 'square', gain: 0.05, len: 2, cutoff: 2800, notes: [
        'E5 . B4 . E5 . G5 . F#5 . E5 . B4 . D5 .', 'F5 . C5 . F5 . A5 . G5 . F5 . C5 . E5 .',
        'G5 . D5 . G5 . B5 . A5 . G5 . D5 . F#5 .', 'A5 . G5 . F5 . E5 . D#5 . F#5 . B5 . . .' ] },
      { wave: 'triangle', gain: 0.05, len: 1, notes: [
        'E4 G4 B4 E5 E4 G4 B4 E5 E4 G4 B4 E5 E4 G4 B4 E5', 'F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5',
        'G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5', 'F4 A4 C5 F5 F4 A4 C5 F5 D#4 F#4 B4 D#5 B3 D#4 F#4 B4' ] },
    ],
    drums: { kick: 'x . . . x . . . x . . . x . . .', snare: '. . . . x . . . . . . . x . x x', hat: 'x . x . x . x . x . x . x . x x' },
  },
};
