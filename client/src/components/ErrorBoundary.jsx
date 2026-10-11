import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Polar Twin] Render crash caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="max-w-md bg-white dark:bg-slate-900 border border-red-500/30 rounded-xl p-6 space-y-4 shadow-2xl text-center">
            <div className="flex justify-center">
              <AlertTriangle size={36} className="text-red-500" />
            </div>
            <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase">
              Component Render Error
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred while rendering this panel.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Recover Panel</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

