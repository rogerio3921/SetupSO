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

app.patch('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { code, name, capacity } = req.body;
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { code, name, capacity }
    });
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update room' });
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

    const scheduledPatient = await prisma.patient.findFirst({
      where: { roomId, status: 'scheduled' },
      orderBy: { updatedAt: 'desc' }
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
          roomPhase: 'open',
          patientFullName: scheduledPatient?.fullName || null,
          noticeNumber: scheduledPatient?.noticeNumber || null,
          procedureName: scheduledPatient?.procedureName || null,
          surgeonName: scheduledPatient?.surgeonName || null,
          attendanceNumber: scheduledPatient?.attendanceNumber || null,
          birthDate: scheduledPatient?.birthDate || null,
          allergies: scheduledPatient?.allergies || null,
          plannedSurgeryTime: scheduledPatient?.plannedSurgeryTime || null
        },
        include: { events: true }
      });
    } else if (scheduledPatient && !caseRecord.patientFullName) {
      caseRecord = await prisma.case.update({
        where: { id: caseRecord.id },
        data: {
          patientFullName: scheduledPatient.fullName,
          noticeNumber: scheduledPatient.noticeNumber,
          procedureName: scheduledPatient.procedureName,
          surgeonName: scheduledPatient.surgeonName,
          attendanceNumber: scheduledPatient.attendanceNumber,
          birthDate: scheduledPatient.birthDate,
          allergies: scheduledPatient.allergies,
          plannedSurgeryTime: scheduledPatient.plannedSurgeryTime
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
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Update event timestamp
app.patch('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { happenedAt } = req.body;
    const data: any = {};
    if (happenedAt) data.happenedAt = new Date(happenedAt);

    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update event' });
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

// Patients
app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      include: { room: true }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.post('/api/patients', authMiddleware, async (req, res) => {
  try {
    const patient = await prisma.patient.create({
      data: req.body
    });
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create patient' });
  }
});

app.patch('/api/patients/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: req.body
    });
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update patient' });
  }
});

app.delete('/api/patients/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    await prisma.patient.delete({ where: { id: patientId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete patient' });
  }
});

// Procedure timings
app.get('/api/procedure-timings', authMiddleware, async (req, res) => {
  try {
    const timings = await prisma.procedureTiming.findMany({
      where: { active: true },
      orderBy: { procedureName: 'asc' }
    });
    res.json(timings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch procedure timings' });
  }
});

app.post('/api/procedure-timings', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const timing = await prisma.procedureTiming.create({
      data: req.body
    });
    res.status(201).json(timing);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create procedure timing' });
  }
});

app.patch('/api/procedure-timings/:timingId', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { timingId } = req.params;
    const timing = await prisma.procedureTiming.update({
      where: { id: timingId },
      data: req.body
    });
    res.json(timing);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update procedure timing' });
  }
});

