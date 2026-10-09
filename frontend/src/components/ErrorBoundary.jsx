import { Component } from 'react'

/** Keeps one broken widget from blanking the whole page; resets when `resetKey` changes. */
export default class ErrorBoundary extends Component {
  state = { error: null, key: undefined }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error, info) {
    console.error('Council UI error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return this.props.fallback ?? (
      <div className="error-card glass" role="alert">
        <strong>Something on this page hit a snag.</strong>
        <p>Your plan is safe. Try that again, or reload the page.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    )
  }
}
