const MODULOS_CATALOGO = [
  {
    id: 'core_pos',
    nome: 'Frente de Caixa Essencial',
    descricao: 'Registro rápido de pedidos, carrinho, formas de pagamento (Dinheiro/PIX/Cartão), troco e fechamento de turno.',
    preco_base: 300.00,
    obrigatorio: true,
    icone: 'ShoppingCart',
    categoria: 'Operação'
  },
  {
    id: 'mod_fichas',
    nome: 'Fichas de Retirada & Balcão',
    descricao: 'Desmembramento automático de pedidos em tickets fracionados por unidade com código validador e corte na impressora térmica.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'Ticket',
    categoria: 'Atendimento'
  },
  {
    id: 'mod_bi_horarios',
    nome: 'Business Intelligence & Horários (BI)',
    descricao: 'Horários de pico, velocidade e vazão do caixa (segundos/venda), previsão de esgotamento de estoque e inteligência de cesta de SKUs.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'Clock',
    categoria: 'Inteligência'
  },
  {
    id: 'mod_rateio_socios',
    nome: 'Gestão de Sócios & Split de Lucros',
    descricao: 'Divisão de vendas por titular de maquininha/Pix, rateio de lucros líquidos com dedução de despesas operacionais.',
    preco_base: 200.00,
    obrigatorio: false,
    icone: 'Users',
    categoria: 'Financeiro'
  },
  {
    id: 'mod_custos_cmv',
    nome: 'Custos, CMV & Prevenção de Perdas',
    descricao: 'Margem bruta real, dreno de taxas de maquininha com economia PIX e auditoria antifraude de quebra de caixa.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'TrendingUp',
    categoria: 'Financeiro'
  },
  {
    id: 'mod_mobile_track',
    nome: 'Vendas Ambulantes & Rastreio Móbile',
    descricao: 'Rastreamento de pedidos feitos fora da tenda pelo celular vs no balcão fixo (tablet/computador).',
    preco_base: 100.00,
    obrigatorio: false,
    icone: 'Smartphone',
    categoria: 'Operação'
  }
];

module.exports = { MODULOS_CATALOGO };
