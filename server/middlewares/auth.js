const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'expoerp-super-secret-jwt-key-2026-production';

const tenantStatusCache = new Map();

async function checkTenantActiveAndValid(tenantId) {
  const now = Date.now();
  const cached = tenantStatusCache.get(tenantId);
  if (cached && (now - cached.timestamp < 30000)) {
    return cached;
  }

  try {
    const { query } = require('../db');
    const res = await query('SELECT ativo, valido_ate FROM expobai.tenants WHERE id = $1', [tenantId]);
    if (res.rows.length === 0) {
      const data = { exists: false, ativo: false, valido_ate: null, timestamp: now };
      tenantStatusCache.set(tenantId, data);
      return data;
    }
    const data = {
      exists: true,
      ativo: res.rows[0].ativo,
      valido_ate: res.rows[0].valido_ate,
      timestamp: now
    };
    tenantStatusCache.set(tenantId, data);
    return data;
  } catch (err) {
    return { exists: true, ativo: true, valido_ate: null, timestamp: now };
  }
}

/**
 * Middleware que valida o token JWT e injeta req.user e req.tenantId
 */
function authenticateToken(req, res, next) {
  // Rotas públicas que não precisam de autenticação
  const publicPaths = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/login-pin',
    '/api/auth/tenants-public'
  ];

  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : (req.query.token || null);

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado: token JWT ausente' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Token de autenticação inválido ou corrompido' });
    }

    req.user = decoded;
    // Se for superadmin e passar ?tenant_id=..., assume a tenda solicitada
    if (decoded.role === 'superadmin' && req.query.tenant_id) {
      req.tenantId = req.query.tenant_id;
    } else {
      req.tenantId = decoded.tenant_id || 'tenda-muller';
    }

    // Blindagem de Segurança: Se não for superadmin, valida se a empresa está ativa e com licença não expirada
    if (decoded.role !== 'superadmin' && req.tenantId) {
      const tenantStatus = await checkTenantActiveAndValid(req.tenantId);
      if (!tenantStatus.exists || !tenantStatus.ativo) {
        return res.status(403).json({ 
          error: 'Acesso bloqueado: empresa/estande inativo ou suspenso. Contate o suporte.', 
          code: 'TENANT_INACTIVE' 
        });
      }
      if (tenantStatus.valido_ate && new Date(tenantStatus.valido_ate) < new Date()) {
        return res.status(403).json({ 
          error: 'Acesso bloqueado: período contratado expirou. Entre em contato para renovar sua licença.', 
          code: 'TENANT_EXPIRED' 
        });
      }
    }

    next();
  });
}

/**
 * Middleware de controle de acesso baseado em papéis (RBAC)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // SuperAdmin tem passe livre em qualquer rota protegida
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado: seu perfil não tem permissão para esta funcionalidade',
        roleNecessaria: roles,
        roleAtual: req.user.role
      });
    }

    next();
  };
}

/**
 * Middleware para Feature Gating: exige que a tenda tenha contratado o módulo especificado
 */
function requireModule(moduleKey) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // SuperAdmin tem acesso livre a todos os módulos
    if (req.user.role === 'superadmin') {
      return next();
    }

    // core_pos é sempre liberado
    if (moduleKey === 'core_pos') {
      return next();
    }

    // Verifica primeiro se o módulo já consta no token
    const tokenMods = req.user.modulos || [];
    if (tokenMods.includes(moduleKey)) {
      return next();
    }

    // Se não constava no token (ex: acabou de ser ativado pelo SuperAdmin), consulta o banco em tempo real
    try {
      const { query } = require('../db');
      const tenantId = req.tenantId || req.user.tenant_id;
      if (tenantId) {
        const tenantRes = await query('SELECT modulos FROM expobai.tenants WHERE id = $1', [tenantId]);
        if (tenantRes.rows.length > 0 && tenantRes.rows[0].modulos) {
          const modulosAtivos = tenantRes.rows[0].modulos;
          req.user.modulos = modulosAtivos;
          if (modulosAtivos.includes(moduleKey)) {
            return next();
          }
        }
      }
    } catch (dbErr) {
      console.warn('Aviso: falha ao verificar módulos em tempo real:', dbErr.message);
    }

    return res.status(403).json({
      error: `O módulo "${moduleKey}" não está ativo no plano da sua tenda.`,
      code: 'MODULE_LOCKED',
      modulo: moduleKey
    });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireModule,
  JWT_SECRET
};

