import type { CSSProperties } from "react";

/* ==========================================================================
   What the platform does, in one picture.

   Three sources on the left (Fixture, Film, the league), sllab in the
   middle, and what a club gets out of it on the right. A pulse of light
   runs from each source into the middle and out to each output, and the
   output's dot lights as it lands.

   Plain SVG with CSS animation: a Server Component, no script. Wide
   screens read left to right; phones get a taller layout of the same
   pieces. Reduced motion shows it still.
   ========================================================================== */

type Icon = "phone" | "camera" | "trophy";

const SOURCES: { label: string; detail: string; icon: Icon }[] = [
  { label: "Fixture", detail: "Schedules and availability", icon: "phone" },
  { label: "Film", detail: "Recorded matches", icon: "camera" },
  { label: "League", detail: "Results and fixtures", icon: "trophy" },
];

const OUTPUTS = [
  "Availability and attendance",
  "Live standings and rankings",
  "Game film on YouTube",
  "Reminders by text",
];

/** One pass of a pulse: it travels for the first 40% of this, then waits. */
const CYCLE = 4;
const TRAVEL = CYCLE * 0.4;
const sourceDelay = (i: number) => (i * CYCLE) / SOURCES.length;
const outputDelay = (i: number) => TRAVEL + (i * CYCLE) / OUTPUTS.length;

type Point = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

type Layout = {
  width: number;
  height: number;
  sources: Box[];
  hub: Box;
  outputs: Box[];
  inPaths: string[];
  outPaths: string[];
  vertical: boolean;
};

const mid = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

function wide(): Layout {
  const sources = [100, 200, 300].map((cy) => ({ x: 0, y: cy - 32, w: 248, h: 64 }));
  const hub = { x: 432, y: 152, w: 96, h: 96 };
  const outputs = [65, 155, 245, 335].map((cy) => ({ x: 712, y: cy - 26, w: 248, h: 52 }));
  const c = mid(hub);
  return {
    width: 960,
    height: 400,
    sources,
    hub,
    outputs,
    inPaths: sources.map((s) => {
      const y = mid(s).y;
      return `M${s.x + s.w} ${y} C${s.x + s.w + 104} ${y} ${hub.x - 88} ${c.y} ${hub.x} ${c.y}`;
    }),
    outPaths: outputs.map((o) => {
      const y = mid(o).y;
      return `M${hub.x + hub.w} ${c.y} C${hub.x + hub.w + 88} ${c.y} ${o.x - 104} ${y} ${o.x} ${y}`;
    }),
    vertical: false,
  };
}

function tall(): Layout {
  const sources = [0, 126, 252].map((x) => ({ x, y: 0, w: 108, h: 88 }));
  const hub = { x: 136, y: 196, w: 88, h: 88 };
  const outputs = [404, 468, 532, 596].map((y) => ({ x: 48, y, w: 312, h: 48 }));
  const c = mid(hub);
  const bottom = hub.y + hub.h;
  return {
    width: 360,
    height: 644,
    sources,
    hub,
    outputs,
    inPaths: sources.map((s) => {
      const x = mid(s).x;
      return `M${x} ${s.y + s.h} C${x} ${s.y + s.h + 64} ${c.x} ${hub.y - 64} ${c.x} ${hub.y}`;
    }),
    outPaths: outputs.map((o) => {
      const y = mid(o).y;
      return `M${c.x} ${bottom} C${c.x} ${bottom + 56} 20 ${bottom + 40} 20 ${bottom + 96} L20 ${y - 12} Q20 ${y} 32 ${y} L${o.x} ${y}`;
    }),
    vertical: true,
  };
}

export function FlowGraphic() {
  return (
    <>
      <Diagram layout={wide()} className="hidden w-full max-w-[960px] md:block" />
      <Diagram layout={tall()} className="w-full max-w-[360px] md:hidden" />
    </>
  );
}

