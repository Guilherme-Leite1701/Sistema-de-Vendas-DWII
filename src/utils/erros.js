/**
 * Erro de negócio/validação com código HTTP associado.
 * Tudo que for AppError é mostrado ao cliente; outros erros viram 500.
 */
class AppError extends Error {
  constructor(mensagem, statusCode = 400, detalhes = undefined) {
    super(mensagem);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.detalhes = detalhes;
  }
}

/**
 * Converte erros vindos do MySQL em erros compreensíveis para a API.
 * Usado nos blocos catch das funções de serviço.
 */
function tratarErroBanco(erro, acao) {
  if (erro instanceof AppError) return erro;

  switch (erro && erro.code) {
    case 'ER_DUP_ENTRY':
      return new AppError('Já existe um registro com este código.', 409);
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError('Referência inválida: vendedor ou região inexistente.', 400);
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError('O registro possui vínculos e não pode ser removido.', 409);
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new AppError('Os dados violam uma restrição do banco de dados.', 400);
    case 'ER_DATA_OUT_OF_RANGE':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return new AppError('Valor numérico fora do limite permitido.', 400);
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ETIMEDOUT':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
      return new AppError('Banco de dados indisponível. Verifique a conexão e o arquivo .env.', 503);
    default: {
      const erroInterno = new Error(`Erro ao ${acao}: ${erro && erro.message}`);
      erroInterno.original = erro;
      return erroInterno;
    }
  }
}

module.exports = { AppError, tratarErroBanco };
