'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Scissors, ListMusic, Library, Braces, ArrowUpRight, RotateCcw, MapPin, Clock3, CalendarDays, ArrowRight, Check, CircleAlert, Printer, X, Radio, LoaderCircle, ChevronRight, CheckCheck } from 'lucide-react';
import type { Catalogue, Command, ShowPayload } from '../lib/domain.ts';
import { catalogue as originalCatalogue } from '../lib/seed.ts';
import { assessSet, applyCommand, formatDuration, newSession, restoreSession } from '../lib/engine.ts';
import { SetlistBoard } from './setlist-board';
import { CrewPanel } from './crew-panel';
import { ReplacementPanel } from './replacement-panel';
import { Repertoire, BuildNotes } from './secondary-views';

const STORAGE_KEY = 'setlist-surgery:show:v1';
type View = 'desk' | 'repertoire' | 'notes';

export default function ShowDesk() {
  const [data,setData] = useState<ShowPayload>({ catalogue: originalCatalogue, session: newSession(originalCatalogue), mode: 'demo' });
  const [view,setView] = useState<View>('desk'), [selected,setSelected] = useState<number | null>(null);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [toast,setToast] = useState(''), [storageWarning,setStorageWarning] = useState('');
  const busyRef = useRef(false), generation = useRef(0), initialized = useRef(false);
  const dataRef = useRef(data); dataRef.current = data;
  const { catalogue,session,mode } = data, assessment = assessSet(catalogue,session);
  const blocked = assessment.songs.filter(s => !s.ready);

  const refresh = useCallback(async (initial = false) => {
    const version = generation.current;
    if (initial) { setLoading(true); setError(''); }
    try {
      const response = await fetch('/api/show', { cache:'no-store' }), payload = await response.json() as ShowPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'The show could not be loaded.');
      if (version !== generation.current) return;
      const next = payload as ShowPayload;
      if (initial && next.mode === 'demo') {
        try { const saved = sessionStorage.getItem(STORAGE_KEY); if (saved) next.session = restoreSession(JSON.parse(saved),next.catalogue); }
        catch { setStorageWarning('Device storage could not be restored. A fresh demo is open.'); }
      }
      setData(next); setError(''); initialized.current = true;
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Could not connect to the show.'); }
    finally { if (initial) setLoading(false); }
  },[]);

  useEffect(() => { void refresh(true); },[refresh]);
  useEffect(() => {
    if (mode !== 'sanity' || !initialized.current) return;
    const timer = window.setInterval(() => { if (!busyRef.current) void refresh(); },15000);
    return () => window.clearInterval(timer);
  },[mode,refresh]);
  useEffect(() => {
    if (mode !== 'demo' || !initialized.current || loading) return;
    try { sessionStorage.setItem(STORAGE_KEY,JSON.stringify(session)); }
    catch { setStorageWarning('Device storage is unavailable. Changes last for this visit only.'); }
  },[session,mode,loading]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''),5500); return () => window.clearTimeout(timer); },[toast]);

  async function command(input: Command) {
    if (busyRef.current || loading) return;
    busyRef.current = true; setBusy(true); generation.current++; setError('');
    try {
      const current = dataRef.current;
      let next: ShowPayload;
      if (current.mode === 'demo') next = { ...current,session:applyCommand(current.catalogue,current.session,input) };
      else {
        const response = await fetch('/api/show', { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:input,revision:current.revision}) });
        const result = await response.json() as ShowPayload & { error?: string };
        if (!response.ok) { if (response.status === 409) await refresh(); throw new Error(result.error ?? 'This change could not be saved.'); }
        next = result;
      }
      setData(next); dataRef.current = next;
      setToast(input.type === 'reset' ? 'Original show restored.' : next.session.history[0]?.text ?? 'Show updated.');
      if (['replace','remove','reset','move'].includes(input.type)) setSelected(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'This change could not be saved.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function switchView(next: View) { setView(next); setSelected(null); }
  const scenario = () => { const bassist = catalogue.performers.find(p => p.role.toLowerCase() === 'bass'); if (bassist) void command({type:'performer',id:bassist.id,available:false}); };
  const bassistUnavailable = catalogue.performers.some(p => p.role.toLowerCase() === 'bass' && (!p.available || session.unavailablePerformerIds.includes(p.id)));
  const date = new Date(`${catalogue.show.date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit'});
  const available = catalogue.performers.filter(p => p.available && !session.unavailablePerformerIds.includes(p.id)).length;
  const disabled = busy || loading || (!initialized.current && !!error);

  return <div className="app-shell">
    <aside className="sidebar no-print"><a className="brand" href="/" aria-label="Setlist Surgery home"><span className="brand-mark"><Scissors size={23}/></span><span>setlist<span>surgery.</span></span></a><span className="sidebar-kicker">KEEP THE NIGHT ALIVE</span>
      <nav aria-label="Workspace"><button aria-label="Show desk" className={view === 'desk' ? 'active' : ''} onClick={() => switchView('desk')}><ListMusic size={18}/><span>Show desk</span><span className="nav-count">01</span></button><button aria-label="Repertoire" className={view === 'repertoire' ? 'active' : ''} onClick={() => switchView('repertoire')}><Library size={18}/><span>Repertoire</span><span className="nav-count">{catalogue.songs.length}</span></button><button aria-label="Behind the desk" className={view === 'notes' ? 'active' : ''} onClick={() => switchView('notes')}><Braces size={18}/><span>Behind the desk</span></button></nav>
      <div className="sidebar-show"><span className="eyebrow">YOUR NEXT SHOW</span><span className="mini-show-date">{date.toUpperCase()}</span><strong>{catalogue.venue.name}</strong><span>{catalogue.show.band}</span><div className="mini-show-line"/><span className="sidebar-show-status"><span className={`status-dot ${assessment.stage === 'approved' ? 'green' : ''}`}/>{assessment.stage === 'approved' ? 'Ready for the stage' : 'In preparation'}</span></div>
      <div className="sidebar-bottom"><a href="https://www.sanity.io/" target="_blank" rel="noreferrer">Built on <strong>Sanity</strong><ArrowUpRight size={13}/></a><span>Original demo band · v1.0</span></div>
    </aside>
    <div className="workspace"><header className="topbar no-print"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={12}/><strong>{view === 'desk' ? 'Show desk' : view === 'repertoire' ? 'Repertoire' : 'Behind the desk'}</strong></div><div className="topbar-right"><span className={`connection-label ${mode === 'sanity' ? 'live' : ''}`}><span className="status-dot"/>{loading ? 'Connecting…' : mode === 'sanity' ? 'Sanity connected' : 'Local demo'}</span><span className="band-avatar">SL</span></div></header>
      <main id="main-content">
        {error && <div className="error-banner no-print" role="alert"><CircleAlert size={18}/><div><strong>{initialized.current ? 'The change needs attention' : 'Could not connect to the show'}</strong><p>{error}</p></div><button className="button small" disabled={busy || loading} onClick={() => void refresh(!initialized.current)}>Refresh show</button></div>}
        {storageWarning && <div className="storage-warning no-print">{storageWarning}</div>}
        {view === 'desk' && <>
          <div className="show-intro no-print"><div><span className="eyebrow"><Radio size={13}/> SHOW CONTROL / {catalogue.show.title.toUpperCase()}</span><h1>The show goes on<span className="title-period">.</span></h1><p>Keep the good songs. Find a way through the rest.</p></div><button className="button subtle reset-button" disabled={disabled} onClick={() => void command({type:'reset'})}><RotateCcw size={14}/> Reset {mode === 'demo' ? 'demo' : 'show'}</button></div>
          <section className="show-ticket no-print" aria-label="Show details"><div className="ticket-date"><strong>{date.split(' ')[1]}</strong><span>{date.split(' ')[0].toUpperCase()}</span></div><div className="ticket-band"><span className="eyebrow">TONIGHT ON STAGE</span><h2>{catalogue.show.band}</h2><div className="ticket-metadata"><span><MapPin size={13}/>{catalogue.venue.name}</span><span><CalendarDays size={13}/>{new Date(`${catalogue.show.date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span><span><Clock3 size={13}/>{catalogue.show.startTime}</span></div></div><div className="ticket-stat"><span>SET LENGTH</span><strong>{formatDuration(assessment.durationSeconds)}<small> / {formatDuration(catalogue.venue.maxDurationSeconds)}</small></strong><span className={assessment.durationSeconds <= catalogue.venue.maxDurationSeconds ? 'spare-time' : 'danger-text'}>{assessment.durationSeconds <= catalogue.venue.maxDurationSeconds ? `${formatDuration(catalogue.venue.maxDurationSeconds-assessment.durationSeconds)} breathing room` : 'Over the venue limit'}</span></div></section>
          {!bassistUnavailable && <div className="scenario-strip no-print"><span className="scenario-icon"><Scissors size={17}/></span><div><strong>Plans change. Your set can too.</strong><span>Try the demo curveball: your bassist just cancelled.</span></div><button className="button small" disabled={disabled} onClick={scenario}>Bassist cancelled <ArrowRight size={14}/></button></div>}
          <div className="desk-grid no-print"><div className="desk-main"><SetlistBoard catalogue={catalogue} session={session} assessment={assessment} selected={selected} busy={disabled} select={setSelected} command={input => void command(input)}/>
            <section className={`review-panel ${assessment.stage === 'approved' ? 'is-approved' : ''}`}><div className="review-stages">{(['draft','rehearsal','approved'] as const).map((stage,index) => <div className={assessment.stage === stage ? 'current' : ''} key={stage}><span>{assessment.stage === 'approved' || (assessment.stage === 'rehearsal' && index === 0) ? <Check size={11}/> : `0${index+1}`}</span><strong>{stage === 'rehearsal' ? 'Rehearsal check' : stage === 'approved' ? 'Approved' : 'Draft'}</strong>{index < 2 && <i/>}</div>)}</div><div className="review-bottom"><div><strong>{assessment.stage === 'approved' ? 'Signed off. Ready for the stage.' : assessment.stage === 'rehearsal' ? 'All checks passed. Your call.' : assessment.ready ? 'A playable set. Give it one last check.' : 'A few loose ends before the first note.'}</strong><p>{assessment.stage === 'approved' ? 'Any change will reopen the review.' : assessment.ready ? 'Crew, kit, rehearsal, and timing are accounted for.' : `${blocked.length} affected ${blocked.length === 1 ? 'song needs' : 'songs need'} attention${assessment.issues.length ? '; check the set issues too' : ''}.`}</p></div>{assessment.stage === 'approved' ? <button className="button primary" onClick={() => window.print()}><Printer size={15}/> Print setlist</button> : <button className="button primary" disabled={disabled || !assessment.ready} title={!assessment.ready ? 'Resolve all readiness issues first' : undefined} onClick={() => void command({type:assessment.stage === 'rehearsal' ? 'approve' : 'rehearse'})}>{busy ? <LoaderCircle size={15} className="spin"/> : assessment.stage === 'rehearsal' ? <CheckCheck size={15}/> : <Check size={15}/>} {assessment.stage === 'rehearsal' ? 'Approve set' : 'Check rehearsal'}</button>}</div></section>
            <details className="activity-log"><summary>Show notes <span>{session.history.length ? `${session.history.length} changes` : 'No changes yet'}</span></summary>{session.history.length ? session.history.map(event => <div key={event.id}><span>{new Date(event.at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span><p>{event.text}</p></div>) : <p>Your decisions will appear here as you make them.</p>}</details>
          </div><aside className="rescue-column"><CrewPanel catalogue={catalogue} session={session} busy={disabled} command={input => void command(input)}/>{selected !== null && session.songIds[selected] ? <ReplacementPanel catalogue={catalogue} session={session} slot={selected} busy={disabled} command={input => void command(input)} close={() => setSelected(null)}/> : <section className={`readiness-card ${assessment.ready ? 'ready' : ''}`}><span className="readiness-icon">{assessment.ready ? <Check size={21}/> : <CircleAlert size={21}/>}</span><span className="eyebrow">THE READINESS CHECK</span><h3>{assessment.ready ? 'All parts accounted for.' : 'A change calls for a new plan.'}</h3><p>{assessment.ready ? `${available} performers available. Every song has its crew and kit, and the set fits the clock.` : 'Follow the affected songs to see what is missing and find a playable replacement.'}</p>{blocked.length > 0 && <button className="text-button" disabled={disabled} onClick={() => setSelected(assessment.songs.findIndex(s => !s.ready))}>Rescue the first song <ArrowRight size={14}/></button>}<div className="readiness-lines"><span><Check size={12}/> References checked</span><span><Check size={12}/> Rehearsal checked</span><span><Check size={12}/> Changeovers included</span></div></section>}</aside></div>
        </>}
        {view === 'repertoire' && <div className="no-print"><Repertoire catalogue={catalogue} session={session} busy={disabled} command={input => void command(input)}/></div>}
        {view === 'notes' && <div className="no-print"><BuildNotes mode={mode} projectId={data.projectId}/></div>}
        <footer className="workspace-footer no-print"><span><span className="status-dot"/>{loading ? 'Opening the show…' : mode === 'sanity' ? busy ? 'Saving to Sanity…' : 'Changes saved to Sanity' : 'Demo changes stay in this tab'}</span><span>Make the next note count.</span></footer>
        <section className="print-sheet"><span className="eyebrow">SETLIST SURGERY / {assessment.stage.toUpperCase()}</span><h1>{catalogue.show.band}</h1><p>{catalogue.venue.name} · {catalogue.show.date} · {catalogue.show.startTime}</p><ol>{assessment.songs.map((entry,index) => <li key={`${entry.id}-${index}`}><strong>{entry.song?.title ?? 'Missing song'}</strong><span>{entry.song?.key} · {formatDuration(entry.song?.durationSeconds ?? 0)}</span>{!entry.ready && <small>{entry.issues.join(' ')}</small>}</li>)}</ol><p>Total: {formatDuration(assessment.durationSeconds)} including changeovers · {assessment.stage === 'approved' ? 'Approved for the stage' : 'DRAFT — NOT APPROVED'}</p></section>
      </main>
    </div>
    {toast && <div className="toast no-print" role="status"><Check size={16}/><span>{toast}</span><button aria-label="Dismiss notification" className="icon-button" onClick={() => setToast('')}><X size={14}/></button></div>}
    <div className="sr-only" aria-live="polite">{blocked.length} songs need attention. Stage: {assessment.stage}.</div>
  </div>;
}
