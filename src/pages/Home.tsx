import { ArrowRight, ArrowUpRight, CheckCheck, Layers, ListTodo, Plus, Radio } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compact, dateLabel, getPersona, markets } from '../domain/config';
import { canSeeCampaign, metrics, nextStep, workspaceTasks } from '../domain/engine';
import { useStore } from '../domain/store';
import { Badge, Button, EmptyState, Modal, NextLink, PageHeader, Progress, SectionHeading, Stat, Status } from '../components/ui';

export function HomePage() {
  const w = useStore(s => s.workspace);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [why, setWhy] = useState(false);
  const persona = getPersona(w.persona);
  const campaigns = w.campaigns.filter(c => canSeeCampaign(w, c) && (w.market === 'All' || c.market === w.market));
  const tasks = workspaceTasks(w);
  const active = campaigns.filter(c => c.stage === 'Live');
  const drafts = campaigns.filter(c => c.stage === 'Draft');
  const impressions = campaigns.reduce((total, c) => total + metrics(c).delivered, 0);
  const activity = campaigns.flatMap(c => c.events.map(event => ({ ...event, campaign: c.name, campaignId: c.id })))
    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const canPlan = persona.nav.includes('planner');
  const canBook = w.persona === 'advertiser';
  const recent = [...campaigns].sort((a, b) => {
    const lastUpdate = (c: typeof a) => c.events.reduce((latest, event) => event.at > latest ? event.at : latest, '');
    return lastUpdate(b).localeCompare(lastUpdate(a));
  }).slice(0, 5);

  return <>
    <PageHeader title="Overview" subtitle={`${persona.name} / ${persona.role} / ${w.market === 'All' ? 'All markets' : markets[w.market].country}`}
      actions={canPlan ? <Button onClick={() => navigate('/planner')}><Plus size={16} />New campaign</Button>
        : canBook ? <Button onClick={() => navigate('/marketplace')}><Plus size={16} />Book locations</Button>
          : <Button onClick={() => navigate('/tasks')}><ListTodo size={16} />View my tasks</Button>} />

    <div className="stat-grid">
      <Stat label="Needs your action" value={String(tasks.length)} note="Assigned to your current role" icon={<ListTodo size={17} />} />
      <Stat label="Live campaigns" value={String(active.length)} note={`${campaigns.length} campaigns in this view`} icon={<Layers size={17} />} />
      <Stat label="Draft campaigns" value={String(drafts.length)} note="Not yet booked" icon={<Layers size={17} />} />
      <Stat label="Delivered impressions" value={compact(impressions)} note="Full demo flights, not a date-filtered total" icon={<Radio size={17} />} onWhy={() => setWhy(true)} />
    </div>

    <div className="overview-work-grid">
      <section className="panel overview-tasks" aria-labelledby="overview-tasks-title">
        <SectionHeading title="Needs your action" subtitle="Open a campaign to review the next step." action={<Badge tone={tasks.length ? 'amber' : 'green'}>{tasks.length} pending</Badge>} />
        <h2 id="overview-tasks-title" className="sr-only">Your assigned work</h2>
        {tasks.length ? <div className="overview-task-list">{tasks.slice(0, 4).map(c => {
          const step = nextStep(c, w.config);
          return <Link key={c.id} className="overview-task" to={`/campaigns/${c.id}`}>
            <span className="overview-task-icon"><ListTodo size={18} /></span>
            <div><strong>{step.label}</strong><span>{c.name}</span><small>{c.id} / {markets[c.market].city}{step.owner ? ` / ${step.owner}` : ''}</small></div>
            <span className="overview-task-status"><Status value={c.stage} /><span>Review<ArrowRight size={14} /></span></span>
          </Link>;
        })}</div> : <div className="overview-caught-up"><CheckCheck size={24} /><h3>No actions assigned to you</h3><p>Other people may still have work in progress. See all handoffs in My tasks.</p></div>}
        <NextLink onClick={() => navigate('/tasks')}>View all tasks</NextLink>
      </section>

      <section className="panel overview-activity" aria-labelledby="overview-activity-title">
        <SectionHeading title="Recent activity" subtitle="Latest recorded changes in this view." />
        <h2 id="overview-activity-title" className="sr-only">Recent campaign activity</h2>
        {activity.length ? <ol>{activity.map(event => <li key={`${event.campaignId}-${event.id}`}>
          <span className="overview-activity-dot" />
          <Link to={`/campaigns/${event.campaignId}?tab=activity`}><strong>{event.text}</strong><span>{event.campaign}</span><small>{event.actor} / {dateLabel(event.at)}</small></Link>
        </li>)}</ol> : <p className="muted">Campaign updates will appear here when work is recorded.</p>}
      </section>
    </div>

    {canPlan && <form className="overview-brief" onSubmit={event => { event.preventDefault(); navigate('/planner', { state: { prompt } }); }}>
      <div><label htmlFor="quick-campaign-idea">Start a campaign brief</label><p>Describe the audience and location. Review the plan before booking.</p></div>
      <input id="quick-campaign-idea" className="input" placeholder="e.g. Reach commuters in Copenhagen for a store launch" value={prompt} onChange={event => setPrompt(event.target.value)} />
      <Button variant="secondary" type="submit">Build a plan<ArrowRight size={15} /></Button>
    </form>}

    <section className="panel overview-campaigns" aria-labelledby="overview-campaigns-title">
      <SectionHeading title="Recent campaigns" subtitle="Most recently updated in the selected market." action={<NextLink onClick={() => navigate('/campaigns')}>All campaigns</NextLink>} />
      <h2 id="overview-campaigns-title" className="sr-only">Campaign status and delivery</h2>
      {!recent.length ? <EmptyState title="No campaigns in this market" description="Choose another market in the header to see your campaigns." /> : <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Campaign</th><th>Status</th><th>Market & flight</th><th>Delivery</th><th><span className="sr-only">Open campaign</span></th></tr></thead>
        <tbody>{recent.map(c => {
          const stats = metrics(c);
          return <tr key={c.id}><td><Link className="overview-campaign-name" to={`/campaigns/${c.id}`}><strong>{c.name}</strong><small>{c.id} / {c.client}</small></Link></td>
            <td><Status value={c.stage} /></td><td><strong className="table-main">{markets[c.market].city}</strong><small>{dateLabel(c.start)} - {dateLabel(c.end)}</small></td>
            <td><div className="table-delivery"><span>{compact(stats.delivered)}<small> / {compact(stats.forecast)} forecast</small></span><Progress value={stats.forecast ? stats.delivered / stats.forecast * 100 : 0} label={`${c.name} delivered audience`} /></div></td>
            <td><Link className="icon-button" aria-label={`Open ${c.name}`} to={`/campaigns/${c.id}`}><ArrowUpRight size={16} /></Link></td></tr>;
        })}</tbody>
      </table></div>}
      <p className="subtle-note">Synthetic campaign data. Delivery evidence is shared with Reports and Finance.</p>
    </section>

    <Modal open={why} onClose={() => setWhy(false)} title="Delivered impressions" description="Totals from the campaign delivery records in your current market view.">
      <div className="explanation-number">{compact(impressions)}<Badge>Demo data</Badge></div>
      <div className="detail-list"><div><span>Source</span><strong>Measure / synthetic fixture data</strong></div><div><span>Campaigns</span><strong>{campaigns.length}</strong></div><div><span>Digital</span><strong>Simulated confirmed plays</strong></div><div><span>Static</span><strong>Accepted posting proof required</strong></div><div><span>Coverage</span><strong>Full demo flight totals</strong></div></div>
      <p className="subtle-note">This is not a live feed. No weekly or monthly allocation is applied to this total.</p>
    </Modal>
  </>;
}
