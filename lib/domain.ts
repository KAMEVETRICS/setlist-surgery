export type Performer = { id: string; name: string; initials: string; role: string; available: boolean };
export type Instrument = { id: string; name: string; available: boolean };
export type Song = { id: string; title: string; durationSeconds: number; key: string; bpm: number; energy: number; rehearsed: boolean; performerIds: string[]; instrumentIds: string[]; note: string };
export type Venue = { id: string; name: string; city: string; maxDurationSeconds: number; changeoverSeconds: number };
export type Show = { id: string; title: string; band: string; date: string; startTime: string; songIds: string[] };
export type Catalogue = { performers: Performer[]; instruments: Instrument[]; songs: Song[]; venue: Venue; show: Show };
export type Stage = 'draft' | 'rehearsal' | 'approved';
export type Session = { version: 1; songIds: string[]; unavailablePerformerIds: string[]; unavailableInstrumentIds: string[]; stage: Stage; reviewFingerprint?: string; approval?: { fingerprint: string; at: string }; history: { id: string; at: string; text: string }[] };
export type Command =
  | { type: 'performer' | 'instrument'; id: string; available: boolean }
  | { type: 'replace'; slot: number; songId: string }
  | { type: 'remove'; slot: number }
  | { type: 'move'; slot: number; direction: -1 | 1 }
  | { type: 'add'; songId: string }
  | { type: 'rehearse' | 'approve' | 'reset' };
export type SongAssessment = { id: string; song?: Song; ready: boolean; issues: string[] };
export type SetAssessment = { songs: SongAssessment[]; durationSeconds: number; issues: string[]; ready: boolean; stage: Stage; fingerprint: string };
export type Candidate = { song: Song; resultingSeconds: number; reason: string; score: number };
export type ShowPayload = { catalogue: Catalogue; session: Session; mode: 'demo' | 'sanity'; revision?: string; projectId?: string };
