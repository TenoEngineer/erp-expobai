import React, { useState, useEffect } from 'react';
import { ShieldAlert, Smartphone, MessageCircle, RefreshCw, LogOut, Lock } from 'lucide-react';
import { desconectarOutrosDispositivos } from '../services/api';

export default function SecurityLockoutModal({ onLogout }) {
  const [lockoutState, setLockoutState] = useState(null); // { type: 'license' | 'device', data: any }
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const handleTenantLockout = (e) => {
      setLockoutState({
        type: 'license',
        data: e.detail || {}
      });
    };

    const handleDeviceLimit = (e) => {
      setLockoutState({
        type: 'device',
        data: e.detail || {}
      });
    };

    window.addEventListener('expoerp:tenant_lockout', handleTenantLockout);
    window.addEventListener('expoerp:device_limit', handleDeviceLimit);

    return () => {
      window.removeEventListener('expoerp:tenant_lockout', handleTenantLockout);
      window.removeEventListener('expoerp:device_limit', handleDeviceLimit);
    };
  }, []);

  if (!lockoutState) return null;

  const handleDisconnectOthers = async () => {
    try {
      setIsResetting(true);
      await desconectarOutrosDispositivos();
      setResetSuccess(true);
      setTimeout(() => {
        setLockoutState(null);
        window.location.reload();
      }, 1200);
    } catch (err) {
      alert('Não foi possível desconectar os outros aparelhos: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsResetting(false);
    }
  };

  const isLicenseLockout = lockoutState.type === 'license';

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-red-950/50 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Ícone de Alerta */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
          {isLicenseLockout ? (
            <ShieldAlert className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
          ) : (
            <Smartphone className="w-9 h-9 sm:w-11 sm:h-11 text-amber-500 animate-bounce" />
          )}
        </div>

        {/* Título */}
        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
          {isLicenseLockout ? 'Acesso ao Estande Bloqueado' : 'Limite de Aparelhos Atingido'}
        </h2>

        {/* Mensagem Explicativa */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
          {lockoutState.data.message || (
            isLicenseLockout
              ? 'O período de contratação deste evento expirou ou o acesso foi suspenso pela administração.'
              : 'O seu plano contratado atingiu o limite máximo de pontos de venda e aparelhos conectados simultaneamente.'
          )}
        </p>

        {/* Detalhes para Limite de Aparelhos */}
        {!isLicenseLockout && lockoutState.data.limite && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 text-left text-xs sm:text-sm space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Limite contratado:</span>
              <span className="font-bold text-white">{lockoutState.data.limite} ponto(s) simultâneo(s)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Aparelhos ativos agora:</span>
              <span className="font-bold text-amber-400">{lockoutState.data.ativos} aparelhos em uso</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              💡 <i>Dica: Se algum celular ou tablet foi desligado recentemente, ele é liberado automaticamente após 20 minutos de inatividade, ou você pode desconectá-los agora mesmo abaixo.</i>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col gap-3">
          {isLicenseLockout ? (
            <>
              <a
                href="https://wa.me/5567999718420?text=Ol%C3%A1%2C%20gostaria%20de%20renovar%20a%20licen%C3%A7a%20do%20meu%20estande%20no%20ExpoERP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Falar no WhatsApp / Renovar Licença</span>
              </a>

              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 w-full py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Trocar de Conta / Sair</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDisconnectOthers}
                disabled={isResetting || resetSuccess}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950 transition-all hover:scale-[1.02]"
              >
                <RefreshCw className={`w-5 h-5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>
                  {resetSuccess ? '✓ Outros Aparelhos Desconectados!' : isResetting ? 'Liberando vagas...' : 'Desconectar outros aparelhos e entrar'}
                </span>
              </button>

              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 w-full py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair e Usar em Outro Momento</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
