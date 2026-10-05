import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogue, initialSession } from '../lib/seed.ts';
import { assessSet, assessSong, suggestReplacements, applyCommand, restoreSession } from '../lib/engine.ts';

const fresh = () => structuredClone(initialSession);

// These checks catch missing dependency checks and incorrectly counted changeovers.
test('bassist cancellation blocks exactly the songs that require Leo', () => {
  const state = applyCommand(catalogue, fresh(), { type: 'performer', id: 'leo', available: false });
  assert.deepEqual(assessSet(catalogue, state).songs.filter(s => !s.ready).map(s => s.id), ['night-drive', 'static-bloom', 'neon-weather']);
  assert.match(assessSong(catalogue, state, 'night-drive').issues.join(' '), /Leo/);
  assert.equal(assessSong(catalogue, state, 'paper-satellites').ready, true);
});

test('runtime includes five changeovers for six songs', () => {
  assert.equal(assessSet(catalogue, fresh()).durationSeconds, 1880);
  assert.equal(assessSet(catalogue, { ...fresh(), songIds: ['night-drive'] }).durationSeconds, 270);
  assert.equal(assessSet(catalogue, { ...fresh(), songIds: [] }).durationSeconds, 0);
});

test('missing performer and instrument references fail closed', () => {
  const changed = structuredClone(catalogue);
  changed.songs[0].performerIds.push('missing-person');
  changed.songs[0].instrumentIds.push('missing-gear');
  const result = assessSong(changed, fresh(), 'night-drive');
  assert.equal(result.ready, false);
  assert.equal(result.issues.length, 2);
});

test('replacement candidates exclude unavailable, unrehearsed, duplicate and broken gear songs', () => {
  const state = applyCommand(catalogue, fresh(), { type: 'performer', id: 'leo', available: false });
  const suggestions = suggestReplacements(catalogue, state, 0);
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions.every(s => !state.songIds.includes(s.song.id)));
  assert.ok(suggestions.every(s => s.song.rehearsed && !s.song.performerIds.includes('leo')));
  assert.ok(!suggestions.some(s => s.song.id === 'borrowed-moon'));
  assert.ok(suggestions.every(s => s.resultingSeconds <= catalogue.venue.maxDurationSeconds));
});

test('a candidate that would exceed the venue time limit is excluded', () => {
  const changed = structuredClone(catalogue);
  changed.venue.maxDurationSeconds = 1800;
  const options = suggestReplacements(changed, fresh(), 0);
  assert.ok(options.every(s => s.resultingSeconds <= 1800));
  assert.ok(!options.some(s => s.song.id === 'slow-motion'));
});

test('empty, duplicate and unknown song sets cannot be approved', () => {
  for (const ids of [[], ['night-drive', 'night-drive'], ['missing-song']]) {
    assert.equal(assessSet(catalogue, { ...fresh(), songIds: ids }).ready, false);
  }
});

test('approval requires rehearsal and edits return the set to draft', () => {
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'approve' }), /rehearsal/i);
  const checked = applyCommand(catalogue, fresh(), { type: 'rehearse' });
  const approved = applyCommand(catalogue, checked, { type: 'approve' });
  assert.equal(assessSet(catalogue, approved).stage, 'approved');
  const edited = applyCommand(catalogue, approved, { type: 'performer', id: 'leo', available: false });
  assert.equal(edited.stage, 'draft');
  assert.equal(edited.approval, undefined);
  assert.throws(() => applyCommand(catalogue, edited, { type: 'rehearse' }), /resolve/i);
});

test('a source rehearsal change invalidates a saved approval', () => {
  const approved = applyCommand(catalogue, applyCommand(catalogue, fresh(), { type: 'rehearse' }), { type: 'approve' });
  const changed = structuredClone(catalogue);
  changed.songs[0].rehearsed = false;
  assert.equal(assessSet(changed, approved).stage, 'draft');
  assert.equal(assessSet(changed, approved).ready, false);
});

test('replacement cannot insert duplicates or an unavailable song', () => {
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'replace', slot: 0, songId: 'paper-satellites' }), /already/i);
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'replace', slot: 0, songId: 'velvet-radio' }), /rehears/i);
});

test('a complete rescue can be approved and leaves the input unchanged', () => {
  const original = fresh();
  let state = applyCommand(catalogue, original, { type: 'performer', id: 'leo', available: false });
  for (const slot of [0, 2, 4]) {
    const choice = suggestReplacements(catalogue, state, slot)[0];
    assert.ok(choice);
    state = applyCommand(catalogue, state, { type: 'replace', slot, songId: choice.song.id });
  }
  assert.equal(assessSet(catalogue, state).ready, true);
  state = applyCommand(catalogue, state, { type: 'rehearse' });
  state = applyCommand(catalogue, state, { type: 'approve' });
  assert.equal(assessSet(catalogue, state).stage, 'approved');
  assert.equal(original.unavailablePerformerIds.length, 0);
});

test('corrupt local storage safely restores the original session', () => {
  for (const value of [null, 4, { songIds: 'wrong' }, { ...fresh(), stage: 'invented' }, { ...fresh(), songIds: ['unknown'] }]) {
    assert.deepEqual(restoreSession(value, catalogue).songIds, initialSession.songIds);
  }
});

test('unknown commands and invalid slots are rejected', () => {
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'delete-project' } as never), /unknown/i);
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'remove', slot: -1 }), /slot/i);
  assert.throws(() => applyCommand(catalogue, fresh(), { type: 'performer', id: 'unknown', available: false }), /unknown/i);
});
