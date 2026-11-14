"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ==========================================================================
   The platform as a pipeline, left to right.

   Sources (the apps a team already uses) stream into one database without
   pause; from it come the things a club could never make by hand: a game
   with everything attached, player profiles, standings, rankings, season
   stats, attendance. Those cycle on the right as drawn cards.

   Plain SVG. One requestAnimationFrame loop moves the packets by writing
   attributes directly, so React re-renders only when the card changes.
   Phones get a taller layout; reduced motion gets no packets and a
   click-through of the cards.
   ========================================================================== */

type Point = { x: number; y: number };
type SourceId = "captains" | "players" | "film" | "league";
type Icon = "phone" | "group" | "camera" | "trophy";

const SOURCES: Record<SourceId, { label: string; sub: string; stream: string; icon: Icon }> = {
  captains: { label: "Fixture", sub: "Captains", stream: "schedule · results", icon: "phone" },
  players: { label: "Fixture", sub: "Players", stream: "availability", icon: "group" },
  film: { label: "Film", sub: "Tracking mount", stream: "match video", icon: "camera" },
  league: { label: "League", sub: "SportsEngine", stream: "standings", icon: "trophy" },
};

const SOURCE_ORDER: SourceId[] = ["captains", "players", "film", "league"];

type Layout = {
  width: number;
  height: number;
  node: { w: number; h: number };
  core: { at: Point; w: number; h: number };
  card: { x: number; y: number; w: number; h: number };
  sources: Record<SourceId, Point>;
  /** Where each source's stream enters the core, and where output streams leave it. */
  intake: Point[];
  outlets: Point[];
  /** Where output streams land on the card. */
  landings: Point[];
  headers: { sources: Point; platform: Point; outputs: Point } | null;
  vertical: boolean;
};

const CARD_W = 360;
const CARD_H = 330;

const WIDE: Layout = {
  width: 1100,
  height: 580,
  node: { w: 220, h: 64 },
  core: { at: { x: 480, y: 290 }, w: 230, h: 176 },
  card: { x: 710, y: 125, w: CARD_W, h: CARD_H },
  sources: {
    captains: { x: 150, y: 125 },
    players: { x: 150, y: 235 },
    film: { x: 150, y: 345 },
    league: { x: 150, y: 455 },
  },
  intake: [
    { x: 365, y: 245 },
    { x: 365, y: 275 },
    { x: 365, y: 305 },
    { x: 365, y: 335 },
  ],
  outlets: [
    { x: 595, y: 260 },
    { x: 595, y: 290 },
    { x: 595, y: 320 },
  ],
  landings: [
    { x: 710, y: 210 },
    { x: 710, y: 290 },
    { x: 710, y: 370 },
  ],
  headers: { sources: { x: 40, y: 48 }, platform: { x: 480, y: 48 }, outputs: { x: 890, y: 48 } },
  vertical: false,
};

const TALL: Layout = {
  width: 420,
  height: 980,
  node: { w: 184, h: 60 },
  core: { at: { x: 210, y: 345 }, w: 236, h: 150 },
  card: { x: 30, y: 560, w: CARD_W, h: CARD_H },
  sources: {
    captains: { x: 112, y: 70 },
    players: { x: 308, y: 70 },
    film: { x: 112, y: 150 },
    league: { x: 308, y: 150 },
  },
  intake: [
    { x: 165, y: 270 },
    { x: 195, y: 270 },
    { x: 225, y: 270 },
    { x: 255, y: 270 },
  ],
  outlets: [
    { x: 180, y: 420 },
    { x: 210, y: 420 },
    { x: 240, y: 420 },
  ],
  landings: [
    { x: 130, y: 560 },
    { x: 210, y: 560 },
    { x: 290, y: 560 },
  ],
  headers: null,
  vertical: true,
};

/* --------------------------------------------------------------------------
   Outputs
   -------------------------------------------------------------------------- */

type Output = { id: string; chip: string; title: string; body: string; render: () => ReactNode };