// Surgery schedules
app.get('/api/schedules', authMiddleware, async (req, res) => {
  try {
    const schedules = await prisma.surgerySchedule.findMany({
      orderBy: { scheduledStart: 'asc' },
      include: { patient: true, room: true }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.post('/api/schedules', authMiddleware, async (req, res) => {
  try {
    const { patientId, roomId, scheduledStart, procedureName, estimatedMinutes, source } = req.body;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const timing = procedureName
      ? await prisma.procedureTiming.findUnique({ where: { procedureName } })
      : null;

    const minutes = Number(estimatedMinutes || patient?.estimatedMinutes || timing?.estimatedMinutes || 0);
    const startDate = new Date(scheduledStart);
    const endDate = new Date(startDate.getTime() + minutes * 60000);

    const schedule = await prisma.surgerySchedule.create({
      data: {
        patientId,
        roomId,
        procedureName: procedureName || patient?.procedureName || 'Procedimento',
        scheduledStart: startDate,
        scheduledEnd: endDate,
        estimatedMinutes: minutes,
        status: 'scheduled',
        source: source || 'manual'
      },
      include: { patient: true, room: true }
    });

    if (patient) {
      await prisma.patient.update({
        where: { id: patientId },
        data: {
          roomId,
          status: 'scheduled',
          plannedSurgeryTime: startDate.toISOString().slice(11, 16),
          estimatedMinutes: minutes
        }
      });
    }

    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create schedule' });
  }
});

app.post('/api/schedules/auto-plan', authMiddleware, async (req, res) => {
  try {
    const { roomId, date, startTime } = req.body;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const patients = await prisma.patient.findMany({
      where: { status: 'waiting' },
      orderBy: { createdAt: 'asc' }
    });

    const baseDate = new Date(date || new Date().toISOString().slice(0, 10));
    const [startHour, startMinute] = String(startTime || '07:00').split(':').map(Number);
    const cursor = new Date(baseDate);
    cursor.setHours(startHour, startMinute, 0, 0);

    const createdSchedules = [];

    for (const patient of patients) {
      const timing = patient.procedureName
        ? await prisma.procedureTiming.findUnique({ where: { procedureName: patient.procedureName } })
        : null;
      const minutes = Number(patient.estimatedMinutes || timing?.estimatedMinutes || 0);
      const start = new Date(cursor);
      const end = new Date(start.getTime() + minutes * 60000);

      const schedule = await prisma.surgerySchedule.create({
        data: {
          patientId: patient.id,
          roomId,
          procedureName: patient.procedureName || 'Procedimento',
          scheduledStart: start,
          scheduledEnd: end,
          estimatedMinutes: minutes,
          status: 'scheduled',
          source: 'auto-plan'
        },
        include: { patient: true, room: true }
      });

      createdSchedules.push(schedule);
      cursor.setTime(end.getTime());

      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          roomId,
          status: 'scheduled',
          plannedSurgeryTime: start.toISOString().slice(11, 16),
          estimatedMinutes: minutes
        }
      });
    }

    res.status(201).json({ room, createdSchedules });
  } catch (error) {
    res.status(400).json({ error: 'Failed to auto plan schedules' });
  }
});

// External API integration for patient import
app.post('/api/integrations/patients/import', authMiddleware, async (req, res) => {
  try {
    const { sourceUrl, token } = req.body;
    if (!sourceUrl) {
      return res.status(400).json({ error: 'sourceUrl is required' });
    }

    const response = await fetch(sourceUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Source API returned ${response.status}` });
    }

    const payload: any = await response.json();
    const sourcePatients = Array.isArray(payload) ? payload : (payload.patients || payload.data || []);

    const imported: any[] = [];

    for (const item of sourcePatients) {
      const patientData = {
        fullName: item.fullName || item.name || item.patientName,
        noticeNumber: item.noticeNumber || item.notice || null,
        attendanceNumber: item.attendanceNumber || item.attendance || null,
        birthDate: item.birthDate || item.dob || null,
        allergies: item.allergies || null,
        procedureName: item.procedureName || item.procedure || null,
        surgeonName: item.surgeonName || item.surgeon || null,
        plannedSurgeryTime: item.plannedSurgeryTime || item.scheduledTime || null,
        estimatedMinutes: item.estimatedMinutes ? Number(item.estimatedMinutes) : null,
        status: item.status || 'waiting'
      };

      if (!patientData.fullName) {
        continue;
      }

      const existing = patientData.noticeNumber
        ? await prisma.patient.findFirst({ where: { noticeNumber: patientData.noticeNumber } })
        : patientData.attendanceNumber
          ? await prisma.patient.findFirst({ where: { attendanceNumber: patientData.attendanceNumber } })
          : null;

      const saved = existing
        ? await prisma.patient.update({ where: { id: existing.id }, data: patientData })
        : await prisma.patient.create({ data: patientData });

      imported.push(saved);
    }

    res.status(201).json({ importedCount: imported.length, imported });
  } catch (error) {
    console.error('Patient import error:', error);
    res.status(500).json({ error: 'Failed to import patients' });
  }
});

function computeSpanMs(startAt: Date | null, endAt: Date | null) {
  if (!startAt || !endAt) return null;
  return endAt.getTime() - startAt.getTime();
}

function computeStageDurationMs(events: any[], eventKey: string) {
  const mode = {
    patient_in_or: 'in_out',
    anesthesia: 'start_end',
    positioning: 'start_end',
    time_out: 'start_end',
    surgery: 'start_end',
    cme: 'in_out',
    cleaning: 'in_out',
    pharmacy: 'in_out',
    clinical_engineering: 'in_out',
    rpa: 'in_out',
    room_setup: 'start_end',
    transport_patient: 'start_end',
  }[eventKey as keyof object];

  if (!mode) return null;

  const ordered = [...events].sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
  const startAction = mode === 'start_end' ? 'start' : 'in';
  const endAction = mode === 'start_end' ? 'end' : 'out';
  const startAt = ordered.find((event) => event.eventKey === eventKey && event.action === startAction)?.happenedAt || null;
  const endAt = ordered.find((event) => event.eventKey === eventKey && event.action === endAction)?.happenedAt || null;
  return computeSpanMs(startAt ? new Date(startAt) : null, endAt ? new Date(endAt) : null);
}

function computeAverage(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (filtered.length === 0) return null;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function computeDelayMs(events: any[], plannedStart: string | null | undefined, eventKey: string, action: string) {
  if (!plannedStart) return null;
  const planned = new Date(plannedStart);
  const actual = [...events]
    .sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime())
    .find((event) => event.eventKey === eventKey && event.action === action)?.happenedAt;

  if (!actual) return null;
  return new Date(actual).getTime() - planned.getTime();
}

app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      include: { events: true, room: true },
      orderBy: { createdAt: 'desc' }
    });

    const completedCases = cases.filter((item) => item.events.some((event) => event.eventKey === 'surgery' && event.action === 'end'));
    const activeCases = cases.filter((item) => item.status === 'active');
    const inPrepCases = cases.filter((item) => item.roomPhase === 'open' || item.patientPhase === 'open');

    const avgTransportToOr = computeAverage(cases.map((item) => computeStageDurationMs(item.events, 'transport_patient')));
    const avgOr = computeAverage(cases.map((item) => computeStageDurationMs(item.events, 'patient_in_or')));
    const avgAnesthesia = computeAverage(cases.map((item) => computeStageDurationMs(item.events, 'anesthesia')));
    const avgSurgery = computeAverage(cases.map((item) => computeStageDurationMs(item.events, 'surgery')));
    const avgRpa = computeAverage(cases.map((item) => computeStageDurationMs(item.events, 'rpa')));
    const avgTotalCc = computeAverage(cases.map((item) => computeSpanMs(
      item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')!.happenedAt) : null,
      item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')!.happenedAt) : null
    )));

    const plannedCount = cases.filter((item) => String(item.plannedSurgeryTime || '').trim()).length;
    const patientDelay = computeAverage(cases.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'patient_in_or', 'in')));
    const anesthesiaDelay = computeAverage(cases.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'anesthesia_team', 'in')));
    const surgeryTeamDelay = computeAverage(cases.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'surgical_team', 'in')));

    res.json({
      totalCases: cases.length,
      completedCases: completedCases.length,
      activeCases: activeCases.length,
      inPrepCases: inPrepCases.length,
      plannedCount,
      averageTransportToOrMs: avgTransportToOr,
      averageOrMs: avgOr,
      averageAnesthesiaMs: avgAnesthesia,
      averageSurgeryMs: avgSurgery,
      averageRpaMs: avgRpa,
      averageTotalCcMs: avgTotalCc,
      averagePatientDelayMs: patientDelay,
      averageAnesthesiaTeamDelayMs: anesthesiaDelay,
      averageSurgeryTeamDelayMs: surgeryTeamDelay,
      cases: cases.map((item) => ({
        id: item.id,
        roomId: item.roomId,
        roomCode: item.room?.code || null,
        code: item.code,
        status: item.status,
        patientFullName: item.patientFullName,
        procedureName: item.procedureName,
        surgeonName: item.surgeonName,
        plannedSurgeryTime: item.plannedSurgeryTime,
        transportPatientMs: computeStageDurationMs(item.events, 'transport_patient'),
        orMs: computeStageDurationMs(item.events, 'patient_in_or'),
        anesthesiaMs: computeStageDurationMs(item.events, 'anesthesia'),
        surgeryMs: computeStageDurationMs(item.events, 'surgery'),
        rpaMs: computeStageDurationMs(item.events, 'rpa'),
        totalCcMs: computeSpanMs(
          item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')!.happenedAt) : null,
          item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')!.happenedAt) : null
        )
      }))
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
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
