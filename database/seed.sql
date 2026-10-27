-- =====================================================================
-- Dados de exemplo (OPCIONAL) para testar a API e o relatório.
-- Execute DEPOIS do schema.sql. As comissões já estão calculadas
-- conforme a fórmula da regra 4.3:
--   comissão = valor_venda * (percentual_base + bônus_cliente + bônus_região) / 100
-- =====================================================================

USE db_vendas;

INSERT INTO vendedores (id_vendedor, nome, meta_mensal, percentual_base, ativo) VALUES
  (1, 'Ana Souza',    20000.00, 5.00, 1),
  (2, 'Bruno Lima',   15000.00, 4.50, 1),
  (3, 'Carla Mendes', 25000.00, 6.00, 1),
  (4, 'Diego Rocha',  10000.00, 4.00, 0);   -- vendedor desativado (soft delete)

INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao) VALUES
  -- Ana (5%):   Sudeste PJ -> 5 + 3 + 0   = 8.0%  | Sul PF -> 5 + 2 + 0.5 = 7.5%
  (1, 1, 3, '2026-10-02 10:15:00', 12000.00, 'PJ',  960.00),
  (2, 1, 4, '2026-10-09 14:40:00',  9500.00, 'PF',  712.50),
  -- Bruno (4.5%): Norte PJ -> 4.5 + 3 + 1 = 8.5% | Nordeste PF -> 4.5 + 2 + 1 = 7.5%
  (3, 2, 1, '2026-10-05 09:00:00',  8000.00, 'PJ',  680.00),
  (4, 2, 2, '2026-10-20 16:30:00',  3200.00, 'PF',  240.00),
  -- Carla (6%): Sudeste PJ -> 6 + 3 + 0 = 9% | Nordeste PF -> 6 + 2 + 1 = 9%
  (5, 3, 3, '2026-10-12 11:20:00', 18000.00, 'PJ', 1620.00),
  (6, 3, 2, '2026-10-22 15:05:00',  4500.00, 'PF',  405.00),
  -- Diego (4%), venda feita antes de ser desativado: Sul PF -> 4 + 2 + 0.5 = 6.5%
  (7, 4, 4, '2026-09-15 13:00:00',  6000.00, 'PF',  390.00);