const OUTPUTS: Output[] = [
  {
    id: "game",
    chip: "Games",
    title: "Every game, with everything attached",
    body: "Opponent, kickoff, field, result, who came and the film, on one record that every app reads.",
    render: () => <GameCard />,
  },
  {
    id: "player",
    chip: "Players",
    title: "A profile that follows the player",
    body: "A person exists once; each season adds a roster spot. Appearances, goals and attendance accrue on their own.",
    render: () => <PlayerCard />,
  },
  {
    id: "standings",
    chip: "Standings",
    title: "Standings, live",
    body: "The league table on the club site, refreshed from the league's feed without anyone retyping it.",
    render: () => <StandingsCard />,
  },
  {
    id: "rankings",
    chip: "Rankings",
    title: "Power rankings across clubs",
    body: "Once several clubs share the platform, results on both sides of a game rank every team in the region.",
    render: () => <RankingsCard />,
  },
  {
    id: "stats",
    chip: "Season stats",
    title: "A season in numbers",
    body: "Record, goal difference, streak, home and away form, all derived from the games as they're entered.",
    render: () => <StatsCard />,
  },
  {
    id: "attendance",
    chip: "Attendance",
    title: "Attendance a captain can act on",
    body: "Who answers, who comes, and who goes quiet, ranked by what needs a word.",
    render: () => <AttendanceCard />,
  },
];

const CARD_MS = 3600;

/* --------------------------------------------------------------------------
   Streams
   -------------------------------------------------------------------------- */

const PACKETS_PER_STREAM = 3;
const STREAM_MS = 3000;
const TRAIL = 56;

function streamPath(a: Point, b: Point, vertical: boolean) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return vertical
    ? `M${a.x} ${a.y} C${a.x} ${a.y + dy * 0.55} ${b.x} ${b.y - dy * 0.55} ${b.x} ${b.y}`
    : `M${a.x} ${a.y} C${a.x + dx * 0.55} ${a.y} ${b.x - dx * 0.55} ${b.y} ${b.x} ${b.y}`;
}

type Stream = { id: string; d: string; offset: number; label?: { text: string; at: Point } };

