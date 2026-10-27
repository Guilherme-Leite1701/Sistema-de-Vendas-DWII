const express = require('express');
const { calcularComissao } = require('../services/comissaoService');

const router = express.Router();

// POST /comissoes/calcular — simula a comissão de uma venda sem gravá-la
router.post('/calcular', async (req, res, next) => {
  try {
    const calculo = await calcularComissao(req.body);
    res.json({ sucesso: true, dados: calculo });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
