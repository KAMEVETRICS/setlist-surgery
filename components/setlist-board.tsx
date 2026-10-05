import { ArrowDown, ArrowUp, ArrowRightLeft, Check, CircleAlert, Trash2, Music2 } from 'lucide-react';
import type { Catalogue, Command, Session, SetAssessment } from '../lib/domain.ts';
import { formatDuration } from '../lib/engine.ts';

type Props = { catalogue: Catalogue; session: Session; assessment: SetAssessment; selected: number | null; busy: boolean; select: (slot: number) => void; command: (command: Command) => void };
export function SetlistBoard({ catalogue, session, assessment, selected, busy, select, command }: Props) {
  const playable = assessment.songs.filter(s => s.ready).length;
  return <section className="setlist-panel" aria-labelledby="running-order-title">
    <div className="section-heading"><div><span className="eyebrow">THE RUNNING ORDER</span><h2 id="running-order-title">Make every song count.</h2></div><span className={`status-pill ${assessment.ready ? 'good' : 'danger'}`}>{playable}/{session.songIds.length} playable</span></div>
    <div className="timeline" aria-label="Set timeline">
      <div className="timeline-track">{assessment.songs.map((entry,index) => <button key={`${entry.id}-${index}`} disabled={busy} style={{ flexGrow: entry.song?.durationSeconds ?? 1 }} className={`${entry.ready ? '' : 'blocked'} ${selected === index ? 'selected' : ''}`} onClick={() => select(index)} aria-label={`Inspect slot ${index+1}: ${entry.song?.title ?? 'Missing song'}`} title={`${entry.song?.title ?? 'Missing song'} · ${formatDuration(entry.song?.durationSeconds ?? 0)}`}><span>{String(index+1).padStart(2,'0')}</span></button>)}</div>
      <div className="timeline-labels"><span>FIRST NOTE</span><span>{formatDuration(assessment.durationSeconds)} / {formatDuration(catalogue.venue.maxDurationSeconds)}</span><span>CURFEW</span></div>
    </div>
    <div className="setlist-labels"><span>SLOT</span><span>SONG / ARRANGEMENT</span><span>TIME</span><span className="actions-label">ACTIONS</span></div>
    <div className="song-list">{assessment.songs.map((entry,index) => {
      const song = entry.song;
      return <div className={`song-row ${entry.ready ? '' : 'needs-work'} ${selected === index ? 'is-selected' : ''}`} key={`${entry.id}-${index}`}>
        <div className="slot-number">{String(index+1).padStart(2,'0')}</div>
        <div className="song-info"><button className="song-name" onClick={() => select(index)} disabled={busy}>{song?.title ?? 'Missing song'}{entry.ready ? <Check size={14} className="ready-icon"/> : <CircleAlert size={15} className="warning-icon"/>}</button>
          <div className="song-meta"><span>{song?.key ?? 'Unknown key'}</span><span className="meta-dot">·</span><span>{song?.bpm ?? '—'} BPM</span><span className="energy" aria-label={`Energy ${song?.energy ?? 0} out of 5`}>{[1,2,3,4,5].map(level => <i key={level} className={level <= (song?.energy ?? 0) ? 'filled' : ''}/>)}</span></div>
          {!entry.ready && <p className="row-issue">{entry.issues.join(' ')}</p>}
        </div>
        <span className="song-time">{formatDuration(song?.durationSeconds ?? 0)}</span>
        <div className="song-actions"><button className={`swap-button ${entry.ready ? '' : 'urgent'}`} disabled={busy} onClick={() => select(index)} aria-label={`Find replacement for ${song?.title ?? 'missing song'}`}><ArrowRightLeft size={14}/><span>Swap</span></button><div className="move-actions"><button className="icon-button" title="Move up" aria-label={`Move ${song?.title ?? 'song'} up`} disabled={busy || index === 0} onClick={() => command({ type:'move',slot:index,direction:-1 })}><ArrowUp size={13}/></button><button className="icon-button" title="Move down" aria-label={`Move ${song?.title ?? 'song'} down`} disabled={busy || index === session.songIds.length-1} onClick={() => command({ type:'move',slot:index,direction:1 })}><ArrowDown size={13}/></button></div><button className="icon-button remove-song" title="Remove song" aria-label={`Remove ${song?.title ?? 'song'}`} disabled={busy} onClick={() => command({ type:'remove',slot:index })}><Trash2 size={13}/></button></div>
      </div>;
    })}</div>
    {!session.songIds.length && <div className="empty-state"><Music2 size={28}/><h3>A blank stage.</h3><p>Add songs from the repertoire to build a new running order.</p></div>}
    <div className="setlist-total"><span>{session.songIds.length} songs <span className="muted">+ {Math.max(0,session.songIds.length-1)} changeovers at {catalogue.venue.changeoverSeconds}s</span></span><strong>{formatDuration(assessment.durationSeconds)}</strong></div>
    {assessment.issues.length > 0 && <div className="set-issues" role="status">{assessment.issues.map(issue => <p key={issue}><CircleAlert size={14}/>{issue}</p>)}</div>}
  </section>;
}
