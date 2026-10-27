# Sistema de Vendas com Comissões, Metas e Performance

API REST em **Node.js + Express + MySQL** (`mysql2/promise`, sem ORM) para gerenciar vendedores, vendas, comissões e relatórios de performance.

## Como rodar

```bash
npm install
mysql -u root -p < database/schema.sql   # cria o banco, as tabelas e as regiões
mysql -u root -p < database/seed.sql     # opcional: dados de exemplo
cp .env.example .env                     # preencha usuário e senha do MySQL
npm start                                # http://localhost:3000
```

Testes das regras de negócio: `npm test`. As requisições prontas estão em `requests.http`.

## Rotas

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/vendedores` | Cadastra vendedor |
| `GET` | `/vendedores?ativo=true\|false` | Lista vendedores |
| `GET` | `/vendedores/:id` | Busca vendedor |
| `GET` | `/vendedores/:id/vendas` | Vendas do vendedor + resumo |
| `PUT` | `/vendedores/:id` | Atualiza meta, percentual base e/ou nome |
| `PATCH` | `/vendedores/:id/desativar` | Desativa vendedor (soft delete) |
| `POST` | `/vendas` | Registra venda |
| `GET` | `/vendas` | Lista vendas |
| `DELETE` | `/vendas/:id` | Exclui venda |
| `POST` | `/comissoes/calcular` | Simula comissão sem gravar |
| `GET` | `/relatorios/performance?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Relatório de performance |

Exemplo de venda (`id_venda` e `data_venda` são opcionais):

```json
{ "id_vendedor": 1, "id_regiao": 4, "valor_venda": 10000, "tipo_cliente": "PJ" }
```

## Regras de negócio

- **Vendedores:** iniciam ativos e nunca são excluídos fisicamente, apenas desativados (`ativo = 0`).
- **Vendas:** o código não pode se repetir, o vendedor precisa existir e estar ativo, a região precisa existir, o valor deve ser maior que zero e o tipo de cliente só pode ser `PF` ou `PJ`. Antes de excluir, o sistema verifica se a venda existe.
- **Comissão:** `valor_venda × (percentual_base + bônus_cliente + bônus_região) / 100`
  - Bônus por cliente: PF 2%, PJ 3%.
  - Bônus por região: Norte 1%, Nordeste 1%, Sudeste 0%, Sul 0,5%.
- **Erros:** `400` para dado inválido, `404` para registro não encontrado, `409` para código repetido, `422` para vendedor inativo e `503` quando o banco está fora do ar.

## Onde estão as 10 funções

- `src/services/vendedorService.js`: `cadastrarVendedor`, `listarVendedores`, `atualizarVendedor` e `desativarVendedor`.
- `src/services/vendaService.js`: `registrarVenda`, `listarVendas`, `consultarVendasPorVendedor` e `excluirVenda`.
- `src/services/comissaoService.js`: `calcularComissao`.
- `src/services/relatorioService.js`: `gerarRelatorioPerformance`.

## Conferência rápida (com o `seed.sql`)

`GET /relatorios/performance?inicio=2026-10-01&fim=2026-10-31` deve retornar:

- 6 vendas, totalizando R$ 55.200.
- Melhor vendedor e maior comissão: Carla Mendes.
- Meta atingida: Ana Souza.
- Comissão média geral: R$ 769,58.
