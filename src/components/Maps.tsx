import { feature } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';
import world from 'world-atlas/countries-110m.json';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { markets } from '../domain/config';
import { frames } from '../domain/fixtures';
import type { Frame, MarketKey } from '../domain/model';
import { IconButton } from './ui';

const project = geoPath(geoEquirectangular().scale(1000 / (2 * Math.PI)).translate([500, 250]));
const countryShapes = feature(world, world.objects.countries).features.map(country => project(country) || '');
export function WorldMap({ onSelect, active }: { onSelect: (market: MarketKey) => void; active?: MarketKey | 'All' }) {
  return <div className="world-map"><svg viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true" className="world-land"><g>{countryShapes.map((path, index) => <path d={path} key={index} />)}</g><path className="map-connection" d="M 534 95 Q 320 45 294 314 M 534 95 Q 755 10 920 344 M 295 314 Q 275 160 294 137" /></svg><div className="world-pins">{Object.values(markets).map((market, index) => <button key={market.key} className={`world-pin ${active === market.key ? 'selected' : ''} ${index < 2 ? 'major-pin' : ''}`} style={{ left: `${(market.lng + 180) / 360 * 100}%`, top: `${(90 - market.lat) / 180 * 100}%` }} onClick={() => onSelect(market.key)} aria-label={`Explore ${market.city}, ${frames.filter(f => f.market === market.key).length} frames`}><span className="pin-ring" /><span className="pin-core" /><span className="world-pin-label">{market.city}<small>50 frames</small></span></button>)}</div><div className="map-credit">Natural Earth · Demo network</div></div>;
}
export function InventoryMap({ items, selected = [], onSelect, active, market = 'DK', compact = false }: { items: Frame[]; selected?: string[]; onSelect: (frame: Frame) => void; active?: string; market?: MarketKey; compact?: boolean }) {
  const blocksId = useId().replaceAll(':', '');
  const [zoom, setZoom] = useState(1);
  const countById = useMemo(() => new Map(items.map((f, i) => [f.id, i + 1])), [items]);
  return <div className={`inventory-map ${compact ? 'map-compact' : ''}`}>
    <div className="city-map-content" style={{ transform: `scale(${zoom})` }}>
      <svg viewBox="0 0 900 650" preserveAspectRatio="xMidYMid slice" className="city-basemap" aria-hidden="true">
        <defs><pattern id={blocksId} width="90" height="70" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse"><rect width="90" height="70" fill="#e9e9df" /><rect x="8" y="8" width="74" height="54" rx="3" fill="#e0e1d7" stroke="#d9dbce" /><path d="M0 0H90V70" fill="none" stroke="#fffef9" strokeWidth="7" /></pattern></defs>
        <rect width="900" height="650" fill={`url(#${blocksId})`} /><path d="M560 -30Q450 120 555 255T645 440Q600 535 710 720H940V-30Z" fill="#cbdfe0" />
        <path d="M15 140 280 70 350 300 65 380Z M270 440 420 370 470 520 330 570Z M630 50 790 10 820 150 680 170Z" fill="#cddabc" stroke="#c3d1b3" strokeWidth="2" />
        <path d="M-20 530 950 200 M150 -30 460 700 M-20 220 620 45 M-10 480 890 640" fill="none" stroke="#fcfaf1" strokeWidth="16" /><path d="M-20 530 950 200 M150 -30 460 700" fill="none" stroke="#d7cbb3" strokeWidth="2" />
        <path d="M520 310 645 270 M600 460 690 420" fill="none" stroke="#faf8f1" strokeWidth="15" />
        <g fill="#4f6257" fontSize="13" fontFamily="var(--font-secondary)" letterSpacing="2"><text x="200" y="240">{markets[market].city.toUpperCase()}</text><text x="58" y="490" fontSize="10">WEST DISTRICT</text><text x="652" y="212" fontSize="10">WATERFRONT</text><text x="320" y="83" fontSize="10">CITY CENTRE</text><text x="225" y="470" fontSize="10">CENTRAL PARK</text></g>
      </svg>
      {items.slice(0, 50).map(frame => <button key={frame.id} className={`map-pin ${selected.includes(frame.id) ? 'pin-selected' : ''} ${active === frame.id ? 'pin-active' : ''} ${frame.type === 'Static' ? 'pin-static' : ''}`} style={{ left: `${frame.x}%`, top: `${frame.y}%` }} onClick={() => onSelect(frame)} aria-label={`${frame.name}, ${frame.type}, ${selected.includes(frame.id) ? 'selected' : 'view details'}`}>{countById.get(frame.id)}</button>)}
    </div>
    <span className="map-city"><span className="status-dot" />{markets[market].city}</span>
    <div className="map-controls"><IconButton label="Zoom in" onClick={() => setZoom(z => Math.min(1.8, z + .2))} disabled={zoom >= 1.8}><Plus size={16} /></IconButton><IconButton label="Zoom out" onClick={() => setZoom(z => Math.max(.8, z - .2))} disabled={zoom <= .8}><Minus size={16} /></IconButton><IconButton label="Reset map view" onClick={() => setZoom(1)}><Crosshair size={16} /></IconButton></div>
    <div className="map-legend"><span><i className="legend-digital" />Digital</span><span><i className="legend-static" />Static</span></div>
    <span className="map-credit">Illustrative city map · Real location coordinates in details</span>
  </div>;
}
