/**
 * Regras de negócio de vendedores (seção 4.1).
 * Funções obrigatórias: cadastrarVendedor, listarVendedores,
 * atualizarVendedor, desativarVendedor.
 */
const db = require('../config/db');
const { AppError, tratarErroBanco } = require('../utils/erros');
const {
  validarId,
  validarNome,
  validarMetaMensal,
  validarPercentual,
  validarBooleano,
} = require('../utils/validacoes');

/** Normaliza a linha do banco (ativo vem como 1/0 do MySQL). */
function formatarVendedor(linha) {
  return { ...linha, ativo: Boolean(linha.ativo) };
}

async function buscarVendedorPorId(idVendedor) {
  try {
    const id = validarId(idVendedor, 'id_vendedor');
    const [linhas] = await db.execute(
      `SELECT id_vendedor, nome, meta_mensal, percentual_base, ativo
         FROM vendedores
        WHERE id_vendedor = ?`,
      [id]
    );
    if (linhas.length === 0) {
      throw new AppError(`Vendedor ${id} não encontrado.`, 404);
    }
    return formatarVendedor(linhas[0]);
  } catch (erro) {
    throw tratarErroBanco(erro, 'buscar vendedor');
  }
}

/** 1. Cadastra um vendedor. Começa ativo, a menos que "ativo" seja informado. */
async function cadastrarVendedor(dados = {}) {
  try {
    const nome = validarNome(dados.nome);
    const metaMensal = validarMetaMensal(dados.meta_mensal);
    const percentualBase = validarPercentual(dados.percentual_base);
    const ativo = dados.ativo === undefined ? true : validarBooleano(dados.ativo, 'ativo');

    const [resultado] = await db.execute(
      `INSERT INTO vendedores (nome, meta_mensal, percentual_base, ativo)
       VALUES (?, ?, ?, ?)`,
      [nome, metaMensal, percentualBase, ativo ? 1 : 0]
    );

    return await buscarVendedorPorId(resultado.insertId);
  } catch (erro) {
    throw tratarErroBanco(erro, 'cadastrar vendedor');
  }
}

/** 2. Lista vendedores. Filtro opcional por situação (?ativo=true|false). */
async function listarVendedores(filtros = {}) {
  try {
    let sql = `SELECT id_vendedor, nome, meta_mensal, percentual_base, ativo
                 FROM vendedores`;
    const parametros = [];

    if (filtros.ativo !== undefined) {
      sql += ' WHERE ativo = ?';
      parametros.push(validarBooleano(filtros.ativo, 'ativo') ? 1 : 0);
    }
    sql += ' ORDER BY nome';

    const [linhas] = await db.execute(sql, parametros);
    return linhas.map(formatarVendedor);
  } catch (erro) {
    throw tratarErroBanco(erro, 'listar vendedores');
  }
}

/**
 * 3. Atualiza meta mensal, percentual base e/ou nome de um vendedor existente.
 * A situação (ativo) não é alterada aqui: use desativarVendedor().
 */
async function atualizarVendedor(idVendedor, dados = {}) {
  try {
    const id = validarId(idVendedor, 'id_vendedor');

    if (dados.ativo !== undefined) {
      throw new AppError(
        "O campo 'ativo' não pode ser alterado por aqui. Use PATCH /vendedores/:id/desativar.",
        400
      );
    }

    // Monta o SET apenas com colunas permitidas; os valores vão sempre como parâmetro (?)
    const colunas = [];
    const valores = [];

    if (dados.nome !== undefined) {
      colunas.push('nome = ?');
      valores.push(validarNome(dados.nome));
    }
    if (dados.meta_mensal !== undefined) {
      colunas.push('meta_mensal = ?');
      valores.push(validarMetaMensal(dados.meta_mensal));
    }
    if (dados.percentual_base !== undefined) {
      colunas.push('percentual_base = ?');
      valores.push(validarPercentual(dados.percentual_base));
    }

    if (colunas.length === 0) {
      throw new AppError(
        "Informe ao menos um campo para atualizar: 'meta_mensal', 'percentual_base' ou 'nome'.",
        400
      );
    }

    await buscarVendedorPorId(id); // garante que existe (404 caso contrário)

    await db.execute(`UPDATE vendedores SET ${colunas.join(', ')} WHERE id_vendedor = ?`, [
      ...valores,
      id,
    ]);

    return await buscarVendedorPorId(id);
  } catch (erro) {
    throw tratarErroBanco(erro, 'atualizar vendedor');
  }
}

/** 4. Exclusão lógica (soft delete): apenas marca ativo = 0, preservando o histórico. */
async function desativarVendedor(idVendedor) {
  try {
    const vendedor = await buscarVendedorPorId(idVendedor);

    if (!vendedor.ativo) {
      return { vendedor, jaEstavaInativo: true };
    }

    await db.execute('UPDATE vendedores SET ativo = 0 WHERE id_vendedor = ?', [
      vendedor.id_vendedor,
    ]);

    return { vendedor: { ...vendedor, ativo: false }, jaEstavaInativo: false };
  } catch (erro) {
    throw tratarErroBanco(erro, 'desativar vendedor');
  }
}

module.exports = {
  cadastrarVendedor,
  listarVendedores,
  atualizarVendedor,
  desativarVendedor,
  buscarVendedorPorId,
};
