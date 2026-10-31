import QRCode from "qrcode";
import { latinName } from "@/lib/latinName";
import { LEVEL_NAME, type Level } from "@/lib/levels";

// The certificate itself is always in English, like most language certificates,
// so it reads the same for any employer or school. Design: Ms Jane's mockup (2026-11-01).

/** A laurel branch drawn in gold; the right one is mirrored. */
function Laurel({ flip = false }: { flip?: boolean }) {
  const leaves = Array.from({ length: 7 }, (_, i) => i);
  return (
    <svg className={flip ? "cert-laurel flip" : "cert-laurel"} viewBox="0 0 60 120" aria-hidden="true">
      <path d="M44 116 C 18 96, 10 60, 26 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {leaves.map((i) => {
        const t = i / 6;
        const x = 44 - 30 * t + 12 * t * t;
        const y = 110 - 98 * t;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="-10" cy="-2" rx="11" ry="4.4" transform="rotate(-35)" fill="currentColor" />
            <ellipse cx="9" cy="-4" rx="10" ry="4" transform="rotate(-60)" fill="currentColor" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}

/** Gold rosette with navy ribbons and the Speakly name. */
function Seal() {
  const points = 28;
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? 46 : 50;
    const a = (Math.PI * i) / points;
    return `${(60 + r * Math.sin(a)).toFixed(2)},${(52 - r * Math.cos(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg className="cert-rosette" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <radialGradient id="cert-gold" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f6e2a6" />
          <stop offset="0.55" stopColor="#d6aa59" />
          <stop offset="1" stopColor="#a87a2c" />
        </radialGradient>
      </defs>
      <path d="M38 80 L24 134 L38 124 L48 138 L58 92 Z" fill="#172b50" stroke="#d6aa59" strokeWidth="1.5" />
      <path d="M82 80 L96 134 L82 124 L72 138 L62 92 Z" fill="#172b50" stroke="#d6aa59" strokeWidth="1.5" />
      <polygon points={d} fill="url(#cert-gold)" />
      <circle cx="60" cy="52" r="38" fill="none" stroke="#fff4d2" strokeWidth="1.2" opacity="0.8" />
      <circle cx="60" cy="52" r="34" fill="none" stroke="#a87a2c" strokeWidth="0.8" />
      <path d="M46 40 q7 -4 14 0 q7 -4 14 0 v12 q-7 -3 -14 0 q-7 -3 -14 0 Z M60 40 v12" fill="none" stroke="#7a5518" strokeWidth="1.4" />
      <text x="60" y="68" textAnchor="middle" fontFamily="EB Garamond, Georgia, serif" fontWeight="700" fontSize="13" fill="#3d2a0c">
        Speakly
      </text>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="cert-icon" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" className="cert-icon" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6Z M15 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export async function CertificateCard({
  name,
  level,
  issued,
  code,
  verifyUrl,
  sample = false,
}: {
  name: string;
  level: Level;
  issued: string;
  code: string;
  /** Host and path without the scheme, e.g. "speakly-jet.vercel.app/certificate/SPK-B2-…". */
  verifyUrl: string;
  /** Shown free after the test with a big "SAMPLE" across it; the clean one is paid. */
  sample?: boolean;
}) {
  const qr = await QRCode.toString(`https://${verifyUrl}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#172b50", light: "#00000000" },
  });

  return (
    <div className="certificate" lang="en">
      <div className="certificate-sheet">
        <svg className="cert-ribbon tl" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H200 C120 20 40 90 0 200 Z" fill="#172b50" />
          <path d="M0 150 C40 70 110 18 200 0 C120 30 50 90 10 200 Z" fill="url(#cert-ribbon-gold)" />
          <defs>
            <linearGradient id="cert-ribbon-gold" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#a87a2c" />
              <stop offset="0.5" stopColor="#f3d68f" />
              <stop offset="1" stopColor="#c99a45" />
            </linearGradient>
          </defs>
        </svg>
        <svg className="cert-ribbon br" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 H200 C120 20 40 90 0 200 Z" fill="#172b50" />
          <path d="M0 150 C40 70 110 18 200 0 C120 30 50 90 10 200 Z" fill="url(#cert-ribbon-gold)" />
        </svg>

        {sample && (
          <span className="cert-watermark" aria-hidden="true">
            SAMPLE
          </span>
        )}

        <div className="cert-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="Speakly" className="cert-logo" />
          <p className="cert-platform">
            <span>English Learning Platform</span>
          </p>

          <div className="cert-heading">
            <Laurel />
            <h1 className="cert-title">
              Speakly English Level
              <br />
              Certificate
            </h1>
            <Laurel flip />
          </div>
          <div className="cert-divider" aria-hidden="true">
            <svg viewBox="0 0 24 16">
              <path d="M12 1 L23 6 L12 11 L1 6 Z M5 8 v4 q7 4 14 0 v-4" fill="currentColor" />
            </svg>
          </div>

          <p className="cert-lead">This is to certify that</p>
          <p className="cert-name">{latinName(name)}</p>
          <p className="cert-lead">
            has successfully completed the Speakly English Level Test
            <br />
            and has been assessed at the
          </p>

          <div className="cert-badge-row">
            <div className="cert-badge">
              <strong>{level}</strong>
              <em>{LEVEL_NAME[level]}</em>
            </div>
          </div>

          <div className="cert-foot">
            <div className="cert-signature">
              <span className="cert-sign">Speakly</span>
              <b>Speakly Team</b>
              <span>English Learning Platform</span>
            </div>
            <Seal />
            <div className="cert-facts">
              <div className="cert-fact">
                <CalendarIcon />
                <span>
                  <small>Test Date:</small>
                  {issued}
                </span>
              </div>
              <div className="cert-fact">
                <IdIcon />
                <span>
                  <small>Certificate ID:</small>
                  <span className="cert-code">{code}</span>
                </span>
              </div>
            </div>
            {/* The free sample has no real certificate yet, so its QR is blurred out. */}
            <div className={sample ? "cert-qr pending" : "cert-qr"}>
              <span className="cert-qr-code" dangerouslySetInnerHTML={{ __html: qr }} />
              <small>Verify Certificate</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
