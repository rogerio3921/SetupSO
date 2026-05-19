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
      // Only create a new case if there's a scheduled patient for this room
      if (!scheduledPatient) {
        return res.json(null);
      }

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
          patientFullName: scheduledPatient.fullName || null,
          noticeNumber: scheduledPatient.noticeNumber || null,
          procedureName: scheduledPatient.procedureName || null,
          surgeonName: scheduledPatient.surgeonName || null,
          attendanceNumber: scheduledPatient.attendanceNumber || null,
          birthDate: scheduledPatient.birthDate || null,
          allergies: scheduledPatient.allergies || null,
          plannedSurgeryTime: scheduledPatient.plannedSurgeryTime || null,
          referenceDate: new Date().toISOString().split('T')[0]
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

    const timelineOrder = DASHBOARD_STAGE_ORDER;

    const stageLabels: Record<string, string> = {
      transport_patient: 'Transporte paciente',
      anesthesia_team: 'Equipe anestésica',
      surgical_team: 'Equipe cirúrgica',
      admission_cc: 'Admissão no Pré CC',
      patient_in_or: 'Paciente em SO',
      anesthesia: 'Anestesia',
      positioning: 'Posicionamento',
      time_out: 'Time out',
      surgery: 'Cirurgia',
      cme: 'CME',
      cleaning: 'Limpeza',
      pharmacy: 'Farmácia',
      clinical_engineering: 'Engenharia clínica',
      rpa: 'RPA',
      room_setup: 'Montagem de Sala'
    };

    const getEventMode = (key: string) => {
      return {
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
        admission_cc: 'in_out',
        anesthesia_team: 'in_out',
        surgical_team: 'in_out'
      }[key as keyof object];
    };

    const getEndActionForKey = (key: string) => {
      const mode = getEventMode(key);
      return mode === 'start_end' ? 'end' : 'out';
    };

    const getPrimaryActionForMode = (mode: string) => (mode === 'start_end' ? 'start' : 'in');

    const ensureEndIfStarted = async (caseId: string, key: string) => {
      const events = await prisma.event.findMany({ where: { caseId, eventKey: key }, orderBy: { happenedAt: 'asc' } });
      const mode = getEventMode(key);
      if (!mode) return;
      const startAction = mode === 'start_end' ? 'start' : 'in';
      const endAction = mode === 'start_end' ? 'end' : 'out';
      const hasStart = events.some((e: any) => e.action === startAction);
      const hasEnd = events.some((e: any) => e.action === endAction);
      if (hasStart && !hasEnd) {
        await prisma.event.create({ data: { caseId, eventKey: key, action: endAction, auto: true, happenedAt: new Date() } });
      }
    };

    if (!auto && (action === 'start' || action === 'in')) {
      const currentMode = getEventMode(eventKey);
      const primaryAction = currentMode ? getPrimaryActionForMode(currentMode) : null;
      const currentIndex = timelineOrder.indexOf(eventKey);

      if (primaryAction && action === primaryAction && currentIndex > 0) {
        const missingStages: string[] = [];

        for (const previousKey of timelineOrder.slice(0, currentIndex)) {
          const previousMode = getEventMode(previousKey);
          if (!previousMode) continue;

          const previousPrimaryAction = getPrimaryActionForMode(previousMode);
          const previousEvents = await prisma.event.findMany({ where: { caseId, eventKey: previousKey }, orderBy: { happenedAt: 'asc' } });
          const hasPrimaryEvent = previousEvents.some((eventItem: any) => eventItem.action === previousPrimaryAction);

          if (!hasPrimaryEvent) {
            missingStages.push(stageLabels[previousKey] || previousKey);
          }
        }

        if (missingStages.length > 0) {
          return res.status(400).json({
            error: 'Stage sequence violation',
            code: 'SEQUENCE_VIOLATION',
            missingStages
          });
        }
      }
    }

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

    // Rules
    try {
      const autoCloseTargets: Record<string, string[]> = {
        'admission_cc:in': ['transport_patient'],
        'patient_in_or:in': ['admission_cc', 'transport_patient'],
        'surgery:start': ['time_out', 'positioning'],
        'cleaning:in': [
          'transport_patient',
          'admission_cc',
          'patient_in_or',
          'anesthesia_team',
          'surgical_team',
          'anesthesia',
          'positioning',
          'time_out',
          'surgery',
          'cme',
          'pharmacy',
          'clinical_engineering',
          'rpa',
        ],
        'rpa:in': ['cleaning'],
        'room_setup:start': ['rpa'],
        'room_setup:end': ['rpa']
      };

      const targets = autoCloseTargets[`${event.eventKey}:${event.action}`] || [];
      for (const key of targets) {
        await ensureEndIfStarted(caseId, key);
      }
    } catch (closureError) {
      console.error('Auto-closure error:', closureError);
    }

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create event' });
  }
});

