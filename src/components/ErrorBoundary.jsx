import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-rose-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-base font-extrabold text-white">Terjadi Kendala Komponen</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.toString() || 'Komponen mengalami error runtime'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Reset & Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
