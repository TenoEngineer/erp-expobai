import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  TrendingDown, 
  Percent, 
  QrCode, 
  PiggyBank, 
  RefreshCw, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getDrenoTaxas } from '../../services/api';

export default function CardFeeLeakageReport({ config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taxaDebito, setTaxaDebito] = useState(1.99);
  const [taxaCredito, setTaxaCredito] = useState(3.49);
  const [periodo, setPeriodo] = useState('todos');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getDrenoTaxas({
        taxa_debito: taxaDebito,
        taxa_credito: taxaCredito,
        periodo
      });
      setData(res);
    } catch (err) {
      console.error('Erro ao calcular dreno de taxas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [taxaDebito, taxaCredito, periodo]);

  const formatPrice = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const res = data?.resumo || {};
  const formas = data?.formas || [];
  const simulacao = data?.simulacao_pix || {};

  return (
    <div className="space-y-6">
      {/* Header com Parametrização de Taxas */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Dreno de Taxas por Meio de Pagamento
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Economia Real PIX
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cálculo exato de taxas pagas às operadoras de maquininha e simulação de economia líquida.
            </p>
          </div>
        </div>

        {/* Controles de Taxas das Maquininhas */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Taxa Débito:</span>
            <div className="flex items-center bg-slate-900 border border-slate-750 rounded-lg px-2 py-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={taxaDebito}
                onChange={(e) => setTaxaDebito(parseFloat(e.target.value) || 0)}
                className="w-14 bg-transparent text-white font-bold text-center outline-none"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Taxa Crédito:</span>
            <div className="flex items-center bg-slate-900 border border-slate-750 rounded-lg px-2 py-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={taxaCredito}
                onChange={(e) => setTaxaCredito(parseFloat(e.target.value) || 0)}
                className="w-14 bg-transparent text-white font-bold text-center outline-none"
              />
              <span className="text-slate-400 font-bold">%</span>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            title="Recalcular taxas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm font-semibold">Calculando dreno financeiro e tarifas de cartões...</p>
        </div>
      ) : (
        <>
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Faturamento Bruto
              </span>
              <div className="text-xl sm:text-2xl font-black text-white">
                {formatPrice(res.faturamento_bruto)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total registrado em caixa
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl border-rose-500/30">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Dreno de Taxas Bancárias
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-400">
                - {formatPrice(res.dreno_total_taxas)}
              </div>
              <p className="text-[11px] text-rose-400/80 mt-1 flex items-center gap-1 font-semibold">
                <TrendingDown className="w-3 h-3" />
                {res.pct_dreno_sobre_faturamento}% do faturamento perdido
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl border-emerald-500/30">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Faturamento Líquido Real
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatPrice(res.faturamento_liquido)}
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Dinheiro que efetivamente cai na conta
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Volume em Cartão (Maquininha)
              </span>
              <div className="text-xl sm:text-2xl font-black text-purple-400">
                {formatPrice(res.total_volume_cartao)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Representa {res.pct_volume_cartao}% de todas as vendas
              </p>
            </div>
          </div>

          {/* Comparativo de Formas de Pagamento e Taxas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800">
              <h3 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-400" />
                Demonstrativo de Dedução por Canal de Pagamento
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Meio de Pagamento</th>
                    <th className="py-3 px-4">Faturado Bruto</th>
                    <th className="py-3 px-4">Taxa %</th>
                    <th className="py-3 px-4">Taxa Paga (R$)</th>
                    <th className="py-3 px-4">Líquido no Bolso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {formas.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.cor }} />
                        {f.forma}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {formatPrice(f.faturado)}
                      </td>
                      <td className="py-3 px-4">
                        {f.taxa_pct > 0 ? (
                          <span className="font-bold text-rose-400">-{f.taxa_pct}%</span>
                        ) : (
                          <span className="font-bold text-emerald-400">0.00% (Grátis)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {f.taxa_reais > 0 ? (
                          <span className="font-black text-rose-400">- {formatPrice(f.taxa_reais)}</span>
                        ) : (
                          <span className="text-slate-500">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                        {formatPrice(f.liquido)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simulador Interativo: Economia com Migração para PIX */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 p-5 sm:p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <PiggyBank className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-wider">
                    Simulador: Quanto Dinheiro Fica no Seu Bolso Estimulando o PIX?
                  </h3>
                  <p className="text-xs text-slate-300">
                    O PIX é instantâneo e livre de taxas de operadoras. Veja o impacto de trocar a maquininha pelo QR Code:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Se Converter 25% dos Cartões
                </span>
                <div className="text-2xl font-black text-emerald-400">
                  + {formatPrice(simulacao.conversao_25_pct)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  lucro líquido recuperado
                </span>
              </div>

              <div className="bg-slate-950/80 border-2 border-emerald-500 p-4 rounded-2xl text-center shadow-lg shadow-emerald-950">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                  ⭐ Se Converter 50% dos Cartões
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                  + {formatPrice(simulacao.conversao_50_pct)}
                </div>
                <span className="text-[11px] text-emerald-300/80 mt-1 block font-bold">
                  lucro extra no caixa do evento
                </span>
              </div>

              <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Se 100% Usasse PIX / Dinheiro
                </span>
                <div className="text-2xl font-black text-emerald-400">
                  + {formatPrice(simulacao.conversao_total_cartao)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  zero centavos para bancos
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                💡 <b>Dica de Sucesso:</b> Imprima o QR Code PIX oficial gerado pelo ExpoERP bem na frente do caixa. O cliente escaneia em 3 segundos e a economia de taxas cobre com sobras o investimento no software!
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
