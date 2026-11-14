export default function PachaRobot({ thinking = false }: { thinking?: boolean }) {
  return <svg className={`pacha-robot ${thinking ? 'is-thinking' : ''}`} viewBox="0 0 180 175" fill="none" aria-hidden="true">
    <ellipse cx="90" cy="162" rx="46" ry="7" fill="#244a3820" />
    <g className="robot-float"><path d="M88 33V19" stroke="#465d3c" strokeWidth="5" strokeLinecap="round" /><path d="M89 22C67 23 66 6 68 6c15-1 24 6 21 16Z" fill="#86a75d" /><path d="M90 19C91 6 104 6 110 8c-2 11-10 16-20 11Z" fill="#b3ca7b" />
      <g className="robot-arm"><path d="M140 87c20-6 29 13 22 24-3 5-15 0-21-3" fill="#e6e4d8" stroke="#465d3c" strokeWidth="3" /></g>
      <path d="M40 87c-21-5-28 15-20 25 5 5 17-1 23-6" fill="#e6e4d8" stroke="#465d3c" strokeWidth="3" />
      <path d="M64 145v10c0 9-25 8-24-2l5-17M114 145v10c0 9 25 8 24-2l-5-17" fill="#90a66d" stroke="#465d3c" strokeWidth="3" />
      <path d="M41 76C25 102 25 144 51 150c21 6 57 6 79 0 26-7 25-49 9-74" fill="#f9f5e8" stroke="#465d3c" strokeWidth="3" />
      <rect x="33" y="33" width="115" height="67" rx="29" fill="#faf8ec" stroke="#465d3c" strokeWidth="3" /><rect x="46" y="45" width="89" height="43" rx="20" fill="#334e3f" />
      <g className="robot-eyes"><ellipse cx="70" cy="63" rx="5" ry="7" fill="#def2b3" /><ellipse cx="111" cy="63" rx="5" ry="7" fill="#def2b3" /></g>
      <path d="M83 73q8 7 15 0" stroke="#def2b3" strokeWidth="3" strokeLinecap="round" /><ellipse cx="58" cy="76" rx="6" ry="3" fill="#e8b895" /><ellipse cx="123" cy="76" rx="6" ry="3" fill="#e8b895" />
      <circle cx="90" cy="123" r="13" fill="#dfebc5" /><path d="M90 131v-12m0 4q-10 0-8-9 9 0 8 9Zm0-1q0-9 9-9 1 9-9 9Z" stroke="#627e4b" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
}
