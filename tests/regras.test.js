/**
 * Testes das regras de negócio sem precisar de um MySQL rodando.
 * O pool do banco é substituído por um "banco falso" em memória que
 * responde às consultas usadas pelos serviços.
 *
 * Executar: npm test
 */
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ---------------------------------------------------------------------
// Banco falso em memória
// ---------------------------------------------------------------------
const banco = { vendedores: [], regioes: [], vendas: [], proximoIdVenda: 1, proximoIdVendedor: 1 };

function popular() {
  banco.vendedores = [
    { id_vendedor: 1, nome: 'Ana Souza', meta_mensal: 20000, percentual_base: 5, ativo: 1 },
    { id_vendedor: 2, nome: 'Bruno Lima', meta_mensal: 15000, percentual_base: 4.5, ativo: 1 },
    { id_vendedor: 4, nome: 'Diego Rocha', meta_mensal: 10000, percentual_base: 4, ativo: 0 },
  ];
  banco.regioes = [
    { id_regiao: 1, nome_regiao: 'Norte', percentual_bonus: 1 },
    { id_regiao: 2, nome_regiao: 'Nordeste', percentual_bonus: 1 },
    { id_regiao: 3, nome_regiao: 'Sudeste', percentual_bonus: 0 },
    { id_regiao: 4, nome_regiao: 'Sul', percentual_bonus: 0.5 },
  ];
  banco.vendas = [];
  banco.proximoIdVenda = 1;
  banco.proximoIdVendedor = 5;
}

function vendaComJoin(v) {
  const ve = banco.vendedores.find((x) => x.id_vendedor === v.id_vendedor);
  const r = banco.regioes.find((x) => x.id_regiao === v.id_regiao);
  return { ...v, nome_vendedor: ve.nome, nome_regiao: r.nome_regiao };
}

const consultasExecutadas = [];

const poolFalso = {
  async query(sql, params) {
    return this.execute(sql, params);
  },
  async execute(sql, params = []) {
    const s = sql.replace(/\s+/g, ' ').trim();
    consultasExecutadas.push({ sql: s, params });

    // Toda consulta deve usar parâmetros: nenhum valor do usuário concatenado
    for (const p of params) {
      if (typeof p === 'string') assert.ok(!s.includes(p), `valor "${p}" concatenado no SQL`);
    }

    if (s.startsWith('SELECT id_vendedor, nome, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?') ||
        s.startsWith('SELECT id_vendedor, nome, meta_mensal, percentual_base, ativo FROM vendedores WHERE id_vendedor = ?')) {
      return [banco.vendedores.filter((v) => v.id_vendedor === params[0])];
    }
    if (s.startsWith('SELECT id_regiao, nome_regiao, percentual_bonus FROM regioes WHERE id_regiao = ?')) {
      return [banco.regioes.filter((r) => r.id_regiao === params[0])];
    }
    if (s.startsWith('SELECT id_venda FROM vendas WHERE id_venda = ?')) {
      return [banco.vendas.filter((v) => v.id_venda === params[0])];
    }
    if (s.includes('FROM vendas v INNER JOIN vendedores ve') && s.endsWith('WHERE v.id_venda = ?')) {
      return [banco.vendas.filter((v) => v.id_venda === params[0]).map(vendaComJoin)];
    }
    if (s.startsWith('INSERT INTO vendas')) {
      const [id, idVendedor, idRegiao, data, valor, tipo, comissao] = params;
      const idFinal = id ?? banco.proximoIdVenda;
      if (banco.vendas.some((v) => v.id_venda === idFinal)) {
        const e = new Error('Duplicate entry'); e.code = 'ER_DUP_ENTRY'; throw e;
      }
      banco.proximoIdVenda = Math.max(banco.proximoIdVenda, idFinal + 1);
      banco.vendas.push({
        id_venda: idFinal, id_vendedor: idVendedor, id_regiao: idRegiao,
        data_venda: data ?? '2026-10-26 12:00:00', valor_venda: valor, tipo_cliente: tipo, valor_comissao: comissao,
      });
      return [{ insertId: idFinal, affectedRows: 1 }];
    }
    if (s.startsWith('DELETE FROM vendas WHERE id_venda = ?')) {
      const antes = banco.vendas.length;
      banco.vendas = banco.vendas.filter((v) => v.id_venda !== params[0]);
      return [{ affectedRows: antes - banco.vendas.length }];
    }
    if (s.startsWith('INSERT INTO vendedores')) {
      const [nome, meta, pct, ativo] = params;
      const id = banco.proximoIdVendedor++;
      banco.vendedores.push({ id_vendedor: id, nome, meta_mensal: meta, percentual_base: pct, ativo });
      return [{ insertId: id, affectedRows: 1 }];
    }
    if (s.startsWith('UPDATE vendedores SET ativo = 0 WHERE id_vendedor = ?')) {
      const v = banco.vendedores.find((x) => x.id_vendedor === params[0]);
      v.ativo = 0;
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('UPDATE vendedores SET')) {
      const id = params[params.length - 1];
      const v = banco.vendedores.find((x) => x.id_vendedor === id);
      const campos = s.match(/SET (.*) WHERE/)[1].split(', ').map((c) => c.split(' = ')[0]);
      campos.forEach((campo, i) => { v[campo] = params[i]; });
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('DELETE FROM vendedores')) {
      throw new Error('Vendedores nunca devem ser excluídos fisicamente!');
    }
    throw new Error(`Consulta não prevista no banco falso: ${s}`);
  },
};

