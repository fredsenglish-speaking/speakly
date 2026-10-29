import { latinName } from "@/lib/latinName";
import { LEVEL_NAME, type Level } from "@/lib/levels";

// The certificate itself is always in English, like most language certificates,
// so it reads the same for any employer or school.
const LEVEL_TEXT: Record<Level, string> = {
  A1: "Can understand and use familiar everyday expressions and very basic phrases.",
  A2: "Can communicate in simple, routine tasks on familiar topics and everyday matters.",
  B1: "Can deal with most everyday situations and describe experiences, plans and opinions.",
  B2: "Can interact with fluency and spontaneity and give clear, detailed views on a wide range of topics.",
  C1: "Can express ideas fluently and precisely, and use English flexibly for social, academic and professional purposes.",
  C2: "Can understand virtually everything heard or read, and express ideas spontaneously, very fluently and precisely, even in the most complex situations.",
};

export function CertificateCard({
  name,
  level,
  issued,
  code,
  verifyUrl,
}: {
  name: string;
  level: Level;
  issued: string;
  code: string;
  verifyUrl: string;
}) {
  return (
    <div className="certificate" lang="en">
      <div className="certificate-sheet">
        <p className="cert-wordmark">Speakly</p>
        <p className="cert-centre">Official Cambridge Preparation Centre</p>
        <h1 className="cert-title">Online Certificate</h1>
        <p className="cert-sub">of English Language Proficiency</p>

        <p className="cert-lead">This is to certify that</p>
        <p className="cert-name">{latinName(name)}</p>
        <p className="cert-lead">
          has completed the Speakly Online Level Test and has been assessed at
        </p>

        <div className="cert-level">
          <span className="cert-seal">{level}</span>
          <span className="cert-level-text">
            <strong>
              CEFR {level} · {LEVEL_NAME[level]}
            </strong>
            <span>{LEVEL_TEXT[level]}</span>
          </span>
        </div>

        <div className="cert-foot">
          <div>
            <span className="cert-line">{issued}</span>
            <span className="cert-label">Date of issue</span>
          </div>
          <div>
            <span className="cert-line cert-sign">Speakly</span>
            <span className="cert-label">Issued by</span>
          </div>
          <div>
            <span className="cert-line cert-code">{code}</span>
            <span className="cert-label">Certificate ID</span>
          </div>
        </div>
        <p className="cert-verify">Verify this certificate at {verifyUrl}</p>
      </div>
    </div>
  );
}
