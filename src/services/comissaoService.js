/**
 * Cálculo de comissão (seção 4.3).
 *
 *   Comissão = valor_venda × (percentual_base + percentual_cliente + percentual_regiao) / 100
 *
 * Os bônus são somados de forma linear ao percentual base (sem juros compostos).
 * - percentual_cliente: PF = 2%, PJ = 3%
 * - percentual_regiao: vem da coluna regioes.percentual_bonus
 *   (Norte 1%, Nordeste 1%, Sudeste 0%, Sul 0,5% — carregados no schema.sql)
 */
const db = require('../config/db');
const { AppError, tratarErroBanco } = require('../utils/erros');
const {
  validarId,
  validarValorVenda,
  validarTipoCliente,
  arredondar2,
} = require('../utils/validacoes');

const BONUS_TIPO_CLIENTE = Object.freeze({ PF: 2, PJ: 3 });

/** Aplica a fórmula (função pura, sem acesso ao banco). Resultado em R$ com 2 casas. */
function aplicarFormulaComissao(valorVenda, percentualBase, percentualCliente, percentualRegiao) {
  const percentualTotal = percentualBase + percentualCliente + percentualRegiao;
  return arredondar2((valorVenda * percentualTotal) / 100);
}

/**
 * 9. Calcula a comissão de uma venda.
 * Valida vendedor (existente e ativo), região (existente), valor (> 0) e tipo (PF/PJ),
 * busca os percentuais no banco e devolve o detalhamento do cálculo.
 */
async function calcularComissao(dados = {}) {
  try {
    // Validações de formato primeiro (não precisam do banco)
    const valorVenda = validarValorVenda(dados.valor_venda);
    const tipoCliente = validarTipoCliente(dados.tipo_cliente);
    const idVendedor = validarId(dados.id_vendedor, 'id_vendedor');
    const idRegiao = validarId(dados.id_regiao, 'id_regiao');

    // Regra 4.2.2: vendedor deve existir e estar ativo
    const [vendedores] = await db.execute(
      'SELECT id_vendedor, nome, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?',
      [idVendedor]
    );
    if (vendedores.length === 0) {
      throw new AppError(`Vendedor ${idVendedor} não encontrado.`, 404);
    }
    const vendedor = vendedores[0];
    if (!vendedor.ativo) {
      throw new AppError(
        `O vendedor ${idVendedor} (${vendedor.nome}) está inativo e não pode registrar vendas.`,
        422
      );
    }

    // Regra 4.2.3: região deve existir
    const [regioes] = await db.execute(
      'SELECT id_regiao, nome_regiao, percentual_bonus FROM regioes WHERE id_regiao = ?',
      [idRegiao]
    );
    if (regioes.length === 0) {
      throw new AppError(`Região ${idRegiao} não encontrada.`, 404);
    }
    const regiao = regioes[0];

    const percentualBase = Number(vendedor.percentual_base);
    const percentualCliente = BONUS_TIPO_CLIENTE[tipoCliente];
    const percentualRegiao = Number(regiao.percentual_bonus);
    const valorComissao = aplicarFormulaComissao(
      valorVenda,
      percentualBase,
      percentualCliente,
      percentualRegiao
    );

    return {
      id_vendedor: vendedor.id_vendedor,
      nome_vendedor: vendedor.nome,
      id_regiao: regiao.id_regiao,
      nome_regiao: regiao.nome_regiao,
      tipo_cliente: tipoCliente,
      valor_venda: valorVenda,
      percentual_base: percentualBase,
      percentual_cliente: percentualCliente,
      percentual_regiao: percentualRegiao,
      percentual_total: arredondar2(percentualBase + percentualCliente + percentualRegiao),
      valor_comissao: valorComissao,
    };
  } catch (erro) {
    throw tratarErroBanco(erro, 'calcular comissão');
  }
}

module.exports = { calcularComissao, aplicarFormulaComissao, BONUS_TIPO_CLIENTE };
