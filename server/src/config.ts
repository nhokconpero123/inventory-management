/** Read the secret when needed (not at import time) so tests can set the environment variable. */
export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET is missing or shorter than 32 characters');
  return s;
}