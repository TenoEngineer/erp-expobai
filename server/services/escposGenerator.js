/**
 * Gerador de comandos ESC/POS para Impressoras Térmicas (Rede e USB)
 * Compatível com impressoras 80mm e 58mm (Epson, Elgin, Bematech, Daruma, POS-80, POS-58, etc.)
 */

// Comandos de Controle ESC/POS
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD_INIT = Buffer.from([ESC, 0x40]); // Inicializa impressora
const CMD_ALIGN_LEFT = Buffer.from([ESC, 0x61, 0x00]);
const CMD_ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]);
const CMD_ALIGN_RIGHT = Buffer.from([ESC, 0x61, 0x02]);

const CMD_BOLD_ON = Buffer.from([ESC, 0x45, 0x01]);
const CMD_BOLD_OFF = Buffer.from([ESC, 0x45, 0x00]);

const CMD_SIZE_NORMAL = Buffer.from([GS, 0x21, 0x00]);
const CMD_SIZE_DOUBLE_H = Buffer.from([GS, 0x21, 0x01]);
const CMD_SIZE_DOUBLE_W = Buffer.from([GS, 0x21, 0x10]);
const CMD_SIZE_DOUBLE = Buffer.from([GS, 0x21, 0x11]); // 2x Largura e Altura
const CMD_SIZE_TRIPLE = Buffer.from([GS, 0x21, 0x22]); // 3x Largura e Altura
const CMD_SIZE_QUAD = Buffer.from([GS, 0x21, 0x33]);   // 4x Largura e Altura (GIGANTE)

// Comando de corte parcial (Guilhotina) com avanço de papel reduzido
// Compatível com Elgin (ESC/POS GS V 66 0) e Bematech (ESC m)
const CMD_CUT_PARTIAL = Buffer.from([
  ESC, 0x64, 0x02,      // Avanço de 2 linhas
  GS, 0x56, 0x42, 0x00, // Corte ESC/POS (Elgin i9/i7/i8, Epson, Bematech modo ESC/POS)
  ESC, 0x6D             // Corte nativo Bematech (modo ESC/Bema)
]);
const CMD_FEED_LINES = (lines = 1) => Buffer.from([ESC, 0x64, lines]);

/**
 * Remove acentos e caracteres especiais para evitar conflitos de codepage na impressora
 */
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .trim();
}

/**
 * Formata valor monetário simples
 */
