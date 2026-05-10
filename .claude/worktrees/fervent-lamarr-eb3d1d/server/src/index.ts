import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const accessTokenTtl = process.env.ACCESS_TOKEN_TTL ?? '15m';
const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL ?? '30d';

type AuthProvider = 'password' | 'apple' | 'google';

type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  provider: AuthProvider;
  providerSubject?: string;
  timezone: string;
  createdAt: string;
};

type StoredSession = {
  userId: string;
  refreshToken: string;
  provider: AuthProvider;
  expiresAt: string;
};

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();
const usersByProviderSubject = new Map<string, StoredUser>();
const sessionsByRefreshToken = new Map<string, StoredSession>();

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.');

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80).optional(),
});

const appleSchema = z.object({
  identityToken: z.string().nullable().optional(),
  authorizationCode: z.string().nullable().optional(),
  user: z.string().min(1),
  email: z.string().email().nullable().optional(),
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
});

const googleSchema = z.object({
  idToken: z.string().nullable().optional(),
  serverAuthCode: z.string().nullable().optional(),
  email: emailSchema,
  name: z.string().nullable().optional(),
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
  providerSubject: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function deriveDisplayNameFromEmail(email: string) {
  return (email.split('@')[0] ?? 'Twogether')
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDisplayName(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ').trim();
}

function createAccessToken(user: StoredUser) {
  const signOptions: SignOptions = {
    expiresIn: accessTokenTtl as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    },
    jwtSecret,
    signOptions
  );
}

function parseTtlToMs(ttl: string) {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 1000 * 60 * 60 * 24 * 30;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
  };

  return amount * multipliers[unit];
}

function createSessionResponse(user: StoredUser, providerSubject?: string) {
  const refreshToken = createId('refresh');
  const expiresAt = new Date(Date.now() + parseTtlToMs(refreshTokenTtl)).toISOString();

  sessionsByRefreshToken.set(refreshToken, {
    userId: user.id,
    refreshToken,
    provider: user.provider,
    expiresAt,
  });

  return {
    session: {
      userId: user.id,
      provider: user.provider,
      email: user.email,
      displayName: user.displayName,
      accessToken: createAccessToken(user),
      refreshToken,
      tokenExpiresAt: expiresAt,
      createdAt: new Date().toISOString(),
      providerSubject: providerSubject ?? user.providerSubject,
    },
  };
}

function persistUser(user: StoredUser) {
  usersById.set(user.id, user);
  usersByEmail.set(user.email, user);

  if (user.providerSubject) {
    usersByProviderSubject.set(user.providerSubject, user);
  }

  return user;
}

function upsertProviderUser(params: {
  provider: AuthProvider;
  providerSubject: string;
  email: string;
  displayName: string;
}) {
  const existing =
    usersByProviderSubject.get(params.providerSubject) ?? usersByEmail.get(params.email);

  const user: StoredUser = existing
    ? {
        ...existing,
        email: params.email,
        displayName: params.displayName || existing.displayName,
        provider: params.provider,
        providerSubject: params.providerSubject,
      }
    : {
        id: createId('user'),
        email: params.email,
        displayName: params.displayName,
        provider: params.provider,
        providerSubject: params.providerSubject,
        timezone: 'America/Chicago',
        createdAt: new Date().toISOString(),
      };

  return persistUser(user);
}

function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Missing bearer token.',
    });
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, jwtSecret) as { sub?: string };
    const userId = decoded.sub;

    if (!userId) {
      return res.status(401).json({
        message: 'Invalid bearer token.',
      });
    }

    const user = usersById.get(userId);
    if (!user) {
      return res.status(401).json({
        message: 'Account no longer exists.',
      });
    }

    (req as express.Request & { authUser?: StoredUser }).authUser = user;
    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid bearer token.',
    });
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    users: usersByEmail.size,
    sessions: sessionsByRefreshToken.size,
  });
});

app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid request.',
    });
  }

  const { email, password, displayName } = parsed.data;
  if (usersByEmail.has(email)) {
    return res.status(409).json({
      message: 'An account with that email already exists.',
    });
  }

  const user: StoredUser = {
    id: createId('user'),
    email,
    displayName: displayName || deriveDisplayNameFromEmail(email),
    passwordHash: await bcrypt.hash(password, 10),
    provider: 'password',
    timezone: 'America/Chicago',
    createdAt: new Date().toISOString(),
  };

  persistUser(user);
  return res.status(201).json(createSessionResponse(user));
});

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid request.',
    });
  }

  const { email, password } = parsed.data;
  const user = usersByEmail.get(email);

  if (!user || !user.passwordHash) {
    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({
      message: 'Invalid email or password.',
    });
  }

  return res.json(createSessionResponse(user));
});

app.post('/auth/apple', (req, res) => {
  const parsed = appleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid Apple auth payload.',
    });
  }

  const displayName =
    buildDisplayName(parsed.data.givenName, parsed.data.familyName) || 'Apple User';
  const email =
    parsed.data.email ?? `${parsed.data.user.slice(0, 8)}@privaterelay.appleid.com`;

  const user = upsertProviderUser({
    provider: 'apple',
    providerSubject: parsed.data.user,
    email,
    displayName,
  });

  return res.json(createSessionResponse(user, parsed.data.user));
});

app.post('/auth/google', (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid Google auth payload.',
    });
  }

  const displayName =
    parsed.data.name ||
    buildDisplayName(parsed.data.givenName, parsed.data.familyName) ||
    deriveDisplayNameFromEmail(parsed.data.email);

  const user = upsertProviderUser({
    provider: 'google',
    providerSubject: parsed.data.providerSubject,
    email: parsed.data.email,
    displayName,
  });

  return res.json(createSessionResponse(user, parsed.data.providerSubject));
});

app.post('/auth/logout', (req, res) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid logout request.',
    });
  }

  if (parsed.data.refreshToken) {
    sessionsByRefreshToken.delete(parsed.data.refreshToken);
  }

  return res.json({
    ok: true,
  });
});

app.post('/auth/password/forgot', (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid password reset request.',
    });
  }

  const knownUser = usersByEmail.get(parsed.data.email);
  return res.json({
    accepted: true,
    message: knownUser
      ? `Password reset email accepted for ${parsed.data.email}.`
      : 'If that account exists, a password reset email has been queued.',
  });
});

app.patch('/account/profile', authenticateRequest, (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Invalid profile update.',
    });
  }

  const authUser = (req as express.Request & { authUser?: StoredUser }).authUser;
  if (!authUser) {
    return res.status(401).json({
      message: 'Not authenticated.',
    });
  }

  const updatedUser: StoredUser = {
    ...authUser,
    displayName: parsed.data.displayName,
  };

  persistUser(updatedUser);
  return res.json(createSessionResponse(updatedUser));
});

app.delete('/account', authenticateRequest, (req, res) => {
  const authUser = (req as express.Request & { authUser?: StoredUser }).authUser;
  if (!authUser) {
    return res.status(401).json({
      message: 'Not authenticated.',
    });
  }

  usersById.delete(authUser.id);
  usersByEmail.delete(authUser.email);

  if (authUser.providerSubject) {
    usersByProviderSubject.delete(authUser.providerSubject);
  }

  for (const [refreshToken, session] of sessionsByRefreshToken.entries()) {
    if (session.userId === authUser.id) {
      sessionsByRefreshToken.delete(refreshToken);
    }
  }

  return res.json({
    ok: true,
  });
});

app.listen(port, () => {
  console.log(`Twogether auth server listening on http://localhost:${port}`);
});
