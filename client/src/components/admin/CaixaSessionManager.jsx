import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Clock, 
  User, 
  DollarSign, 
  RefreshCw,
  X
} from 'lucide-react';
import { getCaixaStatus, abrirCaixa, fecharCaixa, getCaixaHistorico } from '../../services/api';

export default function CaixaSessionManager({ onSessionUpdated }) {
  const [session, setSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modais de Ação
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historico, setHistorico] = useState([]);

  // Form de Abertura
  const [operadorAbertura, setOperadorAbertura] = useState('Caixa 01');
  const [fundoAbertura, setFundoAbertura] = useState('');
  const [obsAbertura, setObsAbertura] = useState('');

  // Form de Fechamento
  const [valorContado, setValorContado] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');
  const [fechandoSubmitting, setFechandoSubmitting] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getCaixaStatus();
      setIsOpen(res.is_aberto);
      setSession(res.sessao);
      if (onSessionUpdated) {
        onSessionUpdated(res);
      }
    } catch (err) {
      console.error('Erro ao consultar sessão de caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    try {
      const data = await getCaixaHistorico(15);
      setHistorico(data);
      setShowHistoricoModal(true);
    } catch (err) {
      alert('Erro ao carregar histórico de turnos: ' + err.message);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAbrirSubmit = async (e) => {
    e.preventDefault();
    try {
      setFechandoSubmitting(true);
      await abrirCaixa({
        operador: operadorAbertura,
        valor_abertura: parseFloat(fundoAbertura) || 0,
        observacoes: obsAbertura
      });
      setShowAbrirModal(false);
      setFundoAbertura('');
      setObsAbertura('');
      await fetchStatus();
      alert('🎉 Turno de caixa aberto com sucesso!');
    } catch (err) {
      alert('Erro ao abrir caixa: ' + (err.response?.data?.error || err.message));
    } finally {
      setFechandoSubmitting(false);
    }
  };

  const handleFecharSubmit = async (e) => {
    e.preventDefault();
    try {
      setFechandoSubmitting(true);
      const res = await fecharCaixa({
        valor_fechamento_dinheiro: valorContado !== '' ? parseFloat(valorContado) : null,
        observacoes: obsFechamento
      });
      setShowFecharModal(false);
      setValorContado('');
      setObsFechamento('');
      await fetchStatus();
      
      const resumo = res.resultado?.resumo || {};
      const diff = resumo.diferenca_gaveta || 0;
      let diffMsg = 'Gaveta conferida perfeitamente!';
      if (diff > 0) diffMsg = `⚠️ Sobra em dinheiro de R$ ${diff.toFixed(2)}`;
      if (diff < 0) diffMsg = `⚠️ Falta em dinheiro de R$ ${Math.abs(diff).toFixed(2)}`;

      alert(`✅ Turno encerrado com sucesso!\n\n${diffMsg}`);
    } catch (err) {
      alert('Erro ao fechar caixa: ' + (err.response?.data?.error || err.message));
    } finally {
      setFechandoSubmitting(false);
    }
  };

  const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateTimeMS = (dt) => {
    if (!dt) return '-';
    return new Date(dt).toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      dateStyle: 'short',
      timeStyle: 'medium'
    }) + ' (MS)';
  };

  const totais = session?.totais || {};
  const fundo = parseFloat(session?.valor_abertura) || 0;
  const saldoEsperado = totais.saldo_esperado_gaveta || fundo;

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
      {/* Header do Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
            isOpen 
              ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400' 
              : 'bg-rose-500/20 border border-rose-400/40 text-rose-400'
          }`}>
            {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                Controle de Turno & Gaveta de Caixa
              </h4>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isOpen 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-950 text-rose-300 border-rose-500/40'
              }`}>
                {isOpen ? '🟢 Turno Operando' : '🔴 Caixa Fechado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ideal para a operação de madrugada: controle de fundo de troco, conferência física de cédulas e abertura/fechamento por turno
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Atualizar caixa"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={fetchHistorico}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Turnos Anteriores</span>
          </button>

          {isOpen ? (
            <button
              type="button"
              onClick={() => setShowFecharModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-950/40 border border-rose-500 flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Encerrar Turno & Gaveta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAbrirModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/40 border border-emerald-500 flex items-center gap-1.5 transition-all"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Abrir Novo Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo do Turno Aberto */}
      {isOpen && session ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
              Operador & Início
            </span>
            <span className="font-extrabold text-sm text-slate-100 block mt-0.5">
              👤 {session.operador || 'Caixa'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              {formatDateTimeMS(session.aberto_em)}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
              Fundo de Troco Inicial
            </span>
            <span className="font-black text-sm text-amber-300 font-mono block mt-0.5">
              {formatPrice(session.valor_abertura)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Cédulas colocadas na abertura
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
            <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">
              Vendas no Turno (Total)
            </span>
            <span className="font-black text-sm text-emerald-300 font-mono block mt-0.5">
              {formatPrice(totais.faturamento_total)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {totais.total_pedidos || 0} pedidos faturados
            </span>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/30 p-3 rounded-xl">
            <span className="text-[11px] text-emerald-400 font-black uppercase tracking-wider block">
              Saldo Esperado na Gaveta
            </span>
            <span className="font-black text-base text-emerald-200 font-mono block mt-0.5">
              {formatPrice(saldoEsperado)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Fundo ({formatPrice(fundo)}) + Cédulas ({formatPrice(totais.total_dinheiro)})
            </span>
          </div>
        </div>
      ) : (
        <div className="py-3 px-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Nenhum turno de caixa aberto no momento. Clique em <b>"Abrir Novo Turno"</b> para registrar o fundo de troco da madrugada.</span>
          <button
            onClick={() => setShowAbrirModal(true)}
            className="text-emerald-400 font-bold hover:underline"
          >
            Iniciar Turno Agora &rarr;
          </button>
        </div>
      )}

      {/* MODAL 1: ABRIR CAIXA */}
      {showAbrirModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <span>Abertura de Caixa (Novo Turno)</span>
              </h3>
              <button 
                onClick={() => setShowAbrirModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAbrirSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome do Operador / Caixa
                </label>
                <input
                  type="text"
                  required
                  value={operadorAbertura}
                  onChange={(e) => setOperadorAbertura(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Fran / Heitor / Caixa 01"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  Fundo de Troco Inicial (R$ Dinheiro Físico)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={fundoAbertura}
                  onChange={(e) => setFundoAbertura(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  autoFocus
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Informe o valor que está sendo colocado na gaveta para iniciar o atendimento.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={obsAbertura}
                  onChange={(e) => setObsAbertura(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Turno da Noite / Madrugada de Sábado"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAbrirModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fechandoSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {fechandoSubmitting ? 'Abrindo...' : 'Confirmar Abertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FECHAR CAIXA */}
      {showFecharModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <span>Encerramento de Turno & Conferência de Gaveta</span>
              </h3>
              <button 
                onClick={() => setShowFecharModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFecharSubmit} className="space-y-4">
              {/* Resumo Financeiro do Turno */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Operador do Turno:</span>
                  <b className="text-white">{session?.operador}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Fundo de Troco Inicial:</span>
                  <b className="font-mono text-amber-400">{formatPrice(session?.valor_abertura)}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Vendas em Cédulas (Dinheiro):</span>
                  <b className="font-mono text-emerald-400">{formatPrice(totais.total_dinheiro)}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Vendas em PIX:</span>
                  <b className="font-mono text-cyan-400">{formatPrice(totais.total_pix)}</b>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Vendas em Cartão (Débito/Crédito):</span>
                  <b className="font-mono text-purple-400">{formatPrice((totais.total_debito || 0) + (totais.total_credito || 0))}</b>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm text-emerald-300">
                  <span>Saldo Físico Esperado na Gaveta:</span>
                  <span className="font-mono">{formatPrice(saldoEsperado)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Valor Contado Fisicamente na Gaveta (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={valorContado}
                  onChange={(e) => setValorContado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="Informe o total de notas contadas"
                  autoFocus
                />
                {valorContado !== '' && (
                  <div className="mt-2 text-xs font-mono font-bold">
                    {parseFloat(valorContado) - saldoEsperado === 0 ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Caixa Bateu Perfeitamente! (Diferença: R$ 0,00)
                      </span>
                    ) : parseFloat(valorContado) - saldoEsperado > 0 ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Sobra de Caixa: +{formatPrice(parseFloat(valorContado) - saldoEsperado)}
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Falta de Caixa: -{formatPrice(Math.abs(parseFloat(valorContado) - saldoEsperado))}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observações de Fechamento (Opcional)
                </label>
                <input
                  type="text"
                  value={obsFechamento}
                  onChange={(e) => setObsFechamento(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="Ex: Entregue a Heitor às 04h30 com envelope lacrado"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFecharModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fechandoSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {fechandoSubmitting ? 'Encerrando...' : 'Conferir & Fechar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTÓRICO DE TURNOS ANTERIORES */}
      {showHistoricoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <span>Histórico de Turnos e Sessões Anteriores</span>
              </h3>
              <button 
                onClick={() => setShowHistoricoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {historico.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Nenhum turno anterior registrado.</p>
              ) : (
                historico.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400 font-mono">Turno #{h.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          h.status === 'aberto' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {h.status}
                        </span>
                        <span className="text-slate-400 font-bold">👤 {h.operador}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {formatDateTimeMS(h.aberto_em)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Fundo Inicial:</span>
                        <span className="font-bold text-amber-300">{formatPrice(h.valor_abertura)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Contado Fechamento:</span>
                        <span className="font-bold text-emerald-300">{formatPrice(h.valor_fechamento_dinheiro)}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block">Encerramento:</span>
                        <span className="text-slate-300">{formatDateTimeMS(h.fechado_em)}</span>
                      </div>
                    </div>

                    {h.observacoes && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                        💬 {h.observacoes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHistoricoModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
