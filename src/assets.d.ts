declare module 'world-atlas/countries-110m.json' {
  import type { GeometryCollection, Topology } from 'topojson-specification';
  const value: Topology<{ countries: GeometryCollection }>;
  export default value;
}
