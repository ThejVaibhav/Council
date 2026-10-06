// Handwritten margin note with a hand-drawn arrow, like a note on a paper itinerary.
export default function Scribble({ children, className = '', arrow = 'down-right' }) {
  return (
    <div className={`scribble ${className}`} aria-hidden="true">
      <span>{children}</span>
      <svg viewBox="0 0 90 90" className={`scribble-arrow arrow-${arrow}`}>
        <path d="M10 8 C 40 14, 52 30, 36 44 C 22 56, 44 66, 76 80" />
        <path d="M60 80 L 77 81 L 70 66" />
      </svg>
    </div>
  )
}
