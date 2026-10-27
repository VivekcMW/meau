import { ArrowRight, Check, ChevronRight, MessageSquare, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { assistantCampaign, assistantReply, assistantStarters } from '../domain/assistant';
import type { AssistantChoice, AssistantContext, AssistantReply, AssistantRequest } from '../domain/assistant';
import { getPersona, markets, moduleNames } from '../domain/config';
import type { ModuleId } from '../domain/model';
import { useStore } from '../domain/store';
import { Badge, IconButton, Modal } from './ui';

interface Exchange { question: string; reply: AssistantReply }

export function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const w = useStore(s => s.workspace);
  const persona = getPersona(w.persona);
  const location = useLocation();
  const navigate = useNavigate();
  const currentCampaign = assistantCampaign(w, location.pathname, location.search);
  const currentApp = (location.pathname.split('/')[1] || 'home') as ModuleId;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Exchange[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const context: AssistantContext = messages.at(-1)?.reply.context ?? { campaignId: currentCampaign?.id };
  const latest = messages.at(-1)?.reply;
  const paused = !w.agentEnabled || w.agentLevel === 'A0';

  useEffect(() => {
    if (open && messages.length) bottom.current?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest',
    });
  }, [messages, open]);

  function ask(question: string, request: AssistantRequest) {
    if (!question.trim()) return;
    const reply = assistantReply(w, request, context);
    setMessages(current => [...current, { question: question.trim(), reply }]);
    setInput('');
  }
  function choose(choice: AssistantChoice) { ask(choice.label, choice.request); }
  function reset() { setMessages([]); setInput(''); }
  const starters = [
    ...(currentCampaign ? [{ label: `What’s next for ${currentCampaign.name}?`, request: { type: 'campaign', id: currentCampaign.id } as const }] : []),
    ...assistantStarters,
  ];

  return <Modal open={open} onClose={onClose} title="Workflow assistant" description="Local guidance, shaped by your answers." drawer className="assistant-panel">
    <div className="assistant-context">
      <span className="avatar">{persona.initials}</span>
      <div><strong>{persona.name} · {persona.role}</strong><span>{w.market === 'All' ? 'All markets' : markets[w.market].country} · {moduleNames[currentApp] || 'Workspace'}</span></div>
      <Badge tone={paused ? 'amber' : 'green'}>{paused ? 'Paused' : w.agentLevel === 'A2' ? 'Drafts for review' : 'Answers only'}</Badge>
    </div>
    <div className="assistant-conversation">
      {!messages.length && <div className="assistant-intro">
        <span className="assistant-emblem"><Sparkles size={23} /></span>
        <span className="eyebrow">YOUR NEXT STEP, TOGETHER</span>
        <h3>{paused ? 'Your guide is paused.' : `What shall we move forward, ${persona.name}?`}</h3>
        <p>{paused ? 'Open Agent settings to enable local answers or drafts.' : 'Pick a starting point. I’ll ask only what helps, then show you where to go.'}</p>
        <div className="assistant-suggestions" aria-label="Conversation starters">
          {(paused ? [assistantStarters[0]] : starters).map(choice => <button key={choice.label} onClick={() => choose(choice)}>
            <MessageSquare size={16} aria-hidden="true" /><span>{paused ? 'Show assistant settings' : choice.label}</span><ChevronRight size={16} aria-hidden="true" />
          </button>)}
        </div>
      </div>}
      <div role="log" aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions">
        {messages.map(({ question, reply }, index) => <div className="assistant-exchange" key={index}>
          <div className="chat-message chat-user"><span className="chat-author">You</span><p>{question}</p></div>
          <div className="chat-message chat-assistant">
            <span className="chat-author"><Sparkles size={13} aria-hidden="true" />AllUnite · Local guide</span>
            <h3>{reply.title}</h3><p>{reply.text}</p>
            {reply.facts && <dl className="assistant-facts">{reply.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
            {reply.link && <button className="button button-primary assistant-next" onClick={() => { navigate(reply.link!.to, { state: reply.link!.state }); onClose(); }}>
              {reply.link.label}<ArrowRight size={15} aria-hidden="true" />
            </button>}
          </div>
        </div>)}
      </div>
      {latest && latest.choices.length > 0 && <div className="assistant-followups" aria-label="Suggested replies">
        <span className="eyebrow">WHERE WOULD YOU LIKE TO GO NEXT?</span>
        <div>{latest.choices.map(choice => <button key={choice.label} onClick={() => choose(choice)}>{choice.label}<ArrowRight size={13} aria-hidden="true" /></button>)}</div>
      </div>}
      <div ref={bottom} />
    </div>
    <div className="assistant-composer">
      {messages.length > 0 && <button className="text-button assistant-reset" onClick={reset}><RotateCcw size={13} />Start a new conversation</button>}
      <form className="assistant-input" onSubmit={event => { event.preventDefault(); ask(input, { type: 'message', text: input }); }}>
        <label className="sr-only" htmlFor="assistant-question">Ask assistant</label>
        <input id="assistant-question" value={input} onChange={event => setInput(event.target.value)} placeholder={latest?.context.topic === 'planning' ? 'Your goal, a city, or a follow-up…' : 'Ask a question or name a campaign…'} autoComplete="off" />
        <IconButton label="Send message" type="submit" disabled={!input.trim()}><Send size={17} /></IconButton>
      </form>
      <p className="assistant-disclaimer"><Check size={12} aria-hidden="true" />Local demo · No live AI. Actions stay yours to review.</p>
    </div>
  </Modal>;
}
