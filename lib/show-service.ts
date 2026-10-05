import { catalogue as demoCatalogue } from './seed.ts';
import { newSession, parseCommand, applyCommand } from './engine.ts';
import { createSanityRepository, sanityConfig, ServiceError } from './sanity.server.ts';

const headers = { 'cache-control': 'no-store, private' };
const json = (body: unknown, status = 200, extra: Record<string,string> = {}) => Response.json(body, { status, headers: { ...headers, ...extra } });

export async function handleShowRequest(request: Request, env: Record<string,string | undefined>, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    if (!['GET','POST'].includes(request.method)) return json({ error: 'Method not allowed.' },405);
    if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'This change must come from the show desk.' },403);
    const config = sanityConfig(env);
    if (!config) {
      if (request.method === 'POST') return json({ error: 'Local demo changes are saved in your browser.' },400);
      return json({ mode: 'demo', catalogue: demoCatalogue, session: newSession(demoCatalogue) });
    }
    const repo = createSanityRepository(config,fetcher), catalogue = await repo.catalogue();
    const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('setlist_session='))?.slice('setlist_session='.length);
    const validCookie = cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cookie);
    if (request.method === 'POST' && !validCookie) return json({ error: 'Open the show desk before making changes.' },401);
    const key = validCookie ? cookie : crypto.randomUUID(), id = `ss.session.${key}`;
    let saved = validCookie ? await repo.session(id) : null;
    if (request.method === 'POST') {
      if (!saved) return json({ error: 'The show session expired. Refresh the desk.' },401);
      const raw = await request.text();
      if (raw.length > 16000) return json({ error: 'The change is too large.' },413);
      let input: { command: unknown; revision?: string };
      try { input = JSON.parse(raw); } catch { return json({ error: 'The change is not valid JSON.' },400); }
      if (!input || typeof input !== 'object') return json({ error: 'Invalid change.' },400);
      if (input.revision !== saved.revision) return json({ error: 'The show changed in another tab. Refresh the latest version and try again.' },409);
      let next;
      try { next = applyCommand(catalogue,saved.state,parseCommand(input.command)); } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid change.' },400); }
      const revision = await repo.update(id,saved.revision,next);
      return json({ mode: 'sanity', catalogue, session: next, revision, projectId: config.projectId });
    }
    let extra: Record<string,string> = {};
    if (!saved) {
      const state = newSession(catalogue), revision = await repo.create(id,state);
      saved = { state, revision };
      extra = { 'set-cookie': `setlist_session=${key}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` };
    }
    return json({ mode: 'sanity', catalogue, session: saved.state, revision: saved.revision, projectId: config.projectId },200,extra);
  } catch (error) {
    return json({ error: error instanceof ServiceError ? error.message : 'The show could not be loaded. Please try again.' },error instanceof ServiceError ? error.status : 503);
  }
}
