// Model text often carries light markdown (**bold**, line breaks, "- " lists). Render just that, safely.
function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <b key={`${key}-${i}`}>{part.slice(2, -2)}</b> : part.replace(/\*\*/g, ''),
  )
}

export default function RichText({ text, className }) {
  if (!text) return null
  const blocks = String(text).trim().split(/\n{2,}|\n(?=\s*(?:[-•*]\s|\*\*))/)
  return (
    <div className={`rich ${className ?? ''}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length && lines.every((l) => /^[-•*]\s/.test(l)))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-•*]\s/, ''), `${i}-${j}`)}</li>)}</ul>
        return <p key={i}>{inline(lines.join(' '), i)}</p>
      })}
    </div>
  )
}
