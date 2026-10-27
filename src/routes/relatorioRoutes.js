const express = require('express');
const { gerarRelatorioPerformance } = require('../services/relatorioService');

const router = express.Router();

// GET /relatorios/performance?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/performance', async (req, res, next) => {
  try {
    const relatorio = await gerarRelatorioPerformance(req.query.inicio, req.query.fim);
    res.json({ sucesso: true, dados: relatorio });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
