import { useState } from 'react'
import type { BackgroundId } from '../content/ids'

/** Eight original illustrated postcard backgrounds (SVG). */
export function PostcardArt({ id, interactive, onEgg }: { id: BackgroundId; interactive?: boolean; onEgg?: (egg: 'origami_lantern') => void }) {
  const [lantern, setLantern] = useState(false)
  return (
    <svg viewBox="0 0 300 180" className={`pc-art pc-${id}`} role="img" aria-label={`Postcard background: ${id.replace('_', ' ')}`} preserveAspectRatio="xMidYMid slice">
      {id === 'lanterns' && (
        <g>
          <rect width="300" height="180" fill="#323E64" />
          <path d="M0 40 Q75 70 150 40 T300 40" stroke="#2B2230" strokeWidth="2" fill="none" />
          {[30, 75, 120, 165, 210, 255].map((x, i) => (
            <g key={x} className="sway-soft" style={{ transformOrigin: `${x}px ${50 + (i % 2) * 10}px` }}>
              <ellipse cx={x} cy={62 + (i % 2) * 10} rx="13" ry="16" fill={i % 2 ? '#DA887C' : '#EAA84C'} />
              <ellipse cx={x} cy={62 + (i % 2) * 10} rx="6" ry="9" fill="#FFE2A6" opacity="0.8" />
            </g>
          ))}
          <rect y="130" width="300" height="50" fill="#5D4235" />
          <rect y="128" width="300" height="4" fill="#EAA84C" opacity="0.6" />
        </g>
      )}
      {id === 'rainy_window' && (
        <g>
          <rect width="300" height="180" fill="#5A6A86" />
          <rect x="20" y="16" width="260" height="148" rx="6" fill="#7C8FAE" stroke="#2B2230" strokeWidth="4" />
          <path d="M150 16v148M20 90h260" stroke="#2B2230" strokeWidth="4" />
          {Array.from({ length: 26 }, (_, i) => (
            <line key={i} className="rain" style={{ animationDelay: `${(i % 9) * 0.2}s` }} x1={30 + ((i * 37) % 240)} y1={20 + ((i * 53) % 120)} x2={27 + ((i * 37) % 240)} y2={32 + ((i * 53) % 120)} stroke="#D7E4F3" strokeWidth="2" />
          ))}
          <rect x="40" y="150" width="70" height="14" rx="3" fill="#779A7A" />
        </g>
      )}
      {id === 'koi_pond' && (
        <g>
          <rect width="300" height="180" fill="#6FA3B8" />
          <circle cx="60" cy="40" r="22" fill="#779A7A" opacity="0.8" />
          <circle cx="250" cy="140" r="26" fill="#779A7A" opacity="0.8" />
          <g className="koi-swim">
            <path d="M110 90q20-14 40 0q-20 14-40 0z" fill="#F08A3C" />
            <path d="M150 90l12-8v16z" fill="#F08A3C" />
            <circle cx="122" cy="88" r="2" fill="#2B2230" />
            <path d="M128 84q8-3 12 3" stroke="#FFFFFF" strokeWidth="3" fill="none" />
          </g>
          <g className="koi-swim slow">
            <path d="M190 50q16-11 32 0q-16 11-32 0z" fill="#FFFFFF" />
            <path d="M222 50l9-6v12z" fill="#FFFFFF" />
            <circle cx="200" cy="48" r="4" fill="#DA887C" />
          </g>
        </g>
      )}
      {id === 'museum_textile' && (
        <g>
          <rect width="300" height="180" fill="#F9F1DF" />
          {Array.from({ length: 7 }, (_, r) =>
            Array.from({ length: 11 }, (_, c) => (
              <path
                key={`${r}-${c}`}
                d={`M${c * 30 - 5} ${r * 28 + 10} l12 -10 l12 10 l-12 10z`}
                fill={(r + c) % 3 === 0 ? '#DA887C' : (r + c) % 3 === 1 ? '#779A7A' : '#B7A9CC'}
                opacity="0.85"
              />
            )),
          )}
          <rect x="0" y="0" width="300" height="180" fill="none" stroke="#5D4235" strokeWidth="10" />
          {interactive && (
            <g
              role="button"
              tabIndex={0}
              aria-label="A folded corner of the textile"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setLantern(true)
                onEgg?.('origami_lantern')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLantern(true)
                  onEgg?.('origami_lantern')
                }
              }}
            >
              <path d="M262 150l24 0l-24 20z" fill="#EAA84C" stroke="#5D4235" strokeWidth="2" />
            </g>
          )}
          {lantern && (
            <g className="origami">
              <path d="M150 50l22 30l-22 40l-22-40z" fill="#EAA84C" stroke="#5D4235" strokeWidth="3" />
              <path d="M128 80h44M150 50v70" stroke="#5D4235" strokeWidth="2" />
              <ellipse cx="150" cy="86" rx="8" ry="12" fill="#FFE2A6" />
            </g>
          )}
        </g>
      )}
      {id === 'flower_courtyard' && (
        <g>
          <rect width="300" height="180" fill="#E8D9B8" />
          <rect y="120" width="300" height="60" fill="#C9B48C" />
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i} transform={`translate(${20 + i * 20} ${40 + ((i * 29) % 70)})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={Math.sin((a * Math.PI) / 180) * 6} r="5" fill={i % 3 ? '#DA887C' : '#F9F1DF'} />
              ))}
              <circle r="3.5" fill="#EAA84C" />
            </g>
          ))}
          <path d="M0 120q150-30 300 0" stroke="#779A7A" strokeWidth="8" fill="none" />
        </g>
      )}
      {id === 'mountain_clouds' && (
        <g>
          <rect width="300" height="180" fill="#B7A9CC" />
          <path d="M0 150 L70 60 L110 110 L160 40 L230 120 L300 70 V180 H0Z" fill="#779A7A" />
          <path d="M160 40l-14 20h28z" fill="#F9F1DF" />
          <g className="cloud-drift">
            <ellipse cx="80" cy="90" rx="40" ry="10" fill="#F9F1DF" opacity="0.9" />
            <ellipse cx="220" cy="70" rx="50" ry="12" fill="#F9F1DF" opacity="0.85" />
          </g>
        </g>
      )}
      {id === 'winter_snow' && (
        <g>
          <rect width="300" height="180" fill="#9FB4CF" />
          <path d="M0 140q80-20 150 0t150 0V180H0Z" fill="#F7F9FC" />
          <path d="M60 140l20-50 20 50z" fill="#5F8063" />
          <path d="M210 140l16-40 16 40z" fill="#5F8063" />
          {Array.from({ length: 36 }, (_, i) => (
            <circle key={i} className="snow" style={{ animationDelay: `${(i % 12) * 0.4}s` }} cx={(i * 47) % 300} cy={(i * 31) % 150} r={i % 4 === 0 ? 2.6 : 1.6} fill="#FFFFFF" />
          ))}
        </g>
      )}
      {id === 'moonlit_rooftop' && (
        <g>
          <rect width="300" height="180" fill="#323E64" />
          <circle cx="240" cy="40" r="18" fill="#FFE9B0" />
          <circle cx="248" cy="35" r="16" fill="#323E64" />
          {Array.from({ length: 18 }, (_, i) => (
            <circle key={i} className="twinkle" style={{ animationDelay: `${(i % 6) * 0.5}s` }} cx={(i * 61) % 300} cy={(i * 17) % 80} r="1.4" fill="#F9F1DF" />
          ))}
          <path d="M0 130 h40 v-30 h30 l15 -12 l15 12 h30 v30 h40 v-20 h40 v20 h40 v-36 h50 V180 H0Z" fill="#2B2230" />
          {[18, 52, 96, 140, 176, 232, 262].map((x) => (
            <rect key={x} x={x} y="140" width="6" height="7" fill="#EAA84C" opacity="0.85" />
          ))}
        </g>
      )}
    </svg>
  )
}
