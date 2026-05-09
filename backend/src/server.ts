import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware } from './auth';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/rooms', authMiddleware);
app.use('/api/cases', authMiddleware);
app.use('/api/events', authMiddleware);

// Rooms routes
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { code, name, capacity } = req.body;
    const room = await prisma.room.create({
      data: { code, name, capacity: capacity || 1 }
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create room' });
  }
});

// Cases routes
app.get('/api/cases', async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      include: { events: true }
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

app.get('/api/rooms/:roomId/case', async (req, res) => {
  try {
    const { roomId } = req.params;
    let caseRecord = await prisma.case.findFirst({
      where: { roomId, status: 'active' },
      include: { events: true }
    });

    if (!caseRecord) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      const count = await prisma.case.count({ where: { roomId } });
      const code = `${room?.code?.replace(/\s/g, '') || 'SALA'}-${new Date().toISOString().split('T')[0]}-${String(count + 1).padStart(2, '0')}`;

      caseRecord = await prisma.case.create({
        data: {
          roomId,
          code,
          status: 'active',
          patientPhase: 'open',
          roomPhase: 'open'
        },
        include: { events: true }
      });
    }

    res.json(caseRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch/create case' });
  }
});

app.patch('/api/cases/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseRecord = await prisma.case.update({
      where: { id: caseId },
      data: req.body,
      include: { events: true }
    });
    res.json(caseRecord);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update case' });
  }
});

// Events routes
app.post('/api/events', async (req, res) => {
  try {
    const { caseId, eventKey, action, auto, userId } = req.body;
    const event = await prisma.event.create({
      data: {
        caseId,
        eventKey,
        action,
        auto: auto || false,
        userId,
        happenedAt: new Date()
      }
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create event' });
  }
});

app.get('/api/cases/:caseId/events', async (req, res) => {
  try {
    const { caseId } = req.params;
    const events = await prisma.event.findMany({
      where: { caseId },
      orderBy: { happenedAt: 'asc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).jsouthMiddleware, roleMiddleware(['Admin']), an({ error: 'Failed to fetch events' });
  }
});

// Users routes (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        badgeNumber: true,
        department: true,
        function: true,
        role: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { email, fullName, badgeNumber, corenNumber, department, function: func, role, password } = req.body;
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        badgeNumber,
        corenNumber,
        department,
        function: func,
        role,
        password // TODO: hash password
      }
    });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Status Legends (admin only)
app.get('/api/status-legends', authMiddleware, async (req, res) => {
  try {
    const legends = await prisma.statusLegend.findMany();
    res.json(legends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status legends' });
  }
});

app.post('/api/status-legends', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { status, color, label } = req.body;
    const legend = await prisma.statusLegend.create({
      data: { status, color, label }
    });
    res.status(201).json(legend);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create status legend' });
  }
});

// Card Config (admin only)
app.get('/api/card-config', authMiddleware, async (req, res) => {
  try {
    const config = await prisma.cardConfig.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch card config' });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SetupSO Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
