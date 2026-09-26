-- Migration v4: Categoria de Combos e índices
DO $$
DECLARE
  v_cat_id INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM expobai.categorias WHERE LOWER(nome) = 'combos') THEN
    INSERT INTO expobai.categorias (nome, icone, cor, ordem, ativo)
    VALUES ('Combos', 'sparkles', '#7C3AED', 0, 1)
    RETURNING id INTO v_cat_id;
  ELSE
    SELECT id INTO v_cat_id FROM expobai.categorias WHERE LOWER(nome) = 'combos';
  END IF;

  -- Exemplo de combo pré-pronto se não houver nenhum
  IF NOT EXISTS (SELECT 1 FROM expobai.produtos WHERE is_combo = true) THEN
    INSERT INTO expobai.produtos (
      categoria_id, nome, descricao, preco, preco_custo, ativo, ordem, is_combo, itens_combo
    ) VALUES (
      v_cat_id,
      'Combo 1: Espetinho + Refrigerante',
      'Inclui: 1x Espetinho Carne + 1x Refrigerante',
      19.00,
      12.50,
      1,
      1,
      true,
      '[{"produto_id":1,"nome":"Espetinho Carne","quantidade":1,"preco":15.00,"preco_custo":8.00},{"produto_id":6,"nome":"Refrigerante","quantidade":1,"preco":6.00,"preco_custo":4.50}]'::jsonb
    );
  END IF;
END $$;
