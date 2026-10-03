export const MODULOS_CATALOGO = [
  {
    id: 'core_pos',
    nome: 'Frente de Caixa Essencial',
    descricao: 'Registro rápido de pedidos, carrinho, formas de pagamento (Dinheiro/PIX/Cartão), troco e fechamento de turno.',
    preco_base: 300.00,
    obrigatorio: true,
    icone: 'ShoppingCart',
    categoria: 'Operação',
    cor: 'from-emerald-500 to-green-600'
  },
  {
    id: 'mod_fichas',
    nome: 'Fichas de Retirada & Balcão',
    descricao: 'Desmembramento automático de pedidos em tickets fracionados por unidade com código validador e corte na impressora térmica.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'Ticket',
    categoria: 'Atendimento',
    cor: 'from-amber-500 to-orange-600'
  },
  {
    id: 'mod_bi_horarios',
    nome: 'Análise de Vendas por Horário (BI)',
    descricao: 'Relatórios de horários de pico, comparativo de dias de feira, mapa de calor e desempenho de vendas por período.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'Clock',
    categoria: 'Inteligência',
    cor: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'mod_rateio_socios',
    nome: 'Gestão de Sócios & Split de Lucros',
    descricao: 'Divisão de vendas por titular de maquininha/Pix, rateio de lucros líquidos com dedução de despesas operacionais.',
    preco_base: 200.00,
    obrigatorio: false,
    icone: 'Users',
    categoria: 'Financeiro',
    cor: 'from-purple-500 to-pink-600'
  },
  {
    id: 'mod_custos_cmv',
    nome: 'Controle de Custos & CMV do Evento',
    descricao: 'Lançamento de custos fixos e variáveis da feira (aluguel de tenda, gelo, frete, gerador) e margem de contribuição real.',
    preco_base: 150.00,
    obrigatorio: false,
    icone: 'TrendingUp',
    categoria: 'Financeiro',
    cor: 'from-rose-500 to-red-600'
  },
  {
    id: 'mod_mobile_track',
    nome: 'Vendas Ambulantes & Rastreio Móbile',
    descricao: 'Rastreamento de pedidos feitos fora da tenda pelo celular vs no balcão fixo (tablet/computador).',
    preco_base: 100.00,
    obrigatorio: false,
    icone: 'Smartphone',
    categoria: 'Operação',
    cor: 'from-cyan-500 to-teal-600'
  }
];

export const isModuleEnabled = (modulosAtivos, moduloId) => {
  if (!modulosAtivos) return true; // fallback
  if (moduloId === 'core_pos') return true;
  if (Array.isArray(modulosAtivos)) {
    return modulosAtivos.includes(moduloId);
  }
  return false;
};