const delay = (seconds: number) => ({ animationDelay: `${seconds}s` }) as CSSProperties;

function Diagram({ layout, className }: { layout: Layout; className: string }) {
  const { sources, hub, outputs, vertical } = layout;
  const hubMid = mid(hub);

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`flow ${className}`}
      role="img"
      aria-label="Fixture, Film and the league feed into sllab, which produces availability and attendance, live standings and rankings, game film on YouTube, and text reminders."
    >
      {/* Resting lines */}
      {[...layout.inPaths, ...layout.outPaths].map((d) => (
        <path key={d} d={d} className="flow-line" />
      ))}

      {/* Pulses */}
      {layout.inPaths.map((d, i) => (
        <Pulse key={d} d={d} style={delay(sourceDelay(i))} />
      ))}
      {layout.outPaths.map((d, i) => (
        <Pulse key={d} d={d} style={delay(outputDelay(i))} />
      ))}

      {/* Sources */}
      {sources.map((box, i) => {
        const source = SOURCES[i];
        return (
          <g key={source.label}>
            <rect {...rect(box)} rx={12} className="flow-card" />
            {vertical ? (
              <>
                <Glyph icon={source.icon} at={{ x: mid(box).x - 12, y: box.y + 18 }} />
                <text x={mid(box).x} y={box.y + 68} textAnchor="middle" className="flow-title">
                  {source.label}
                </text>
              </>
            ) : (
              <>
                <rect x={box.x + 14} y={box.y + 14} width={36} height={36} rx={9} className="flow-tile" />
                <Glyph icon={source.icon} at={{ x: box.x + 20, y: box.y + 20 }} />
                <text x={box.x + 64} y={box.y + 28} className="flow-title">
                  {source.label}
                </text>
                <text x={box.x + 64} y={box.y + 46} className="flow-detail">
                  {source.detail}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* sllab */}
      <rect {...rect(hub)} rx={22} className="flow-hub" />
      <rect {...rect(hub)} rx={22} className="flow-hub-glow" style={delay(TRAVEL)} />
      <text x={hubMid.x} y={hubMid.y + 6} textAnchor="middle" className="flow-mark">
        sllab
      </text>

      {/* Outputs */}
      {outputs.map((box, i) => {
        const y = mid(box).y;
        return (
          <g key={OUTPUTS[i]}>
            <rect {...rect(box)} rx={12} className="flow-card" />
            <circle cx={box.x + 20} cy={y} r={3} className="flow-dot" />
            <circle cx={box.x + 20} cy={y} r={3} className="flow-dot-lit" style={delay(outputDelay(i))} />
            <text x={box.x + 34} y={y + 5} className="flow-output">
              {OUTPUTS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Pulse({ d, style }: { d: string; style: CSSProperties }) {
  return (
    <g className="flow-pulse" aria-hidden>
      <path d={d} pathLength={100} className="flow-pulse-glow" style={style} />
      <path d={d} pathLength={100} className="flow-pulse-core" style={style} />
    </g>
  );
}

const rect = (b: Box) => ({ x: b.x, y: b.y, width: b.w, height: b.h });

/** A 24-unit line glyph placed with its top-left at `at`. */
function Glyph({ icon, at }: { icon: Icon; at: Point }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`} className="flow-glyph">
      {icon === "phone" && (
        <>
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M10.5 18.5h3" />
        </>
      )}
      {icon === "camera" && (
        <>
          <path d="M3.5 8.5h3.5l2-3h6l2 3h3.5v11h-17z" />
          <circle cx="12" cy="13.5" r="3.5" />
        </>
      )}
      {icon === "trophy" && (
        <>
          <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z" />
          <path d="M7.5 6.5H4.5a3 3 0 0 0 3 3M16.5 6.5h3a3 3 0 0 1-3 3" />
          <path d="M12 14v4M8.5 20.5h7" />
        </>
      )}
    </g>
  );
}
