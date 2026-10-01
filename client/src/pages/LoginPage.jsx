import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { login } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      setError('Preencha seu e-mail e sua senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email, senha);
      localStorage.setItem('expoerp_token', res.token);
      localStorage.setItem('expoerp_user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.response?.data?.error || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo boothName="ExpoERP" subtitle="Frente de Caixa e Gestão" size={54} />
          <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">
            Entrar no Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Digite suas credenciais para continuar
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário: Apenas E-mail e Senha */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                autoFocus
                className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50 mt-6"
          >
            {loading ? (
              <span>Entrando...</span>
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé Limpo */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          ExpoERP 2026 &bull; Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}
