import { ArrowRight, Check, X, Sparkles, CircleAlert } from 'lucide-react';
import type { Catalogue, Session, Command } from '../lib/domain.ts';
import { assessSong, suggestReplacements, formatDuration } from '../lib/engine.ts';

export function ReplacementPanel({ catalogue, session, slot, busy, command, close }: { catalogue: Catalogue; session: Session; slot: number; busy: boolean; command: (command: Command) => void; close: () => void }) {
  const current = catalogue.songs.find(s => s.id === session.songIds[slot]);
  const candidates = suggestReplacements(catalogue,session,slot);
  const excluded = catalogue.songs.filter(s => !session.songIds.includes(s.id)).map(s => assessSong(catalogue,session,s.id)).filter(s => !s.ready);
  return <section className="replacement-panel"><div className="panel-heading"><span className="eyebrow">RESCUE SLOT {String(slot+1).padStart(2,'0')}</span><button className="icon-button" onClick={close} aria-label="Close replacement panel"><X size={16}/></button></div><h3>A different way through.</h3><p className="panel-description">Replacing <strong>{current?.title ?? 'a missing song'}</strong>. Every option below fits the available crew, kit, and clock.</p>
    <div className="candidate-list">{candidates.map((candidate,index) => <article className={`candidate ${index === 0 ? 'best-fit' : ''}`} key={candidate.song.id}>{index === 0 && <span className="candidate-label"><Sparkles size={11}/> CLOSEST FIT</span>}<div className="candidate-title"><h4>{candidate.song.title}</h4><span>{formatDuration(candidate.song.durationSeconds)}</span></div><div className="song-meta"><span>{candidate.song.key}</span><span>·</span><span>{candidate.song.bpm} BPM</span></div><p className="candidate-note">{candidate.song.note}</p><p className="candidate-proof"><Check size={12}/>{candidate.reason}</p><div className="candidate-footer"><span>Set becomes <strong>{formatDuration(candidate.resultingSeconds)}</strong></span><button className={index === 0 ? 'button primary small' : 'button small'} disabled={busy} onClick={() => command({type:'replace',slot,songId:candidate.song.id})} aria-label={`Use ${candidate.song.title} as replacement`}>Use song <ArrowRight size={13}/></button></div></article>)}</div>
    {!candidates.length && <div className="no-candidates"><CircleAlert size={22}/><h4>No playable replacement.</h4><p>Restore a required performer or instrument, shorten the set, or remove this slot.</p></div>}
    {excluded.length > 0 && <details className="excluded-options"><summary>Why {excluded.length} other {excluded.length === 1 ? 'song is' : 'songs are'} ruled out</summary>{excluded.map(entry => <div key={entry.id}><strong>{entry.song?.title}</strong><p>{entry.issues.join(' ')}</p></div>)}</details>}
    <p className="rules-note">Selected from your repertoire using readiness rules. You make the final call.</p>
  </section>;
}
