const express = require('express');

const vendedorRoutes = require('./routes/vendedorRoutes');
const vendaRoutes = require('./routes/vendaRoutes');
const comissaoRoutes = require('./routes/comissaoRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const { rotaNaoEncontrada, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

// Página inicial com o mapa da API
app.get('/', (req, res) => {
  res.json({
    sucesso: true,
    api: 'Sistema de Vendas com Comissões, Metas e Performance',
    rotas: {
      vendedores: [
        'POST   /vendedores',
        'GET    /vendedores?ativo=true|false',
        'GET    /vendedores/:id',
        'GET    /vendedores/:id/vendas',
        'PUT    /vendedores/:id',
        'PATCH  /vendedores/:id/desativar',
      ],
      vendas: ['POST   /vendas', 'GET    /vendas', 'DELETE /vendas/:id'],
      comissoes: ['POST   /comissoes/calcular'],
      relatorios: ['GET    /relatorios/performance?inicio=AAAA-MM-DD&fim=AAAA-MM-DD'],
    },
  });
});

app.use('/vendedores', vendedorRoutes);
app.use('/vendas', vendaRoutes);
app.use('/comissoes', comissaoRoutes);
app.use('/relatorios', relatorioRoutes);

app.use(rotaNaoEncontrada);
app.use(errorHandler);

module.exports = app;
