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
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-white mb-2">
            Ops! Algo inesperado aconteceu.
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Ocorreu um erro ao carregar a tela. Clique no botão abaixo para recarregar o sistema.
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl max-w-md w-full mb-6 text-left font-mono text-xs text-rose-400 overflow-x-auto">
            {this.state.error?.message || 'Erro desconhecido'}
          </div>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Sistema</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