// Delete room
app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    await prisma.room.delete({ where: { id: roomId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete room' });
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

const DASHBOARD_STAGE_ORDER = [
  'transport_patient',
  'admission_cc',
  'patient_in_or',
  'anesthesia_team',
  'surgical_team',
  'anesthesia',
  'positioning',
  'time_out',
  'surgery',
  'cme',
  'cleaning',
  'pharmacy',
  'clinical_engineering',
  'rpa',
  'room_setup'
];

function parseDashboardDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildCaseMoment(caseItem: any) {
  if (caseItem.referenceDate && caseItem.plannedSurgeryTime && /^\d{2}:\d{2}$/.test(caseItem.plannedSurgeryTime)) {
    const moment = new Date(caseItem.referenceDate);
    const [hours, minutes] = String(caseItem.plannedSurgeryTime).split(':').map(Number);
    moment.setHours(hours, minutes, 0, 0);
    return moment;
  }

  if (caseItem.plannedSurgeryTime) {
    const planned = new Date(caseItem.plannedSurgeryTime);
    if (!Number.isNaN(planned.getTime())) {
      return planned;
    }
  }

  return new Date(caseItem.createdAt);
}

function getEventTimestamp(events: any[], eventKey: string, action: string) {
  return [...events]
    .sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime())
    .find((event: any) => event.eventKey === eventKey && event.action === action)?.happenedAt || null;
}

function formatEventTimestamp(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPlannedStartAt(caseItem: any) {
  const plannedStart = normalizePlannedStart(caseItem.plannedSurgeryTime, caseItem.referenceDate, caseItem.createdAt);
  return plannedStart;
}

function normalizePlannedStart(plannedStart: unknown, referenceDate?: string | Date | null, createdAt?: string | Date | null) {
  if (plannedStart === null || plannedStart === undefined) return null;

  const text = String(plannedStart).trim();
  if (!text) return null;

  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const refSource = referenceDate || createdAt || new Date();
    const refDate = new Date(refSource);
    if (Number.isNaN(refDate.getTime())) return null;

    const [hours, minutes] = text.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const planned = new Date(refDate);
    planned.setHours(hours, minutes, 0, 0);
    return planned;
  }

  const isoDate = new Date(text);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
}

function normalizePlannedSurgeryTime(value: unknown) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const hhmmMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hour = hhmmMatch[1].padStart(2, '0');
    return `${hour}:${hhmmMatch[2]}`;
  }

  if (/^\d{1,2}$/.test(text)) {
    return null;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(11, 16);
  }

  return null;
}

function formatCaseMoment(caseItem: any) {
  return buildCaseMoment(caseItem).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDashboardCaseFilters(query: Record<string, string | undefined>) {
  const roomId = query.roomId || undefined;
  const period = query.period || 'all';
  const date = parseDashboardDate(query.date || null);
  const from = parseDashboardDate(query.from || null);
  const to = parseDashboardDate(query.to || null);

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (period === 'day' && date) {
    rangeStart = new Date(date);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(date);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (period === 'month' && date) {
    rangeStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    rangeEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'range' && from && to) {
    rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(to);
    rangeEnd.setHours(23, 59, 59, 999);
  }

  return { roomId, rangeStart, rangeEnd };
}

function filterDashboardCases(cases: any[], query: Record<string, string | undefined>) {
  const { roomId, rangeStart, rangeEnd } = getDashboardCaseFilters(query);

  return cases.filter((caseItem) => {
    if (roomId && caseItem.roomId !== roomId) {
      return false;
    }

    if (rangeStart || rangeEnd) {
      const caseMoment = buildCaseMoment(caseItem);
      if (rangeStart && caseMoment < rangeStart) return false;
      if (rangeEnd && caseMoment > rangeEnd) return false;
    }

    return true;
  });
}

// Close a case: ensure all open stages are ended, mark case closed, release patient, and prepare room for next
app.post('/api/cases/:caseId/close', async (req, res) => {
  try {
    const { caseId } = req.params;

    const getEventMode = (key: string) => {
      return {
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
        admission_cc: 'in_out',
        anesthesia_team: 'in_out',
        surgical_team: 'in_out'
      }[key as keyof object];
    };

    const ensureEndIfStarted = async (caseId: string, key: string) => {
      const events = await prisma.event.findMany({ where: { caseId, eventKey: key }, orderBy: { happenedAt: 'asc' } });
      const mode = getEventMode(key);
      if (!mode) return;
      const startAction = mode === 'start_end' ? 'start' : 'in';
      const endAction = mode === 'start_end' ? 'end' : 'out';
      const hasStart = events.some((e: any) => e.action === startAction);
      const hasEnd = events.some((e: any) => e.action === endAction);
      if (hasStart && !hasEnd) {
        await prisma.event.create({ data: { caseId, eventKey: key, action: endAction, auto: true, happenedAt: new Date() } });
      }
    };

    const allKeys = ['transport_patient','admission_cc','patient_in_or','anesthesia','positioning','time_out','surgery','cme','cleaning','pharmacy','clinical_engineering','rpa','room_setup','anesthesia_team','surgical_team'];

    for (const key of allKeys) {
      await ensureEndIfStarted(caseId, key);
    }

    // Close the case
    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { status: 'closed', patientPhase: 'closed', roomPhase: 'closed' },
      include: { events: true }
    });

    // Release the patient: find patient assigned to this room and mark as completed
    const roomId = updated.roomId;
    const assignedPatients = await prisma.patient.findMany({
      where: { roomId, status: 'scheduled' }
    });

    for (const patient of assignedPatients) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { status: 'completed', roomId: null }
      });
    }

    // Also update any schedules for this room that are still "scheduled" to "completed"
    await prisma.surgerySchedule.updateMany({
      where: {
        roomId,
        status: 'scheduled',
        patientId: { in: assignedPatients.map((p) => p.id) }
      },
      data: { status: 'completed' }
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to close case' });
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
    const plannedSurgeryTime = normalizePlannedSurgeryTime(req.body?.plannedSurgeryTime);
    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        plannedSurgeryTime
      }
    });
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create patient' });
  }
});

