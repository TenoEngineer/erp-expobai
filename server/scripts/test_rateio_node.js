const rateioRepo = require('../repositories/rateioRepository');

async function test() {
  const rel = await rateioRepo.getRelatorioRateio();
  console.log("=== RELATÓRIO ATUAL ===");
  console.log("Alex:", rel.socios.alex);
  console.log("Heitor:", rel.socios.heitor);
  console.log("Pais:", rel.socios.pais);
  console.log("Passos:", rel.passos_liquidacao);
}

test().then(() => process.exit(0));
