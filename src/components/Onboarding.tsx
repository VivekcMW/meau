import { ArrowLeft, ArrowRight, Check, CheckCircle2, Compass, Layers, ListTodo, Pause, Play, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appGroups, architectureApps, personaGoals } from '../domain/architecture';
import { getPersona, moduleNames } from '../domain/config';
import { canSeeCampaign } from '../domain/engine';
import { useStore } from '../domain/store';
import { useTourStore } from '../domain/tour-store';
import { appTourPersona, tourPath, tourPersona, tourSteps, tourTitle, welcomeGroups } from '../domain/tours';
import type { TourSelection, TourStep } from '../domain/tours';
import { Badge, Button, IconButton, Modal, Progress } from './ui';

export function Onboarding({ children, blocked }: { children: ReactNode; blocked: boolean }) {
  const { progress, error, chooserOpen, openChooser, closeChooser, save, launch, clearLaunch } = useTourStore();
  const w = useStore(state => state.workspace);
  const location = useLocation();
  const navigate = useNavigate();
  const [finished, setFinished] = useState(false);
  const steps = useMemo(() => progress.selection ? tourSteps(progress.selection) : [], [progress.selection]);
  const step = steps[progress.step];
  const running = progress.status === 'active' && !!progress.selection && tourPersona(progress.selection) === w.persona && !!step && location.pathname === tourPath(step);
  const main = useRef<HTMLElement>(null);
  const pendingRoute = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (location.pathname === '/' && progress.status === 'new' && !blocked) openChooser();
  }, [location.pathname, progress.status, blocked, openChooser]);
  useEffect(() => {
    if (finished && progress.selection && step && (tourPersona(progress.selection) !== w.persona || location.pathname !== tourPath(step))) setFinished(false);
  }, [finished, progress.selection, step, w.persona, location.pathname]);
  useEffect(() => {
    if (pendingRoute.current) {
      if (location.pathname === pendingRoute.current.to) pendingRoute.current = null;
      else if (location.pathname === pendingRoute.current.from) return;
      else pendingRoute.current = null;
    }
    if (progress.status === 'active' && !running) save({ ...progress, status: 'paused' });
  }, [progress, running, save, location.pathname]);

  const start = useCallback((selection: TourSelection, index = 0) => {
    const role = tourPersona(selection);
    const path = tourPath(tourSteps(selection)[index]);
    pendingRoute.current = { from: location.pathname, to: path };
    if (role !== w.persona && !useStore.getState().update(current => ({ ...current, persona: role }))) { pendingRoute.current = null; return; }
    setFinished(false);
    save({ status: 'active', selection, step: index });
    closeChooser();
    navigate(path);
  }, [w.persona, location.pathname, save, closeChooser, navigate]);
  useEffect(() => {
    if (launch) { start(launch.selection, launch.step); clearLaunch(); }
  }, [launch, start, clearLaunch]);
  function dismissWelcome() {
    if (progress.status === 'new') save({ ...progress, status: 'skipped' });
    closeChooser();
  }
  function move(index: number) {
    if (!progress.selection) return;
    pendingRoute.current = { from: location.pathname, to: tourPath(steps[index]) };
    save({ ...progress, step: index });
    navigate(tourPath(steps[index]));
  }
  function pause() {
    save({ ...progress, status: 'paused' });
    main.current?.focus({ preventScroll: true });
  }
  const resumable = progress.selection && ['active', 'paused'].includes(progress.status);
  const coachVisible = !blocked && !chooserOpen && (running || finished);
  return <>
    <div className={`workspace-body ${coachVisible ? 'tour-running' : ''}`}>
      <main id="main-content" className="page-content" tabIndex={-1} ref={main}>
        {error && !chooserOpen && !coachVisible && <div className="tour-storage-error" role="alert">{error}</div>}
        {!coachVisible && !chooserOpen && location.pathname === '/' && resumable && <section className="tour-resume" aria-label="Saved tour">
          <span className="tour-small-icon"><Compass size={21} /></span><div><strong>Continue your {tourTitle(progress.selection!)} tour</strong><p>Step {progress.step + 1} of {steps.length}. Continue where you left off.</p></div>
          <Button variant="secondary" onClick={() => openChooser()}>Change tour</Button><Button onClick={() => start(progress.selection!, progress.step)}><Play size={14} />Resume tour</Button>
        </section>}
        {children}
      </main>
      {coachVisible && progress.selection && <TourGuide selection={progress.selection} step={step} index={progress.step} total={steps.length} finished={finished} error={error}
        onBack={() => move(progress.step - 1)} onNext={() => move(progress.step + 1)} onPause={pause}
        onFinish={() => { save({ ...progress, status: 'completed' }); setFinished(true); }}
        onClose={() => { setFinished(false); main.current?.focus({ preventScroll: true }); }}
        onOpen={path => { setFinished(false); navigate(path); main.current?.focus({ preventScroll: true }); }} />}
    </div>
    <WelcomeChooser key={chooserOpen ? 'open' : 'closed'} open={chooserOpen} selection={progress.selection} onStart={start} onClose={dismissWelcome} error={error} />
  </>;
}

