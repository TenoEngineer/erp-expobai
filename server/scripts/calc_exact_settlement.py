# Let's compute the exact liquidation matrix with the user's specific conditions:
# 1. Gross Sales:
vendas_alex = 7950.00
vendas_heitor = 9034.00
vendas_pais = 2555.00

# 2. Custos:
# Aluguel: 1800 (pago 900 por heitor do bolso, 900 por alex do bolso -> 100% quitado por fora)
# Luz: 300 (tirado do caixa físico -> divisão 150 alex, 150 heitor)
# Wifi: 150 (pago por Heitor do bolso -> divisão 75 alex, 75 heitor)
# Taxa Cartão: 137.14 (descontado da conta do Alex -> divisão 68.57 alex, 68.57 heitor)

# 3. Posse do dinheiro:
# Alex: Cartão Líquido na conta = 6878.00 - 137.14 = 6740.86
# Pais: Pix na conta Nubank = 3797.00
# Heitor: Dinheiro físico na mão = 4527.00 (após ter tirado os 300 da luz)

# Custos a abater das vendas de cada um:
# Alex deve arcar com:
# - Luz: 150.00
# - Wifi: 75.00
# - Taxa cartão: 68.57
# Total custos que cabem ao Alex: 293.57
# Como Alex já arcou com 137.14 da taxa retida na conta dele:
# Custos restantes que Alex deve pagar: 293.57 - 137.14 = 156.43
# (Sendo 150 da luz que saiu do caixa + 6.43 de diferença entre Wifi e Taxa)

# Portanto, o Direito Líquido do Alex das vendas da feira é:
# 7950.00 (vendas brutas) - 293.57 (custos) = 7656.43
# Como ele recebeu no banco: 6740.86 líquido (6878 - 137.14)
# Quanto falta entrar para o Alex:
falta_alex = 7656.43 - 6740.86
print(f"Falta o Alex receber: R$ {falta_alex:.2f}")

# Pais:
# Vendas brutas: 2555.00
# Custos: 0.00
# Direito líquido: 2555.00
# Posse no Nubank: 3797.00
# Excedente que Pais devem repassar:
devolve_pais = 3797.00 - 2555.00
print(f"Pais devem transferir para o Heitor: R$ {devolve_pais:.2f}")

# Heitor:
# Vendas brutas: 9034.00
# Custos que cabem ao Heitor:
# - Luz: 150.00
# - Wifi: 75.00
# - Taxa cartão: 68.57
# Total custos Heitor: 293.57
# Mas Heitor adiantou 150.00 do Wifi do bolso:
# Custos líquidos Heitor: 293.57 - 150.00 = 143.57
# Direito líquido Heitor: 9034.00 - 143.57 = 8890.43 (ou 9034 - 293.57 = 8740.43 + 150 = 8890.43)

# Quanto Heitor fica no bolso:
# Tem em mãos: 4527.00
# Recebe dos Pais: + 1242.00
# Paga para o Alex: - 915.57
# Total que Heitor fica:
total_heitor_fica = 4527.00 + devolve_pais - falta_alex
print(f"Heitor fica com: R$ {total_heitor_fica:.2f}")
