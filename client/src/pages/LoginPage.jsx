import React, { useState, useEffect } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ArrowRight, ShieldCheck, Store, Sparkles, UserCheck } from 'lucide-react';
import Logo from '../components/Logo';
import { login, loginPin, getPublicTenants } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('email'); // 'email' ou 'pin'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [pin, setPin] = useState('');
  const [tenantId, setTenantId] = useState('tenda-muller');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Carrega lista pública de tendas para seleção de PIN
    const loadTenants = async () => {
      try {
        const data = await getPublicTenants();
        if (Array.isArray(data) && data.length > 0) {
          setTenants(data);
          setTenantId(data[0].id);
        }
      } catch (err) {
        // Fallback silencioso se offline
        setTenants([{ id: 'tenda-muller', nome: 'Tenda dos Müller' }]);
      }
    };
    loadTenants();
  }, []);

  const handleLoginEmail = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      setError('Preencha seu e-mail e senha.');
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
      setError(err.response?.data?.error || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPin = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Digite o PIN de acesso.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginPin(tenantId, pin);
      localStorage.setItem('expoerp_token', res.token);
      localStorage.setItem('expoerp_user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.response?.data?.error || 'PIN incorreto para esta tenda.');
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
        {/* Cabeçalho com Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo boothName="ExpoERP" subtitle="Plataforma de Gestão & PDV" size={54} />
          <h2 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Frente de Caixa Ágil &bull; Feiras e Eventos
          </p>
        </div>

        {/* Seletor de Modo: E-mail / PIN */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setMode('email'); setError(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'email'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Admin / Gestão</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('pin'); setError(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'pin'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Caixa Rápido (PIN)</span>
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário: E-mail e Senha */}
        {mode === 'email' ? (
          <form onSubmit={handleLoginEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@expoerp.com.br"
                  required
                  autoFocus
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha Criptografada
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
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Formulário: PIN Rápido para Operadores */
          <form onSubmit={handleLoginPin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Selecione a sua Tenda / Estande
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                PIN de Operador (4 a 6 dígitos)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1234"
                  required
                  autoFocus
                  className="w-full h-11 pl-10 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center font-mono tracking-widest text-lg font-black text-amber-400 placeholder-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all cursor-pointer disabled:opacity-50 mt-6"
            >
              {loading ? (
                <span>Acessando...</span>
              ) : (
                <>
                  <span>Abrir Caixa Rápido</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Rodapé Seguro */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Isolamento Multi-Tenant</span>
          </div>
          <span>ExpoERP v2.0</span>
        </div>
      </div>
    </div>
  );
}
