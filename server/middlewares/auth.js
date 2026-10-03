const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'expoerp-super-secret-jwt-key-2026-production';

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

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
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
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // SuperAdmin tem acesso livre a todos os módulos
    if (req.user.role === 'superadmin') {
      return next();
    }

    const modulos = req.user.modulos || [];
    // core_pos é sempre liberado
    if (moduleKey === 'core_pos' || modulos.includes(moduleKey)) {
      return next();
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

