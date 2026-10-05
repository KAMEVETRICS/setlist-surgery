import type { Catalogue, Session, Command, SongAssessment, SetAssessment, Candidate, Stage } from './domain.ts';

export function newSession(catalogue: Catalogue): Session {
  return { version: 1, songIds: [...catalogue.show.songIds], unavailablePerformerIds: [], unavailableInstrumentIds: [], stage: 'draft', history: [] };
}

export function assessSong(catalogue: Catalogue, session: Session, id: string): SongAssessment {
  const song = catalogue.songs.find(item => item.id === id);
  if (!song) return { id, ready: false, issues: ['This song is missing from the repertoire.'] };
  const issues: string[] = [];
  if (!Number.isFinite(song.durationSeconds) || song.durationSeconds <= 0) issues.push('Song duration is missing or invalid.');
  if (!song.rehearsed) issues.push('This arrangement has not been rehearsed.');
  if (!Array.isArray(song.performerIds) || !song.performerIds.length) issues.push('No performers are assigned to this arrangement.');
  for (const performerId of song.performerIds ?? []) {
    const performer = catalogue.performers.find(item => item.id === performerId);
    if (!performer) issues.push('A required performer is missing from the crew.');
    else if (!performer.available || session.unavailablePerformerIds.includes(performerId)) issues.push(`${performer.name} (${performer.role.toLowerCase()}) is unavailable.`);
  }
  for (const instrumentId of song.instrumentIds ?? []) {
    const instrument = catalogue.instruments.find(item => item.id === instrumentId);
    if (!instrument) issues.push('A required instrument is missing from the inventory.');
    else if (!instrument.available || session.unavailableInstrumentIds.includes(instrumentId)) issues.push(`${instrument.name} is unavailable.`);
  }
  return { id, song, ready: issues.length === 0, issues };
}

function fingerprint(catalogue: Catalogue, session: Session): string {
  return JSON.stringify({ ids: session.songIds,
    songs: session.songIds.map(id => { const s = catalogue.songs.find(s => s.id === id); return s ? [s.id,s.durationSeconds,s.rehearsed,s.performerIds,s.instrumentIds] : [id,'missing']; }),
    people: catalogue.performers.map(p => [p.id,p.available]), gear: catalogue.instruments.map(p => [p.id,p.available]),
    absent: [...session.unavailablePerformerIds].sort(), broken: [...session.unavailableInstrumentIds].sort(), limit: catalogue.venue.maxDurationSeconds, changeover: catalogue.venue.changeoverSeconds });
}

export function assessSet(catalogue: Catalogue, session: Session): SetAssessment {
  const songs = session.songIds.map(id => assessSong(catalogue, session, id));
  const issues: string[] = [];
  if (!songs.length) issues.push('Add at least one song to the running order.');
  if (new Set(session.songIds).size !== session.songIds.length) issues.push('A song appears more than once in the set.');
  const changeover = catalogue.venue.changeoverSeconds, limit = catalogue.venue.maxDurationSeconds;
  if (!Number.isFinite(changeover) || changeover < 0 || !Number.isFinite(limit) || limit <= 0) issues.push('Venue timing constraints are invalid.');
  const durationSeconds = songs.reduce((sum, entry) => sum + (entry.song && Number.isFinite(entry.song.durationSeconds) && entry.song.durationSeconds > 0 ? entry.song.durationSeconds : 0), 0) + Math.max(0, songs.length - 1) * (Number.isFinite(changeover) && changeover >= 0 ? changeover : 0);
  if (durationSeconds > limit) issues.push(`The set is ${formatDuration(durationSeconds - limit)} over the venue's time limit.`);
  const ready = issues.length === 0 && songs.every(song => song.ready), stamp = fingerprint(catalogue, session);
  let stage: Stage = 'draft';
  if (ready && session.stage === 'approved' && session.approval?.fingerprint === stamp) stage = 'approved';
  else if (ready && session.stage === 'rehearsal' && session.reviewFingerprint === stamp) stage = 'rehearsal';
  return { songs, durationSeconds, issues, ready, stage, fingerprint: stamp };
}

