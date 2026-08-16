import { Component } from 'react'
import '../styles/ErrorBoundary.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="error-boundary">
        <div className="error-boundary__card">
          <p className="error-boundary__title">Something went wrong</p>
          <p className="error-boundary__text">
            This page could not be displayed. You can go back or reload the app.
          </p>
          <div className="error-boundary__actions">
            <button
              type="button"
              className="error-boundary__secondary"
              onClick={() => window.history.back()}
            >
              Go back
            </button>
            <button
              type="button"
              className="error-boundary__primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary