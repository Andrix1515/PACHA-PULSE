import { useId } from 'react'

/** Animated vector interpretation of the team's Icon.jpeg; no raster editing. */
export default function PachaRobot({ thinking = false, happy = false }: { thinking?: boolean; happy?: boolean }) {
  const id = useId().replaceAll(':', '')
  return <svg className={`pacha-robot rabbit-companion ${thinking ? 'is-thinking' : ''} ${happy ? 'is-happy' : ''}`} data-character="team-rabbit" viewBox="0 0 240 320" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-cream`} x1="50" y1="40" x2="180" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#fff5e5" /><stop offset="1" stopColor="#e8dcc7" /></linearGradient>
      <radialGradient id={`${id}-screen`} cx="0" cy="0" r="1" gradientTransform="translate(103 165) rotate(35) scale(105 80)" gradientUnits="userSpaceOnUse"><stop stopColor="#9affbd" /><stop offset="1" stopColor="#4fe892" /></radialGradient>
    </defs>
    <ellipse cx="121" cy="309" rx="67" ry="7" fill="#214b3020" />
    <g className="robot-float" stroke="#105336" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round">
      <g className="rabbit-ear rabbit-ear-left">
        <path d="M72 127C43 113 5 38 25 13c20-25 59 26 63 71 2 18 1 32-4 42Z" fill={`url(#${id}-cream)`} />
        <path d="M21 49q23-15 45-16l8 13q-25 2-47 16ZM37 83q23-14 44-14l4 14q-20-1-40 13Z" fill="#50e889" />
        <path d="M65 115q20-13 27-4c7 8-16 25-22 29-9 0-14-15-5-25Z" fill="#087544" />
      </g>
      <g className="rabbit-ear rabbit-ear-right">
        <path d="M158 126c-8-31 3-72 27-102 32-40 50-5 40 30-9 32-31 58-46 72Z" fill={`url(#${id}-cream)`} />
        <path d="M179 35q24 3 45 16l-5 14q-22-14-46-17ZM164 70q23 2 44 15l-9 13q-19-12-38-12Z" fill="#50e889" />
        <path d="m179 119 12-18" /><path d="M188 103q-14-6-9-18 13 3 9 18Zm0 1q7-14 21-9-3 14-21 9Z" fill="#86e348" />
        <path d="M155 110c4-10 27 1 34 13 6 11 0 14-8 12-14-6-31-14-26-25Z" fill="#087544" />
      </g>
      <g className="rabbit-foot rabbit-foot-left"><path d="m85 270-6 14c-29 12-34 30-13 32 21 3 45-1 48-13l-6-32" fill={`url(#${id}-cream)`} /><path d="M79 282q16 8 30 1l-2-10-22-4Z" fill="#087544" /><path d="m76 304-4 11m20-10-2 11" /></g>
      <g className="rabbit-foot rabbit-foot-right"><path d="m133 271-5 32c4 14 31 15 50 11 20-5 12-22-13-30l-5-14" fill={`url(#${id}-cream)`} /><path d="M132 283q17 6 32-1l-4-12-23 3Z" fill="#087544" /><path d="m150 305 2 11m14-13 4 11" /></g>
      <path d="M88 223c-20 6-30 16-25 25 7 8 15 4 26-3m62-22c20 6 30 16 25 25-7 8-15 4-26-3" fill="#087544" />
      <path d="M82 218c-10 14-13 42 5 53 18 13 48 13 66 1 18-13 15-41 5-54" fill={`url(#${id}-cream)`} />
      <path d="M104 223c-11 10-13 40 0 52m33-52c11 10 13 40 0 52" stroke="#557354" />
      <path d="M120 257q-17-1-16-15 16 0 16 15Zm0 0q-1-18 16-21 2 17-16 21Z" fill="#83dd4b" />
      <g className="robot-arm"><path d="M157 220c15-5 15 14 17 22 23 6 19 30-1 29-16 0-19-14-16-24" fill={`url(#${id}-cream)`} /><ellipse cx="157" cy="230" rx="9" ry="13" fill="#50e889" /><path d="m178 265 1 6" /></g>
      <path d="M83 220c-15-5-15 14-17 22-23 6-19 30 1 29 16 0 19-14 16-24" fill={`url(#${id}-cream)`} /><ellipse cx="83" cy="230" rx="9" ry="13" fill="#50e889" /><path d="m62 265-1 6" />
      <path d="M46 144c15-31 45-45 77-45 47 0 82 32 83 68 3 36-34 62-80 62-49 0-90-22-88-56 0-10 3-20 8-29Z" fill={`url(#${id}-cream)`} />
      <path d="M62 149c14-22 38-30 63-29 36 0 64 22 65 49 2 28-26 45-66 45-40 0-70-16-69-41 0-9 2-17 7-24Z" fill={`url(#${id}-screen)`} />
      <g className="robot-eyes" fill="#075430" stroke="none"><rect x="79" y="155" width="19" height="29" rx="3" transform="rotate(-5 79 155)" /><rect x="146" y="149" width="19" height="29" rx="3" transform="rotate(-5 146 149)" /></g>
      <path d="m115 179 11-1-5 7Z" fill="#075430" />
      {thinking ? <ellipse cx="122" cy="196" rx="5" ry="6" fill="#075430" stroke="none" /> : <path d={happy ? 'M105 191q17 24 35-2' : 'm106 192 9 6 8-7 8 5 8-8'} strokeWidth="4" />}
      <ellipse cx="71" cy="189" rx="7" ry="3" fill="#e9aa92" stroke="none" opacity=".75" /><ellipse cx="171" cy="183" rx="7" ry="3" fill="#e9aa92" stroke="none" opacity=".75" />
      <path d="M72 143q12-12 26-14" stroke="#c9ffde" strokeWidth="4" opacity=".7" />
    </g>
  </svg>
}