function WelcomeChooser({ open, selection: previous, onStart, onClose, error }: {
  open: boolean; selection: TourSelection | null; onStart: (selection: TourSelection) => void; onClose: () => void; error: string | null;
}) {
  const currentRole = useStore(state => state.workspace.persona);
  const [selection, setSelection] = useState<TourSelection>(previous || { kind: 'persona', id: currentRole });
  const preview = useRef<HTMLElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const person = getPersona(tourPersona(selection));
  const steps = tourSteps(selection);
  const app = selection.kind === 'app' ? architectureApps.find(app => app.id === selection.id) : null;
  function choose(next: TourSelection) {
    setSelection(next);
    if (window.matchMedia('(max-width: 700px)').matches) requestAnimationFrame(() => preview.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  return <Modal open={open} onClose={onClose} className="welcome-modal" title="Find your way around AllUnite One"
    description="Choose your role or an app. We will walk through the work, one short step at a time."
    onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLElement>('.tour-heading, #main-content')?.focus({ preventScroll: true })); }}>
    <div className="welcome-layout">
      <div className="welcome-choices" ref={choices}>
        <div className="welcome-modes" role="group" aria-label="Choose a tour path">
          <button aria-pressed={selection.kind === 'persona'} onClick={() => setSelection({ kind: 'persona', id: currentRole })}><Users size={20} /><span><strong>By my role</strong><small>Recommended</small></span></button>
          <button aria-pressed={selection.kind === 'app'} onClick={() => setSelection({ kind: 'app', id: 'planner', persona: appTourPersona('planner', currentRole) })}><Layers size={20} /><span><strong>By an app</strong><small>Go straight to a tool</small></span></button>
        </div>
        <div className="welcome-options" aria-label={selection.kind === 'persona' ? 'Available roles' : 'Available apps'}>
          {selection.kind === 'persona' ? welcomeGroups.map(group => <section key={group.name}><h3>{group.name}</h3><div className="welcome-option-grid">{group.people.map(id => {
            const person = getPersona(id);
            return <button className="welcome-option" key={id} aria-pressed={selection.id === id} onClick={() => choose({ kind: 'persona', id })}>
              <span className="avatar">{person.initials}</span><span><strong>{person.role}</strong><small>{person.name} · {person.tenant}</small></span>{selection.id === id && <Check size={17} />}
            </button>;
          })}</div></section>) : appGroups.map(group => <section key={group.id}><h3>{group.name}</h3><div className="welcome-option-grid">{architectureApps.filter(app => app.group === group.id).map(app => <button className="welcome-option" key={app.id} aria-pressed={selection.id === app.id} onClick={() => choose({ kind: 'app', id: app.id, persona: appTourPersona(app.id, currentRole) })}>
            <span className="welcome-app-code">{app.code}</span><span><strong>{moduleNames[app.id]}</strong><small>{app.purpose}</small></span>{selection.id === app.id && <Check size={17} />}
          </button>)}</div></section>)}
        </div>
      </div>
      <section className="welcome-preview" aria-label="Your tour preview" aria-live="polite" ref={preview}>
        <div className="welcome-preview-top"><Badge tone="green">{selection.kind === 'persona' ? 'Your role, explained' : 'A closer look at the app'}</Badge><span>{steps.length} short steps</span></div>
        <h3>{tourTitle(selection)}</h3><p className="welcome-purpose">{app ? app.purpose : personaGoals[person.id]}</p>
        <div className="welcome-identity"><span className="avatar">{person.initials}</span><span><strong>Explore as {person.name}</strong><small>{person.role} · {person.id === currentRole ? 'Current demo role' : 'Switches your demo role'}</small></span></div>
        {app && <p className="welcome-role-goal">{personaGoals[person.id]}</p>}
        <h4>What we will cover</h4>
        <ol className="welcome-outline">{steps.map((step, index) => <li key={`${step.module}-${index}`}><span>{index + 1}</span><div><strong>{selection.kind === 'persona' ? moduleNames[step.module] : step.title}</strong>{selection.kind === 'persona' && <small>{step.title}</small>}</div></li>)}</ol>
        <button className="welcome-change" onClick={() => choices.current?.scrollIntoView({ block: 'start', behavior: 'instant' })}><ArrowLeft size={14} />Change selection</button>
      </section>
    </div>
    {error && <p className="tour-storage-error" role="alert">{error}</p>}
    <div className="welcome-actions"><Button variant="ghost" onClick={onClose}>Explore without a tour</Button><Button onClick={() => onStart(selection)}>Start tour as {person.name}<ArrowRight size={17} /></Button></div>
  </Modal>;
}

