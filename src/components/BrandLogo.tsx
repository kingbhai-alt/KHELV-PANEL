import React, { useState, useEffect } from 'react';
import { PANDA_LOGO_URL } from '../assets/pandaMascot';

interface BrandLogoProps {
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * Resilient KHELV PENEL brand crest with bundled asset primary source
 * and inline metallic SVG fallback so no broken image frame can ever appear.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  src = PANDA_LOGO_URL,
  alt = 'KHELV PENEL',
  className = 'w-11 h-11 rounded-xl',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (imgFailed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex items-center justify-center bg-gradient-to-br from-[#0c1d3d] via-[#0a1329] to-[#070b14] border border-sky-400/60 shadow-[0_0_16px_rgba(14,165,233,0.45)] overflow-hidden shrink-0`}
      >
        <svg viewBox="0 0 64 64" className="w-[82%] h-[82%]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="29" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="24" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="3 2" />
          <path
            d="M16 26L22 17L32 23L42 17L48 26L44 33H20L16 26Z"
            fill="#0ea5e9"
            fillOpacity="0.25"
            stroke="#7dd3fc"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="45"
            textAnchor="middle"
            fill="#e0f2fe"
            fontSize="10"
            fontWeight="900"
            fontFamily="monospace"
            letterSpacing="1"
          >
            KHELV
          </text>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${className} object-cover shrink-0 bg-[#070b14]`}
    />
  );
};
