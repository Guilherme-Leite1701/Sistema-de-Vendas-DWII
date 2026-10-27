/**
 * 10. Relatório de performance comercial (seção 6).
 * Recebe um período (inicio e fim, no formato AAAA-MM-DD, ambos inclusivos).
 */
const db = require('../config/db');
const { AppError, tratarErroBanco } = require('../utils/erros');
const { validarData } = require('../utils/validacoes');

// Filtro de período: do início do dia "inicio" até o fim do dia "fim"
const FILTRO_PERIODO = 'v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY)';

async function gerarRelatorioPerformance(inicio, fim) {
  try {
    const dataInicio = validarData(inicio, 'inicio');
    const dataFim = validarData(fim, 'fim');
    if (dataInicio > dataFim) {
      throw new AppError("A data 'inicio' não pode ser posterior à data 'fim'.", 400);
    }
    const periodo = [dataInicio, dataFim];

    const [
      [[totais]],
      [porRegiao],
      [porTipoCliente],
      [melhorVendedor],
      [maiorComissao],
      [metasAtingidas],
    ] = await Promise.all([
      // 1 e 7. Total de vendas e comissão média geral
      db.execute(
        `SELECT COUNT(*)                                     AS total_vendas,
                COALESCE(SUM(v.valor_venda), 0)              AS valor_total_vendido,
                COALESCE(SUM(v.valor_comissao), 0)           AS valor_total_comissoes,
                COALESCE(ROUND(AVG(v.valor_comissao), 2), 0) AS comissao_media_geral
           FROM vendas v
          WHERE ${FILTRO_PERIODO}`,
        periodo
      ),

      // 2 e 8. Soma e comissão média por região (LEFT JOIN mostra regiões sem vendas)
      db.execute(
        `SELECT r.id_regiao,
                r.nome_regiao,
                COUNT(v.id_venda)                            AS quantidade_vendas,
                COALESCE(SUM(v.valor_venda), 0)              AS valor_total,
                COALESCE(ROUND(AVG(v.valor_comissao), 2), 0) AS comissao_media
           FROM regioes r
           LEFT JOIN vendas v
             ON v.id_regiao = r.id_regiao
            AND ${FILTRO_PERIODO}
          GROUP BY r.id_regiao, r.nome_regiao
          ORDER BY r.id_regiao`,
        periodo
      ),

      // 3. Soma por tipo de cliente
      db.execute(
        `SELECT v.tipo_cliente,
                COUNT(*)           AS quantidade_vendas,
                SUM(v.valor_venda) AS valor_total
           FROM vendas v
          WHERE ${FILTRO_PERIODO}
          GROUP BY v.tipo_cliente`,
        periodo
      ),

      // 4. Melhor vendedor (maior valor total vendido)
      db.execute(
        `SELECT ve.id_vendedor,
                ve.nome,
                COUNT(v.id_venda)  AS quantidade_vendas,
                SUM(v.valor_venda) AS total_vendido
           FROM vendas v
          INNER JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
          WHERE ${FILTRO_PERIODO}
          GROUP BY ve.id_vendedor, ve.nome
          ORDER BY total_vendido DESC, ve.id_vendedor
          LIMIT 1`,
        periodo
      ),

      // 5. Maior comissão acumulada
      db.execute(
        `SELECT ve.id_vendedor,
                ve.nome,
                COUNT(v.id_venda)     AS quantidade_vendas,
                SUM(v.valor_comissao) AS total_comissao
           FROM vendas v
          INNER JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
          WHERE ${FILTRO_PERIODO}
          GROUP BY ve.id_vendedor, ve.nome
          ORDER BY total_comissao DESC, ve.id_vendedor
          LIMIT 1`,
        periodo
      ),

      // 6. Vendedores cuja soma no período atingiu ou superou a meta mensal
      db.execute(
        `SELECT ve.id_vendedor,
                ve.nome,
                ve.meta_mensal,
                SUM(v.valor_venda)                                AS total_vendido,
                ROUND(SUM(v.valor_venda) / ve.meta_mensal * 100, 2) AS percentual_da_meta
           FROM vendas v
          INNER JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
          WHERE ${FILTRO_PERIODO}
          GROUP BY ve.id_vendedor, ve.nome, ve.meta_mensal
         HAVING SUM(v.valor_venda) >= ve.meta_mensal
          ORDER BY total_vendido DESC`,
        periodo
      ),
    ]);

    // Garante PF e PJ no resultado mesmo quando um deles não teve vendas
    const vendasPorTipoCliente = ['PF', 'PJ'].map((tipo) => {
      const linha = porTipoCliente.find((item) => item.tipo_cliente === tipo);
      return {
        tipo_cliente: tipo,
        quantidade_vendas: linha ? linha.quantidade_vendas : 0,
        valor_total: linha ? linha.valor_total : 0,
      };
    });

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      total_vendas: totais.total_vendas,
      valor_total_vendido: totais.valor_total_vendido,
      valor_total_comissoes: totais.valor_total_comissoes,
      vendas_por_regiao: porRegiao.map(({ id_regiao, nome_regiao, quantidade_vendas, valor_total }) => ({
        id_regiao,
        nome_regiao,
        quantidade_vendas,
        valor_total,
      })),
      vendas_por_tipo_cliente: vendasPorTipoCliente,
      melhor_vendedor: melhorVendedor[0] || null,
      maior_comissao: maiorComissao[0] || null,
      metas_atingidas: {
        quantidade: metasAtingidas.length,
        vendedores: metasAtingidas,
      },
      comissao_media_geral: totais.comissao_media_geral,
      comissao_media_por_regiao: porRegiao.map(
        ({ id_regiao, nome_regiao, quantidade_vendas, comissao_media }) => ({
          id_regiao,
          nome_regiao,
          quantidade_vendas,
          comissao_media,
        })
      ),
    };
  } catch (erro) {
    throw tratarErroBanco(erro, 'gerar relatório de performance');
  }
}

module.exports = { gerarRelatorioPerformance };
