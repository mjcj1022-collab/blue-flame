import { describe, it, expect } from 'vitest'
import { loginFailureReason, sessionUser, sessionInvalidatedBy } from '../state/auth'

/**
 * On a free host that sleeps, an unreachable server must NOT be reported as a
 * wrong password — that sends people chasing the wrong problem. fetch() rejects
 * with a TypeError when no response arrives (asleep, offline, CORS-blocked);
 * a real 401 comes back as a plain Error from the API client.
 */
describe('sign-in failure classification', () => {
  it('treats a failed fetch as "unreachable", not bad credentials', () => {
    expect(loginFailureReason(new TypeError('Failed to fetch'))).toBe('unreachable')
    expect(loginFailureReason(new TypeError('NetworkError when attempting to fetch resource.'))).toBe('unreachable')
  })

  it('treats a server-sent error (401 invalid credentials) as "credentials"', () => {
    expect(loginFailureReason(new Error('invalid credentials'))).toBe('credentials')
    expect(loginFailureReason(new Error('Unauthorized'))).toBe('credentials')
  })

  it('defaults to "credentials" for anything unrecognised', () => {
    expect(loginFailureReason('nope')).toBe('credentials')
    expect(loginFailureReason(undefined)).toBe('credentials')
  })
})

/**
 * A remembered username with no surviving token used to render a session that
 * looked fine but failed every API call with "missing bearer token".
 */
describe('restoring a session', () => {
  it('is NOT signed in when the backend is on but the token is gone', () => {
    expect(sessionUser('mike', null, true)).toBeNull()
  })

  it('is signed in when the backend is on and the token survived', () => {
    expect(sessionUser('mike', 'jwt.abc', true)).toBe('mike')
  })

  it('keeps the standalone soft-gate session, which needs no token', () => {
    expect(sessionUser('mike', null, false)).toBe('mike')
  })

  it('stays signed out when there was no user to begin with', () => {
    expect(sessionUser(null, 'jwt.abc', true)).toBeNull()
    expect(sessionUser(null, null, false)).toBeNull()
  })
})

/**
 * Validating the restored token on load. The dangerous mistake here is signing
 * people out whenever the server is asleep — that would be worse than the stale
 * session it's meant to fix. Only an active rejection kills the session.
 */
describe('verifying a restored session', () => {
  it('does NOT sign out when the server is unreachable (free host asleep)', () => {
    expect(sessionInvalidatedBy(new TypeError('Failed to fetch'))).toBe(false)
    expect(sessionInvalidatedBy(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(false)
  })

  it('signs out when the server actively rejects the token', () => {
    expect(sessionInvalidatedBy(new Error('Unauthorized'))).toBe(true)
    expect(sessionInvalidatedBy(new Error('invalid token'))).toBe(true)
    expect(sessionInvalidatedBy(new Error('missing bearer token'))).toBe(true)
  })

  it('treats an unrecognised failure as a rejection, failing closed', () => {
    expect(sessionInvalidatedBy('weird')).toBe(true)
    expect(sessionInvalidatedBy(undefined)).toBe(true)
  })
})
