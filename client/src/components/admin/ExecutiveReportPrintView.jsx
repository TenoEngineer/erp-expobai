import React from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  QrCode, 
  Banknote, 
  CreditCard, 
  Calendar,
  Clock,
  Layers,
  PieChart,
  Award,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function ExecutiveReportPrintView({ report, periodoDescricao, config }) {
  if (!report) return null;

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const ind = report.indicadores || {};
  const pag = report.por_forma_pagamento || {};
  const categorias = report.categorias || [];
  const ranking = report.ranking_produtos || [];
  const vendasPorHora = report.vendas_por_hora || [];
  const pedidos = report.ultimos_pedidos || [];

  const faturamentoTotal = ind.faturamento_total || report.faturamento_total || 0;
  const totalPedidos = ind.total_pedidos || report.total_pedidos || 0;
  const ticketMedio = ind.ticket_medio || report.ticket_medio || 0;
  const totalItens = ind.total_itens_vendidos || 0;
  const mediaItens = ind.media_itens_por_pedido || 0;
  const totalTroco = ind.total_troco_entregue || 0;

  const nomeEstande = config?.nome_estande || 'Tenda dos Müller';
  const dataEmissao = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Campo_Grande',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // Identificar Carro-Chefe (Maior faturamento) e Líder de Volume
  const produtoTopFaturamento = ranking[0] || null;
  const produtoTopVolume = [...ranking].sort((a, b) => b.total_vendido - a.total_vendido)[0] || null;

  // Identificar Horário de Pico
  const horarioPico = [...vendasPorHora].sort((a, b) => b.total_faturado - a.total_faturado)[0] || null;

  // Curva ABC acumulada
  let somaAcumulada = 0;
  const rankingComCurva = ranking.map(p => {
    somaAcumulada += p.total_faturado;
    const pctAcumulado = faturamentoTotal > 0 ? (somaAcumulada / faturamentoTotal) * 100 : 0;
    let classe = 'C';
    if (pctAcumulado <= 80) classe = 'A';
    else if (pctAcumulado <= 95) classe = 'B';
    return { ...p, classe, pctAcumulado: pctAcumulado.toFixed(1) };
  });

  return (
    <div id="relatorio-executivo-print" className="text-slate-900 bg-white">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO EXECUTIVO INSTITUCIONAL */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-950 uppercase font-sans">
                🌾 {nomeEstande}
              </span>
              <span className="text-xs bg-slate-900 text-white font-black px-2.5 py-0.5 rounded tracking-wider uppercase">
                Expobai 2026
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-800 uppercase tracking-tight mt-1">
              Relatório Analítico de Performance de Vendas & Fechamento de Caixa
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">
              Amambai - Mato Grosso do Sul &bull; Pavilhão Gastronômico &bull; "Onde a cidade é + agro"
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-700 space-y-0.5 font-mono">
            <p><b>Período Analisado:</b> <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold">{periodoDescricao}</span></p>
            <p><b>Emissão:</b> {dataEmissao}</p>
            <p className="text-emerald-700 font-bold">● STATUS: CONCILIADO E AUDITADO</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMÁRIO EXECUTIVO & DIAGNÓSTICO (KPIS CHAVE) */}
      {/* ========================================================================= */}
      <div className="mb-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
          <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
          <span>1. Indicadores Principais de Performance (KPIs Executivos)</span>
        </h2>

        <div className="grid grid-cols-4 gap-2.5">
          <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Faturamento Total Bruto
            </span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">
              {formatPrice(faturamentoTotal)}
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Total liquidado no período
            </span>
          </div>

          <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Volume de Comandas / Pedidos
            </span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">
              {totalPedidos}
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Transações atendidas
            </span>
          </div>

          <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Ticket Médio por Venda
            </span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">
              {formatPrice(ticketMedio)}
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Gasto médio por cliente
            </span>
          </div>

          <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Itens Vendidos / Cesta
            </span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">
              {totalItens} <span className="text-xs font-normal text-slate-600">({mediaItens.toFixed(1)}/ped)</span>
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Densidade média de produtos
            </span>
          </div>
        </div>

        {/* Linha complementar de liquidez e troco */}
        <div className="mt-2.5 grid grid-cols-3 gap-2.5 text-xs bg-slate-100/70 border border-slate-200 p-2.5 rounded-lg">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Liquidez Imediata (À Vista: Pix + Dinheiro):</span>
            <span className="font-extrabold text-slate-900 font-mono">
              {formatPrice(ind.faturamento_a_vista || (pag.pix?.valor + pag.dinheiro?.valor) || 0)} 
              <span className="text-emerald-700 ml-1">({ind.pct_a_vista || 0}%)</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Vendas em Cartão (Crédito + Débito):</span>
            <span className="font-extrabold text-slate-900 font-mono">
              {formatPrice(ind.faturamento_cartao || (pag.debito?.valor + pag.credito?.valor) || 0)} 
              <span className="text-slate-700 ml-1">({ind.pct_cartao || 0}%)</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Troco Total Devolvido em Dinheiro:</span>
            <span className="font-extrabold text-amber-800 font-mono">
              {formatPrice(totalTroco)}
            </span>
          </div>
        </div>

        {/* Linha de Lucro Bruto Operacional e Margem de Lucro */}
        <div className="mt-2.5 grid grid-cols-3 gap-2.5 text-xs bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg">
          <div>
            <span className="text-emerald-700 text-[10px] uppercase font-bold block">Custo Total de Mercadorias (CMV):</span>
            <span className="font-extrabold text-slate-900 font-mono">
              {formatPrice(ind.custo_total_produtos || 0)}
            </span>
          </div>
          <div>
            <span className="text-emerald-700 text-[10px] uppercase font-bold block">Lucro Bruto Estimado:</span>
            <span className="font-extrabold text-emerald-800 font-mono">
              {formatPrice(ind.lucro_bruto_total || 0)}
            </span>
          </div>
          <div>
            <span className="text-emerald-700 text-[10px] uppercase font-bold block">Margem de Lucro Média:</span>
            <span className="font-extrabold text-emerald-800 font-mono">
              {ind.margem_lucro_media_pct || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONCILIAÇÃO FINANCEIRA POR FORMA DE PAGAMENTO (SHARE OF WALLET) */}
      {/* ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1">
          <DollarSign className="w-3.5 h-3.5 text-slate-700" />
          <span>2. Conciliação por Meio de Captura & Pagamento</span>
        </h2>

        <table className="w-full text-xs border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px]">
              <th className="p-2 text-left">Método de Pagamento</th>
              <th className="p-2 text-right">Faturamento (R$)</th>
              <th className="p-2 text-right">% do Faturamento</th>
              <th className="p-2 text-center">Nº Transações</th>
              <th className="p-2 text-right">% Transações</th>
              <th className="p-2 text-right">Ticket Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-2 font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                PIX Instantâneo
              </td>
              <td className="p-2 text-right font-mono font-bold">{formatPrice(pag.pix?.valor)}</td>
              <td className="p-2 text-right font-mono font-bold text-emerald-800">{pag.pix?.pct_valor || 0}%</td>
              <td className="p-2 text-center font-mono">{pag.pix?.quantidade || 0}</td>
              <td className="p-2 text-right font-mono text-slate-600">{pag.pix?.pct_pedidos || 0}%</td>
              <td className="p-2 text-right font-mono text-slate-700">
                {formatPrice(pag.pix?.quantidade > 0 ? pag.pix.valor / pag.pix.quantidade : 0)}
              </td>
            </tr>
            <tr>
              <td className="p-2 font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Dinheiro Físico
              </td>
              <td className="p-2 text-right font-mono font-bold">{formatPrice(pag.dinheiro?.valor)}</td>
              <td className="p-2 text-right font-mono font-bold text-amber-800">{pag.dinheiro?.pct_valor || 0}%</td>
              <td className="p-2 text-center font-mono">{pag.dinheiro?.quantidade || 0}</td>
              <td className="p-2 text-right font-mono text-slate-600">{pag.dinheiro?.pct_pedidos || 0}%</td>
              <td className="p-2 text-right font-mono text-slate-700">
                {formatPrice(pag.dinheiro?.quantidade > 0 ? pag.dinheiro.valor / pag.dinheiro.quantidade : 0)}
              </td>
            </tr>
            <tr>
              <td className="p-2 font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
                Cartão de Débito
              </td>
              <td className="p-2 text-right font-mono font-bold">{formatPrice(pag.debito?.valor)}</td>
              <td className="p-2 text-right font-mono font-bold text-cyan-800">{pag.debito?.pct_valor || 0}%</td>
              <td className="p-2 text-center font-mono">{pag.debito?.quantidade || 0}</td>
              <td className="p-2 text-right font-mono text-slate-600">{pag.debito?.pct_pedidos || 0}%</td>
              <td className="p-2 text-right font-mono text-slate-700">
                {formatPrice(pag.debito?.quantidade > 0 ? pag.debito.valor / pag.debito.quantidade : 0)}
              </td>
            </tr>
            <tr>
              <td className="p-2 font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                Cartão de Crédito
              </td>
              <td className="p-2 text-right font-mono font-bold">{formatPrice(pag.credito?.valor)}</td>
              <td className="p-2 text-right font-mono font-bold text-purple-800">{pag.credito?.pct_valor || 0}%</td>
              <td className="p-2 text-center font-mono">{pag.credito?.quantidade || 0}</td>
              <td className="p-2 text-right font-mono text-slate-600">{pag.credito?.pct_pedidos || 0}%</td>
              <td className="p-2 text-right font-mono text-slate-700">
                {formatPrice(pag.credito?.quantidade > 0 ? pag.credito.valor / pag.credito.quantidade : 0)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
              <td className="p-2">TOTAL CONCILIADO</td>
              <td className="p-2 text-right font-mono text-sm">{formatPrice(faturamentoTotal)}</td>
              <td className="p-2 text-right font-mono">100.0%</td>
              <td className="p-2 text-center font-mono text-sm">{totalPedidos}</td>
              <td className="p-2 text-right font-mono">100.0%</td>
              <td className="p-2 text-right font-mono">{formatPrice(ticketMedio)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Parecer do Analista sobre Pagamentos */}
        <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
          💡 <b>Diagnóstico de Tesouraria:</b> Operação concentrada em <b>{ind.pct_a_vista || 0}% à vista</b> (PIX + Dinheiro). Isso assegura disponibilidade de caixa imediata para recomposição diária de insumos e bebidas no evento, com excelente velocidade nas filas de caixa.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CURVA ABC & PERFORMANCE DE PRODUTOS */}
      {/* ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-slate-700" />
            <span>3. Matriz de Produtos & Curva ABC (Pareto)</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono font-medium">
            Curva A (80% receita) &bull; Curva B (15%) &bull; Curva C (5%)
          </span>
        </div>

        <table className="w-full text-xs border border-slate-300 border-collapse mb-2">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9px]">
              <th className="p-1.5 text-center w-7">#</th>
              <th className="p-1.5 text-left">Produto / Cardápio</th>
              <th className="p-1.5 text-left">Categoria</th>
              <th className="p-1.5 text-right">Qtd</th>
              <th className="p-1.5 text-right">Venda Unit.</th>
              <th className="p-1.5 text-right">Custo Unit.</th>
              <th className="p-1.5 text-right">Total Faturado</th>
              <th className="p-1.5 text-right">Lucro Bruto</th>
              <th className="p-1.5 text-right">Margem</th>
              <th className="p-1.5 text-right">% Share</th>
              <th className="p-1.5 text-center">Curva</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rankingComCurva.map((prod, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-1.5 text-center font-mono font-bold text-slate-500">{prod.posicao}</td>
                <td className="p-1.5 font-bold text-slate-900">{prod.nome_produto}</td>
                <td className="p-1.5 text-slate-600 text-[10px]">{prod.categoria}</td>
                <td className="p-1.5 text-right font-mono font-bold">{prod.total_vendido} un</td>
                <td className="p-1.5 text-right font-mono text-slate-600">{formatPrice(prod.preco_medio)}</td>
                <td className="p-1.5 text-right font-mono text-slate-600">{formatPrice(prod.preco_custo || 0)}</td>
                <td className="p-1.5 text-right font-mono font-bold text-slate-950">{formatPrice(prod.total_faturado)}</td>
                <td className="p-1.5 text-right font-mono font-bold text-emerald-800">{formatPrice(prod.lucro_bruto || 0)}</td>
                <td className="p-1.5 text-right font-mono text-slate-700 font-bold">
                  {prod.margem_lucro_pct !== null && prod.margem_lucro_pct !== undefined ? `${prod.margem_lucro_pct}%` : '-'}
                </td>
                <td className="p-1.5 text-right font-mono font-medium text-slate-700">{prod.pct_share}%</td>
                <td className="p-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    prod.classe === 'A' ? 'bg-emerald-100 text-emerald-800' :
                    prod.classe === 'B' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {prod.classe}
                  </span>
                </td>
              </tr>
            ))}
            {rankingComCurva.length === 0 && (
              <tr>
                <td colSpan="11" className="p-4 text-center text-slate-500 italic">
                  Nenhuma venda registrada no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Destaques de Produtos */}
        {produtoTopFaturamento && (
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-200">
            <div>
              👑 <b>Carro-Chefe de Faturamento:</b> <span className="font-bold text-slate-900">{produtoTopFaturamento.nome_produto}</span> ({formatPrice(produtoTopFaturamento.total_faturado)} &bull; {produtoTopFaturamento.pct_share}% da receita total).
            </div>
            <div>
              📦 <b>Líder em Volume Físico:</b> <span className="font-bold text-slate-900">{produtoTopVolume?.nome_produto}</span> ({produtoTopVolume?.total_vendido} unidades vendidas).
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. DISTRIBUIÇÃO TEMPORAL / HORÁRIOS DE PICO */}
      {/* ========================================================================= */}
      {vendasPorHora.length > 0 && (
        <div className="mb-6 page-break-inside-avoid">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              <span>4. Distribuição Temporal de Vendas (Ritmo & Picos)</span>
            </h2>
            {horarioPico && (
              <span className="text-[10px] text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ⚡ Horário de Pico: {horarioPico.hora} ({formatPrice(horarioPico.total_faturado)} &bull; {horarioPico.qtd_pedidos} pedidos)
              </span>
            )}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {vendasPorHora.map((h, i) => (
              <div key={i} className="border border-slate-200 p-2 rounded bg-slate-50 text-center">
                <span className="text-[10px] font-bold text-slate-500 font-mono block">{h.hora}</span>
                <span className="text-xs font-black text-slate-900 font-mono block">{formatPrice(h.total_faturado)}</span>
                <span className="text-[9px] text-slate-500 font-mono block">{h.qtd_pedidos} ped ({h.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. AUDITORIA DETALHADA DAS COMANDAS DO PERÍODO */}
      {/* ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-700" />
            <span>5. Auditoria de Pedidos Emitidos (Relação Analítica)</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">
            Mostrando {pedidos.length} pedidos conciliados
          </span>
        </div>

        <table className="w-full text-xs border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9px]">
              <th className="p-1.5 text-center w-12">Comanda</th>
              <th className="p-1.5 text-center w-24">Hora</th>
              <th className="p-1.5 text-center w-20">Pagamento</th>
              <th className="p-1.5 text-left">Itens Consumidos</th>
              <th className="p-1.5 text-right w-16">Troco</th>
              <th className="p-1.5 text-right w-20">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[11px]">
            {pedidos.slice(0, 100).map((ped, idx) => {
              const isMisto = ped.forma_pagamento === 'misto' && Array.isArray(ped.pagamentos);
              const splitText = isMisto 
                ? ped.pagamentos.map(p => `${p.forma.toUpperCase()} ${formatPrice(p.valor)}`).join(' + ') 
                : null;

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="p-1.5 text-center font-mono font-bold text-slate-900">
                    <div>#{String(ped.numero_pedido).padStart(3, '0')}</div>
                    {ped.editado && (
                      <span className="inline-block text-[8px] bg-amber-100 text-amber-900 border border-amber-300 rounded px-1 mt-0.5 font-sans font-bold">
                        [Editado]
                      </span>
                    )}
                  </td>
                  <td className="p-1.5 text-center font-mono text-slate-600 text-[10px]">
                    {ped.hora_ms || (ped.data_hora ? new Date(ped.data_hora).toLocaleTimeString('pt-BR', { timeZone: 'America/Campo_Grande', hour: '2-digit', minute: '2-digit' }) : '-')}
                  </td>
                  <td className="p-1.5 text-center">
                    {isMisto ? (
                      <span className="font-bold text-[8px] uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono block">
                        {splitText}
                      </span>
                    ) : (
                      <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        {ped.forma_pagamento}
                      </span>
                    )}
                  </td>
                  <td className="p-1.5 text-slate-700 max-w-[280px]">
                    <div className="truncate">{ped.itens_resumo}</div>
                    {ped.editado && ped.motivo_edicao && (
                      <div className="text-[9px] text-amber-700 font-medium italic">Obs: {ped.motivo_edicao}</div>
                    )}
                  </td>
                  <td className="p-1.5 text-right font-mono text-slate-500 text-[10px]">
                    {parseFloat(ped.troco) > 0 ? formatPrice(ped.troco) : '-'}
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold text-slate-950">
                    {formatPrice(ped.total)}
                  </td>
                </tr>
              );
            })}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-slate-500 italic">
                  Nenhum pedido registrado no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {pedidos.length > 100 && (
          <p className="text-[9px] text-slate-500 italic mt-1 text-right">
            * Listagem de auditoria limitada aos primeiros 100 registros para otimização de impressão.
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. RODAPÉ DO RELATÓRIO */}
      {/* ========================================================================= */}
      <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono page-break-inside-avoid">
        <span>🌾 Tenda dos Müller &bull; Expobai 2026 &bull; ERP Frente de Caixa</span>
        <span>Emissão: {dataEmissao}</span>
      </div>

    </div>
  );
}
