import { Router } from 'express';
import IntakeRegistration from '../models/IntakeRegistration.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function serializeRegistration(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    name: obj.name,
    department: obj.department,
    rollNumber: obj.rollNumber,
    role: obj.role,
    createdAt: obj.createdAt,
  };
}

// public so anybody can access
router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const department = String(req.body.department || '').trim();
    const rollNumber = String(req.body.rollNumber || '').trim();
    const role = String(req.body.role || '').trim();

    if (!name || !department || !rollNumber || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // if (!['Instrumentalist', 'Singer'].includes(role)) {
    //   return res.status(400).json({ error: 'Role must be either Instrumentalist or Singer.' });
    // }
    if (rollNumber.length != 11) {
      return res.status(400).json({ error: 'Enter your correct 11-digit college roll number!' });
    }
    // const existing = await IntakeRegistration.findOne({ rollNumber });
    // if (existing) {
    //   return res.status(409).json({ error: 'This roll number has already been registered.' });
    // }

    const registration = await IntakeRegistration.create({
      name,
      department,
      rollNumber,
      role,
    });

    return res.status(201).json({ registration: serializeRegistration(registration) });
  } catch (err) {
    console.error('Intake registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This roll number has already been registered.' });
    }
    return res.status(500).json({ error: 'Could not complete registration.' });
  }
});

// admin stuff
router.get('/', requireAuth, async (_req, res) => {
  try {
    const registrations = await IntakeRegistration.find().sort({ createdAt: -1 });
    return res.json({ registrations: registrations.map(serializeRegistration) });
  } catch (err) {
    console.error('List intake registrations error:', err);
    return res.status(500).json({ error: 'Could not load registrations.' });
  }
});

// Protected — admins only
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await IntakeRegistration.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    return res.json({ ok: true, deletedId: deleted._id });
  } catch (err) {
    console.error('Delete intake registration error:', err);
    return res.status(500).json({ error: 'Could not delete registration.' });
  }
});

export default router;
