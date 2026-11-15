import type { ReactNode } from "react";

/* ==========================================================================
   The platform as a hive.

   Three cells share walls: Fixture, Film and the league feed, the places a
   team's season is recorded. From the seam between them one line runs out
   and splits three ways, carrying lit packets to the smaller cells at the
   end: standings, stats, the club's site. Nothing a club keeps by hand.

   Plain SVG with SMIL motion, so it's a Server Component and needs no
   script. The geometry is laid out once along a "flow" axis and drawn
   twice: left to right on wide screens, top to bottom on phones, where
   the same honeycomb simply turns pointy side up.
   ========================================================================== */

/** Flow-space coordinates: `u` along the flow, `v` across it. */
type Flow = { u: number; v: number };
type Point = { x: number; y: number };

const R = 72; // cell circumradius
const SMALL = 30; // output cell circumradius
const H = (Math.sqrt(3) / 2) * R;
const V0 = 200; // the flow's centreline
const SPREAD = 150; // how far the outer outputs sit from the centreline
const JUNCTION = 380; // where the line splits
const OUTPUT_U = 500;

type Cell = { id: string; label: string; at: Flow; icon: ReactNode };

const CELLS: Cell[] = [
  { id: "fixture", label: "Fixture", at: { u: 88, v: V0 }, icon: <PhoneIcon /> },
  { id: "film", label: "Film", at: { u: 196, v: V0 - H }, icon: <CameraIcon /> },
  { id: "league", label: "League", at: { u: 196, v: V0 + H }, icon: <TrophyIcon /> },
];

const OUTPUTS = [
  { id: "standings", label: "Standings", v: V0 - SPREAD, dur: 3.2, begin: 0 },
  { id: "stats", label: "Stats", v: V0, dur: 2, begin: 1.1 },
  { id: "site", label: "Site", v: V0 + SPREAD, dur: 3.2, begin: 2.2 },
];

/** The seam on the cluster's right, where Film and League meet. */
const SEAM: Flow = { u: 196 + R / 2, v: V0 };

/** A flat-top hexagon's corners in flow space. */
function corners(at: Flow, radius: number): Flow[] {
  const h = (Math.sqrt(3) / 2) * radius;
  const half = radius / 2;
  return [
    { u: at.u + radius, v: at.v },
    { u: at.u + half, v: at.v + h },
    { u: at.u - half, v: at.v + h },
    { u: at.u - radius, v: at.v },
    { u: at.u - half, v: at.v - h },
    { u: at.u + half, v: at.v - h },
  ];
}

/** The line from the seam to an output cell's near corner. */
function route(v: number): Flow[] {
  const end = { u: OUTPUT_U - SMALL, v };
  if (v === V0) return [SEAM, end];
  return [SEAM, { u: JUNCTION, v: V0 }, { u: JUNCTION, v }, end];
}

export function HiveGraphic() {
  return (
    <>
      <Hive vertical={false} className="hidden w-full md:block" />
      <Hive vertical className="w-full md:hidden" />
    </>
  );
}

function Hive({ vertical, className }: { vertical: boolean; className: string }) {
  const map = ({ u, v }: Flow): Point => (vertical ? { x: v, y: u } : { x: u, y: v });
  const poly = (points: Flow[]) => points.map(map).map((p) => `${p.x},${p.y}`).join(" ");
  const path = (points: Flow[]) =>
    points.map(map).map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const id = (name: string) => `hive-${vertical ? "tall" : "wide"}-${name}`;

  const width = vertical ? 400 : 640;
  const height = vertical ? 640 : 400;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`hive ${className}`}
      role="img"
      aria-labelledby={id("title")}
    >
      <title id={id("title")}>
        Fixture, Film and the league feed flowing into standings, stats and the club site.
      </title>
      <defs>
        <filter id={id("glow")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id={id("trail")} gradientUnits="userSpaceOnUse" x1="-26" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Lines */}
      {OUTPUTS.map((o) => (
        <path key={o.id} id={id(o.id)} d={path(route(o.v))} className="hive-line" />
      ))}

      {/* The hive */}
      {CELLS.map((cell) => {
        const c = map(cell.at);
        return (
          <g key={cell.id}>
            <polygon points={poly(corners(cell.at, R))} className="hive-cell" />
            <g transform={`translate(${c.x - 14} ${c.y - 26}) scale(1.1667)`} className="hive-icon">
              {cell.icon}
            </g>
            <text x={c.x} y={c.y + 26} textAnchor="middle" className="hive-label">
              {cell.label}
            </text>
          </g>
        );
      })}

      {/* Outputs */}
      {OUTPUTS.map((o) => {
        const at = { u: OUTPUT_U, v: o.v };
        const c = map(at);
        const label = vertical
          ? { x: c.x, y: c.y + SMALL + 18, anchor: "middle" as const }
          : { x: c.x + SMALL + 14, y: c.y + 4, anchor: "start" as const };
        return (
          <g key={o.id}>
            <polygon points={poly(corners(at, SMALL))} className="hive-cell hive-cell-small" />
            <text x={label.x} y={label.y} textAnchor={label.anchor} className="hive-label">
              {o.label}
            </text>
          </g>
        );
      })}

      {/* Packets */}
      {OUTPUTS.map((o) => {
        const timing = { dur: `${o.dur}s`, begin: `${o.begin}s`, repeatCount: "indefinite" } as const;
        const fade = (
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" {...timing} />
        );
        return (
          <g key={o.id} className="hive-packet">
            <g opacity="0">
              <line x1="-26" y1="0" x2="0" y2="0" stroke={`url(#${id("trail")})`} strokeWidth="1.5" />
              <animateMotion rotate="auto" {...timing}>
                <mpath href={`#${id(o.id)}`} />
              </animateMotion>
              {fade}
            </g>
            <g opacity="0">
              <circle r="5" className="hive-dot-glow" filter={`url(#${id("glow")})`} />
              <circle r="2.4" className="hive-dot" />
              <animateMotion {...timing}>
                <mpath href={`#${id(o.id)}`} />
              </animateMotion>
              {fade}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------------------
   Icons: 24-unit line drawings
   -------------------------------------------------------------------------- */

function PhoneIcon() {
  return (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  );
}

function CameraIcon() {
  return (
    <>
      <path d="M3.5 8.5h3.5l2-3h6l2 3h3.5v11h-17z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  );
}

function TrophyIcon() {
  return (
    <>
      <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 6.5H4.5a3 3 0 0 0 3 3M16.5 6.5h3a3 3 0 0 1-3 3" />
      <path d="M12 14v4M8.5 20.5h7" />
    </>
  );
}
