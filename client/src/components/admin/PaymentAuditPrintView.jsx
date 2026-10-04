import React from 'react';
import { QrCode, CreditCard, Banknote, Layers, CheckCircle2 } from 'lucide-react';

export default function PaymentAuditPrintView({
  data,
  lancamentos = [],
  formaPagamento = 'pix',
  periodoDescricao = 'Período Atual',
  config = {}
}) {
  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const nomeEstande = config?.nome_estande || 'Tenda dos Müller';
  const dataEmissao = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Campo_Grande',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const formaLabel = formaPagamento === 'pix' ? 'PIX (QR Code / Celular)' :
    formaPagamento === 'debito' ? 'CARTÃO DE DÉBITO' :
    formaPagamento === 'credito' ? 'CARTÃO DE CRÉDITO' :
    formaPagamento === 'dinheiro' ? 'DINHEIRO EM ESPÉCIE' : 'TODOS OS PAGAMENTOS';

  const destinoResponsavel = data?.conta_destino?.responsavel || (
    formaPagamento === 'pix' ? 'Conta PIX' :
    formaPagamento === 'debito' || formaPagamento === 'credito' ? 'Maquininha de Cartão' :
    formaPagamento === 'dinheiro' ? 'Gaveta do Caixa' : 'Consolidado'
  );

  const totalAuditado = data?.metricas?.valor_filtrado || lancamentos.reduce((acc, l) => acc + (parseFloat(l.valor_efetivo) || 0), 0);
  const qtdTransacoes = lancamentos.length;
  const ticketMedio = qtdTransacoes > 0 ? (totalAuditado / qtdTransacoes) : 0;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MODO FOLHA A4 / PDF (RELATÓRIO DE CONCILIAÇÃO ANALÍTICO) */}
      {/* ========================================================================= */}
      <div id="conferencia-a4-view" className="hidden print:block text-slate-900 bg-white p-8 max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5">
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
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">
                Conferência de Lançamentos: {formaLabel}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Extrato detalhado de auditoria financeira &bull; Destino: <b>{destinoResponsavel}</b>
              </p>
            </div>

            <div className="text-right text-xs text-slate-700 font-mono space-y-0.5">
              <p><b>Contexto:</b> <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold">{periodoDescricao}</span></p>
              <p><b>Emissão:</b> {dataEmissao}</p>
              <p className="text-emerald-700 font-bold">● EXTRATO PARA AUDITORIA</p>
            </div>
          </div>
        </div>

        {/* Quadro de Destaque Financeiro */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-300 p-3.5 rounded-xl text-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Total a Conciliar no Banco / Maquininha
            </span>
            <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">
              {formatPrice(totalAuditado)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Soma exata das transações filtradas
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-3.5 rounded-xl text-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Quantidade de Lançamentos
            </span>
            <span className="text-2xl font-black font-mono text-slate-800 mt-1 block">
              {qtdTransacoes} transações
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Registradas neste método
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-3.5 rounded-xl text-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Ticket Médio por Venda
            </span>
            <span className="text-2xl font-black font-mono text-amber-700 mt-1 block">
              {formatPrice(ticketMedio)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Média por pedido neste método
            </span>
          </div>
        </div>

        {/* Tabela Detalhada de Lançamentos */}
        <div className="mb-6">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 text-xs">
            <span className="font-black uppercase tracking-wider text-slate-800">
              Discriminação de Lançamentos ({qtdTransacoes} registros)
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Horário Oficial de Amambai/MS
            </span>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase text-[10px]">
                <th className="py-2 px-2 text-left w-16"># Comanda</th>
                <th className="py-2 px-2 text-left w-24">Data / Hora</th>
                <th className="py-2 px-2 text-left">Produtos & Itens Vendidos</th>
                <th className="py-2 px-2 text-left w-36">Sócios / Divisão</th>
                <th className="py-2 px-2 text-right w-24">Valor {formaPagamento.toUpperCase()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 italic">
                    Nenhum lançamento encontrado para esta forma de pagamento.
                  </td>
                </tr>
              ) : (
                lancamentos.map((l, index) => {
                  const horaFormatada = l.hora_ms || (l.data_hora_ms ? l.data_hora_ms.split(' ')[1] : '') || (l.data_hora ? new Date(l.data_hora).toLocaleTimeString('pt-BR', { timeZone: 'America/Campo_Grande' }) : '-');
                  const dataFormatada = (l.data_hora_ms ? l.data_hora_ms.split(' ')[0] : '') || (l.data_hora ? new Date(l.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' }) : '');

                  return (
                    <tr 
                      key={l.id || index}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      <td className="py-2 px-2 font-black text-slate-900 font-mono text-sm">
                        #{String(l.numero_pedido).padStart(3, '0')}
                      </td>
                      <td className="py-2 px-2 text-slate-600 text-[11px]">
                        <div>{dataFormatada}</div>
                        <div className="font-bold text-slate-900">{horaFormatada}</div>
                      </td>
                      <td className="py-2 px-2 text-slate-800 font-sans font-medium text-[11px] leading-tight">
                        <div>{l.itens_resumo || 'Itens diversos'}</div>
                        {l.observacoes && (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">
                            Obs: {l.observacoes}
                          </div>
                        )}
                        {l.is_misto && (
                          <div className="text-[10px] text-purple-700 font-bold mt-0.5">
                            ⚡ Pagamento Misto (Total Pedido: {formatPrice(l.total)})
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-slate-600 text-[10px]">
                        {l.socios_resumo || '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-black text-slate-900 font-mono text-sm">
                        {formatPrice(l.valor_efetivo)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                <td colSpan="3" className="py-3 px-2 text-left uppercase font-sans text-xs">
                  Total Geral Auditado ({qtdTransacoes} transações)
                </td>
                <td className="py-3 px-2 text-right uppercase font-sans text-xs text-slate-600">
                  Soma Total:
                </td>
                <td className="py-3 px-2 text-right font-black font-mono text-base text-emerald-800">
                  {formatPrice(totalAuditado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Box de Assinatura e Conferência Bancária */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/80 text-xs space-y-3" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>✍️</span> Termo de Conciliação e Validação Financeira
            </span>
            <span className="font-mono text-slate-500 text-[11px]">
              {formaLabel} &bull; {destinoResponsavel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-2 text-slate-700">
              <p className="font-medium">
                Declaro que realizei a conferência deste relatório junto ao extrato bancário / relatório da maquininha:
              </p>
              <div className="space-y-1 font-mono text-[11px]">
                <label className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-slate-400 rounded inline-block"></span>
                  <span>( ) BATEU 100% EXATO com o saldo bancário / comprovantes</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-slate-400 rounded inline-block"></span>
                  <span>( ) HOUVE DIVERGÊNCIA de R$ ________________________</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Nome do Responsável:</span>
                <div className="border-b border-slate-400 h-6"></div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Assinatura:</span>
                <div className="border-b border-slate-400 h-6"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé A4 */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
          ERP Expobai &bull; Tenda dos Müller &bull; Documento gerado eletronicamente em {dataEmissao}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODO BOBINA TÉRMICA (58mm / 80mm PARA IMPRESSORA DE CUPOM) */}
      {/* ========================================================================= */}
      <div id="conferencia-thermal-view" className="hidden print:block text-black font-mono text-xs">
        <div className="text-center pb-2 mb-2 border-b border-dashed border-black">
          <div className="font-bold text-sm uppercase">{nomeEstande}</div>
          <div className="text-[10px]">EXPOBAI 2026 - AMAMBAI/MS</div>
          <div className="font-black text-xs uppercase mt-1">*** EXTRATO DE AUDITORIA ***</div>
          <div className="font-black text-xs uppercase">{formaLabel}</div>
          <div className="text-[10px]">Destino: {destinoResponsavel}</div>
          <div className="text-[10px]">Período: {periodoDescricao}</div>
          <div className="text-[9px]">{dataEmissao}</div>
        </div>

        <div className="py-2 border-b border-dashed border-black text-center">
          <div className="text-[10px] uppercase">TOTAL AUDITADO:</div>
          <div className="font-black text-lg">{formatPrice(totalAuditado)}</div>
          <div className="text-[10px]">{qtdTransacoes} transações &bull; Méd: {formatPrice(ticketMedio)}</div>
        </div>

        <div className="py-2 border-b border-dashed border-black">
          <div className="font-bold text-[10px] uppercase mb-1 text-center">LANÇAMENTOS DETALHADOS:</div>
          {lancamentos.map((l, idx) => {
            const hora = l.hora_ms || (l.data_hora_ms ? l.data_hora_ms.split(' ')[1] : '') || '-';
            const mistoTag = l.is_misto ? ` (Misto)` : '';
            return (
              <div key={idx} className="py-1.5 border-b border-dotted border-gray-400">
                <div className="flex justify-between font-bold">
                  <span>#{String(l.numero_pedido).padStart(3, '0')} [{hora}]</span>
                  <span>{formatPrice(l.valor_efetivo)}{mistoTag}</span>
                </div>
                <div className="text-[10px] text-gray-800 leading-tight">
                  {l.itens_resumo}
                </div>
              </div>
            );
          })}
        </div>

        <div className="py-3 text-center text-[10px] space-y-2">
          <div className="font-bold">TOTAL GERAL: {formatPrice(totalAuditado)}</div>
          <div>[ ] Conferido no Extrato Bancário</div>
          <div className="pt-2">Resp: ___________________________</div>
          <div>Assinatura: _______________________</div>
          <div className="pt-1 text-[9px]">*** FIM DO EXTRATO ***</div>
        </div>
      </div>
    </>
  );
}
