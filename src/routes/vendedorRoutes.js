const express = require('express');
const {
  cadastrarVendedor,
  listarVendedores,
  atualizarVendedor,
  desativarVendedor,
  buscarVendedorPorId,
} = require('../services/vendedorService');
const { consultarVendasPorVendedor } = require('../services/vendaService');

const router = express.Router();

// POST /vendedores — cadastra um vendedor
router.post('/', async (req, res, next) => {
  try {
    const vendedor = await cadastrarVendedor(req.body);
    res.status(201).json({ sucesso: true, mensagem: 'Vendedor cadastrado com sucesso.', dados: vendedor });
  } catch (erro) {
    next(erro);
  }
});

// GET /vendedores?ativo=true|false — lista vendedores
router.get('/', async (req, res, next) => {
  try {
    const vendedores = await listarVendedores({ ativo: req.query.ativo });
    res.json({ sucesso: true, total: vendedores.length, dados: vendedores });
  } catch (erro) {
    next(erro);
  }
});

// GET /vendedores/:id — busca um vendedor
router.get('/:id', async (req, res, next) => {
  try {
    const vendedor = await buscarVendedorPorId(req.params.id);
    res.json({ sucesso: true, dados: vendedor });
  } catch (erro) {
    next(erro);
  }
});

// GET /vendedores/:id/vendas — vendas do vendedor + resumo
router.get('/:id/vendas', async (req, res, next) => {
  try {
    const resultado = await consultarVendasPorVendedor(req.params.id);
    res.json({ sucesso: true, dados: resultado });
  } catch (erro) {
    next(erro);
  }
});

// PUT /vendedores/:id — atualiza meta mensal, percentual base e/ou nome
router.put('/:id', async (req, res, next) => {
  try {
    const vendedor = await atualizarVendedor(req.params.id, req.body);
    res.json({ sucesso: true, mensagem: 'Vendedor atualizado com sucesso.', dados: vendedor });
  } catch (erro) {
    next(erro);
  }
});

// PATCH /vendedores/:id/desativar — exclusão lógica (soft delete)
router.patch('/:id/desativar', async (req, res, next) => {
  try {
    const { vendedor, jaEstavaInativo } = await desativarVendedor(req.params.id);
    res.json({
      sucesso: true,
      mensagem: jaEstavaInativo ? 'O vendedor já estava inativo.' : 'Vendedor desativado com sucesso.',
      dados: vendedor,
    });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
