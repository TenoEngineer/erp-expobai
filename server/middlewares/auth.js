const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'expoerp-super-secret-jwt-key-2026-production';

const tenantStatusCache = new Map();

/**
 * Consulta status, licença, limite de dispositivos e módulos do tenant com cache de 30s
 */
async function checkTenantActiveAndValid(tenantId) {
  const now = Date.now();
  const cached = tenantStatusCache.get(tenantId);
  if (cached && (now - cached.timestamp < 30000)) {
    return cached;
  }

  try {
    const { query } = require('../db');
    const res = await query('SELECT ativo, valido_ate, limite_dispositivos, modulos FROM expobai.tenants WHERE id = $1', [tenantId]);
    if (res.rows.length === 0) {
      const data = { exists: false, ativo: false, valido_ate: null, limite_dispositivos: 1, modulos: [], timestamp: now };
      tenantStatusCache.set(tenantId, data);
      return data;
    }
    const row = res.rows[0];
    const data = {
      exists: true,
      ativo: Boolean(row.ativo),
      valido_ate: row.valido_ate,
      limite_dispositivos: parseInt(row.limite_dispositivos, 10) || 5,
      modulos: Array.isArray(row.modulos) ? row.modulos : (typeof row.modulos === 'string' ? JSON.parse(row.modulos) : ['core_pos']),
      timestamp: now
    };
    tenantStatusCache.set(tenantId, data);
    return data;
  } catch (err) {
    console.error('Erro ao verificar tenant no banco:', err.message);
    if (cached) return cached;
    // Fail-closed para segurança
    return { exists: false, ativo: false, valido_ate: null, limite_dispositivos: 1, modulos: [], timestamp: now };
  }
}

/**
 * Rastreia conexões e bloqueia novos aparelhos se ultrapassar o limite contratado de dispositivos
 */
async function verifyAndTrackDevice({ tenantId, userId, deviceId, deviceInfo, ipAddress, limiteDispositivos = 5 }) {
  if (!deviceId) return { allowed: true };
  const { query } = require('../db');
  const timeoutMinutes = 20; // Janela de inatividade para considerar um aparelho desconectado

  try {
    // 1. Contar quantos OUTROS aparelhos únicos tiveram atividade nos últimos 20 minutos
    const countRes = await query(`
      SELECT COUNT(DISTINCT device_id) as total_ativos
      FROM expobai.dispositivos_ativos
      WHERE tenant_id = $1
        AND device_id != $2
        AND ultimo_acesso >= NOW() - ($3 || ' minutes')::interval
    `, [tenantId, deviceId, timeoutMinutes]);

    const outrosAtivos = parseInt(countRes.rows[0]?.total_ativos || 0, 10);

    // 2. Verificar se este aparelho já estava cadastrado para este tenant
    const existingRes = await query(`
      SELECT id FROM expobai.dispositivos_ativos
      WHERE tenant_id = $1 AND device_id = $2
    `, [tenantId, deviceId]);

    const isNovoAparelho = existingRes.rows.length === 0;

    // Se for aparelho novo e a quantidade de ativos já atingir o teto contratado
    if (isNovoAparelho && outrosAtivos >= limiteDispositivos) {
      return {
        allowed: false,
        limite: limiteDispositivos,
        ativos: outrosAtivos,
        error: `Limite de aparelhos excedido: seu estande contratou ${limiteDispositivos} ponto(s) de venda simultâneo(s). Há ${outrosAtivos} aparelho(s) ativo(s) no momento.`
      };
    }

    // 3. Atualizar último acesso ou registrar o aparelho (Upsert)
    await query(`
      INSERT INTO expobai.dispositivos_ativos (tenant_id, device_id, device_info, usuario_id, ip_address, ultimo_acesso)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id, device_id)
      DO UPDATE SET
        ultimo_acesso = CURRENT_TIMESTAMP,
        usuario_id = COALESCE(EXCLUDED.usuario_id, expobai.dispositivos_ativos.usuario_id),
        device_info = COALESCE(EXCLUDED.device_info, expobai.dispositivos_ativos.device_info),
        ip_address = EXCLUDED.ip_address
    `, [tenantId, deviceId, deviceInfo || null, userId || null, ipAddress || null]);

    return { allowed: true, limite: limiteDispositivos, ativos: outrosAtivos + 1 };
  } catch (err) {
    console.error('Aviso ao rastrear dispositivo:', err.message);
    return { allowed: true };
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

    // Blindagem de Segurança para Tenants:
    if (decoded.role !== 'superadmin' && req.tenantId) {
      const tenantStatus = await checkTenantActiveAndValid(req.tenantId);
      
      // 1. Empresa / Tenda Inativa
      if (!tenantStatus.exists || !tenantStatus.ativo) {
        return res.status(403).json({ 
          error: 'Acesso bloqueado: empresa/estande inativo ou suspenso. Contate o suporte.', 
          code: 'TENANT_INACTIVE' 
        });
      }

      // 2. Período / Licença Expirada (Token Expiration Bypass Prevention)
      if (tenantStatus.valido_ate && new Date(tenantStatus.valido_ate) < new Date()) {
        return res.status(403).json({ 
          error: 'Acesso bloqueado: o período contratado deste evento expirou. Renove sua licença para continuar operando.', 
          code: 'TENANT_EXPIRED',
          valido_ate: tenantStatus.valido_ate
        });
      }

      // 3. Limite de Dispositivos e Contas Compartilhadas (Device Limit Abuse Prevention)
      const deviceId = req.headers['x-device-id'] || req.query.device_id || null;
      if (deviceId) {
        const deviceInfo = req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 200) : null;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        const devCheck = await verifyAndTrackDevice({
          tenantId: req.tenantId,
          userId: decoded.id,
          deviceId,
          deviceInfo,
          ipAddress,
          limiteDispositivos: tenantStatus.limite_dispositivos || 5
        });

        if (!devCheck.allowed) {
          return res.status(403).json({
            error: devCheck.error,
            code: 'DEVICE_LIMIT_EXCEEDED',
            limite: devCheck.limite,
            ativos: devCheck.ativos
          });
        }
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
 * Middleware para Feature Gating: exige que a tenda tenha contratado pelo menos um dos módulos especificados
 */
function requireModule(...moduleKeys) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // SuperAdmin tem acesso livre a todos os módulos
    if (req.user.role === 'superadmin') {
      return next();
    }

    // core_pos é sempre liberado
    if (moduleKeys.includes('core_pos')) {
      return next();
    }

    const tenantId = req.tenantId || req.user.tenant_id;
    const tenantStatus = await checkTenantActiveAndValid(tenantId);
    const modulosAtivos = tenantStatus.modulos || req.user.modulos || [];

    const hasModule = moduleKeys.some(key => modulosAtivos.includes(key));
    if (hasModule) {
      return next();
    }

    return res.status(403).json({
      error: `Acesso negado: o módulo "${moduleKeys.join(' ou ')}" não está ativo no plano contratado da sua tenda.`,
      code: 'MODULE_LOCKED',
      modulosNecessarios: moduleKeys
    });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireModule,
  checkTenantActiveAndValid,
  verifyAndTrackDevice,
  JWT_SECRET
};

