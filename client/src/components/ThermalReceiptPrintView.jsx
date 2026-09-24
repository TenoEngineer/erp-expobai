import React from 'react';

/**
 * Componente que renderiza a estrutura dos tickets térmicos
 * Oculto na tela (hidden), mas visível e formatado na impressão (print:block)
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
      <div className="ticket-wrapper" style={{ textAlign: 'center', paddingBottom: '2px', paddingTop: '0px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', lineHeight: '1.2' }}>
          {nomeEstande}
        </h2>
        
        {/* NÚMERO GIGANTE DA SENHA */}
        <div style={{ 
          fontSize: '52px', 
          fontWeight: '900', 
          margin: '4px 0', 
          letterSpacing: '2px', 
          border: '2px solid #000', 
          padding: '4px 0',
          fontFamily: 'monospace',
          lineHeight: '1'
        }}>
          #{numeroFormatado}
        </div>
      </div>

      {/* Quebra de Página / Corte entre Ticket 1 e Ticket 2 */}
      <div className="page-break-ticket" style={{ pageBreakAfter: 'always', margin: '0', borderTop: '1px dashed #999' }}></div>

      {/* ======================================================== */}
      {/* TICKET 2: COMANDA DA COZINHA / PRODUÇÃO (NÚMERO + ITENS) */}
      {/* ======================================================== */}
      <div className="ticket-wrapper" style={{ paddingTop: '0px' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', lineHeight: '1.2' }}>
            *** VIA DA COZINHA ***
          </h3>
          <p style={{ fontSize: '10px', margin: '1px 0', fontWeight: 'bold' }}>
            CONTROLE DE PRODUÇÃO E PREPARO
          </p>
          <div style={{ fontSize: '24px', fontWeight: '900', margin: '3px 0', fontFamily: 'monospace', lineHeight: '1' }}>
            PEDIDO #{numeroFormatado}
          </div>
          <p style={{ fontSize: '10px', margin: '0' }}>{dataHora}</p>
        </div>

        <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
            ITENS A PREPARAR:
          </div>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              {(order.itens || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ fontWeight: '900', fontSize: '15px', width: '40px', verticalAlign: 'top', padding: '4px 0' }}>
                    {item.quantidade}x
                  </td>
                  <td style={{ fontWeight: 'bold', padding: '4px 0' }}>
                    {item.nome_produto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '11px', textAlign: 'right', borderTop: '1px dashed #000', paddingTop: '6px' }}>
          TOTAL: {formatPrice(order.total)} ({order.forma_pagamento?.toUpperCase()})
        </div>

        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '12px', fontWeight: 'bold' }}>
          *** EXPEDIÇÃO E COZINHA ***
        </div>
      </div>

    </div>
  );
}