function TourGuide({ selection, step, index, total, finished, error, onBack, onNext, onPause, onFinish, onClose, onOpen }: {
  selection: TourSelection; step: TourStep; index: number; total: number; finished: boolean; error: string | null;
  onBack: () => void; onNext: () => void; onPause: () => void; onFinish: () => void; onClose: () => void; onOpen: (path: string) => void;
}) {
  const w = useStore(state => state.workspace);
  const person = getPersona(tourPersona(selection));
  const [missing, setMissing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const main = useRef<HTMLElement | null>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (finished) return;
    main.current = document.getElementById('main-content');
    let highlighted: Element | null = null;
    function scrollToTarget() {
      if (!main.current || !highlighted) return;
      const pane = main.current.getBoundingClientRect();
      const bounds = highlighted.getBoundingClientRect();
      main.current.scrollTo({ top: main.current.scrollTop + bounds.top - pane.top - Math.max(12, (pane.height - bounds.height) / 2), behavior: 'instant' });
    }
    const resize = new ResizeObserver(scrollToTarget);
    if (main.current) resize.observe(main.current);
    function highlight() {
      const target = main.current?.querySelector(step.target);
      if (!target) {
        if (highlighted) { resize.unobserve(highlighted); highlighted.classList.remove('tour-highlight'); highlighted = null; setMissing(true); }
        return;
      }
      if (target === highlighted) return;
      if (highlighted) resize.unobserve(highlighted);
      highlighted?.classList.remove('tour-highlight');
      highlighted = target;
      highlighted.classList.add('tour-highlight');
      resize.observe(highlighted);
      scrollToTarget();
      setMissing(false);
    }
    highlight();
    const observer = new MutationObserver(highlight);
    if (main.current) observer.observe(main.current, { childList: true, subtree: true });
    const timeout = setTimeout(() => { if (!highlighted) setMissing(true); }, 5000);
    return () => { observer.disconnect(); resize.disconnect(); clearTimeout(timeout); highlighted?.classList.remove('tour-highlight'); setMissing(false); };
  }, [step, finished]);
  const example = person.nav.includes('campaigns') ? w.campaigns.find(campaign => canSeeCampaign(w, campaign) && (w.market === 'All' || campaign.market === w.market)) : undefined;
  const startModule = selection.kind === 'app' ? selection.id : person.id === 'planner' ? 'planner' : person.home;
  return <aside className="tour-guide" aria-label="Guided tour">
    <div className="tour-guide-top"><span><Compass size={17} />{finished ? 'Tour complete' : 'Quick walkthrough'}</span><IconButton label={finished ? 'Close tour' : 'Pause tour'} onClick={finished ? onClose : onPause}>{finished ? <X size={17} /> : <Pause size={17} />}</IconButton></div>
    <div className="tour-guide-body">
      <div className="tour-person"><span className="avatar">{person.initials}</span><div><strong>{person.name} · {person.role}</strong><small>{tourTitle(selection)} tour</small></div></div>
      {finished ? <>
        <span className="tour-complete-icon"><CheckCircle2 size={30} /></span><h2 className="tour-heading" tabIndex={-1} ref={heading}>You are ready to explore.</h2><p>You have seen how {tourTitle(selection).toLowerCase()} fits into the work. The tour has not changed your campaigns or approvals.</p>
        <p className="tour-takeaway"><ListTodo size={17} /><span>Help in the footer lets you replay this tour or choose another role or app.</span></p>
      </> : <>
        <div className="tour-progress-label"><span>Step {index + 1} of {total}</span><strong>{moduleNames[step.module]}</strong></div><Progress value={(index + 1) / total * 100} label="Tour progress" />
        <h2 className="tour-heading" tabIndex={-1} ref={heading}>{step.title}</h2><p>{step.description}</p><p className="tour-takeaway"><CheckCircle2 size={18} /><span>{step.takeaway}</span></p>
        {missing && <p className="tour-storage-error" role="status">This section is not available in the current view. Continue to the next step, or pause to explore.</p>}
      </>}
      {error && <p className="tour-storage-error" role="alert">{error}</p>}
    </div>
    <div className="tour-controls">{finished ? <>
      <Button onClick={() => onOpen(startModule === 'home' ? '/' : `/${startModule}`)}>Open {moduleNames[startModule]}<ArrowRight size={16} /></Button>
      {example && <Button variant="secondary" onClick={() => onOpen(`/campaigns/${example.id}`)}>Open an example campaign</Button>}
      <Button variant="ghost" onClick={onClose}>Explore on my own</Button>
    </> : <><div><Button variant="secondary" disabled={index === 0} onClick={onBack}><ArrowLeft size={15} />Back</Button><Button onClick={index === total - 1 ? onFinish : onNext}>{index === total - 1 ? 'Finish tour' : 'Next'}{index === total - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</Button></div><button className="tour-pause-link" onClick={onPause}>Pause and explore · resume from Help</button></>}</div>
  </aside>;
}