export function suggestReplacements(catalogue: Catalogue, session: Session, slot: number): Candidate[] {
  if (!Number.isInteger(slot) || slot < 0 || slot >= session.songIds.length) return [];
  const original = catalogue.songs.find(song => song.id === session.songIds[slot]);
  return catalogue.songs.filter(song => !session.songIds.includes(song.id)).flatMap(song => {
    const next = { ...session, songIds: session.songIds.map((id,index) => index === slot ? song.id : id) };
    const songAssessment = assessSong(catalogue,next,song.id), setAssessment = assessSet(catalogue,next);
    if (!songAssessment.ready || setAssessment.issues.length) return [];
    const energyDifference = Math.abs(song.energy - (original?.energy ?? 3));
    return [{ song, resultingSeconds: setAssessment.durationSeconds, score: energyDifference * 1000 + Math.abs(song.durationSeconds - (original?.durationSeconds ?? song.durationSeconds)), reason: `${energyDifference === 0 ? 'Same energy' : energyDifference === 1 ? 'Similar energy' : 'A change of pace'} · available crew · rehearsed` }];
  }).sort((a,b) => a.score - b.score || a.song.title.localeCompare(b.song.title));
}

export function parseCommand(value: unknown): Command {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unknown command.');
  const c = value as Record<string,unknown>;
  const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 128;
  const slot = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
  if (['approve','rehearse','reset'].includes(String(c.type))) return { type: c.type } as Command;
  if ((c.type === 'performer' || c.type === 'instrument') && id(c.id) && typeof c.available === 'boolean') return { type: c.type, id: c.id, available: c.available };
  if (c.type === 'replace' && slot(c.slot) && id(c.songId)) return { type: 'replace', slot: c.slot, songId: c.songId };
  if (c.type === 'remove' && slot(c.slot)) return { type: 'remove', slot: c.slot };
  if (c.type === 'move' && slot(c.slot) && (c.direction === -1 || c.direction === 1)) return { type: 'move', slot: c.slot, direction: c.direction };
  if (c.type === 'add' && id(c.songId)) return { type: 'add', songId: c.songId };
  throw new Error('Unknown command or invalid slot.');
}

