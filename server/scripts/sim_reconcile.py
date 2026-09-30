import json

# Target Realities:
TARGET_CARTAO = 6878.02
TARGET_PIX = 3970.65 # Nubank 24 a 28

# Current ERP:
CURRENT_CARTAO = 6242.00
CURRENT_PIX = 4841.00
CURRENT_DINHEIRO = 8456.00

print("--- SIMULAÇÃO DE CONCILIAÇÃO PERFEITA ---")
print(f"Meta Cartão (Sicredi):  R$ {TARGET_CARTAO:.2f}")
print(f"Meta Pix (Nubank):      R$ {TARGET_PIX:.2f}")

diff_cartao = TARGET_CARTAO - CURRENT_CARTAO # + 636.02
diff_pix = CURRENT_PIX - TARGET_PIX          # + 870.35

print(f"\nCartão precisa SUBIR:  + R$ {diff_cartao:.2f}")
print(f"Pix precisa DESCER:    - R$ {diff_pix:.2f}")

# 1. Transferir R$ 636.02 de Pix para Cartão:
# Esse R$ 636.02 eram vendas que passaram na maquininha mas o operador clicou 'Pix'
sobra_pix = diff_pix - diff_cartao
print(f"\nAo transferir R$ {diff_cartao:.2f} dos Pix fantasmas para Cartão:")
print(f"  -> Cartão fica: R$ {CURRENT_CARTAO + diff_cartao:.2f} (100% EXATO com Sicredi!)")
print(f"  -> Pix ainda tem de sobra no ERP: R$ {sobra_pix:.2f}")

# 2. Ajuste do EXP-1077 (R$ 70.00 de Dinheiro para Pix):
print(f"\nAo passar EXP-1077 (R$ 70.00) de Dinheiro para Pix:")
sobra_pix_ajustada = sobra_pix + 70.00
print(f"  -> Sobra de pedidos que foram marcados como Pix sem dinheiro no Nubank: R$ {sobra_pix_ajustada:.2f}")
print(f"     (Ex: 10 recusas da maquininha de R$ 177,01 + pedidos pagos em dinheiro ou cancelados)")
