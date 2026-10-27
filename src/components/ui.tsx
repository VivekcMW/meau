import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Check, ChevronRight, CircleHelp, Radio, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { readAsset } from '../domain/assets';
import type { Campaign, Method } from '../domain/model';
import { useStore } from '../domain/store';

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'coral' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
}
export function Modal({ open, onClose, title, description, children, wide = false, drawer = false, className = '', onCloseAutoFocus }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean; drawer?: boolean; className?: string; onCloseAutoFocus?: (event: Event) => void }) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay" />
    <Dialog.Content className={`modal ${wide ? 'modal-wide' : ''} ${drawer ? 'modal-drawer' : ''} ${className}`} onCloseAutoFocus={onCloseAutoFocus}>
      <div className="modal-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description className={description ? 'muted' : 'sr-only'}>{description || title}</Dialog.Description></div><Dialog.Close asChild><IconButton label="Close dialog"><X size={19} /></IconButton></Dialog.Close></div>
      <div className="modal-body">{children}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}
export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div>{action}</div>;
}
export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: 'green' | 'coral' | 'amber' | 'blue' | 'neutral'; dot?: boolean }) {
  return <span className={`badge badge-${tone}`}>{dot && <span className="status-dot" />}{children}</span>;
}
export function Status({ value }: { value: string }) {
  const tone = ['Live', 'Approved', 'Paid', 'Reconciled', 'Available', 'Active', 'Matched', 'Verified'].includes(value) ? 'green'
    : ['In review', 'Awaiting offers', 'Ready to sign', 'Booked', 'Pending', 'Held'].includes(value) ? 'amber'
      : ['Rejected', 'Exception', 'Missing proof', 'Blocked'].includes(value) ? 'coral' : 'neutral';
  return <Badge tone={tone} dot>{value}</Badge>;
}
export function MethodBadge({ method = 'Measured' }: { method?: Method }) {
  return <span className={`method method-${method.toLowerCase()}`} title={`${method} · synthetic demo audience`}><Radio size={11} />{method}</span>;
}
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={24} /></span><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  return <div className="search-field"><Search size={17} /><input aria-label={label} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />{value && <IconButton label="Clear search" onClick={() => onChange('')}><X size={14} /></IconButton>}</div>;
}
export function Tabs<T extends string>({ items, value, onChange, label = 'View' }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; label?: string }) {
  return <div className="tabs" aria-label={label}>{items.map(item => <button key={item.id} className={item.id === value ? 'tab active' : 'tab'} aria-pressed={item.id === value} onClick={() => onChange(item.id)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>;
}
export function Progress({ value, label, color }: { value: number; label?: string; color?: string }) {
  return <div className="progress" role="progressbar" aria-label={label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}><span style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /></div>;
}
export function Stat({ label, value, change, note, icon, onWhy }: { label: string; value: string; change?: string; note?: string; icon?: ReactNode; variant?: number; onWhy?: () => void }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span>{onWhy ? <IconButton label={`Explain ${label}`} onClick={onWhy}><CircleHelp size={15} /></IconButton> : icon}</div><div className="stat-body"><strong>{value}</strong></div>{(change || note) && <div className="stat-foot">{change && <span className="stat-change"><ArrowUpRight size={13} />{change}</span>}{note && <span>{note}</span>}</div>}</div>;
}
export function CheckRow({ children, note }: { children: ReactNode; note?: string }) {
  return <div className="check-row"><span><Check size={14} /></span><div>{children}{note && <small>{note}</small>}</div></div>;
}
export function NextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-button" onClick={onClick}>{children}<ChevronRight size={15} /></button>;
}
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><strong>allunite <span>one</span></strong></div>;
}
export function CreativeArt({ theme = 0, className = '', small = false }: { theme?: number; className?: string; small?: boolean }) {
  const content = [
    ['NORD', 'A little more', 'outside.', 'MAKE ROOM FOR REAL LIFE'],
    ['PÃO & CO.', 'Good days', 'start here.', 'FRESHLY BAKED. EVERY DAY.'],
    ['FORMA', 'Made for', 'everyday.', 'LESS, BUT BETTER.'],
    ['VELO', 'Move with', 'the city.', 'FIND YOUR OWN PACE'],
  ][theme % 4];
  return <div className={`creative-art art-${theme % 4} ${small ? 'art-small' : ''} ${className}`} role="img" aria-label={`${content[0]} demo creative: ${content[1]} ${content[2]}`}><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-grain" /><span className="art-brand">{content[0]}</span><strong>{content[1]}<br /><em>{content[2]}</em></strong><span className="art-caption">{content[3]}</span><span className="art-arrow"><ArrowUpRight /></span></div>;
}
export function CreativeImage({ campaign, className = '' }: { campaign: Campaign; className?: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const notify = useStore(s => s.notify);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined); setFailed(false);
    if (campaign.assetId) {
      readAsset(campaign.assetId).then(blob => {
        if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      }).catch((error: unknown) => {
        if (active) { setFailed(true); notify(error instanceof Error ? error.message : 'Creative could not be loaded.', 'error'); }
      });
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [campaign.assetId, notify]);
  if (failed) return <div className="asset-error">Creative unavailable. Upload it again.</div>;
  return url ? <img className={`uploaded-creative ${className}`} src={url} alt={`${campaign.name} creative`} /> : <CreativeArt theme={campaign.theme} className={className} />;
}
export function FrameScene({ theme = 0, name = 'Demo billboard' }: { theme?: number; name?: string }) {
  return <div className={`frame-scene scene-${theme % 4}`} role="img" aria-label={`${name}, illustrated inventory preview`}><div className="scene-sky" /><div className="scene-building building-a" /><div className="scene-building building-b" /><div className="scene-building building-c" /><div className="scene-tree tree-a" /><div className="scene-tree tree-b" /><div className="scene-road" /><div className="scene-board"><CreativeArt theme={theme} small /></div><div className="scene-pole" /><span className="scene-label">LOCATION PREVIEW</span></div>;
}
