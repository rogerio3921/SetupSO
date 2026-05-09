import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateToken, hashPassword, comparePasswords, AuthPayload } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// POST /auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, fullName, badgeNumber, corenNumber, department, function: func, password, role } = req.body;

    // Validate required fields
    if (!email || !fullName || !badgeNumber || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        badgeNumber,
        corenNumber,
        department,
        function: func || 'Auxiliar',
        role: role || 'User',
        password: passwordHash
      }
    });

    // Generate token
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    const token = generateToken(payload);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await comparePasswords(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    const token = generateToken(payload);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        function: user.function,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout - Logout (client-side only, JWT is stateless)
router.post('/logout', (req, res) => {
  // JWT is stateless, so logout is handled on client
  res.json({ message: 'Logged out successfully' });
});

// GET /auth/me - Get current user
router.get('/me', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        badgeNumber: true,
        corenNumber: true,
        department: true,
        function: true,
        role: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
