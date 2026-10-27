/**
 * Conexão com o MySQL usando mysql2/promise (pool de conexões).
 * As credenciais vêm exclusivamente das variáveis de ambiente (.env).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const variaveisObrigatorias = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const faltando = variaveisObrigatorias.filter((nome) => !process.env[nome]);

if (faltando.length > 0) {
  console.warn(
    `[db] Atenção: variáveis de ambiente ausentes: ${faltando.join(', ')}. ` +
      'Copie o arquivo .env.example para .env e preencha os dados do banco.'
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Retorna DECIMAL como Number (e não string) para facilitar cálculos e o JSON
  decimalNumbers: true,
  // Retorna DATETIME como texto 'AAAA-MM-DD HH:MM:SS', sem conversão de fuso horário
  dateStrings: true,
});

module.exports = pool;
