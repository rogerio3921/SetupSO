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

    const timelineOrder = [
      'anesthesia_team',
      'surgical_team',
      'transport_patient',
      'admission_cc',
      'patient_in_or',
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

    const stageLabels: Record<string, string> = {
      anesthesia_team: 'Equipe anestésica',
      surgical_team: 'Equipe cirúrgica',
      transport_patient: 'Transporte paciente',
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
      const hasStart = events.some((e) => e.action === startAction);
      const hasEnd = events.some((e) => e.action === endAction);
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
          const hasPrimaryEvent = previousEvents.some((eventItem) => eventItem.action === previousPrimaryAction);

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
          'anesthesia',
          'positioning',
          'time_out',
          'surgery',
          'cme',
          'pharmacy',
          'clinical_engineering',
          'rpa',
          'anesthesia_team',
          'surgical_team'
        ],
        'rpa:in': ['cleaning'],
        'room_setup:start': ['rpa']
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
      const hasStart = events.some((e) => e.action === startAction);
      const hasEnd = events.some((e) => e.action === endAction);
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
    const { roomId, status } = req.body;

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

function computeDelayMs(events: any[], plannedStart: string | null | undefined, eventKey: string, action: string, referenceDate?: string | Date | null) {
  if (!plannedStart) return null;

  // plannedSurgeryTime can be "HH:MM" or a full ISO string
  let planned: Date;
  if (/^\d{2}:\d{2}$/.test(plannedStart)) {
    // It's just a time like "08:00", we need a reference date
    // Use the first event date or referenceDate or today
    const refDate = referenceDate
      ? new Date(referenceDate)
      : events.length > 0
        ? new Date(events[0].happenedAt)
        : new Date();
    const [hours, minutes] = plannedStart.split(':').map(Number);
    planned = new Date(refDate);
    planned.setHours(hours, minutes, 0, 0);
  } else {
    planned = new Date(plannedStart);
  }

  if (isNaN(planned.getTime())) return null;

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
    const inPrepCases = cases.filter((item) => item.status === 'active' && (item.roomPhase === 'open' || item.patientPhase === 'open'));

    // Only use completed cases (with surgery end) for average calculations to avoid skewing with ongoing cases
    const casesForAverages = completedCases.length > 0 ? completedCases : cases;

    const avgTransportToOr = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'transport_patient')));
    const avgOr = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'patient_in_or')));
    const avgAnesthesia = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'anesthesia')));
    const avgSurgery = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'surgery')));
    const avgRpa = computeAverage(casesForAverages.map((item) => computeStageDurationMs(item.events, 'rpa')));
    const avgTotalCc = computeAverage(casesForAverages.map((item) => computeSpanMs(
      item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'transport_patient' && event.action === 'start')!.happenedAt) : null,
      item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')?.happenedAt ? new Date(item.events.find((event) => event.eventKey === 'rpa' && event.action === 'out')!.happenedAt) : null
    )));

    const plannedCount = cases.filter((item) => String(item.plannedSurgeryTime || '').trim()).length;
    const patientDelay = computeAverage(casesForAverages.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'patient_in_or', 'in', item.referenceDate || item.createdAt)));
    const anesthesiaDelay = computeAverage(casesForAverages.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'anesthesia_team', 'in', item.referenceDate || item.createdAt)));
    const surgeryTeamDelay = computeAverage(casesForAverages.map((item) => computeDelayMs(item.events, item.plannedSurgeryTime, 'surgical_team', 'in', item.referenceDate || item.createdAt)));

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
