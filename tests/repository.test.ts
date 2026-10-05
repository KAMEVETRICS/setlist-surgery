import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogue } from '../lib/seed.ts';
import { handleShowRequest } from '../lib/show-service.ts';

const environment = { SANITY_PROJECT_ID: 'test1234', SANITY_DATASET: 'setlist_surgery', SANITY_API_TOKEN: 'fixture-token' };
const request = (method = 'GET', cookie = '', body?: unknown) => new Request('https://show.example/api/show', { method, headers: { ...(cookie ? { cookie } : {}), ...(method === 'POST' ? { origin: 'https://show.example', 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

function transport() {
  const documents = new Map<string, Record<string, unknown>>();
  let revisions = 0;
  const fetcher: typeof fetch = async (url, init) => {
    const address = String(url);
    if (address.includes('/query/')) return Response.json({ result: structuredClone(catalogue) });
    if (address.includes('/doc/')) return Response.json({ documents: [documents.get(decodeURIComponent(address.split('/').at(-1)!))].filter(Boolean) });
    if (address.includes('/mutate/')) {
      const body = JSON.parse(String(init?.body));
      const results = [];
      for (const mutation of body.mutations) {
        if (mutation.create) {
          const doc = { ...mutation.create, _rev: String(++revisions) };
          assert.equal(doc._type, 'rescueSession');
          assert.match(doc._id, /^ss\.session\.[0-9a-f-]{36}$/);
          documents.set(doc._id, doc);
          results.push({ id: doc._id, document: doc });
        } else {
          const patch = mutation.patch;
          const existing = documents.get(patch.id);
          assert.equal(existing?._type, 'rescueSession');
          if (!existing || patch.ifRevisionID !== existing._rev) return Response.json({ error: 'revision conflict' }, { status: 409 });
          const doc = { ...existing, ...patch.set, _rev: String(++revisions) };
          documents.set(patch.id, doc);
          results.push({ id: patch.id, document: doc });
        }
      }
      return Response.json({ results });
    }
    throw new Error('Unexpected service boundary');
  };
  return { fetcher, documents };
}

test('malformed catalogue display fields return a visible service error', async () => {
  const broken = structuredClone(catalogue) as unknown as {show:{title:unknown}};
  broken.show.title = null;
  const boundary = transport();
  const fetcher: typeof fetch = async (url,init) => String(url).includes('/query/') ? Response.json({result:broken}) : boundary.fetcher(url,init);
  const response = await handleShowRequest(request(),environment,fetcher);
  assert.equal(response.status,503);
});

test('corrupt saved history cannot reach the renderer', async () => {
  const boundary = transport();
  const opened = await handleShowRequest(request(),environment,boundary.fetcher);
  const cookie = opened.headers.get('set-cookie')!.split(';')[0];
  const doc = [...boundary.documents.values()][0];
  (doc.state as {history:unknown[]}).history = [null];
  assert.equal((await handleShowRequest(request('GET',cookie),environment,boundary.fetcher)).status,503);
});

test('the catalogue query follows the show venue reference and missing venues fail closed', async () => {
  let query = '';
  const fetcher: typeof fetch = async (_url,init) => { query = JSON.parse(String(init?.body)).query; return Response.json({result:{...catalogue,venue:null}}); };
  assert.equal((await handleShowRequest(request(),environment,fetcher)).status,503);
  assert.match(query,/\*\[_id == "ss\.show\.tonight"\]\[0\]\.venue->/);
});

test('unconfigured GET is explicitly a browser-local demo', async () => {
  const response = await handleShowRequest(request(), {});
  assert.equal(response.status, 200);
  const data = await response.json() as { mode: string; catalogue: typeof catalogue };
  assert.equal(data.mode, 'demo');
  assert.equal(data.catalogue.songs.length, 12);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('partial Sanity configuration produces an error instead of silently returning demo data', async () => {
  const response = await handleShowRequest(request(), { SANITY_PROJECT_ID: 'test1234' });
  assert.equal(response.status, 503);
  assert.match((await response.json() as { error: string }).error, /configuration/i);
});

test('live writes update only the server-issued session and stale revisions return a conflict', async () => {
  const boundary = transport();
  const opened = await handleShowRequest(request(), environment, boundary.fetcher);
  const first = await opened.json() as { revision: string };
  const cookie = opened.headers.get('set-cookie')!.split(';')[0];
  assert.match(cookie, /^setlist_session=/);
  const changed = await handleShowRequest(request('POST', cookie, { revision: first.revision, command: { type: 'performer', id: 'leo', available: false } }), environment, boundary.fetcher);
  assert.equal(changed.status, 200);
  assert.deepEqual((await changed.json() as { session: { unavailablePerformerIds: string[] } }).session.unavailablePerformerIds, ['leo']);
  const stale = await handleShowRequest(request('POST', cookie, { revision: first.revision, command: { type: 'approve' } }), environment, boundary.fetcher);
  assert.equal(stale.status, 409);
  assert.equal(boundary.documents.size, 1);
});

test('foreign-origin writes and arbitrary commands cannot mutate Sanity', async () => {
  const boundary = transport();
  const hostile = new Request('https://show.example/api/show', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' });
  assert.equal((await handleShowRequest(hostile, environment, boundary.fetcher)).status, 403);
  const opened = await handleShowRequest(request(), environment, boundary.fetcher);
  const first = await opened.json() as { revision: string }, cookie = opened.headers.get('set-cookie')!.split(';')[0];
  const invalid = await handleShowRequest(request('POST', cookie, { revision: first.revision, command: { type: 'delete', id: 'song' } }), environment, boundary.fetcher);
  assert.equal(invalid.status, 400);
  assert.equal(boundary.documents.size, 1);
  assert.equal([...boundary.documents.values()][0]._rev, first.revision);
});

test('remote failures remain visible without exposing the server token', async () => {
  const failing: typeof fetch = async () => Response.json({ error: 'Unauthorized fixture-token' }, { status: 401 });
  const response = await handleShowRequest(request(), environment, failing);
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.ok(!text.includes('fixture-token'));
  assert.ok(!text.includes('"mode":"demo"'));
});
