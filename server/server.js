const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const { dbReady } = require('./db');

const categoriasRouter = require('./routes/categorias');
const produtosRouter = require('./routes/produtos');
const pedidosRouter = require('./routes/pedidos');
const relatoriosRouter = require('./routes/relatorios');
const configuracoesRouter = require('./routes/configuracoes');
const impressaoRouter = require('./routes/impressao');
const caixaRouter = require('./routes/caixa');

const app = express();
const PORT = process.env.PORT || 5002;

// 1. Configuração de CORS flexível
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:10000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (como mobile apps, curl ou postman) ou se estiver na lista permitida
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissivo em produção para facilitar caixas de múltiplos dispositivos
  },
  credentials: true
}));

// 2. Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Servir pasta de uploads de imagens
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 4. Rotas da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ERP Expobai - Frente de Caixa',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/categorias', categoriasRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/caixa', caixaRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/impressao', impressaoRouter);

// Middleware global de tratamento de erros para rotas da API
app.use('/api', (err, req, res, next) => {
  console.error('⚠️ Erro na requisição API:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
});

// 5. Servir build do React em Produção (Render.com)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`📦 Servindo arquivos estáticos do frontend de: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// 6. Inicialização do servidor após banco estar pronto
dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🤠 ERP EXPOBAI - SERVIDOR ATIVO`);
    console.log(`🚀 Porta: http://localhost:${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });
}).catch(err => {
  console.error('Erro crítico ao aguardar banco de dados:', err);
});
