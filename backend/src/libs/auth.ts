import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET = process.env.JWT_SECRET || 'fallback';

export const hashPass = (password: string) => bcrypt.hash(password, 10);
export const comparePass = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (payload: object) => 
  jwt.sign(payload, SECRET, { expiresIn: '1d' });