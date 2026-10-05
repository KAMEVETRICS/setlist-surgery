import type { Catalogue, Session } from './domain.ts';

export type SanityConfig = { projectId: string; dataset: string; token: string };
type SanityEnvelope = { result?: unknown; documents?: { _type: string; _rev: string; state: Session }[]; results?: { document?: { _rev?: string } }[] };
export class ServiceError extends Error {
  status: number;
  constructor(message: string, status = 503) { super(message); this.status = status; }
}

export function sanityConfig(env: Record<string, string | undefined>): SanityConfig | null {
  const projectId = env.SANITY_PROJECT_ID?.trim(), dataset = env.SANITY_DATASET?.trim(), token = env.SANITY_API_TOKEN?.trim();
  if (!projectId && !dataset && !token) return null;
  if (!projectId || !dataset || !token || !/^[a-z0-9]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(dataset)) throw new ServiceError('Sanity configuration is incomplete. Set the project ID, dataset and server token.');
  return { projectId, dataset, token };
}

const catalogueQuery = `{
  "performers": *[_type == "performer" && _id match "ss.*"] | order(name) {"id": _id, name, initials, role, available},
  "instruments": *[_type == "instrument" && _id match "ss.*"] | order(name) {"id": _id, name, available},
  "songs": *[_type == "song" && _id match "ss.*"] | order(title) {"id": _id, title, durationSeconds, key, bpm, energy, rehearsed, "performerIds": performers[]._ref, "instrumentIds": instruments[]._ref, "note": coalesce(note, "")},
  "venue": *[_id == "ss.show.tonight"][0].venue-> {"id": _id, name, city, maxDurationSeconds, changeoverSeconds},
  "show": *[_id == "ss.show.tonight"][0] {"id": _id, title, band, date, startTime, "songIds": songs[]._ref}
}`;

function validateCatalogue(value: unknown): Catalogue {
  const c = value as Catalogue;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === 'string');
  if (!c || !Array.isArray(c.songs) || !Array.isArray(c.performers) || !Array.isArray(c.instruments) || !c.venue || !c.show || !strings(c.show.songIds)) throw new ServiceError('Sanity content is not seeded yet, or its structure is incomplete.');
  if (![c.show.id,c.show.title,c.show.band,c.show.date,c.show.startTime,c.venue.id,c.venue.name,c.venue.city].every(v=>typeof v==='string' && v.length>0) || !/^\d{4}-\d{2}-\d{2}$/.test(c.show.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.show.startTime) || !Number.isFinite(c.venue.maxDurationSeconds) || !Number.isFinite(c.venue.changeoverSeconds)) throw new ServiceError('The show or venue has invalid fields. Check its Studio record and venue reference.');
  if (!c.performers.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.initials === 'string' && typeof p.role === 'string' && typeof p.available === 'boolean') || !c.instruments.every(i => i && typeof i.id === 'string' && typeof i.name === 'string' && typeof i.available === 'boolean') || !c.songs.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.key === 'string' && typeof s.note === 'string' && typeof s.durationSeconds === 'number' && typeof s.energy === 'number' && typeof s.bpm === 'number' && typeof s.rehearsed === 'boolean' && strings(s.performerIds) && strings(s.instrumentIds))) throw new ServiceError('Some Sanity records have invalid fields. Check the Studio validation messages.');
  return c;
}

export function sessionFields(state: Session) {
  const refs = (ids: string[]) => ids.map((id,index) => ({ _type: 'reference', _ref: id, _key: `ref-${index}` }));
  const snapshot = { ...state, _type:'sessionState', history:state.history.map(event=>({...event,_type:'showEvent',_key:event.id})), ...(state.approval ? {approval:{...state.approval,_type:'setApproval'}} : {}) };
  return { state: snapshot, songs: refs(state.songIds), unavailablePerformers: refs(state.unavailablePerformerIds), unavailableInstruments: refs(state.unavailableInstrumentIds), reviewStage: state.stage };
}

export function createSanityRepository(config: SanityConfig, fetcher: typeof fetch = fetch) {
  const base = `https://${config.projectId}.api.sanity.io/v2026-10-04/data`;
  async function call(path: string, init: RequestInit = {}) {
    let response: Response;
    try { response = await fetcher(`${base}/${path}`, { ...init, headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json', ...init.headers }, cache: 'no-store', signal: AbortSignal.timeout(15000) }); }
    catch { throw new ServiceError('Could not reach Sanity. Your changes have not been saved.'); }
    if (response.status === 409) throw new ServiceError('The show changed in another tab. Refresh the latest version and try again.', 409);
    if (!response.ok) throw new ServiceError('Sanity could not read or save the show. Check the project, dataset and server token.');
    try { return await response.json() as SanityEnvelope; } catch { throw new ServiceError('Sanity returned an unreadable response.'); }
  }
  return {
    async catalogue(): Promise<Catalogue> { const data = await call(`query/${config.dataset}`, { method: 'POST', body: JSON.stringify({ query: catalogueQuery }) }); return validateCatalogue(data.result); },
    async session(id: string): Promise<{ state: Session; revision: string } | null> {
      const data = await call(`doc/${config.dataset}/${encodeURIComponent(id)}`), doc = data.documents?.[0];
      if (!doc) return null;
      const s = doc.state;
      if (doc._type !== 'rescueSession' || typeof doc._rev !== 'string' || !s || s.version !== 1 || !Array.isArray(s.songIds) || !Array.isArray(s.unavailablePerformerIds) || !Array.isArray(s.unavailableInstrumentIds) || !Array.isArray(s.history) || !['draft','rehearsal','approved'].includes(s.stage)) throw new ServiceError('The saved show has invalid data.');
      const ids = (values: unknown[]) => values.length<=30 && values.every(v=>typeof v==='string' && v.length>0 && v.length<128);
      if (![s.songIds,s.unavailablePerformerIds,s.unavailableInstrumentIds].every(ids) || s.history.length>30 || !s.history.every(event=>event && typeof event.id==='string' && typeof event.text==='string' && event.text.length<1000 && typeof event.at==='string' && Number.isFinite(Date.parse(event.at))) || (s.reviewFingerprint!==undefined && typeof s.reviewFingerprint!=='string') || (s.approval!==undefined && (!s.approval || typeof s.approval.fingerprint!=='string' || typeof s.approval.at!=='string' || !Number.isFinite(Date.parse(s.approval.at))))) throw new ServiceError('The saved show has invalid details. Refresh the source records before continuing.');
      return { state: s, revision: doc._rev };
    },
    async create(id: string, state: Session): Promise<string> {
      const data = await call(`mutate/${config.dataset}?returnDocuments=true`, { method: 'POST', body: JSON.stringify({ mutations: [{ create: { _id: id, _type: 'rescueSession', ...sessionFields(state) } }] }) });
      const revision = data.results?.[0]?.document?._rev;
      if (typeof revision !== 'string') throw new ServiceError('Sanity did not confirm creation of the show.');
      return revision;
    },
    async update(id: string, revision: string, state: Session): Promise<string> {
      const data = await call(`mutate/${config.dataset}?returnDocuments=true`, { method: 'POST', body: JSON.stringify({ mutations: [{ patch: { id, ifRevisionID: revision, set: sessionFields(state) } }] }) });
      const updated = data.results?.[0]?.document?._rev;
      if (typeof updated !== 'string') throw new ServiceError('Sanity did not confirm saving the show.');
      return updated;
    },
  };
}