// Injeta o banco falso no lugar de src/config/db.js (que precisaria do mysql2)
const caminhoDb = path.join(__dirname, '..', 'src', 'config', 'db.js');
require.cache[caminhoDb] = { id: caminhoDb, filename: caminhoDb, loaded: true, exports: poolFalso };

const { calcularComissao, aplicarFormulaComissao } = require('../src/services/comissaoService');
const { registrarVenda, excluirVenda } = require('../src/services/vendaService');
const {
  cadastrarVendedor,
  atualizarVendedor,
  desativarVendedor,
} = require('../src/services/vendedorService');
const { gerarRelatorioPerformance } = require('../src/services/relatorioService');

beforeEach(() => {
  popular();
  consultasExecutadas.length = 0;
});

async function falhaCom(promessa, status, trecho) {
  await assert.rejects(promessa, (erro) => {
    assert.equal(erro.statusCode, status, `status esperado ${status}, recebido ${erro.statusCode}: ${erro.message}`);
    if (trecho) assert.match(erro.message, trecho);
    return true;
  });
}

// ---------------------------------------------------------------------
// 4.3 Cálculo de comissão
// ---------------------------------------------------------------------
test('fórmula: soma linear dos percentuais', () => {
  assert.equal(aplicarFormulaComissao(1000, 5, 3, 1), 90); // 9% de 1000
  assert.equal(aplicarFormulaComissao(9500, 5, 2, 0.5), 712.5); // 7,5%
  assert.equal(aplicarFormulaComissao(33.33, 4.5, 2, 1), 2.5); // arredonda centavos
});

test('comissão para todas as combinações de região x tipo de cliente', async () => {
  // Ana: base 5%
  const esperado = {
    'PF-1': 5 + 2 + 1, 'PJ-1': 5 + 3 + 1, // Norte
    'PF-2': 5 + 2 + 1, 'PJ-2': 5 + 3 + 1, // Nordeste
    'PF-3': 5 + 2 + 0, 'PJ-3': 5 + 3 + 0, // Sudeste
    'PF-4': 5 + 2 + 0.5, 'PJ-4': 5 + 3 + 0.5, // Sul
  };
  for (const [chave, pct] of Object.entries(esperado)) {
    const [tipo, regiao] = chave.split('-');
    const r = await calcularComissao({ id_vendedor: 1, id_regiao: Number(regiao), valor_venda: 10000, tipo_cliente: tipo });
    assert.equal(r.percentual_total, pct, chave);
    assert.equal(r.valor_comissao, (10000 * pct) / 100, chave);
  }
});

// ---------------------------------------------------------------------
// 4.2 Validações de venda
// ---------------------------------------------------------------------
test('registra venda válida e grava a comissão calculada', async () => {
  const r = await registrarVenda({ id_vendedor: 2, id_regiao: 1, valor_venda: 8000, tipo_cliente: 'PJ' });
  assert.equal(r.venda.valor_comissao, 680); // 4,5 + 3 + 1 = 8,5%
  assert.equal(r.venda.nome_regiao, 'Norte');
  assert.equal(banco.vendas.length, 1);
});

test('4.2.1 código de venda duplicado é recusado', async () => {
  await registrarVenda({ id_venda: 50, id_vendedor: 1, id_regiao: 3, valor_venda: 100, tipo_cliente: 'PF' });
  await falhaCom(
    registrarVenda({ id_venda: 50, id_vendedor: 1, id_regiao: 3, valor_venda: 200, tipo_cliente: 'PF' }),
    409, /código 50/
  );
  assert.equal(banco.vendas.length, 1);
});

