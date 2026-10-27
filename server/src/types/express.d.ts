declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: 'admin' | 'staff' };
    }
  }
}
export {};