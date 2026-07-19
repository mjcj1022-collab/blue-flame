import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

const SECRET = process.env.JWT_SECRET ?? 'dev-insecure-change-me'

export interface Claims { id: string; tenant_id: string; role: string }

export const signToken = (claims: Claims): string => jwt.sign(claims, SECRET, { expiresIn: '7d' })

/** Attaches req.user from a Bearer token, or 401s. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ error: 'missing bearer token' }); return }
  try {
    ;(req as Request & { user: Claims }).user = jwt.verify(token, SECRET) as Claims
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}

/** Role gate — e.g. only admin/cad can change pricing. */
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: Claims }).user
    if (!user || !roles.includes(user.role)) { res.status(403).json({ error: 'forbidden' }); return }
    next()
  }