function buildStreams(layout: Layout): Stream[] {
  const { node, vertical } = layout;
  const inputs = SOURCE_ORDER.map((id, i) => {
    const at = layout.sources[id];
    const from = vertical ? { x: at.x, y: at.y + node.h / 2 } : { x: at.x + node.w / 2, y: at.y };
    const to = layout.intake[i];
    return {
      id: `in-${id}`,
      d: streamPath(from, to, vertical),
      offset: i * 640,
      label: vertical ? undefined : { text: SOURCES[id].stream, at: { x: from.x + 18, y: from.y - 9 } },
    };
  });
  const outputs = layout.outlets.map((from, i) => ({
    id: `out-${i}`,
    d: streamPath(from, layout.landings[i], vertical),
    offset: 900 + i * 420,
  }));
  return [...inputs, ...outputs];
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

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export function PlatformGraphic() {
  const narrow = useMedia("(max-width: 640px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const layout = narrow ? TALL : WIDE;
  const streams = buildStreams(layout);

  const [card, setCard] = useState({ index: 0, previous: -1 });
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const trailRefs = useRef<Record<string, SVGPathElement | null>>({});

  const playing = visible && !reduced;
  const show = useCallback(
    (index: number) => setCard((state) => (index === state.index ? state : { index, previous: state.index })),
    [],
  );

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => show((card.index + 1) % OUTPUTS.length), CARD_MS);
    return () => clearTimeout(timer);
  }, [playing, card.index, show]);

  // The streams never stop: each packet's place is a function of the clock.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      for (const stream of streams) {
        const path = pathRefs.current[stream.id];
        if (!path) continue;
        const length = path.getTotalLength();
        for (let k = 0; k < PACKETS_PER_STREAM; k++) {
          const t = ((((now + stream.offset) / STREAM_MS + k / PACKETS_PER_STREAM) % 1) + 1) % 1;
          const head = t * length;
          const point = path.getPointAtLength(head);
          const fade = Math.min(1, t * 8, (1 - t) * 8);
          const key = `${stream.id}-${k}`;
          const dot = dotRefs.current[key];
          const glow = dotRefs.current[`${key}-glow`];
          const trail = trailRefs.current[key];
          dot?.setAttribute("cx", String(point.x));
          dot?.setAttribute("cy", String(point.y));
          dot?.setAttribute("opacity", String(fade));
          glow?.setAttribute("cx", String(point.x));
          glow?.setAttribute("cy", String(point.y));
          glow?.setAttribute("opacity", String(fade * 0.4));
          if (trail) {
            trail.setAttribute("stroke-dasharray", `${TRAIL} ${length + TRAIL}`);
            trail.setAttribute("stroke-dashoffset", String(TRAIL - head));
            trail.setAttribute("opacity", String(fade));
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, streams]);

  const current = OUTPUTS[card.index];
  const previous = card.previous >= 0 ? OUTPUTS[card.previous] : null;
  const { core } = layout;
  // The card groups are positioned by CSS, so the enter/leave keyframes can
  // animate transform without losing the offset (an SVG transform attribute
  // would be overridden by the animation).
  const cardOffset = {
    transform: `translate(${layout.card.x}px, ${layout.card.y}px)`,
    "--pg-card-x": `${layout.card.x}px`,
    "--pg-card-y": `${layout.card.y}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className="w-full">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-auto w-full select-none"
        role="img"
        aria-labelledby="pg-title pg-desc"
      >
        <title id="pg-title">How SLLAB works</title>
        <desc id="pg-desc">
          Fixture, Film and the league feed stream into one SLLAB database. From it come games with everything
          attached, player profiles, standings, power rankings, season stats and attendance. Showing: {current.title}.
        </desc>

        <defs>
          <pattern id="pg-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-line" />
          </pattern>
          <radialGradient id="pg-fade" cx="50%" cy="50%" r="62%">
            <stop offset="50%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="pg-vignette">
            <rect width={layout.width} height={layout.height} fill="url(#pg-fade)" />
          </mask>
          <filter id="pg-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <clipPath id="pg-card-clip">
            <rect x={layout.card.x} y={layout.card.y} width={layout.card.w} height={layout.card.h} rx={16} />
          </clipPath>
        </defs>

        <rect width={layout.width} height={layout.height} fill="url(#pg-dots)" mask="url(#pg-vignette)" />

        {layout.headers && (
          <g className="pg-mono fill-muted" fontSize={10.5} letterSpacing="0.18em">
            <text x={layout.headers.sources.x} y={layout.headers.sources.y}>
              SOURCES
            </text>
            <text x={layout.headers.platform.x} y={layout.headers.platform.y} textAnchor="middle">
              PLATFORM
            </text>
            <text x={layout.headers.outputs.x} y={layout.headers.outputs.y} textAnchor="middle">
              OUTPUTS
            </text>
            <line x1={40} y1={62} x2={260} y2={62} className="stroke-line" />
            <line x1={365} y1={62} x2={595} y2={62} className="stroke-line" />
            <line x1={710} y1={62} x2={1070} y2={62} className="stroke-line" />
          </g>
        )}

        {/* Streams: the rail, then the moving light on it */}
        {streams.map((stream) => (
          <g key={`${stream.id}-${narrow}`}>
            <path
              ref={(element) => {
                pathRefs.current[stream.id] = element;
              }}
              d={stream.d}
              fill="none"
              strokeWidth={1.2}
              className="stroke-line"
            />
            {stream.label && (
              <text x={stream.label.at.x} y={stream.label.at.y} fontSize={10} className="pg-mono fill-muted">
                {stream.label.text}
              </text>
            )}
            {!reduced &&
              Array.from({ length: PACKETS_PER_STREAM }, (_, k) => {
                const key = `${stream.id}-${k}`;
                return (
                  <g key={key}>
                    <path
                      ref={(element) => {
                        trailRefs.current[key] = element;
                      }}
                      d={stream.d}
                      fill="none"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      opacity={0}
                      className="stroke-fg"
                    />
                    <circle
                      ref={(element) => {
                        dotRefs.current[`${key}-glow`] = element;
                      }}
                      r={7}
                      opacity={0}
                      filter="url(#pg-glow)"
                      className="fill-fg"
                    />
                    <circle
                      ref={(element) => {
                        dotRefs.current[key] = element;
                      }}
                      r={3}
                      opacity={0}
                      className="fill-fg"
                    />
                  </g>
                );
              })}
          </g>
        ))}

        {/* Sources */}
        {SOURCE_ORDER.map((id) => (
          <SourceNode key={id} at={layout.sources[id]} size={layout.node} {...SOURCES[id]} />
        ))}

        {/* The platform */}
        <g>
          <rect x={core.at.x - core.w / 2} y={core.at.y - core.h / 2} width={core.w} height={core.h} rx={20} className="fill-fg" />
          <text x={core.at.x} y={core.at.y - 34} textAnchor="middle" fontSize={24} fontWeight={600} letterSpacing="-0.03em" className="fill-bg">
            sllab
          </text>
          <text x={core.at.x} y={core.at.y - 14} textAnchor="middle" fontSize={10} letterSpacing="0.16em" className="pg-mono pg-core-sub">
            ONE DATABASE · ONE API
          </text>
          {["people · teams · seasons", "events · availability", "games · film · messages"].map((line, i) => (
            <g key={line} transform={`translate(${core.at.x} ${core.at.y + 8 + i * 22})`}>
              <rect x={-92} y={-8} width={184} height={18} rx={9} className="pg-core-chip" />
              <text textAnchor="middle" y={5} fontSize={10.5} className="pg-mono fill-bg">
                {line}
              </text>
            </g>
          ))}
        </g>

        {/* Outputs: the card, with the previous one fading beneath the next */}
        <g clipPath="url(#pg-card-clip)">
          <rect x={layout.card.x} y={layout.card.y} width={layout.card.w} height={layout.card.h} className="fill-bg" />
          {previous && (
            <g key={`out-${card.previous}-${card.index}`} className="pg-card-out" style={cardOffset}>
              {previous.render()}
            </g>
          )}
          <g key={`in-${card.index}`} className="pg-card-in" style={cardOffset}>
            {current.render()}
          </g>
        </g>
        <rect
          x={layout.card.x}
          y={layout.card.y}
          width={layout.card.w}
          height={layout.card.h}
          rx={16}
          fill="none"
          strokeWidth={1.2}
          className="stroke-fg"
        />
      </svg>

      <Captions index={card.index} playing={playing} onChoose={show} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Pieces
   -------------------------------------------------------------------------- */

function SourceNode({ at, size, label, sub, icon }: { at: Point; size: Layout["node"]; label: string; sub: string; icon: Icon }) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  return (
    <g>
      <rect x={x} y={y} width={size.w} height={size.h} rx={14} strokeWidth={1.2} className="fill-bg stroke-line" />
      <g transform={`translate(${x + 16} ${at.y - 14})`}>
        <rect width={28} height={28} rx={8} className="pg-icon-bg" />
        <Glyph icon={icon} />
      </g>
      <text x={x + 56} y={at.y - 3} fontSize={14.5} fontWeight={600} letterSpacing="-0.01em" className="fill-fg">
        {label}
      </text>
      <text x={x + 56} y={at.y + 14} fontSize={11} className="pg-mono fill-muted">
        {sub}
      </text>
    </g>
  );
}

function Glyph({ icon }: { icon: Icon }) {
  const stroke = {
    fill: "none",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "stroke-fg",
  };
  switch (icon) {
    case "phone":
      return (
        <g {...stroke}>
          <rect x={9.5} y={6} width={9} height={16} rx={2} />
          <path d="M13 19h2" />
        </g>
      );
    case "group":
      return (
        <g {...stroke}>
          <circle cx={11} cy={11.5} r={2.6} />
          <circle cx={17.5} cy={12.5} r={2.1} />
          <path d="M6.5 20.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4M15.5 17c.6-.4 1.3-.6 2-.6 1.7 0 3 1.1 3.5 3.3" />
        </g>
      );
    case "camera":
      return (
        <g {...stroke}>
          <path d="M6.5 10.5a2 2 0 0 1 2-2h1.6l1.3-1.8h5.2l1.3 1.8h1.6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
          <circle cx={14} cy={14} r={3} />
        </g>
      );
    case "trophy":
      return (
        <g {...stroke}>
          <path d="M9.5 7h9v4.5a4.5 4.5 0 0 1-9 0z" />
          <path d="M9.5 8.5H7.5a1.5 1.5 0 0 0 0 3h2M18.5 8.5h2a1.5 1.5 0 0 1 0 3h-2M14 16v3M11 21h6" />
        </g>
      );
  }
}

function Captions({ index, playing, onChoose }: { index: number; playing: boolean; onChoose: (index: number) => void }) {
  const current = OUTPUTS[index];
  return (
    <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[1fr_1.3fr] md:items-start md:gap-14">
      <div aria-live="polite" className="min-h-[7rem]">
        <p className="label">What comes out</p>
        <h3 key={`t-${index}`} className="pg-caption display mt-4 text-[clamp(1.4rem,2.6vw,2rem)]">
          {current.title}
        </h3>
        <p key={`b-${index}`} className="pg-caption lede mt-3 max-w-md text-[15px] text-muted">
          {current.body}
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6 md:grid-cols-3">
        {OUTPUTS.map((output, i) => (
          <li key={output.id}>
            <button
              type="button"
              onClick={() => onChoose(i)}
              aria-current={i === index ? "step" : undefined}
              className="group block w-full text-left"
            >
              <span className="relative block h-px w-full overflow-hidden bg-line">
                <span
                  key={i === index ? `on-${index}` : "off"}
                  className={`absolute inset-y-0 left-0 bg-fg ${i === index ? (playing ? "pg-progress" : "w-full") : "w-0"}`}
                  style={{ animationDuration: `${CARD_MS}ms` }}
                />
              </span>
              <span
                className={`mt-3 block text-[13px] leading-snug tracking-tight transition-colors ${
                  i === index ? "text-fg" : "text-muted group-hover:text-fg"
                }`}
              >
                {output.chip}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Cards: 360 × 330, origin top-left, 22px padding. Drawn to look like the
   product, in the site's two colours. The people and scores are invented.
   -------------------------------------------------------------------------- */

const PAD = 22;
const MONO = "pg-mono fill-muted";

function CardHeader({ kicker, tag }: { kicker: string; tag?: string }) {
  return (
    <g>
      <text x={PAD} y={PAD + 10} fontSize={10} letterSpacing="0.18em" className={MONO}>
        {kicker.toUpperCase()}
      </text>
      {tag && (
        <g transform={`translate(${CARD_W - PAD} ${PAD})`}>
          <rect x={-tag.length * 6.6 - 14} y={-2} width={tag.length * 6.6 + 14} height={17} rx={8.5} className="fill-fg" />
          <text x={-7} y={10} textAnchor="end" fontSize={9.5} letterSpacing="0.14em" className="pg-mono fill-bg">
            {tag}
          </text>
        </g>
      )}
      <line x1={PAD} y1={PAD + 22} x2={CARD_W - PAD} y2={PAD + 22} className="stroke-line" />
    </g>
  );
}

function Crest({ x, y, r = 11, dark = false }: { x: number; y: number; r?: number; dark?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={dark ? "fill-fg" : "pg-icon-bg"} />
      <circle cx={x} cy={y} r={r * 0.42} fill="none" strokeWidth={1.2} className={dark ? "stroke-bg" : "stroke-fg"} />
    </g>
  );
}

function GameCard() {
  const y = 86;
  const rows = [
    ["Kickoff", "Sat Oct 7 · 7:00 PM"],
    ["Field", "John Muir Field · Home"],
    ["Attendance", "18 going · 3 out · 2 unanswered"],
    ["Film", "Full match · 94 min"],
  ];
  return (
    <g>
      <CardHeader kicker="Game · Week 4" tag="FINAL" />
      <Crest x={PAD + 16} y={y} r={16} dark />
      <text x={PAD + 42} y={y + 5} fontSize={15} fontWeight={600} letterSpacing="-0.01em" className="fill-fg">
        UC San Diego
      </text>
      <text x={CARD_W / 2 + 10} y={y + 7} textAnchor="middle" fontSize={24} fontWeight={600} letterSpacing="-0.03em" className="fill-fg">
        2 – 1
      </text>
      <text x={CARD_W - PAD - 42} y={y + 5} textAnchor="end" fontSize={15} fontWeight={600} letterSpacing="-0.01em" className="fill-fg">
        UCLA
      </text>
      <Crest x={CARD_W - PAD - 16} y={y} r={16} />
      {rows.map(([key, value], i) => (
        <g key={key} transform={`translate(0 ${y + 48 + i * 36})`}>
          <line x1={PAD} y1={-12} x2={CARD_W - PAD} y2={-12} className="stroke-line" />
          <text x={PAD} y={6} fontSize={10.5} letterSpacing="0.1em" className={MONO}>
            {key.toUpperCase()}
          </text>
          <text x={CARD_W - PAD} y={6} textAnchor="end" fontSize={12.5} className="fill-fg">
            {value}
          </text>
        </g>
      ))}
      <g transform={`translate(${PAD} ${CARD_H - PAD - 22})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={10 + i * 16} cy={11} r={9} strokeWidth={1.5} className="pg-icon-bg stroke-bg" />
        ))}
        <text x={100} y={15} fontSize={11} className={MONO}>
          +13 going
        </text>
        <g transform={`translate(${CARD_W - PAD * 2 - 72} 0)`}>
          <rect width={72} height={22} rx={11} className="fill-fg" />
          <path d="M28 7l8 4-8 4z" className="fill-bg" />
          <text x={48} y={15} fontSize={10.5} textAnchor="middle" className="pg-mono fill-bg">
            Film
          </text>
        </g>
      </g>
    </g>
  );
}