app.patch('/api/patients/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { roomId, status } = req.body;
    const plannedSurgeryTime = normalizePlannedSurgeryTime(req.body?.plannedSurgeryTime);

    // Validate: patient cannot be assigned to a room if already active in another
    if (roomId && status === 'scheduled') {
      const existingPatient = await prisma.patient.findUnique({ where: { id: patientId } });
      
      // Check if patient is already scheduled in a different room with an active case
      if (existingPatient && existingPatient.roomId && existingPatient.roomId !== roomId && existingPatient.status === 'scheduled') {
        const activeCase = await prisma.case.findFirst({
          where: { roomId: existingPatient.roomId, status: 'active' }
        });
        if (activeCase) {
          const existingRoom = await prisma.room.findUnique({ where: { id: existingPatient.roomId } });
          return res.status(400).json({
            error: 'PATIENT_ALREADY_IN_ROOM',
            message: `Paciente já está alocado na sala ${existingRoom?.code || existingRoom?.name || existingPatient.roomId}. Conclua o caso atual antes de mover para outra sala.`
          });
        }
      }
    }

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...req.body,
        plannedSurgeryTime: plannedSurgeryTime ?? undefined
      }
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

    // Validate: patient cannot be in another active room
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patient && patient.roomId && patient.roomId !== roomId && patient.status === 'scheduled') {
      const existingRoom = await prisma.room.findUnique({ where: { id: patient.roomId } });
      return res.status(400).json({
        error: 'PATIENT_ALREADY_IN_ROOM',
        message: `Paciente já está alocado na sala ${existingRoom?.code || existingRoom?.name || patient.roomId}. Conclua o caso atual antes de alocar em outra sala.`
      });
    }

    // Check if there's an active case with this patient in another room
    const activeCase = await prisma.case.findFirst({
      where: {
        status: 'active',
        roomId: { not: roomId },
        patientFullName: patient?.fullName || undefined
      }
    });
    if (activeCase && patient?.fullName) {
      const existingRoom = await prisma.room.findUnique({ where: { id: activeCase.roomId } });
      return res.status(400).json({
        error: 'PATIENT_ALREADY_IN_ROOM',
        message: `Paciente já possui caso ativo na sala ${existingRoom?.code || existingRoom?.name || activeCase.roomId}. Conclua o caso antes de agendar em outra sala.`
      });
    }

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
        plannedSurgeryTime: normalizePlannedSurgeryTime(item.plannedSurgeryTime || item.scheduledTime),
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
  const startAt = ordered.find((event: any) => event.eventKey === eventKey && event.action === startAction)?.happenedAt || null;
  const endAt = ordered.find((event: any) => event.eventKey === eventKey && event.action === endAction)?.happenedAt || null;
  return computeSpanMs(startAt ? new Date(startAt) : null, endAt ? new Date(endAt) : null);
}

function computeAverage(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (filtered.length === 0) return null;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function computeDelayMs(events: any[], plannedStart: string | null | undefined, eventKey: string, action: string, referenceDate?: string | Date | null) {
  const planned = normalizePlannedStart(plannedStart, referenceDate, events.length > 0 ? events[0].happenedAt : null);
  if (!planned) return null;

  const actual = [...events]
    .sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime())
    .find((event: any) => event.eventKey === eventKey && event.action === action)?.happenedAt;

  if (!actual) return null;
  return new Date(actual).getTime() - planned.getTime();
}

