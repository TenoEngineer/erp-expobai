const relatoriosRepo = require('../repositories/relatoriosRepository');

async function test() {
  console.log('=============================================');
  console.log('TESTANDO ANÁLISE DE CESTA: TENDA MULLER');
  console.log('=============================================');
  const muller = await relatoriosRepo.getAnaliseCesta({ tenant_id: 'tenda-muller' });
  console.log('Totais Müller:', muller.totais);
  console.log('Distribuição SKUs Müller:');
  console.table(muller.distribuicao_skus);
  console.log('Top 5 Pares Cross-selling Müller:', muller.top_pares_cross_selling.slice(0, 5));
  console.log('Top 5 Monoproduto Müller:', muller.top_monoproduto.slice(0, 5));
  console.log('Top 5 Compras Unitárias Müller:', muller.top_compras_unitarias.slice(0, 5));

  console.log('\n=============================================');
  console.log('TESTANDO ANÁLISE DE CESTA: CHURRASCO GAUCHO');
  console.log('=============================================');
  const gaucho = await relatoriosRepo.getAnaliseCesta({ tenant_id: 'churrasco-gaucho' });
  console.log('Totais Gaúcho:', gaucho.totais);
  console.log('Distribuição SKUs Gaúcho:');
  console.table(gaucho.distribuicao_skus);
  console.log('Top 5 Pares Cross-selling Gaúcho:', gaucho.top_pares_cross_selling.slice(0, 5));
  console.log('Top 5 Monoproduto Gaúcho:', gaucho.top_monoproduto.slice(0, 5));
  console.log('Top 5 Compras Unitárias Gaúcho:', gaucho.top_compras_unitarias.slice(0, 5));
}

test().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
