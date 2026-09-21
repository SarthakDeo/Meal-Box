import './TiffinLoader.css';

export default function TiffinLoader({ text = "Loading meal box...", fullPage = false, size = "normal" }) {
  const content = (
    <div className={`tiffin-loader-container ${size}`}>
      <svg className="tiffin-svg" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam Lines */}
        <g className="steam-line">
          <path d="M 42 22 C 40 17, 44 14, 42 9" stroke="var(--primary-color, #F97316)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 50 20 C 48 15, 52 12, 50 7" stroke="var(--primary-color, #F97316)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 58 22 C 56 17, 60 14, 58 9" stroke="var(--primary-color, #F97316)" strokeWidth="2" strokeLinecap="round"/>
        </g>

        {/* TIER 3: Top Lid & Handle */}
        <g className="tier-3">
          {/* Top Handle */}
          <path d="M 40 30 C 40 22, 60 22, 60 30" stroke="var(--neutral-300, #E5E7EB)" strokeWidth="3" strokeLinecap="round" fill="none"/>
          {/* Top Box */}
          <rect x="25" y="30" width="50" height="20" rx="4" fill="var(--neutral-300, #E5E7EB)"/>
          <rect x="25" y="46" width="50" height="4" fill="var(--primary-color, #F97316)"/>
        </g>

        {/* TIER 2: Middle Container */}
        <g className="tier-2">
          <rect x="25" y="54" width="50" height="20" rx="4" fill="var(--neutral-300, #E5E7EB)"/>
          <rect x="25" y="70" width="50" height="4" fill="var(--neutral-700, #374151)"/>
        </g>

        {/* TIER 1: Bottom Container */}
        <g className="tier-1">
          <rect x="25" y="78" width="50" height="22" rx="4" fill="var(--neutral-300, #E5E7EB)"/>
          <rect x="25" y="96" width="50" height="4" fill="var(--neutral-700, #374151)"/>
        </g>
      </svg>

      {text && <div className="tiffin-loading-text">{text}</div>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="tiffin-loader-fullpage">
        {content}
      </div>
    );
  }

  return content;
}
