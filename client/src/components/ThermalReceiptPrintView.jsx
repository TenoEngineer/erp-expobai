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
      <div className="ticket-wrapper" style={{ textAlign: 'center', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
          {nomeEstande}
        </h2>
        <p style={{ fontSize: '11px', margin: '2px 0 6px 0' }}>EXPOBAI 2026 - AMAMBAI</p>
        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '6px 0', fontWeight: 'bold', fontSize: '13px' }}>
          FICHA DE RETIRADA / SENHA
        </div>
        
        {/* NÚMERO GIGANTE DA SENHA */}
        <div style={{ 
          fontSize: '48px', 
          fontWeight: '900', 
          margin: '12px 0', 
          letterSpacing: '2px', 
          border: '2px solid #000', 
          padding: '6px 0',
          fontFamily: 'monospace'
        }}>
          #{numeroFormatado}
        </div>

        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '8px 0 4px 0' }}>
          Aguarde sua senha ser chamada no balcão!
        </p>
        <p style={{ fontSize: '10px', color: '#333' }}>{dataHora}</p>
        <div style={{ borderTop: '1px dashed #000', margin: '10px 0 4px 0', paddingTop: '6px', fontSize: '10px' }}>
          Obrigado pela preferência!
        </div>
      </div>

      {/* Quebra de Página / Corte entre Ticket 1 e Ticket 2 */}
      <div className="page-break-ticket" style={{ pageBreakAfter: 'always', margin: '20px 0', borderTop: '2px dashed #999' }}></div>

      {/* ======================================================== */}
      {/* TICKET 2: COMANDA DA COZINHA / PRODUÇÃO (NÚMERO + ITENS) */}
      {/* ======================================================== */}
      <div className="ticket-wrapper" style={{ paddingTop: '8px' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>
            *** VIA DA COZINHA ***
          </h3>
          <p style={{ fontSize: '11px', margin: '2px 0', fontWeight: 'bold' }}>
            CONTROLE DE PRODUÇÃO E PREPARO
          </p>
          <div style={{ fontSize: '26px', fontWeight: '900', margin: '6px 0', fontFamily: 'monospace' }}>
            PEDIDO #{numeroFormatado}
          </div>
          <p style={{ fontSize: '10px' }}>{dataHora}</p>
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

        {order.observacoes && (
          <div style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
            OBS: {order.observacoes}
          </div>
        )}

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