test('4.2.2 vendedor inexistente ou inativo é recusado', async () => {
  await falhaCom(registrarVenda({ id_vendedor: 99, id_regiao: 1, valor_venda: 100, tipo_cliente: 'PF' }), 404);
  await falhaCom(registrarVenda({ id_vendedor: 4, id_regiao: 1, valor_venda: 100, tipo_cliente: 'PF' }), 422, /inativo/);
  assert.equal(banco.vendas.length, 0);
});

test('4.2.3 região inexistente é recusada', async () => {
  await falhaCom(registrarVenda({ id_vendedor: 1, id_regiao: 9, valor_venda: 100, tipo_cliente: 'PF' }), 404, /Região/);
});

test('4.2.4 valor da venda deve ser > 0', async () => {
  for (const valor of [0, -10, 'abc', null, '', 0.001]) {
    await falhaCom(registrarVenda({ id_vendedor: 1, id_regiao: 1, valor_venda: valor, tipo_cliente: 'PF' }), 400, /valor_venda/);
  }
});

test("4.2.5 tipo de cliente deve ser estritamente 'PF' ou 'PJ'", async () => {
  for (const tipo of ['pf', 'Pj', 'PX', '', undefined, 1]) {
    await falhaCom(registrarVenda({ id_vendedor: 1, id_regiao: 1, valor_venda: 10, tipo_cliente: tipo }), 400, /tipo_cliente/);
  }
});

test('4.2.6 excluir venda inexistente retorna 404 e não executa DELETE', async () => {
  await falhaCom(excluirVenda(123), 404);
  assert.ok(!consultasExecutadas.some((c) => c.sql.startsWith('DELETE')));

  await registrarVenda({ id_venda: 7, id_vendedor: 1, id_regiao: 4, valor_venda: 100, tipo_cliente: 'PF' });
  const excluida = await excluirVenda('7');
  assert.equal(excluida.id_venda, 7);
  assert.equal(banco.vendas.length, 0);
});

test('data_venda opcional é validada', async () => {
  await falhaCom(
    registrarVenda({ id_vendedor: 1, id_regiao: 1, valor_venda: 10, tipo_cliente: 'PF', data_venda: '2026-02-30' }),
    400, /data_venda/
  );
  const r = await registrarVenda({ id_vendedor: 1, id_regiao: 1, valor_venda: 10, tipo_cliente: 'PF', data_venda: '2026-10-01' });
  assert.equal(r.venda.data_venda, '2026-10-01 00:00:00');
});

// ---------------------------------------------------------------------
// 4.1 Vendedores
// ---------------------------------------------------------------------
test('vendedor cadastrado inicia ativo', async () => {
  const v = await cadastrarVendedor({ nome: 'Eva', meta_mensal: 5000, percentual_base: 3 });
  assert.equal(v.ativo, true);
  const inativo = await cadastrarVendedor({ nome: 'Fábio', meta_mensal: 5000, percentual_base: 3, ativo: false });
  assert.equal(inativo.ativo, false);
});

test('cadastro valida campos obrigatórios', async () => {
  await falhaCom(cadastrarVendedor({ meta_mensal: 1, percentual_base: 1 }), 400, /nome/);
  await falhaCom(cadastrarVendedor({ nome: 'X', meta_mensal: -1, percentual_base: 1 }), 400, /meta_mensal/);
  await falhaCom(cadastrarVendedor({ nome: 'X', meta_mensal: 1, percentual_base: 150 }), 400, /percentual_base/);
});

test('desativação é lógica (UPDATE ativo = 0, nunca DELETE)', async () => {
  const r = await desativarVendedor(1);
  assert.equal(r.vendedor.ativo, false);
  assert.equal(banco.vendedores.find((v) => v.id_vendedor === 1).ativo, 0);
  assert.ok(!consultasExecutadas.some((c) => c.sql.startsWith('DELETE')));
  await falhaCom(desativarVendedor(999), 404);
});

test('atualiza meta e percentual base', async () => {
  const v = await atualizarVendedor(2, { meta_mensal: 18000, percentual_base: '5.25' });
  assert.equal(v.meta_mensal, 18000);
  assert.equal(v.percentual_base, 5.25);
  await falhaCom(atualizarVendedor(2, {}), 400);
  await falhaCom(atualizarVendedor(999, { meta_mensal: 1 }), 404);
});

// ---------------------------------------------------------------------
// 6. Relatório — validação do período
// ---------------------------------------------------------------------
test('relatório exige período válido', async () => {
  await falhaCom(gerarRelatorioPerformance(undefined, '2026-10-31'), 400, /inicio/);
  await falhaCom(gerarRelatorioPerformance('2026-10-01', '31/10/2026'), 400, /fim/);
  await falhaCom(gerarRelatorioPerformance('2026-11-01', '2026-10-01'), 400, /posterior/);
});
