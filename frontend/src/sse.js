// POST + Server Sent Events. EventSource only supports GET, so read the stream by hand.
export async function streamDebate(url, body, onEvent, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let detail = null
    try {
      const body = await res.json()
      detail = typeof body.detail === 'string' ? body.detail : body.detail?.[0]?.msg
    } catch {
      // not JSON, e.g. the dev proxy's 502 when the backend is down
    }
    throw new Error(detail || `could not reach the Council server (HTTP ${res.status}). Is the backend running?`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let type = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) type = line.slice(7)
        else if (line.startsWith('data: ')) data += line.slice(6)
      }
      if (data) onEvent(type, JSON.parse(data))
    }
  }
}