function PlayerCard() {
  const stats = [
    ["11", "Apps"],
    ["7", "Goals"],
    ["4", "Assists"],
    ["92%", "Attend."],
  ];
  const form = [1, 1, 0, 1, 1, 1, 0.5, 1, 1, 1];
  return (
    <g>
      <CardHeader kicker="Player · 2026 season" tag="#9" />
      <circle cx={PAD + 28} cy={98} r={28} className="pg-icon-bg" />
      <circle cx={PAD + 28} cy={89} r={9} className="fill-muted" opacity={0.5} />
      <path d={`M${PAD + 9} 120a19 14 0 0 1 38 0z`} className="fill-muted" opacity={0.5} />
      <text x={PAD + 70} y={92} fontSize={18} fontWeight={600} letterSpacing="-0.02em" className="fill-fg">
        Marcus Reyes
      </text>
      <text x={PAD + 70} y={112} fontSize={11} className={MONO}>
        Forward · Junior · San Diego, CA
      </text>
      {stats.map(([value, label], i) => (
        <g key={label} transform={`translate(${PAD + i * 79} 150)`}>
          <rect width={70} height={56} rx={10} strokeWidth={1} className="fill-bg stroke-line" />
          <text x={35} y={28} textAnchor="middle" fontSize={19} fontWeight={600} letterSpacing="-0.02em" className="fill-fg">
            {value}
          </text>
          <text x={35} y={45} textAnchor="middle" fontSize={9.5} letterSpacing="0.12em" className={MONO}>
            {label.toUpperCase()}
          </text>
        </g>
      ))}
      <text x={PAD} y={238} fontSize={10} letterSpacing="0.18em" className={MONO}>
        LAST 10 EVENTS
      </text>
      {form.map((value, i) => (
        <rect
          key={i}
          x={PAD + i * 32}
          y={250}
          width={24}
          height={34}
          rx={5}
          className={value === 1 ? "fill-fg" : value === 0.5 ? "fill-muted" : "pg-icon-bg"}
          opacity={value === 0.5 ? 0.5 : 1}
        />
      ))}
      <text x={PAD} y={CARD_H - PAD + 2} fontSize={10.5} className={MONO}>
        ■ Went &nbsp;■ Not going &nbsp;□ No answer
      </text>
    </g>
  );
}

