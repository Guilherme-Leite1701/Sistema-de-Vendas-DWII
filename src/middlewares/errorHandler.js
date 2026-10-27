const { AppError } = require('../utils/erros');

/** Rota inexistente */
function rotaNaoEncontrada(req, res) {
  res.status(404).json({ sucesso: false, erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

/** Tratamento centralizado de erros: sempre responde em JSON */
// eslint-disable-next-line no-unused-vars
function errorHandler(erro, req, res, next) {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ sucesso: false, erro: 'JSON inválido no corpo da requisição.' });
  }

  if (erro instanceof AppError) {
    const corpo = { sucesso: false, erro: erro.message };
    if (erro.detalhes) corpo.detalhes = erro.detalhes;
    return res.status(erro.statusCode).json(corpo);
  }

  console.error('[erro interno]', erro.original || erro);
  return res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor.' });
}

module.exports = { rotaNaoEncontrada, errorHandler };
