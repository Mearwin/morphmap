import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  fallback?: ReactNode
  children: ReactNode
  resetKey?: unknown
}

type State = {
  error: Error | null
  prevResetKey: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, prevResetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.prevResetKey) {
      return { error: null, prevResetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{ padding: '2rem', color: '#ccc', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <pre style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--accent, #4a9eff)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
