import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PALAS | Senin Zihin Sarayın",
  description: "Anıların ve fikirlerin için yaşayan, sıcak bir zihin sarayı.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <svg aria-hidden="true" className="svg-filters">
          <filter id="hand-drawn">
            <feTurbulence baseFrequency="0.035" numOctaves="2" seed="8" type="fractalNoise" />
            <feDisplacementMap in="SourceGraphic" scale="2.5" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}