export function applyCommand(catalogue: Catalogue, session: Session, input: Command): Session {
  const command = parseCommand(input);
  if (command.type === 'reset') return newSession(catalogue);
  const next: Session = { ...session, songIds: [...session.songIds], unavailablePerformerIds: [...session.unavailablePerformerIds], unavailableInstrumentIds: [...session.unavailableInstrumentIds], history: [...session.history], stage: 'draft', approval: undefined, reviewFingerprint: undefined };
  let text = '';
  if (command.type === 'performer' || command.type === 'instrument') {
    const items = command.type === 'performer' ? catalogue.performers : catalogue.instruments, item = items.find(entry => entry.id === command.id);
    if (!item) throw new Error('Unknown crew or instrument.');
    const field = command.type === 'performer' ? 'unavailablePerformerIds' : 'unavailableInstrumentIds';
    next[field] = command.available ? next[field].filter(id => id !== command.id) : [...new Set([...next[field],command.id])];
    text = `${item.name} marked ${command.available ? 'available' : 'unavailable'}.`;
  } else if (command.type === 'replace' || command.type === 'remove' || command.type === 'move') {
    if (command.slot >= next.songIds.length) throw new Error('Invalid slot.');
    const previous = catalogue.songs.find(song => song.id === next.songIds[command.slot]);
    if (command.type === 'remove') { next.songIds.splice(command.slot,1); text = `${previous?.title ?? 'Missing song'} removed from the set.`; }
    else if (command.type === 'move') {
      const target = command.slot + command.direction;
      if (target < 0 || target >= next.songIds.length) throw new Error('Invalid target slot.');
      [next.songIds[target],next.songIds[command.slot]] = [next.songIds[command.slot],next.songIds[target]];
      text = `${previous?.title ?? 'Song'} moved ${command.direction === -1 ? 'up' : 'down'}.`;
    } else {
      if (next.songIds.includes(command.songId)) throw new Error('That song is already in the running order.');
      const a = assessSong(catalogue,next,command.songId);
      if (!a.ready) throw new Error(a.issues.join(' '));
      next.songIds[command.slot] = command.songId;
      const issues = assessSet(catalogue,next).issues;
      if (issues.length) throw new Error(issues.join(' '));
      text = `${previous?.title ?? 'Missing song'} replaced with ${a.song!.title}.`;
    }
  } else if (command.type === 'add') {
    if (next.songIds.includes(command.songId)) throw new Error('That song is already in the running order.');
    if (next.songIds.length >= 30) throw new Error('This show supports up to 30 songs.');
    const a = assessSong(catalogue,next,command.songId);
    if (!a.ready) throw new Error(a.issues.join(' '));
    next.songIds.push(command.songId);
    const issues = assessSet(catalogue,next).issues;
    if (issues.length) throw new Error(issues.join(' '));
    text = `${a.song!.title} added to the set.`;
  } else {
    const a = assessSet(catalogue,session);
    if (!a.ready) throw new Error('Resolve the readiness issues before reviewing the set.');
    if (command.type === 'rehearse') { next.stage = 'rehearsal'; next.reviewFingerprint = a.fingerprint; text = 'Rehearsal readiness checked. The set is ready for approval.'; }
    else {
      if (a.stage !== 'rehearsal') throw new Error('Check rehearsal readiness before approving the set.');
      next.stage = 'approved'; next.approval = { fingerprint: a.fingerprint, at: new Date().toISOString() }; text = 'Set approved for the stage.';
    }
  }
  next.history = [{ id: crypto.randomUUID(), at: new Date().toISOString(), text },...next.history].slice(0,30);
  return next;
}

export function restoreSession(value: unknown, catalogue: Catalogue): Session {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return newSession(catalogue);
  const saved = value as Session;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 30 && v.every(id => typeof id === 'string' && id.length < 128);
  if (saved.version !== 1 || !strings(saved.songIds) || !strings(saved.unavailablePerformerIds) || !strings(saved.unavailableInstrumentIds) || !['draft','rehearsal','approved'].includes(saved.stage)) return newSession(catalogue);
  if (saved.songIds.some(id => !catalogue.songs.some(song => song.id === id)) || new Set(saved.songIds).size !== saved.songIds.length) return newSession(catalogue);
  if (saved.unavailablePerformerIds.some(id => !catalogue.performers.some(p => p.id === id)) || saved.unavailableInstrumentIds.some(id => !catalogue.instruments.some(p => p.id === id))) return newSession(catalogue);
  const history = Array.isArray(saved.history) ? saved.history.filter(e => e && typeof e.text === 'string' && e.text.length < 400 && typeof e.at === 'string' && typeof e.id === 'string').slice(0,30) : [];
  const approval = saved.approval && typeof saved.approval.fingerprint === 'string' && saved.approval.fingerprint.length < 15000 && typeof saved.approval.at === 'string' ? saved.approval : undefined;
  return { version: 1, songIds: [...saved.songIds], unavailablePerformerIds: [...saved.unavailablePerformerIds], unavailableInstrumentIds: [...saved.unavailableInstrumentIds], stage: saved.stage, history, approval, reviewFingerprint: typeof saved.reviewFingerprint === 'string' && saved.reviewFingerprint.length < 15000 ? saved.reviewFingerprint : undefined };
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0,Math.round(seconds));
  return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,'0')}`;
}
