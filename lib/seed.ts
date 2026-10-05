import type { Catalogue, Session, Song } from './domain.ts';

const song = (id: string, title: string, durationSeconds: number, key: string, bpm: number, energy: number, performerIds: string[], instrumentIds: string[], note: string, rehearsed = true): Song => ({ id, title, durationSeconds, key, bpm, energy, performerIds, instrumentIds, note, rehearsed });

export const catalogue: Catalogue = {
  performers: [
    { id: 'mara', name: 'Mara Chen', initials: 'MC', role: 'Vocals', available: true },
    { id: 'jon', name: 'Jon Reyes', initials: 'JR', role: 'Guitar', available: true },
    { id: 'leo', name: 'Leo Park', initials: 'LP', role: 'Bass', available: true },
    { id: 'sam', name: 'Sam Okafor', initials: 'SO', role: 'Drums', available: true },
    { id: 'inez', name: 'Inez Silva', initials: 'IS', role: 'Keys', available: true },
  ],
  instruments: [
    { id: 'electric-guitar', name: 'Electric guitar', available: true },
    { id: 'acoustic-guitar', name: 'Acoustic guitar', available: true },
    { id: 'bass', name: 'Bass guitar', available: true },
    { id: 'drums', name: 'Drum kit', available: true },
    { id: 'keys', name: 'Stage piano', available: true },
    { id: 'synth', name: 'Analogue synth', available: false },
  ],
  songs: [
    song('night-drive', 'Night Drive', 270, 'E minor', 118, 4, ['mara','jon','leo','sam'], ['electric-guitar','bass','drums'], 'Full-band opener. The bass line carries the verses.'),
    song('paper-satellites', 'Paper Satellites', 240, 'G major', 92, 2, ['mara','jon'], ['acoustic-guitar'], 'Acoustic duo arrangement. Let the last chord ring.'),
    song('static-bloom', 'Static Bloom', 300, 'A minor', 126, 5, ['mara','jon','leo','sam'], ['electric-guitar','bass','drums'], 'Big chorus; bass and drums enter together.'),
    song('afterimage', 'Afterimage', 260, 'C major', 84, 2, ['mara','inez'], ['keys'], 'Piano and voice. Leave space after the second chorus.'),
    song('neon-weather', 'Neon Weather', 330, 'D minor', 110, 4, ['mara','leo','sam','inez'], ['bass','drums','keys'], 'Keys lead; the bass riff is part of the hook.'),
    song('last-light', 'Last Light', 330, 'G major', 108, 4, ['mara','jon','sam'], ['electric-guitar','drums'], 'Bass-free closing arrangement, rehearsed last Thursday.'),
    song('slow-motion', 'Slow Motion', 315, 'E minor', 112, 4, ['mara','jon','sam'], ['electric-guitar','drums'], 'Lean trio arrangement. Guitar handles the low riff.'),
    song('no-signal', 'No Signal', 265, 'A minor', 128, 5, ['mara','jon','sam'], ['electric-guitar','drums'], 'Punchy three-piece version. A natural high-energy swap.'),
    song('glasshouse', 'Glasshouse', 280, 'D minor', 104, 3, ['mara','inez','sam'], ['keys','drums'], 'Piano, drums and voice. No bass part in this arrangement.'),
    song('velvet-radio', 'Velvet Radio', 290, 'B minor', 96, 3, ['mara','jon','inez'], ['electric-guitar','keys'], 'New arrangement; the band has not rehearsed it together.', false),
    song('borrowed-moon', 'Borrowed Moon', 300, 'F major', 100, 3, ['mara','inez'], ['synth'], 'Needs the analogue synth, currently out for repair.'),
    song('soft-landing', 'Soft Landing', 235, 'C major', 88, 2, ['mara','jon'], ['acoustic-guitar'], 'Stripped-back duo version. Useful when the clock is tight.'),
  ],
  venue: { id: 'echo-room', name: 'The Echo Room', city: 'Los Angeles, CA', maxDurationSeconds: 2400, changeoverSeconds: 30 },
  show: { id: 'tonight', title: 'Sunday Sessions', band: 'The Static Lines', date: '2026-10-04', startTime: '21:00', songIds: ['night-drive','paper-satellites','static-bloom','afterimage','neon-weather','last-light'] },
};

export const initialSession: Session = { version: 1, songIds: [...catalogue.show.songIds], unavailablePerformerIds: [], unavailableInstrumentIds: [], stage: 'draft', history: [] };