function StandingsCard() {
  const rows = [
    ["UC Santa Barbara", 8, 1, 2, 25],
    ["UC San Diego", 7, 2, 2, 23],
    ["UCLA", 6, 2, 3, 20],
    ["USC", 5, 3, 3, 18],
    ["Cal Poly", 4, 2, 5, 14],
    ["San Diego State", 2, 3, 6, 9],
  ] as const;
  const cols = [
    ["W", 232],
    ["D", 264],
    ["L", 296],
    ["PTS", 336],
  ] as const;
  return (
    <g>
      <CardHeader kicker="Standings · SoCal Division I" tag="LIVE" />
      <g className={MONO} fontSize={10} letterSpacing="0.12em">
        <text x={PAD} y={76}>
          #
        </text>
        <text x={PAD + 22} y={76}>
          TEAM
        </text>
        {cols.map(([label, x]) => (
          <text key={label} x={x} y={76} textAnchor="end">
            {label}
          </text>
        ))}
      </g>
      {rows.map(([team, w, d, l, pts], i) => {
        const us = team === "UC San Diego";
        const y = 92 + i * 36;
        return (
          <g key={team} transform={`translate(0 ${y})`}>
            {us && <rect x={PAD - 8} y={0} width={CARD_W - PAD * 2 + 16} height={32} rx={8} className="pg-icon-bg" />}
            <text x={PAD} y={21} fontSize={12} className={us ? "pg-mono fill-fg" : MONO}>
              {i + 1}
            </text>
            <Crest x={PAD + 30} y={16} r={8} dark={us} />
            <text x={PAD + 46} y={21} fontSize={12.5} fontWeight={us ? 600 : 400} className="fill-fg">
              {team}
            </text>
            {[w, d, l].map((n, k) => (
              <text key={k} x={cols[k][1]} y={21} textAnchor="end" fontSize={12} className="pg-mono fill-fg">
                {n}
              </text>
            ))}
            <text x={cols[3][1]} y={21} textAnchor="end" fontSize={12.5} fontWeight={600} className="pg-mono fill-fg">
              {pts}
            </text>
            <line x1={PAD} y1={32} x2={CARD_W - PAD} y2={32} className="stroke-line" />
          </g>
        );
      })}
    </g>
  );
}

