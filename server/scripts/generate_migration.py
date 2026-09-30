import json
import subprocess

with open("scripts/reconciliation_plan.json", encoding="utf-8") as f:
    plan = json.load(f)

cred_ids = plan['credito_ids']
deb_ids = plan['debito_ids']
sobra_ids = plan['sobra_pix_ids']

sql_commands = []
sql_commands.append("BEGIN;")

# 1. Update EXP-1077 (ID 1079) to Pix
sql_commands.append("""
UPDATE expobai.pedidos
SET forma_pagamento = 'pix',
    pagamentos = '[{"forma": "pix", "valor": 70.00}]'::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Bancária: Pix confirmado no Nubank (Argeu Machado / Victor Hugo)'
WHERE id = 1079;
""")

# 2. Update 12 orders from Pix to Credito
cred_ids_str = ",".join(str(x) for x in cred_ids)
sql_commands.append(f"""
UPDATE expobai.pedidos
SET forma_pagamento = 'credito',
    pagamentos = json_build_array(json_build_object('forma', 'credito', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Sicredi: Venda passada em Cartão de Crédito na maquininha'
WHERE id IN ({cred_ids_str});
""")

# 3. Update 24 orders from Pix to Debito
deb_ids_str = ",".join(str(x) for x in deb_ids)
sql_commands.append(f"""
UPDATE expobai.pedidos
SET forma_pagamento = 'debito',
    pagamentos = json_build_array(json_build_object('forma', 'debito', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Sicredi: Venda passada em Cartão de Débito na maquininha'
WHERE id IN ({deb_ids_str});
""")

# 4. Update 21 sobra orders from Pix to Dinheiro
sobra_ids_str = ",".join(str(x) for x in sobra_ids)
sql_commands.append(f"""
UPDATE expobai.pedidos
SET forma_pagamento = 'dinheiro',
    pagamentos = json_build_array(json_build_object('forma', 'dinheiro', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Caixa: Venda paga em dinheiro no balcão'
WHERE id IN ({sobra_ids_str});
""")

# 5. Insert card fee into custos_evento (rateado 50/50 entre Alex e Heitor, pago por Alex)
sql_commands.append("""
INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
VALUES (
    'Taxa Maquininha Sicredi (Expobai)',
    137.14,
    'alex_heitor',
    'alex',
    'Taxa de cartão retida pela adquirente Sicredi sobre faturamento bruto de R$ 6.878,02'
);
""")

sql_commands.append("COMMIT;")

full_sql = "\n".join(sql_commands)
with open("scripts/apply_reconciliation.sql", "w", encoding="utf-8") as f:
    f.write(full_sql)

print(f"SQL gerado com sucesso!")
print(f"Crédito a atualizar: {len(cred_ids)} pedidos")
print(f"Débito a atualizar:  {len(deb_ids)} pedidos")
print(f"Dinheiro a atualizar: {len(sobra_ids)} pedidos")
print(f"EXP-1077 a atualizar: 1 pedido")
print(f"Custo de taxa do Sicredi: R$ 137.14 (divisão alex_heitor, pago_por alex)")
