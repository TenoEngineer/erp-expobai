const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

const { dbReady } = require('./db');
const { authenticateToken } = require('./middlewares/auth');

const authRouter = require('./routes/auth');
const tenantsRouter = require('./routes/tenants');
const categoriasRouter = require('./routes/categorias');
const produtosRouter = require('./routes/produtos');
const pedidosRouter = require('./routes/pedidos');
const relatoriosRouter = require('./routes/relatorios');
const configuracoesRouter = require('./routes/configuracoes');
const impressaoRouter = require('./routes/impressao');
const caixaRouter = require('./routes/caixa');
const rateioRouter = require('./routes/rateio');

const app = express();
const PORT = process.env.PORT || 5002;

// 1. Cabeçalhos de Segurança OWASP (Helmet)
app.use(helmet({
  contentSecurityPolicy: false // Permite renderização de estilos inline e gráficos do Vite
}));

// 2. Configuração de CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:10000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.sslip.io') || origin.includes('.duckdns.org')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// 3. Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Servir pasta de uploads de imagens
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 5. Rotas Públicas da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ExpoERP - Frente de Caixa e Gestão para Eventos',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRouter);

// 6. Proteção de Autenticação JWT e Isolamento Multi-Tenant
app.use('/api', authenticateToken);

// 7. Rotas Protegidas da API
app.use('/api/tenants', tenantsRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/caixa', caixaRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/impressao', impressaoRouter);
app.use('/api/rateio', rateioRouter);

// Middleware global de tratamento de erros para rotas da API
app.use('/api', (err, req, res, next) => {
  console.error('⚠️ Erro na requisição API:', err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
});

// 8. Servir build do React em Produção
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

// 9. Inicialização do servidor após banco estar pronto
dbReady.then(() => {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`⚡ EXPOERP - SISTEMA PDV & EVENTOS ATIVO`);
    console.log(`🚀 Porta: http://localhost:${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️ Segurança: JWT + Bcrypt + RBAC + Multi-Tenant`);
    console.log(`=========================================`);
  });
}).catch(err => {
  console.error('Erro crítico ao aguardar banco de dados:', err);
});