function RankingsCard() {
  const rows = [
    ["UC Santa Barbara", 0, 96],
    ["UC San Diego", 2, 91],
    ["Cal", 1, 84],
    ["UCLA", -2, 80],
    ["Stanford", 0, 76],
    ["USC", -1, 69],
  ] as const;
  return (
    <g>
      <CardHeader kicker="Power rankings · West" tag="WEEK 9" />
      {rows.map(([team, delta, score], i) => {
        const y = 78 + i * 40;
        const us = team === "UC San Diego";
        return (
          <g key={team} transform={`translate(0 ${y})`}>
            <circle cx={PAD + 12} cy={14} r={12} className={us ? "fill-fg" : "pg-icon-bg"} />
            <text
              x={PAD + 12}
              y={18}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className={us ? "pg-mono fill-bg" : "pg-mono fill-fg"}
            >
              {i + 1}
            </text>
            <text x={PAD + 36} y={18} fontSize={12.5} fontWeight={us ? 600 : 400} className="fill-fg">
              {team}
            </text>
            <g transform="translate(236 14)">
              {delta !== 0 && (
                <path d={delta > 0 ? "M0 3l4-6 4 6z" : "M0-3l4 6 4-6z"} className={delta > 0 ? "fill-fg" : "fill-muted"} />
              )}
              <text x={12} y={4} fontSize={10.5} className={MONO}>
                {delta === 0 ? "—" : Math.abs(delta)}
              </text>
            </g>
            <rect x={268} y={10} width={70} height={8} rx={4} className="pg-icon-bg" />
            <rect x={268} y={10} width={(70 * score) / 100} height={8} rx={4} className="fill-fg" />
          </g>
        );
      })}
      <text x={PAD} y={CARD_H - PAD + 2} fontSize={10.5} className={MONO}>
        Results from both sides of every game, across clubs
      </text>
    </g>
  );
}