function computeCaseDelayMinutes(caseItem: any) {
  const planned = getPlannedStartAt(caseItem);
  if (!planned) return { delayMs: 0, plannedAt: null as Date | null, actualAt: null as string | null };

  const actualAt = getEventTimestamp(caseItem.events, 'surgery', 'start')
    || getEventTimestamp(caseItem.events, 'surgery', 'end')
    || getEventTimestamp(caseItem.events, 'patient_in_or', 'in');

  if (!actualAt) {
    return { delayMs: 0, plannedAt: planned, actualAt: null };
  }

  const delayMs = Math.max(0, new Date(actualAt).getTime() - planned.getTime());
  return { delayMs, plannedAt: planned, actualAt };
}

app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const cases = await prisma.case.findMany({
      include: { events: true, room: true },
      orderBy: { createdAt: 'desc' }
    });

    const filteredCases = filterDashboardCases(cases, query);

    const completedCases = filteredCases.filter((item) => item.events.some((event: any) => event.eventKey === 'surgery' && event.action === 'end'));
    const activeCases = filteredCases.filter((item) => item.status === 'active');
    const inPrepCases = filteredCases.filter((item) => item.status === 'active' && (item.roomPhase === 'open' || item.patientPhase === 'open'));

    // Only use completed cases (with surgery end) for average calculations to avoid skewing with ongoing cases
    const casesForAverages = completedCases.length > 0 ? completedCases : filteredCases;

    const avgTransportToOr = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'transport_patient')));
    const avgOr = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'patient_in_or')));
    const avgAnesthesia = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'anesthesia')));
    const avgSurgery = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'surgery')));
    const avgRpa = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'rpa')));
    const avgTotalCc = computeAverage(casesForAverages.map((item: any) => computeSpanMs(
      item.events.find((event: any) => event.eventKey === 'transport_patient' && event.action === 'start')?.happenedAt ? new Date(item.events.find((event: any) => event.eventKey === 'transport_patient' && event.action === 'start')!.happenedAt) : null,
      item.events.find((event: any) => event.eventKey === 'rpa' && event.action === 'out')?.happenedAt ? new Date(item.events.find((event: any) => event.eventKey === 'rpa' && event.action === 'out')!.happenedAt) : null
    )));

    const plannedCount = filteredCases.filter((item) => String(item.plannedSurgeryTime || '').trim()).length;
    const patientDelay = computeAverage(casesForAverages.map((item: any) => computeDelayMs(item.events, item.plannedSurgeryTime, 'patient_in_or', 'in', item.referenceDate || item.createdAt)));
    const anesthesiaDelay = computeAverage(casesForAverages.map((item: any) => computeDelayMs(item.events, item.plannedSurgeryTime, 'anesthesia_team', 'in', item.referenceDate || item.createdAt)));
    const surgeryTeamDelay = computeAverage(casesForAverages.map((item: any) => computeDelayMs(item.events, item.plannedSurgeryTime, 'surgical_team', 'in', item.referenceDate || item.createdAt)));

    res.json({
      totalCases: filteredCases.length,
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
      cases: filteredCases.map((item) => ({
        id: item.id,
        roomId: item.roomId,
        roomCode: item.room?.code || null,
        code: item.code,
        status: item.status,
        patientFullName: item.patientFullName,
        procedureName: item.procedureName,
        surgeonName: item.surgeonName,
        plannedSurgeryTime: item.plannedSurgeryTime,
        createdAt: item.createdAt,
        referenceDate: item.referenceDate,
        dateTimeLabel: formatCaseMoment(item),
        plannedAtLabel: formatEventTimestamp(getPlannedStartAt(item)),
        actualSurgeryStartLabel: formatEventTimestamp(getEventTimestamp(item.events, 'surgery', 'start') || getEventTimestamp(item.events, 'patient_in_or', 'in')),
        transportPatientMs: computeStageDurationMs(item.events, 'transport_patient'),
        orMs: computeStageDurationMs(item.events, 'patient_in_or'),
        anesthesiaMs: computeStageDurationMs(item.events, 'anesthesia'),
        surgeryMs: computeStageDurationMs(item.events, 'surgery'),
        rpaMs: computeStageDurationMs(item.events, 'rpa'),
        totalCcMs: computeSpanMs(
            item.events.find((event: any) => event.eventKey === 'transport_patient' && event.action === 'start')?.happenedAt ? new Date(item.events.find((event: any) => event.eventKey === 'transport_patient' && event.action === 'start')!.happenedAt) : null,
            item.events.find((event: any) => event.eventKey === 'rpa' && event.action === 'out')?.happenedAt ? new Date(item.events.find((event: any) => event.eventKey === 'rpa' && event.action === 'out')!.happenedAt) : null
          )
      }))
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// CC Config (admin settings - cost per minute, etc.)
app.get('/api/cc-config', authMiddleware, async (req, res) => {
  try {
    const configs = await prisma.ccConfig.findMany();
    // Return as key-value object
    const result: Record<string, string> = {};
    configs.forEach((c) => { result[c.key] = c.value; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CC config' });
  }
});

app.put('/api/cc-config', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const entries = req.body; // { key: value, key2: value2, ... }

    for (const [key, value] of Object.entries(entries)) {
      await prisma.ccConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    const configs = await prisma.ccConfig.findMany();
    const result: Record<string, string> = {};
    configs.forEach((c) => { result[c.key] = c.value; });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update CC config' });
  }
});

// Dashboard cost analysis
app.get('/api/dashboard/costs', authMiddleware, async (req, res) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    // Get cost per minute from config
    const costConfig = await prisma.ccConfig.findUnique({ where: { key: 'cost_per_minute' } });
    const costPerMinute = costConfig ? parseFloat(costConfig.value) : 0;

    if (costPerMinute === 0) {
      return res.json({
        costPerMinute: 0,
        totalDelayCost: 0,
        totalOperatingCost: 0,
        stageCosts: [],
        caseRanking: []
      });
    }

    const cases = await prisma.case.findMany({
      where: { status: 'closed' },
      include: { events: true, room: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const filteredCases = filterDashboardCases(cases, query);

    const getEventMode = (key: string): string | undefined => {
      return ({
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
        admission_cc: 'in_out',
        anesthesia_team: 'in_out',
        surgical_team: 'in_out'
      } as Record<string, string>)[key];
    };

    const getStageDuration = (events: any[], eventKey: string): number | null => {
      const mode = getEventMode(eventKey);
      if (!mode) return null;
      const startAction = mode === 'start_end' ? 'start' : 'in';
      const endAction = mode === 'start_end' ? 'end' : 'out';
      const ordered = [...events].sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
      const startAt = ordered.find((e: any) => e.eventKey === eventKey && e.action === startAction)?.happenedAt;
      const endAt = ordered.find((e: any) => e.eventKey === eventKey && e.action === endAction)?.happenedAt;
      if (!startAt || !endAt) return null;
      return new Date(endAt).getTime() - new Date(startAt).getTime();
    };

    // Calculate delay cost per case
    let totalDelayCost = 0;
    const caseRanking: Array<{
      id: string;
      code: string;
      roomCode: string;
      patientName: string;
      procedureName: string;
      dateTimeLabel: string;
      plannedAtLabel: string;
      actualSurgeryStartLabel: string;
      totalMinutes: number;
      totalCost: number;
      delayMinutes: number;
      delayCost: number;
    }> = [];

    // Stage cost accumulator
    const stageTotals: Record<string, { label: string; totalMs: number; count: number }> = {};

    const stageLabels: Record<string, string> = {
      anesthesia_team: 'Equipe anestésica',
      surgical_team: 'Equipe cirúrgica',
      transport_patient: 'Transporte paciente',
      admission_cc: 'Admissão Pré CC',
      patient_in_or: 'Paciente em SO',
      anesthesia: 'Anestesia',
      positioning: 'Posicionamento',
      time_out: 'Time out',
      surgery: 'Cirurgia',
      cme: 'CME',
      cleaning: 'Limpeza',
      pharmacy: 'Farmácia',
      clinical_engineering: 'Eng. clínica',
      rpa: 'RPA',
      room_setup: 'Montagem sala'
    };

    for (const caseItem of filteredCases) {
      // Total CC time: transport_patient:start to rpa:out
      const transportStart = caseItem.events.find((e: any) => e.eventKey === 'transport_patient' && e.action === 'start')?.happenedAt;
      const rpaOut = caseItem.events.find((e: any) => e.eventKey === 'rpa' && e.action === 'out')?.happenedAt;
      let totalMs = 0;
      if (transportStart && rpaOut) {
        totalMs = new Date(rpaOut).getTime() - new Date(transportStart).getTime();
      }
      const totalMinutes = totalMs / 60000;
      const totalCost = totalMinutes * costPerMinute;

      // Delay calculation
      const delayInfo = computeCaseDelayMinutes(caseItem as any);
      const delayMs = delayInfo.delayMs;

      const delayMinutes = delayMs / 60000;
      const delayCost = delayMinutes * costPerMinute;
      totalDelayCost += delayCost;

      caseRanking.push({
        id: caseItem.id,
        code: caseItem.code,
        roomCode: caseItem.room?.code || '—',
        patientName: caseItem.patientFullName || '—',
        procedureName: caseItem.procedureName || '—',
        dateTimeLabel: formatCaseMoment(caseItem),
        plannedAtLabel: formatEventTimestamp(delayInfo.plannedAt),
        actualSurgeryStartLabel: formatEventTimestamp(delayInfo.actualAt),
        totalMinutes: Math.round(totalMinutes),
        totalCost: Math.round(totalCost * 100) / 100,
        delayMinutes: Math.round(delayMinutes),
        delayCost: Math.round(delayCost * 100) / 100
      });

      // Per-stage costs
      for (const stageKey of Object.keys(stageLabels)) {
        const duration = getStageDuration(caseItem.events as any[], stageKey);
        if (duration !== null && duration > 0) {
          if (!stageTotals[stageKey]) {
            stageTotals[stageKey] = { label: stageLabels[stageKey], totalMs: 0, count: 0 };
          }
          stageTotals[stageKey].totalMs += duration;
          stageTotals[stageKey].count += 1;
        }
      }
    }

    // Build stage costs array
    const stageCosts = Object.entries(stageTotals)
      .map(([key, data]) => ({
        key,
        label: data.label,
        averageMinutes: Math.round((data.totalMs / data.count) / 60000),
        totalMinutes: Math.round(data.totalMs / 60000),
        averageCost: Math.round(((data.totalMs / data.count) / 60000) * costPerMinute * 100) / 100,
        totalCost: Math.round((data.totalMs / 60000) * costPerMinute * 100) / 100,
        count: data.count
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Total operating cost
    const totalOperatingCost = stageCosts.reduce((sum, s) => sum + s.totalCost, 0);

    // Sort ranking by total cost descending
    caseRanking.sort((a, b) => b.totalCost - a.totalCost);

    res.json({
      costPerMinute,
      totalDelayCost: Math.round(totalDelayCost * 100) / 100,
      totalOperatingCost: Math.round(totalOperatingCost * 100) / 100,
      stageCosts,
      caseRanking: caseRanking.slice(0, 20) // Top 20
    });
  } catch (error) {
    console.error('Dashboard costs error:', error);
    res.status(500).json({ error: 'Failed to compute costs' });
  }
});

// Custom Metrics (user-defined calculations)
app.get('/api/custom-metrics', authMiddleware, async (req, res) => {
  try {
    let metrics = await prisma.customMetric.findMany({
      orderBy: { order: 'asc' }
    });

    // Seed default metrics on first access
    if (metrics.length === 0) {
      const defaults = [
        { name: 'Atraso do Médico', description: 'Tempo entre entrada do paciente na SO e entrada da equipe cirúrgica', startEventKey: 'patient_in_or', startAction: 'in', endEventKey: 'surgical_team', endAction: 'in', order: 1, isDefault: true },
        { name: 'Atraso Anestesista', description: 'Tempo entre entrada do paciente na SO e chegada da equipe anestésica', startEventKey: 'patient_in_or', startAction: 'in', endEventKey: 'anesthesia_team', endAction: 'in', order: 2, isDefault: true },
        { name: 'Tempo Transporte → SO', description: 'Tempo total do transporte até entrada na sala', startEventKey: 'transport_patient', startAction: 'start', endEventKey: 'patient_in_or', endAction: 'in', order: 3, isDefault: true },
        { name: 'Tempo Anestesia → Cirurgia', description: 'Tempo entre início da anestesia e início da cirurgia', startEventKey: 'anesthesia', startAction: 'start', endEventKey: 'surgery', endAction: 'start', order: 4, isDefault: true },
        { name: 'Tempo Cirurgia', description: 'Duração total da cirurgia', startEventKey: 'surgery', startAction: 'start', endEventKey: 'surgery', endAction: 'end', order: 5, isDefault: true },
        { name: 'Tempo Turnover', description: 'Tempo entre saída do paciente e montagem completa da sala', startEventKey: 'patient_in_or', startAction: 'out', endEventKey: 'room_setup', endAction: 'end', order: 6, isDefault: true },
        { name: 'Tempo Limpeza', description: 'Duração da limpeza da sala', startEventKey: 'cleaning', startAction: 'in', endEventKey: 'cleaning', endAction: 'out', order: 7, isDefault: true },
        { name: 'Tempo Paciente no CC', description: 'Tempo total do paciente no centro cirúrgico (entrada SO até RPA saída)', startEventKey: 'patient_in_or', startAction: 'in', endEventKey: 'rpa', endAction: 'out', order: 8, isDefault: true },
        { name: 'Tempo Indução → Incisão', description: 'Tempo entre início da anestesia e início da cirurgia (skin-to-skin)', startEventKey: 'anesthesia', startAction: 'start', endEventKey: 'surgery', endAction: 'start', order: 9, isDefault: true },
        { name: 'Tempo Pós-Cirurgia → RPA', description: 'Tempo entre fim da cirurgia e entrada na RPA', startEventKey: 'surgery', startAction: 'end', endEventKey: 'rpa', endAction: 'in', order: 10, isDefault: true },
      ];

      for (const metric of defaults) {
        await prisma.customMetric.create({
          data: { ...metric, showOnDashboard: true, showOnReport: true, active: true }
        });
      }

      metrics = await prisma.customMetric.findMany({ orderBy: { order: 'asc' } });
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom metrics' });
  }
});

app.post('/api/custom-metrics', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { name, description, startEventKey, startAction, endEventKey, endAction, showOnDashboard, showOnReport } = req.body;

    if (!name || !startEventKey || !startAction || !endEventKey || !endAction) {
      return res.status(400).json({ error: 'name, startEventKey, startAction, endEventKey, endAction são obrigatórios' });
    }

    const maxOrder = await prisma.customMetric.findFirst({ orderBy: { order: 'desc' } });

    const metric = await prisma.customMetric.create({
      data: {
        name,
        description: description || null,
        startEventKey,
        startAction,
        endEventKey,
        endAction,
        showOnDashboard: showOnDashboard !== false,
        showOnReport: showOnReport !== false,
        active: true,
        order: (maxOrder?.order || 0) + 1
      }
    });
    res.status(201).json(metric);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create custom metric' });
  }
});

app.patch('/api/custom-metrics/:metricId', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { metricId } = req.params;
    const metric = await prisma.customMetric.update({
      where: { id: metricId },
      data: req.body
    });
    res.json(metric);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update custom metric' });
  }
});

app.delete('/api/custom-metrics/:metricId', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { metricId } = req.params;
    await prisma.customMetric.delete({ where: { id: metricId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete custom metric' });
  }
});

// Compute custom metrics results (for dashboard and reports)
app.get('/api/custom-metrics/results', authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;

    const metrics = await prisma.customMetric.findMany({
      where: { active: true },
      orderBy: { order: 'asc' }
    });

    if (metrics.length === 0) {
      return res.json({ metrics: [] });
    }

    // Get cost config
    const costConfig = await prisma.ccConfig.findUnique({ where: { key: 'cost_per_minute' } });
    const costPerMinute = costConfig ? parseFloat(costConfig.value) : 0;

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from as string);
    if (to) {
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const casesWhere: any = { status: 'closed' };
    if (from || to) {
      casesWhere.createdAt = dateFilter;
    }

    const cases = await prisma.case.findMany({
      where: casesWhere,
      include: { events: true, room: true },
      orderBy: { createdAt: 'desc' }
    });

    const results = metrics.map((metric) => {
      const perCase: Array<{
        caseId: string;
        caseCode: string;
        roomCode: string;
        patientName: string;
        procedureName: string;
        durationMs: number;
        durationMinutes: number;
        cost: number;
        date: string;
      }> = [];

      let totalMs = 0;
      let count = 0;

      for (const caseItem of cases) {
        const ordered = [...caseItem.events].sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());

        const startEvent = ordered.find((e: any) => e.eventKey === metric.startEventKey && e.action === metric.startAction);
        const endEvent = ordered.find((e: any) => e.eventKey === metric.endEventKey && e.action === metric.endAction);

        if (startEvent && endEvent) {
          const durationMs = new Date(endEvent.happenedAt).getTime() - new Date(startEvent.happenedAt).getTime();
          if (durationMs > 0) {
            const durationMinutes = durationMs / 60000;
            totalMs += durationMs;
            count++;

            perCase.push({
              caseId: caseItem.id,
              caseCode: caseItem.code,
              roomCode: caseItem.room?.code || '—',
              patientName: caseItem.patientFullName || '—',
              procedureName: caseItem.procedureName || '—',
              durationMs,
              durationMinutes: Math.round(durationMinutes * 10) / 10,
              cost: Math.round(durationMinutes * costPerMinute * 100) / 100,
              date: caseItem.createdAt.toISOString().split('T')[0]
            });
          }
        }
      }

      const averageMs = count > 0 ? Math.round(totalMs / count) : 0;
      const totalMinutes = Math.round(totalMs / 60000);
      const averageMinutes = count > 0 ? Math.round((totalMs / count) / 60000 * 10) / 10 : 0;
      const totalCost = Math.round((totalMs / 60000) * costPerMinute * 100) / 100;

      return {
        id: metric.id,
        name: metric.name,
        description: metric.description,
        startEventKey: metric.startEventKey,
        startAction: metric.startAction,
        endEventKey: metric.endEventKey,
        endAction: metric.endAction,
        showOnDashboard: metric.showOnDashboard,
        showOnReport: metric.showOnReport,
        // Aggregated
        totalMinutes,
        averageMinutes,
        averageMs,
        totalCost,
        count,
        costPerMinute,
        // Per case detail
        cases: perCase.sort((a, b) => b.durationMinutes - a.durationMinutes)
      };
    });

    res.json({ metrics: results, costPerMinute });
  } catch (error) {
    console.error('Custom metrics results error:', error);
    res.status(500).json({ error: 'Failed to compute custom metrics' });
  }
});

// Timeline Stages (admin configurable flow)
app.get('/api/timeline-stages', authMiddleware, async (req, res) => {
  try {
    const stages = await prisma.timelineStage.findMany({
      orderBy: { seq: 'asc' }
    });

    // If no stages in DB yet, seed with defaults
    if (stages.length === 0) {
      const defaults = [
        { key: 'transport_patient', label: 'Transporte paciente', kind: 'start_end', seq: 1 },
        { key: 'admission_cc', label: 'Admissão no Pré CC', kind: 'in_out', seq: 2 },
        { key: 'patient_in_or', label: 'Paciente em SO', kind: 'in_out', seq: 3 },
        { key: 'anesthesia_team', label: 'Equipe anestésica', kind: 'in_out', seq: 4 },
        { key: 'surgical_team', label: 'Equipe cirúrgica', kind: 'in_out', seq: 5 },
        { key: 'anesthesia', label: 'Anestesia', kind: 'start_end', seq: 6 },
        { key: 'positioning', label: 'Posicionamento', kind: 'start_end', seq: 7 },
        { key: 'time_out', label: 'Time out', kind: 'start_end', seq: 8 },
        { key: 'surgery', label: 'Cirurgia', kind: 'start_end', seq: 9 },
        { key: 'cme', label: 'CME', kind: 'in_out', seq: 10 },
        { key: 'cleaning', label: 'Limpeza', kind: 'in_out', seq: 11 },
        { key: 'pharmacy', label: 'Farmácia', kind: 'in_out', seq: 12 },
        { key: 'clinical_engineering', label: 'Engenharia clínica', kind: 'in_out', seq: 13 },
        { key: 'rpa', label: 'RPA', kind: 'in_out', seq: 14 },
        { key: 'room_setup', label: 'Montagem de Sala', kind: 'start_end', seq: 15 },
      ];

      for (const stage of defaults) {
        await prisma.timelineStage.create({ data: stage });
      }

      const seeded = await prisma.timelineStage.findMany({ orderBy: { seq: 'asc' } });
      return res.json(seeded);
    }

    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timeline stages' });
  }
});

app.post('/api/timeline-stages', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { key, label, kind, seq } = req.body;

    if (!key || !label) {
      return res.status(400).json({ error: 'key and label are required' });
    }

    // Auto-generate key from label if not provided properly
    const stageKey = key || label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Get max seq if not provided
    let stageSeq = seq;
    if (stageSeq === undefined || stageSeq === null) {
      const maxStage = await prisma.timelineStage.findFirst({ orderBy: { seq: 'desc' } });
      stageSeq = (maxStage?.seq || 0) + 1;
    }

    const stage = await prisma.timelineStage.create({
      data: {
        key: stageKey,
        label,
        kind: kind || 'start_end',
        seq: stageSeq,
        active: true
      }
    });
    res.status(201).json(stage);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Uma etapa com essa chave já existe.' });
    }
    res.status(400).json({ error: 'Failed to create timeline stage' });
  }
});

app.patch('/api/timeline-stages/:stageId', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { stageId } = req.params;
    const { label, kind, seq, active } = req.body;

    const data: any = {};
    if (label !== undefined) data.label = label;
    if (kind !== undefined) data.kind = kind;
    if (seq !== undefined) data.seq = seq;
    if (active !== undefined) data.active = active;

    const stage = await prisma.timelineStage.update({
      where: { id: stageId },
      data
    });
    res.json(stage);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update timeline stage' });
  }
});

app.delete('/api/timeline-stages/:stageId', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { stageId } = req.params;
    await prisma.timelineStage.delete({ where: { id: stageId } });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete timeline stage' });
  }
});

// Reorder timeline stages (bulk update)
app.put('/api/timeline-stages/reorder', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
  try {
    const { stages } = req.body; // Array of { id, seq }

    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'stages array is required' });
    }

    for (const item of stages) {
      await prisma.timelineStage.update({
        where: { id: item.id },
        data: { seq: item.seq }
      });
    }

    const updated = await prisma.timelineStage.findMany({ orderBy: { seq: 'asc' } });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to reorder timeline stages' });
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