function formatMoeda(val) {
  const n = parseFloat(val) || 0;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

/**
 * Obtém largura em colunas (32 para 58mm, 48 para 80mm)
 */
function getCols(largura = '80mm') {
  return largura === '58mm' ? 32 : 48;
}

/**
 * Linha divisória formatada para a largura
 */
function divider(char = '-', largura = '80mm') {
  const cols = getCols(largura);
  return char.repeat(cols) + '\n';
}

/**
 * Linha de 2 colunas justificadas (esquerda e direita)
 */
function justifyRow(left, right, largura = '80mm') {
  const cols = getCols(largura);
  const l = cleanText(left);
  const r = cleanText(right);
  const spaces = Math.max(1, cols - (l.length + r.length));
  return l + ' '.repeat(spaces) + r + '\n';
}

class EscposBuilder {
  constructor() {
    this.buffers = [CMD_INIT];
  }

  raw(buffer) {
    this.buffers.push(buffer);
    return this;
  }

  align(alignment) {
    if (alignment === 'center') this.buffers.push(CMD_ALIGN_CENTER);
    else if (alignment === 'right') this.buffers.push(CMD_ALIGN_RIGHT);
    else this.buffers.push(CMD_ALIGN_LEFT);
    return this;
  }

  size(s) {
    if (s === 'double') this.buffers.push(CMD_SIZE_DOUBLE);
    else if (s === 'triple') this.buffers.push(CMD_SIZE_TRIPLE);
    else if (s === 'quad') this.buffers.push(CMD_SIZE_QUAD);
    else if (s === 'double_h') this.buffers.push(CMD_SIZE_DOUBLE_H);
    else if (s === 'double_w') this.buffers.push(CMD_SIZE_DOUBLE_W);
    else this.buffers.push(CMD_SIZE_NORMAL);
    return this;
  }

  bold(enable = true) {
    this.buffers.push(enable ? CMD_BOLD_ON : CMD_BOLD_OFF);
    return this;
  }

  text(str) {
    this.buffers.push(Buffer.from(cleanText(str), 'ascii'));
    return this;
  }

  line(str = '') {
    if (str) {
      this.buffers.push(Buffer.from(cleanText(str) + '\n', 'ascii'));
    } else {
      this.buffers.push(Buffer.from('\n', 'ascii'));
    }
    return this;
  }

  divider(char = '-', largura = '80mm') {
    this.buffers.push(Buffer.from(divider(char, largura), 'ascii'));
    return this;
  }

  feed(lines = 3) {
    this.buffers.push(CMD_FEED_LINES(lines));
    return this;
  }

  cut(partial = true) {
    this.buffers.push(CMD_CUT_PARTIAL);
    return this;
  }

  toBuffer() {
    return Buffer.concat(this.buffers);
  }
}

/**
 * 1. TICKET DO CLIENTE / SENHA DE RETIRADA
 * Exibe SOMENTE o número em tamanho gigante e identificação da barraca.
 */
function buildTicketCliente(order, config = {}, largura = '80mm', cortar = true) {
  const b = new EscposBuilder();
  const nomeEstande = config.nome_estande || 'TENDA DOS MULLER';
  const numStr = String(order.numero_pedido).padStart(3, '0');

  b.align('center');
  b.bold(true);
  b.size('double');
  b.line(nomeEstande.toUpperCase());

  // NÚMERO GIGANTE DA SENHA
  b.size('quad'); // 4x tamanho
  b.bold(true);
  b.line(`#${numStr}`);

  b.size('normal');
  b.bold(false);

  b.feed(1);
  if (cortar) {
    b.cut();
  }

  return b.toBuffer();
}

/**
 * 2. TICKET DA COZINHA / PRODUÇÃO / ORGANIZAÇÃO INTERNA
 * Exibe o número do pedido + lista de itens pedidos com quantidade e observações.
 */
function buildTicketProducao(order, config = {}, largura = '80mm', cortar = true) {
  const b = new EscposBuilder();
  const nomeEstande = config.nome_estande || 'TENDA DOS MULLER';
  const numStr = String(order.numero_pedido).padStart(3, '0');
  const codigo = order.codigo_identificador || `EXP-${numStr}`;
  const dataHora = order.data_hora 
    ? new Date(order.data_hora).toLocaleString('pt-BR') 
    : new Date().toLocaleString('pt-BR');

  b.align('center');
  b.bold(true);
  b.size('double');
  b.line('*** VIA DA COZINHA ***');
  b.size('normal');
  b.line('CONTROLE DE PRODUCAO / PREPARO');
  b.divider('=', largura);

  // Número do Pedido em Destaque
  b.size('triple');
  b.bold(true);
  b.line(`PEDIDO #${numStr}`);
  b.size('normal');
  b.bold(false);
  b.line(`Identificador: ${codigo}`);
  b.line(`Horario: ${dataHora}`);
  b.divider('-', largura);

  // Cabeçalho dos Itens
  b.align('left');
  b.bold(true);
  b.line('ITENS DO PEDIDO:');
  b.divider('-', largura);

  // Lista dos Itens
  const itens = order.itens || [];
  itens.forEach((item) => {
    const qtd = item.quantidade || 1;
    const nome = item.nome_produto || item.nome || 'Item';
    
    b.size('double_w'); // Largura dupla para destacar a quantidade e item
    b.bold(true);
    b.line(`[ ${qtd}x ] ${nome}`);
    b.size('normal');
    b.bold(false);

    let comboInfo = item.combo_info;
    if (typeof comboInfo === 'string') {
      try { comboInfo = JSON.parse(comboInfo); } catch {}
    }
    if (comboInfo?.itens && Array.isArray(comboInfo.itens) && comboInfo.itens.length > 0) {
      const breakdown = comboInfo.itens.map(it => `${it.quantidade}x ${it.nome}`).join(' + ');
      b.line(`  Inclui: ${breakdown}`);
    }
  });

  b.divider('-', largura);

  // Informações Financeiras para conferência
  b.align('left');
  const formaPag = (order.forma_pagamento || 'PIX').toUpperCase();
  const totalFormatado = formatMoeda(order.total);
  b.line(`Pagamento: ${formaPag} | Total: ${totalFormatado}`);
  if (order.troco && parseFloat(order.troco) > 0) {
    b.line(`Troco: ${formatMoeda(order.troco)}`);
  }

  b.divider('=', largura);
  b.align('center');
  b.line('*** EXPEDICAO E PREPARO ***');

  b.feed(1);
  if (cortar) {
    b.cut();
  }

  return b.toBuffer();
}

/**
 * 3. GERAÇÃO DOS DOIS TICKETS CONCATENADOS
 * Ticket 1 (Cliente) -> Guilhotina -> Ticket 2 (Cozinha) -> Guilhotina
 */
function buildAmbosTickets(order, config = {}, largura = '80mm', cortar = true) {
  const buf1 = buildTicketCliente(order, config, largura, cortar);
  const buf2 = buildTicketProducao(order, config, largura, cortar);
  return Buffer.concat([buf1, buf2]);
}

/**
 * 4. TICKET DE TESTE DA IMPRESSORA
 */
function buildTicketTeste(config = {}, largura = '80mm') {
  const b = new EscposBuilder();
  const nomeEstande = config.nome_estande || 'TENDA DOS MULLER';

  b.align('center');
  b.bold(true);
  b.size('double');
  b.line(nomeEstande.toUpperCase());
  b.size('normal');
  b.line('TESTE DE COMUNICACAO ESC/POS');
  b.divider('=', largura);

  b.align('center');
  b.bold(true);
  b.size('triple');
  b.line('#999');
  b.size('normal');
  b.bold(false);
  b.line();
  b.line('IMPRESSORA CONFIGURADA COM SUCESSO!');
  b.line('Conexao Ativa e Operacional.');
  b.divider('-', largura);

  b.align('left');
  b.line(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  b.line(`Largura Bobina: ${largura}`);
  b.divider('=', largura);

  b.feed(3);
  b.cut();

  return b.toBuffer();
}

module.exports = {
  buildTicketCliente,
  buildTicketProducao,
  buildAmbosTickets,
  buildTicketTeste,
  cleanText
};
