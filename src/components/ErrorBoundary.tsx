import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render/runtime errors in the routed page so a single broken page
// never blanks the whole app (navbar, other routes stay usable).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary] page crashed:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong on this page.</h1>
          <p className="text-sm text-slate-500 mb-1">The rest of the app is still working — use the menu to navigate.</p>
          <p className="text-xs text-slate-400 break-words mb-5">{error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