export function TourHelp({ onClose }: { onClose: () => void }) {
  const { progress, openChooser, requestLaunch } = useTourStore();
  const w = useStore(state => state.workspace);
  function replay(resume: boolean) {
    if (!progress.selection) return;
    onClose();
    requestLaunch(progress.selection, resume ? progress.step : 0);
  }
  return <section className="tour-help">
    <span className="tour-small-icon"><Compass size={23} /></span><div><h3>A short tour of your work</h3><p>Choose a role or an app. Each step explains what to look for and what happens next.</p></div>
    {progress.selection && <p className="tour-help-saved"><strong>{tourTitle(progress.selection)}</strong> · {getPersona(tourPersona(progress.selection)).name}{['paused', 'active'].includes(progress.status) ? ` · Step ${progress.step + 1} of ${tourSteps(progress.selection).length}` : ' · Previously explored'}</p>}
    <div className="button-row">
      {progress.selection && ['paused', 'active'].includes(progress.status) && <Button onClick={() => replay(true)}>Resume tour</Button>}
      {progress.selection && <Button variant="secondary" onClick={() => replay(false)}>Replay tour</Button>}
      <Button variant={progress.selection ? 'secondary' : 'primary'} onClick={() => { onClose(); openChooser(); }}>Choose a role or app<ArrowRight size={15} /></Button>
    </div>
    {progress.selection && tourPersona(progress.selection) !== w.persona && <p className="subtle-note">Resuming or replaying switches the demo role to {getPersona(tourPersona(progress.selection)).name}, {getPersona(tourPersona(progress.selection)).role.toLowerCase()}.</p>}
  </section>;
}
