-- Migração V3: Suporte a Combos com Preços Diferentes e Margem por Item
ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS combos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT FALSE;
ALTER TABLE expobai.produtos ADD COLUMN IF NOT EXISTS itens_combo JSONB DEFAULT '[]'::jsonb;

ALTER TABLE expobai.pedido_itens ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE expobai.pedido_itens ADD COLUMN IF NOT EXISTS combo_info JSONB DEFAULT NULL;
