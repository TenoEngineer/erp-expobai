BEGIN;

UPDATE expobai.pedidos
SET forma_pagamento = 'pix',
    pagamentos = '[{"forma": "pix", "valor": 70.00}]'::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Bancária: Pix confirmado no Nubank (Argeu Machado / Victor Hugo)'
WHERE id = 1079;


UPDATE expobai.pedidos
SET forma_pagamento = 'credito',
    pagamentos = json_build_array(json_build_object('forma', 'credito', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Sicredi: Venda passada em Cartão de Crédito na maquininha'
WHERE id IN (420,583,584,610,612,613,668,670,672,715,739,954);


UPDATE expobai.pedidos
SET forma_pagamento = 'debito',
    pagamentos = json_build_array(json_build_object('forma', 'debito', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Sicredi: Venda passada em Cartão de Débito na maquininha'
WHERE id IN (679,754,796,798,802,807,816,821,842,847,857,867,894,941,943,969,1017,1018,1022,1034,1048,1049,1050,1099);


UPDATE expobai.pedidos
SET forma_pagamento = 'dinheiro',
    pagamentos = json_build_array(json_build_object('forma', 'dinheiro', 'valor', total))::jsonb,
    editado = TRUE,
    editado_em = NOW(),
    motivo_edicao = 'Conciliação Caixa: Venda paga em dinheiro no balcão'
WHERE id IN (831,832,870,923,962,968,980,981,982,983,994,999,1002,1005,1026,1032,1058,1065,1070,1096,1097);


INSERT INTO expobai.custos_evento (descricao, valor, divisao, pago_por, observacoes)
VALUES (
    'Taxa Maquininha Sicredi (Expobai)',
    137.14,
    'alex_heitor',
    'alex',
    'Taxa de cartão retida pela adquirente Sicredi sobre faturamento bruto de R$ 6.878,02'
);

COMMIT;