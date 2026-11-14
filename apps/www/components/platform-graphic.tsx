"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ==========================================================================
   How the pieces of SLLAB talk to each other, as one game moves through it.

   The diagram is plain SVG. A story of six steps loops: each step lights the
   nodes involved and sends packets along the connections between them. A
   single requestAnimationFrame loop moves the packets and their light trails
   by writing attributes straight to the elements, so React only re-renders
   when the step changes. Phones get a taller layout of the same graph, and
   reduced motion gets the steps without the movement.
   ========================================================================== */

type NodeId = "captain" | "players" | "site" | "film" | "sms" | "core";
type EdgeId = "captain-core" | "players-core" | "site-core" | "film-core" | "core-sms" | "sms-players";
type Point = { x: number; y: number };
type Icon = "phone" | "group" | "browser" | "camera" | "message";

const NODES: Record<Exclude<NodeId, "core">, { label: string; sub: string; icon: Icon }> = {
  captain: { label: "Fixture", sub: "Captain", icon: "phone" },
  players: { label: "Fixture", sub: "Players", icon: "group" },
  site: { label: "Club site", sub: "ucsdmcs.com", icon: "browser" },
  film: { label: "Film", sub: "Tracking mount", icon: "camera" },
  sms: { label: "Reminders", sub: "Text messages", icon: "message" },
};

/** Each edge is drawn from its first node to its second. */
const EDGES: Record<EdgeId, [NodeId, NodeId]> = {
  "captain-core": ["captain", "core"],
  "players-core": ["players", "core"],
  "site-core": ["site", "core"],
  "film-core": ["film", "core"],
  "core-sms": ["core", "sms"],
  "sms-players": ["sms", "players"],
};

type Layout = {
  width: number;
  height: number;
  node: { w: number; h: number; label: number; sub: number };
  core: { w: number; h: number };
  at: Record<NodeId, Point>;
};

const WIDE: Layout = {
  width: 1000,
  height: 540,
  node: { w: 214, h: 66, label: 15, sub: 11.5 },
  core: { w: 236, h: 96 },
  at: {
    captain: { x: 150, y: 100 },
    players: { x: 150, y: 430 },
    site: { x: 850, y: 100 },
    film: { x: 850, y: 430 },
    sms: { x: 500, y: 470 },
    core: { x: 500, y: 250 },
  },
};

const TALL: Layout = {
  width: 400,
  height: 760,
  node: { w: 150, h: 62, label: 14, sub: 10.5 },
  core: { w: 220, h: 92 },
  // Reminders sits low and centred so the players' and Film's connections
  // curve past it rather than behind it.
  at: {
    captain: { x: 100, y: 70 },
    site: { x: 300, y: 70 },
    core: { x: 200, y: 300 },
    sms: { x: 200, y: 600 },
    players: { x: 78, y: 700 },
    film: { x: 322, y: 700 },
  },
};

type Flow = {
  edge: EdgeId;
  /** 1 travels the edge as drawn; -1 travels it backwards. */
  dir: 1 | -1;
  count?: number;
  delay?: number;
};

type Step = { title: string; body: string; lit: NodeId[]; flows: Flow[] };

const STEPS: Step[] = [
  {
    title: "A captain schedules a game",
    body: "Saturday, 7 pm, John Muir Field. Entered once, in Fixture.",
    lit: ["captain", "core"],
    flows: [{ edge: "captain-core", dir: 1 }],
  },
  {
    title: "It's everywhere at once",
    body: "Every player's schedule and the club's public site read the same row. Nobody re-posts it.",
    lit: ["core", "players", "site"],
    flows: [
      { edge: "players-core", dir: -1 },
      { edge: "site-core", dir: -1 },
    ],
  },
  {
    title: "Players answer in one tap",
    body: "Going or not, with everyone else's answer beside it, so the captain knows who's coming.",
    lit: ["players", "core"],
    flows: [{ edge: "players-core", dir: 1, count: 4 }],
  },
  {
    title: "Reminders reach whoever hasn't",
    body: "The platform texts the rest. Captains never see a phone number.",
    lit: ["core", "sms", "players"],
    flows: [
      { edge: "core-sms", dir: 1 },
      { edge: "sms-players", dir: 1, delay: 1100 },
    ],
  },
  {
    title: "Film records the match",
    body: "A phone on a $400 mount follows play on its own and attaches the video to the game.",
    lit: ["film", "core"],
    flows: [{ edge: "film-core", dir: 1, count: 3 }],
  },
  {
    title: "Results land everywhere",
    body: "The score and the film show up in Fixture and on the club site, the moment they're in.",
    lit: ["core", "players", "captain", "site"],
    flows: [
      { edge: "players-core", dir: -1 },
      { edge: "captain-core", dir: -1 },
      { edge: "site-core", dir: -1 },
    ],
  },
];

