// Painted sunset backdrop: sky gradient, sun, layered ridges, and film grain. Pure SVG, no image assets.
export default function Landscape({ dimmed = false }) {
  return (
    <div className={`landscape ${dimmed ? 'landscape-dimmed' : ''}`} aria-hidden="true">
      <svg className="landscape-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--sky-top)" />
            <stop offset="0.55" stopColor="var(--sky-mid)" />
            <stop offset="1" stopColor="var(--sky-low)" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--sun)" stopOpacity="0.85" />
            <stop offset="0.35" stopColor="var(--sun)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#sky)" />
        <circle className="sun-glow" cx="1080" cy="560" r="300" fill="url(#sunGlow)" />
        <circle cx="1080" cy="560" r="62" fill="var(--sun)" opacity="0.9" />
        <path
          fill="var(--ridge-1)"
          d="M0 610 C120 560 210 590 300 548 C400 500 470 560 560 530 C660 496 730 470 820 512 C910 552 990 520 1080 540 C1180 562 1260 500 1340 520 C1390 532 1420 540 1440 536 V900 H0Z"
        />
        <path
          fill="var(--ridge-2)"
          d="M0 680 C90 640 180 660 260 626 C360 584 450 640 540 618 C650 590 720 600 800 632 C900 672 1000 610 1110 628 C1210 646 1300 610 1440 640 V900 H0Z"
        />
        <path
          fill="var(--ridge-3)"
          d="M0 760 C140 712 240 730 360 702 C470 676 560 720 680 714 C800 708 880 680 1000 702 C1120 724 1240 700 1440 724 V900 H0Z"
        />
        <path
          fill="var(--ridge-4)"
          d="M0 840 C200 800 320 812 480 796 C640 780 760 812 920 806 C1080 800 1240 780 1440 800 V900 H0Z"
        />
      </svg>
      <svg className="grain" aria-hidden="true">
        <filter id="grainFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grainFilter)" />
      </svg>
    </div>
  )
}