function StatsCard() {
  const chips = [
    ["+11", "Goal diff"],
    ["W3", "Streak"],
    ["5–0–1", "Home"],
    ["3–2–2", "Away"],
  ];
  const goals = [2, 1, 3, 0, 2, 4, 1, 2, 3, 1, 2, 2, 3];
  const max = Math.max(...goals);
  const chartY = 196;
  const chartH = 86;
  return (
    <g>
      <CardHeader kicker="Season · 2026" tag="13 GAMES" />
      <text x={PAD} y={110} fontSize={42} fontWeight={600} letterSpacing="-0.04em" className="fill-fg">
        8–2–3
      </text>
      <text x={PAD + 2} y={130} fontSize={10.5} letterSpacing="0.14em" className={MONO}>
        WON · DRAWN · LOST
      </text>
      {chips.map(([value, label], i) => (
        <g key={label} transform={`translate(${PAD + i * 79} 146)`}>
          <text x={0} y={14} fontSize={14} fontWeight={600} letterSpacing="-0.01em" className="fill-fg">
            {value}
          </text>
          <text x={0} y={28} fontSize={9.5} letterSpacing="0.12em" className={MONO}>
            {label.toUpperCase()}
          </text>
        </g>
      ))}
      <text x={PAD} y={chartY - 6} fontSize={10} letterSpacing="0.18em" className={MONO}>
        GOALS PER GAME
      </text>
      <line x1={PAD} y1={chartY + chartH} x2={CARD_W - PAD} y2={chartY + chartH} className="stroke-line" />
      {goals.map((g, i) => {
        const h = Math.max(3, (g / max) * (chartH - 8));
        return (
          <rect
            key={i}
            x={PAD + i * 24.5}
            y={chartY + chartH - h}
            width={16}
            height={h}
            rx={3}
            className="fill-fg"
            opacity={0.3 + (g / max) * 0.7}
          />
        );
      })}
    </g>
  );
}

