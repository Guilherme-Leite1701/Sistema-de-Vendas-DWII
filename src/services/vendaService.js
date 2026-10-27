/**
 * Registro, consulta e exclusão de vendas (seção 4.2).
 * Funções obrigatórias: registrarVenda, listarVendas,
 * consultarVendasPorVendedor, excluirVenda.
 */
const db = require('../config/db');
const { AppError, tratarErroBanco } = require('../utils/erros');
const { validarId, validarDataHora } = require('../utils/validacoes');
const { calcularComissao } = require('./comissaoService');
const { buscarVendedorPorId } = require('./vendedorService');

// SELECT com JOIN reaproveitado nas consultas de vendas
const SELECT_VENDAS = `
  SELECT v.id_venda,
         v.id_vendedor,
         ve.nome        AS nome_vendedor,
         v.id_regiao,
         r.nome_regiao,
         v.data_venda,
         v.valor_venda,
         v.tipo_cliente,
         v.valor_comissao
    FROM vendas v
   INNER JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
   INNER JOIN regioes    r  ON r.id_regiao    = v.id_regiao`;

async function buscarVendaPorId(id) {
  const [linhas] = await db.execute(`${SELECT_VENDAS} WHERE v.id_venda = ?`, [id]);
  return linhas[0] || null;
}

/**
 * 5. Registra uma venda após todas as validações da regra 4.2
 * e grava a comissão calculada pela regra 4.3.
 */
async function registrarVenda(dados = {}) {
  try {
    // Regra 4.2.1: se o código for informado, não pode existir outra venda com ele
    let idVenda = null;
    if (dados.id_venda !== undefined && dados.id_venda !== null && dados.id_venda !== '') {
      idVenda = validarId(dados.id_venda, 'id_venda');
      const [existentes] = await db.execute('SELECT id_venda FROM vendas WHERE id_venda = ?', [
        idVenda,
      ]);
      if (existentes.length > 0) {
        throw new AppError(`Já existe uma venda com o código ${idVenda}.`, 409);
      }
    }

    // Data opcional (útil para lançar vendas retroativas); senão usa CURRENT_TIMESTAMP
    const dataVenda =
      dados.data_venda === undefined || dados.data_venda === null || dados.data_venda === ''
        ? null
        : validarDataHora(dados.data_venda);

    // Regras 4.2.2 a 4.2.5 + cálculo da comissão (regra 4.3)
    const calculo = await calcularComissao(dados);

    const [resultado] = await db.execute(
      `INSERT INTO vendas
         (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao)
       VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)`,
      [
        idVenda, // null => AUTO_INCREMENT gera o código
        calculo.id_vendedor,
        calculo.id_regiao,
        dataVenda,
        calculo.valor_venda,
        calculo.tipo_cliente,
        calculo.valor_comissao,
      ]
    );

    const venda = await buscarVendaPorId(idVenda || resultado.insertId);

    return {
      venda,
      detalhamento_comissao: {
        percentual_base: calculo.percentual_base,
        percentual_cliente: calculo.percentual_cliente,
        percentual_regiao: calculo.percentual_regiao,
        percentual_total: calculo.percentual_total,
        valor_comissao: calculo.valor_comissao,
      },
    };
  } catch (erro) {
    throw tratarErroBanco(erro, 'registrar venda');
  }
}

/** 6. Lista todas as vendas com nome do vendedor e da região (JOIN). */
async function listarVendas() {
  try {
    const [linhas] = await db.execute(`${SELECT_VENDAS} ORDER BY v.data_venda DESC, v.id_venda DESC`);
    return linhas;
  } catch (erro) {
    throw tratarErroBanco(erro, 'listar vendas');
  }
}

/** 7. Vendas de um vendedor + resumo com COUNT/SUM/AVG. */
async function consultarVendasPorVendedor(idVendedor) {
  try {
    const vendedor = await buscarVendedorPorId(idVendedor); // 404 se não existir

    const [vendas] = await db.execute(
      `${SELECT_VENDAS} WHERE v.id_vendedor = ? ORDER BY v.data_venda DESC, v.id_venda DESC`,
      [vendedor.id_vendedor]
    );

    const [[resumo]] = await db.execute(
      `SELECT COUNT(*)                                  AS quantidade_vendas,
              COALESCE(SUM(valor_venda), 0)             AS total_vendido,
              COALESCE(SUM(valor_comissao), 0)          AS total_comissao,
              COALESCE(ROUND(AVG(valor_venda), 2), 0)   AS ticket_medio
         FROM vendas
        WHERE id_vendedor = ?`,
      [vendedor.id_vendedor]
    );

    return { vendedor, resumo, vendas };
  } catch (erro) {
    throw tratarErroBanco(erro, 'consultar vendas do vendedor');
  }
}

/** 8. Exclui uma venda, verificando antes se ela existe (regra 4.2.6). */
async function excluirVenda(idVenda) {
  try {
    const id = validarId(idVenda, 'id_venda');

    const venda = await buscarVendaPorId(id);
    if (!venda) {
      throw new AppError(`Venda ${id} não encontrada.`, 404);
    }

    await db.execute('DELETE FROM vendas WHERE id_venda = ?', [id]);
    return venda;
  } catch (erro) {
    throw tratarErroBanco(erro, 'excluir venda');
  }
}

module.exports = {
  registrarVenda,
  listarVendas,
  consultarVendasPorVendedor,
  excluirVenda,
};
