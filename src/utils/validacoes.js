/**
 * Funções auxiliares de validação e conversão de dados de entrada.
 */
const { AppError } = require('./erros');

const VALOR_MAXIMO_DECIMAL_12_2 = 9999999999.99;

/** Converte number ou string numérica em Number; qualquer outra coisa vira NaN. */
function paraNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

/** Arredonda para 2 casas decimais (centavos). */
function arredondar2(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function validarId(valor, campo = 'id') {
  const numero = paraNumero(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new AppError(`O campo '${campo}' deve ser um número inteiro positivo.`, 400);
  }
  return numero;
}

function validarNome(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new AppError("O campo 'nome' é obrigatório.", 400);
  }
  const nome = valor.trim();
  if (nome.length > 100) {
    throw new AppError("O campo 'nome' deve ter no máximo 100 caracteres.", 400);
  }
  return nome;
}

function validarMetaMensal(valor) {
  const meta = paraNumero(valor);
  if (!Number.isFinite(meta) || meta < 0 || meta > VALOR_MAXIMO_DECIMAL_12_2) {
    throw new AppError("O campo 'meta_mensal' deve ser um número maior ou igual a zero.", 400);
  }
  return arredondar2(meta);
}

function validarPercentual(valor, campo = 'percentual_base') {
  const percentual = paraNumero(valor);
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    throw new AppError(`O campo '${campo}' deve ser um número entre 0 e 100.`, 400);
  }
  return arredondar2(percentual);
}

function validarBooleano(valor, campo) {
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false;
  throw new AppError(`O campo '${campo}' deve ser verdadeiro (true/1) ou falso (false/0).`, 400);
}

/** Regra 4.2.4: valor da venda estritamente maior que zero. */
function validarValorVenda(valor) {
  const numero = paraNumero(valor);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new AppError("O campo 'valor_venda' deve ser um número maior que zero.", 400);
  }
  const arredondado = arredondar2(numero);
  if (arredondado <= 0 || arredondado > VALOR_MAXIMO_DECIMAL_12_2) {
    throw new AppError("O campo 'valor_venda' está fora do intervalo permitido.", 400);
  }
  return arredondado;
}

/** Regra 4.2.5: tipo de cliente estritamente 'PF' ou 'PJ'. */
function validarTipoCliente(valor) {
  if (valor !== 'PF' && valor !== 'PJ') {
    throw new AppError("O campo 'tipo_cliente' deve ser estritamente 'PF' ou 'PJ'.", 400);
  }
  return valor;
}

function dataExiste(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/** Valida uma data no formato AAAA-MM-DD (usada no relatório). */
function validarData(valor, campo) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new AppError(`O parâmetro '${campo}' é obrigatório no formato AAAA-MM-DD.`, 400);
  }
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!dataExiste(ano, mes, dia)) {
    throw new AppError(`O parâmetro '${campo}' não é uma data válida.`, 400);
  }
  return valor;
}

/**
 * Valida data/hora opcional da venda. Aceita 'AAAA-MM-DD', 'AAAA-MM-DD HH:MM'
 * ou 'AAAA-MM-DD HH:MM:SS' (também com 'T'). Retorna 'AAAA-MM-DD HH:MM:SS'.
 */
function validarDataHora(valor, campo = 'data_venda') {
  const padrao = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
  const partes = typeof valor === 'string' ? valor.trim().match(padrao) : null;
  if (!partes) {
    throw new AppError(
      `O campo '${campo}' deve estar no formato AAAA-MM-DD ou AAAA-MM-DD HH:MM:SS.`,
      400
    );
  }
  const [, ano, mes, dia, hora = '00', minuto = '00', segundo = '00'] = partes;
  if (
    !dataExiste(Number(ano), Number(mes), Number(dia)) ||
    Number(hora) > 23 ||
    Number(minuto) > 59 ||
    Number(segundo) > 59
  ) {
    throw new AppError(`O campo '${campo}' não é uma data/hora válida.`, 400);
  }
  return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

module.exports = {
  paraNumero,
  arredondar2,
  validarId,
  validarNome,
  validarMetaMensal,
  validarPercentual,
  validarBooleano,
  validarValorVenda,
  validarTipoCliente,
  validarData,
  validarDataHora,
};
