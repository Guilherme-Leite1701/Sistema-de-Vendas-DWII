require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

async function iniciar() {
  try {
    await pool.query('SELECT 1'); // testa a conexão antes de subir a API
    console.log(`[db] Conectado ao MySQL (${process.env.DB_NAME}).`);

    app.listen(PORT, () => {
      console.log(`[api] Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (erro) {
    console.error('[db] Não foi possível conectar ao MySQL:', erro.message);
    console.error('      Confira o arquivo .env e se o banco db_vendas foi criado (database/schema.sql).');
    process.exit(1);
  }
}

iniciar();