const STEP_MS = 4200;
const TRAVEL_MS = 1500;
const STAGGER_MS = 240;
const TRAIL = 70;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A curve that leaves and arrives along the dominant axis, like a cable. */
function edgePath(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return `M${a.x} ${a.y} C${a.x + dx * 0.6} ${a.y} ${b.x - dx * 0.6} ${b.y} ${b.x} ${b.y}`;
  }
  return `M${a.x} ${a.y} C${a.x} ${a.y + dy * 0.6} ${b.x} ${b.y - dy * 0.6} ${b.x} ${b.y}`;
}

function arrivalNode(flow: Flow): NodeId {
  const [from, to] = EDGES[flow.edge];
  return flow.dir === 1 ? to : from;
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function PlatformGraphic() {
  const narrow = useMedia("(max-width: 640px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const layout = narrow ? TALL : WIDE;

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [ripples, setRipples] = useState<Partial<Record<NodeId, number>>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<Partial<Record<EdgeId, SVGPathElement | null>>>({});
  const packetRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const trailRefs = useRef<Record<string, SVGPathElement | null>>({});

  const playing = visible && !reduced;
  const current = STEPS[step];

  // Only run while on screen.
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Advance the story.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setStep((index) => (index + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, step]);

  // Ripple each node as its packets arrive.
  useEffect(() => {
    if (!playing) return;
    const timers = STEPS[step].flows.map((flow) =>
      setTimeout(
        () => {
          const node = arrivalNode(flow);
          setRipples((map) => ({ ...map, [node]: (map[node] ?? 0) + 1 }));
        },
        (flow.delay ?? 0) + ((flow.count ?? 1) - 1) * STAGGER_MS + TRAVEL_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [playing, step]);

  // Move the packets and their trails.
  useEffect(() => {
    if (!playing) return;
    const flows = STEPS[step].flows;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      flows.forEach((flow, i) => {
        const path = pathRefs.current[flow.edge];
        if (!path) return;
        const length = path.getTotalLength();

        for (let k = 0; k < (flow.count ?? 1); k++) {
          const packet = packetRefs.current[`${i}-${k}`];
          const glow = packetRefs.current[`${i}-${k}-glow`];
          const trail = trailRefs.current[`${i}-${k}`];
          const t = (elapsed - (flow.delay ?? 0) - k * STAGGER_MS) / TRAVEL_MS;

          if (t <= 0 || t >= 1) {
            packet?.setAttribute("opacity", "0");
            glow?.setAttribute("opacity", "0");
            trail?.setAttribute("opacity", "0");
            continue;
          }

          const progress = ease(t);
          const along = flow.dir === 1 ? progress : 1 - progress;
          const head = along * length;
          const point = path.getPointAtLength(head);
          const fade = Math.min(1, t * 6, (1 - t) * 6);

          packet?.setAttribute("cx", String(point.x));
          packet?.setAttribute("cy", String(point.y));
          packet?.setAttribute("opacity", String(fade));
          glow?.setAttribute("cx", String(point.x));
          glow?.setAttribute("cy", String(point.y));
          glow?.setAttribute("opacity", String(fade * 0.45));

          if (trail) {
            // The dash sits just behind the head, whichever way it travels.
            const dashStart = flow.dir === 1 ? head - TRAIL : head;
            trail.setAttribute("stroke-dasharray", `${TRAIL} ${length + TRAIL}`);
            trail.setAttribute("stroke-dashoffset", String(-dashStart));
            trail.setAttribute("opacity", String(fade));
          }
        }
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, step, layout]);

  const choose = useCallback((index: number) => setStep(index), []);

  const edgeActive = (edge: EdgeId) => current.flows.some((flow) => flow.edge === edge);
  const lit = (node: NodeId) => current.lit.includes(node);

  return (
    <div ref={rootRef} className="w-full">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-auto w-full select-none"
        role="img"
        aria-labelledby="platform-graphic-title platform-graphic-desc"
      >
        <title id="platform-graphic-title">How SLLAB fits together</title>
        <desc id="platform-graphic-desc">
          Fixture for captains and players, the club site, Film and text reminders all connect to one SLLAB platform.
          Currently showing: {current.title}.
        </desc>

        <defs>
          <pattern id="pg-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-line" />
          </pattern>
          <radialGradient id="pg-fade" cx="50%" cy="50%" r="60%">
            <stop offset="55%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="pg-vignette">
            <rect width={layout.width} height={layout.height} fill="url(#pg-fade)" />
          </mask>
          <filter id="pg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width={layout.width} height={layout.height} fill="url(#pg-dots)" mask="url(#pg-vignette)" />

        {/* Connections */}
        {(Object.keys(EDGES) as EdgeId[]).map((edge) => {
          const [a, b] = EDGES[edge];
          const d = edgePath(layout.at[a], layout.at[b]);
          const active = edgeActive(edge);
          return (
            <g key={`${edge}-${narrow}`}>
              <path
                ref={(element) => {
                  pathRefs.current[edge] = element;
                }}
                d={d}
                fill="none"
                strokeWidth={active ? 1.5 : 1.2}
                strokeDasharray={active ? undefined : "3 5"}
                className={`pg-edge ${active ? "stroke-muted" : "stroke-line"}`}
              />
            </g>
          );
        })}

        {/* Trails and packets for the current step */}
        {current.flows.map((flow, i) =>
          Array.from({ length: flow.count ?? 1 }, (_, k) => {
            const [a, b] = EDGES[flow.edge];
            const d = edgePath(layout.at[a], layout.at[b]);
            const key = `${i}-${k}`;
            return (
              <g key={`${step}-${key}-${narrow}`}>
                <path
                  ref={(element) => {
                    trailRefs.current[key] = element;
                  }}
                  d={d}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0}
                  className="stroke-fg"
                />
                <circle
                  ref={(element) => {
                    packetRefs.current[`${key}-glow`] = element;
                  }}
                  r={8}
                  opacity={0}
                  className="fill-fg"
                  filter="url(#pg-glow)"
                />
                <circle
                  ref={(element) => {
                    packetRefs.current[key] = element;
                  }}
                  r={3.5}
                  opacity={0}
                  className="fill-fg"
                />
              </g>
            );
          }),
        )}

        {/* Outer nodes */}
        {(Object.keys(NODES) as Exclude<NodeId, "core">[]).map((id) => (
          <NodeBox
            key={id}
            at={layout.at[id]}
            size={layout.node}
            lit={lit(id)}
            ripple={ripples[id] ?? 0}
            {...NODES[id]}
          />
        ))}

        {/* The platform */}
        <CoreBox at={layout.at.core} size={layout.core} ripple={ripples.core ?? 0} />
      </svg>

      <Steps step={step} playing={playing} onChoose={choose} />
    </div>
  );
}

function NodeBox({
  at,
  size,
  lit,
  ripple,
  label,
  sub,
  icon,
}: {
  at: Point;
  size: Layout["node"];
  lit: boolean;
  ripple: number;
  label: string;
  sub: string;
  icon: Icon;
}) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  return (
    <g className={`pg-node ${lit ? "pg-node-lit" : ""}`}>
      {ripple > 0 && (
        <rect
          key={ripple}
          x={x}
          y={y}
          width={size.w}
          height={size.h}
          rx={14}
          fill="none"
          strokeWidth={1.5}
          className="pg-ripple stroke-fg"
        />
      )}
      <rect x={x} y={y} width={size.w} height={size.h} rx={14} strokeWidth={1.2} className="pg-node-box fill-bg" />
      <g transform={`translate(${x + 16} ${at.y - 14})`}>
        <rect width={28} height={28} rx={8} className="pg-node-icon-bg" />
        <Glyph icon={icon} />
      </g>
      <text x={x + 56} y={at.y - 3} fontSize={size.label} fontWeight={600} className="fill-fg" letterSpacing="-0.01em">
        {label}
      </text>
      <text x={x + 56} y={at.y + size.sub + 3} fontSize={size.sub} className="pg-mono fill-muted">
        {sub}
      </text>
    </g>
  );
}

function CoreBox({ at, size, ripple }: { at: Point; size: Layout["core"]; ripple: number }) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  return (
    <g>
      <ellipse
        cx={at.x}
        cy={at.y}
        rx={size.w / 2 + 34}
        ry={size.h / 2 + 34}
        fill="none"
        strokeWidth={1}
        strokeDasharray="2 7"
        className="pg-orbit stroke-muted"
      />
      {ripple > 0 && (
        <rect
          key={ripple}
          x={x}
          y={y}
          width={size.w}
          height={size.h}
          rx={20}
          fill="none"
          strokeWidth={1.5}
          className="pg-ripple stroke-fg"
        />
      )}
      <rect x={x} y={y} width={size.w} height={size.h} rx={20} className="fill-fg" />
      <text x={at.x} y={at.y - 4} textAnchor="middle" fontSize={22} fontWeight={600} letterSpacing="-0.03em" className="fill-bg">
        sllab
      </text>
      <text x={at.x} y={at.y + 18} textAnchor="middle" fontSize={11} className="pg-mono pg-core-sub">
        ONE DATABASE · ONE API
      </text>
    </g>
  );
}

/** 28×28 line icons, drawn to match the node boxes. */
function Glyph({ icon }: { icon: Icon }) {
  const common = { fill: "none", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "stroke-fg" };
  switch (icon) {
    case "phone":
      return (
        <g {...common}>
          <rect x={9.5} y={6} width={9} height={16} rx={2} />
          <path d="M13 19h2" />
        </g>
      );
    case "group":
      return (
        <g {...common}>
          <circle cx={11} cy={11.5} r={2.6} />
          <circle cx={17.5} cy={12.5} r={2.1} />
          <path d="M6.5 20.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4M15.5 17c.6-.4 1.3-.6 2-.6 1.7 0 3 1.1 3.5 3.3" />
        </g>
      );
    case "browser":
      return (
        <g {...common}>
          <rect x={6} y={7.5} width={16} height={13} rx={2} />
          <path d="M6 11h16" />
          <circle cx={8.6} cy={9.3} r={0.3} />
          <circle cx={10.4} cy={9.3} r={0.3} />
        </g>
      );
    case "camera":
      return (
        <g {...common}>
          <path d="M6.5 10.5a2 2 0 0 1 2-2h1.6l1.3-1.8h5.2l1.3 1.8h1.6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
          <circle cx={14} cy={14} r={3} />
        </g>
      );
    case "message":
      return (
        <g {...common}>
          <path d="M7 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-3.5 3v-3H9a2 2 0 0 1-2-2z" />
          <path d="M10.5 11.5h7M10.5 14h4.5" />
        </g>
      );
  }
}

function Steps({ step, playing, onChoose }: { step: number; playing: boolean; onChoose: (index: number) => void }) {
  const current = STEPS[step];
  return (
    <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[1fr_1.4fr] md:items-start md:gap-14">
      <div aria-live="polite" className="min-h-[7.5rem]">
        <p className="label">
          {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </p>
        <h3 key={step} className="pg-caption display mt-4 text-[clamp(1.4rem,2.6vw,2rem)]">
          {current.title}
        </h3>
        <p key={`b-${step}`} className="pg-caption lede mt-3 max-w-md text-[15px] text-muted">
          {current.body}
        </p>
      </div>

      <ol className="grid grid-cols-6 gap-2 md:grid-cols-3 md:gap-x-4 md:gap-y-5">
        {STEPS.map((item, index) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => onChoose(index)}
              aria-current={index === step ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${item.title}`}
              className="group block w-full text-left"
            >
              <span className="relative block h-px w-full overflow-hidden bg-line">
                <span
                  key={index === step ? `on-${step}` : "off"}
                  className={`absolute inset-y-0 left-0 bg-fg ${
                    index < step ? "w-full" : index === step ? (playing ? "pg-progress" : "w-full") : "w-0"
                  }`}
                  style={{ animationDuration: `${STEP_MS}ms` }}
                />
              </span>
              <span
                className={`mt-3 hidden text-[13px] leading-snug tracking-tight transition-colors md:block ${
                  index === step ? "text-fg" : "text-muted group-hover:text-fg"
                }`}
              >
                {item.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
