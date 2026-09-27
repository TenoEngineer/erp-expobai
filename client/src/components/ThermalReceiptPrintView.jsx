import React from 'react';

/**
 * Componente que renderiza a estrutura dos tickets térmicos
 * Oculto na tela (hidden), mas visível e formatado na impressão (print:block).
 * Totalmente centralizado para evitar cortes em bobinas de 58mm e 80mm.
 */
export default function ThermalReceiptPrintView({ order, config }) {
  if (!order) return null;

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const numeroFormatado = String(order.numero_pedido || 0).padStart(3, '0');
  const nomeEstande = config?.nome_estande || 'Tenda dos Müller';
  const dataHora = order.data_hora
    ? new Date(order.data_hora).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  return (
    <div id="thermal-receipt" className="hidden print:block text-black">
      
      {/* ============================================== */}
      {/* TICKET 1: SOMENTE O NÚMERO / FICHA DO CLIENTE */}
      {/* ============================================== */}
      <div className="ticket-wrapper" style={{ textAlign: 'center', padding: '2px 0 6px 0', margin: '0 auto' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', lineHeight: '1.2' }}>
          {nomeEstande}
        </h2>
        
        {/* NÚMERO DA SENHA CENTRALIZADO E TAMANHO AJUSTADO (SEM CORTES) */}
        <div style={{ 
          fontSize: '34px', 
          fontWeight: '900', 
          margin: '4px auto', 
          letterSpacing: '1px', 
          border: '2px solid #000', 
          padding: '2px 10px',
          width: 'fit-content',
          fontFamily: 'monospace',
          lineHeight: '1.1',
          textAlign: 'center'
        }}>
          #{numeroFormatado}
        </div>

        <p style={{ fontSize: '9px', margin: '2px 0 0 0', textTransform: 'uppercase' }}>
          Guarde esta comanda
        </p>
      </div>

      {/* Quebra de Página / Corte entre Ticket 1 e Ticket 2 */}
      <div className="page-break-ticket" style={{ pageBreakAfter: 'always', margin: '4px 0', borderTop: '1px dashed #000' }}></div>

      {/* ======================================================== */}
      {/* TICKET 2: COMANDA DA COZINHA / PRODUÇÃO (NÚMERO + ITENS) */}
      {/* ======================================================== */}
      <div className="ticket-wrapper" style={{ textAlign: 'center', padding: '2px 0', margin: '0 auto' }}>
        
        {/* Cabeçalho Cozinha Centralizado */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', lineHeight: '1.2' }}>
            *** VIA DA COZINHA ***
          </h3>
          <div style={{ fontSize: '20px', fontWeight: '900', margin: '2px 0', fontFamily: 'monospace', lineHeight: '1.1' }}>
            PEDIDO #{numeroFormatado}
          </div>
          <p style={{ fontSize: '9px', margin: '0' }}>{dataHora}</p>
        </div>

        {/* Itens Centralizados com tamanhos legíveis */}
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '4px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', textTransform: 'uppercase' }}>
            ITENS A PREPARAR:
          </div>
          
          <div style={{ textAlign: 'center' }}>
            {(order.itens || []).map((item, i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px dotted #ccc' }}>
                <span style={{ fontWeight: '900', fontSize: '13px' }}>
                  [{item.quantidade}x]{' '}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
                  {item.nome_produto}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financeiro Centralizado */}
        <div style={{ fontSize: '11px', textAlign: 'center', paddingTop: '2px' }}>
          <div>PAGAMENTO: <b>{order.forma_pagamento?.toUpperCase()}</b></div>
          <div style={{ fontWeight: '900', fontSize: '12px', marginTop: '1px' }}>
            TOTAL: {formatPrice(order.total)}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px', fontWeight: 'bold' }}>
          *** EXPEDIÇÃO E COZINHA ***
        </div>
      </div>

    </div>
  );
}