function AttendanceCard() {
  const rows = [
    ["Marcus Reyes", 92, 0],
    ["Daniel Okafor", 88, 1],
    ["Ethan Park", 81, 2],
    ["Luis Herrera", 64, 5],
    ["Jonah Whitfield", 41, 9],
  ] as const;
  return (
    <g>
      <CardHeader kicker="Attendance · last 30 days" tag="22 PLAYERS" />
      <g className={MONO} fontSize={10} letterSpacing="0.12em">
        <text x={PAD} y={76}>
          PLAYER
        </text>
        <text x={CARD_W - PAD} y={76} textAnchor="end">
          UNANSWERED
        </text>
      </g>
      {rows.map(([name, pct, quiet], i) => {
        const y = 92 + i * 42;
        const barW = 150;
        return (
          <g key={name} transform={`translate(0 ${y})`}>
            <text x={PAD} y={14} fontSize={12.5} className="fill-fg">
              {name}
            </text>
            <rect x={PAD} y={22} width={barW} height={6} rx={3} className="pg-icon-bg" />
            <rect x={PAD} y={22} width={(barW * pct) / 100} height={6} rx={3} className="fill-fg" />
            <text x={PAD + barW + 10} y={28} fontSize={10.5} className="pg-mono fill-fg">
              {pct}%
            </text>
            <g transform={`translate(${CARD_W - PAD - 30} 6)`}>
              <rect width={30} height={18} rx={9} className={quiet >= 5 ? "fill-fg" : "pg-icon-bg"} />
              <text x={15} y={13} textAnchor="middle" fontSize={10.5} className={quiet >= 5 ? "pg-mono fill-bg" : "pg-mono fill-fg"}>
                {quiet}
              </text>
            </g>
          </g>
        );
      })}
      <text x={PAD} y={CARD_H - PAD + 2} fontSize={10.5} className={MONO}>
        Silence weighs more than a no: it leaves the captain guessing
      </text>
    </g>
  );
}
