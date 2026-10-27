const express = require('express');
const { registrarVenda, listarVendas, excluirVenda } = require('../services/vendaService');

const router = express.Router();

// POST /vendas — registra uma venda (com validações e cálculo de comissão)
router.post('/', async (req, res, next) => {
  try {
    const resultado = await registrarVenda(req.body);
    res.status(201).json({ sucesso: true, mensagem: 'Venda registrada com sucesso.', dados: resultado });
  } catch (erro) {
    next(erro);
  }
});

// GET /vendas — lista todas as vendas
router.get('/', async (req, res, next) => {
  try {
    const vendas = await listarVendas();
    res.json({ sucesso: true, total: vendas.length, dados: vendas });
  } catch (erro) {
    next(erro);
  }
});

// DELETE /vendas/:id — exclui uma venda (verifica se existe antes)
router.delete('/:id', async (req, res, next) => {
  try {
    const venda = await excluirVenda(req.params.id);
    res.json({ sucesso: true, mensagem: 'Venda excluída com sucesso.', dados: venda });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
