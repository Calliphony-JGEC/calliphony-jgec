import mongoose from 'mongoose';
import { Router } from 'express';
import Form, { FORM_FIELD_TYPES } from '../models/Form.js';
import FormResponse from '../models/FormResponse.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function serializeField(field) {
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: Boolean(field.required),
    placeholder: field.placeholder || '',
    options: Array.isArray(field.options) ? field.options.filter(Boolean) : [],
  };
}

function serializeForm(doc, { includeMeta = false } = {}) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const format = ensureFormat(obj);
  const payload = {
    id: String(obj._id),
    title: format.title,
    description: format.description,
    buttonLabel: format.buttonLabel,
    submitLabel: format.submitLabel,
    published: Boolean(obj.published),
    fields: format.fields,
    format,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
  if (includeMeta) {
    payload.responseCount = obj.responseCount || 0;
  }
  return payload;
}

function serializeResponse(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
    return {
    id: String(obj._id),
    formId: String(obj.formId),
    answers: obj.answers && typeof obj.answers === 'object' ? obj.answers : {},
    format: obj.format && typeof obj.format === 'object' ? obj.format : null,
    createdAt: obj.createdAt,
  };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function invalidId(res) {
  return res.status(400).json({ error: 'Invalid form id.' });
}

function normalizeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function newFieldId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFields(list = []) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .map((raw) => {
      const label = String(raw?.label || '').trim();
      if (!label) return null;
      const type = FORM_FIELD_TYPES.includes(raw?.type) ? raw.type : 'text';
      let id = String(raw?.id || '').trim() || newFieldId();
      if (seen.has(id)) id = newFieldId();
      seen.add(id);
      const needsOptions = type === 'select' || type === 'radio' || type === 'checkbox';
      const options = needsOptions
        ? (Array.isArray(raw.options) ? raw.options : [])
            .map((opt) => String(opt || '').trim())
            .filter(Boolean)
        : [];
      return {
        id,
        label,
        type,
        required: raw?.required !== false,
        placeholder: String(raw?.placeholder || '').trim(),
        options,
      };
    })
    .filter(Boolean);
}

function buildFormat({ title, description, buttonLabel, submitLabel, fields }) {
  const resolvedTitle = String(title || '').trim();
  return {
    title: resolvedTitle,
    description: String(description || '').trim(),
    buttonLabel: String(buttonLabel || resolvedTitle).trim() || resolvedTitle,
    submitLabel: String(submitLabel || 'Submit').trim() || 'Submit',
    fields: (fields || []).map(serializeField),
  };
}

function ensureFormat(obj) {
  if (obj?.format && Array.isArray(obj.format.fields) && obj.format.fields.length) {
    return {
      title: obj.format.title || obj.title,
      description: obj.format.description ?? obj.description ?? '',
      buttonLabel: obj.format.buttonLabel || obj.buttonLabel || obj.title || '',
      submitLabel: obj.format.submitLabel || obj.submitLabel || 'Submit',
      fields: obj.format.fields.map(serializeField),
    };
  }
  return buildFormat(obj);
}

function stampFormat(form) {
  form.format = buildFormat(form);
  form.markModified('fields');
  form.markModified('format');
}

function publicFormPayload(form) {
  const serialized = serializeForm(form);
  return {
    id: serialized.id,
    title: serialized.title,
    description: serialized.description,
    buttonLabel: serialized.buttonLabel,
    submitLabel: serialized.submitLabel,
    fields: serialized.fields,
    format: serialized.format,
  };
}

async function unpublishOthers(exceptId) {
  await Form.updateMany({ _id: { $ne: exceptId }, published: true }, { $set: { published: false } });
}

function validateAnswers(fields, answers) {
  const incoming = answers && typeof answers === 'object' ? answers : {};
  const cleaned = {};

  for (const field of fields) {
    const raw = incoming[field.id];
    const isEmptyArray = Array.isArray(raw) && raw.filter((v) => String(v).trim()).length === 0;
    const isEmpty =
      raw == null ||
      (typeof raw === 'string' && !raw.trim()) ||
      isEmptyArray;

    if (field.required && isEmpty) {
      return { error: `${field.label} is required.` };
    }
    if (isEmpty) {
      cleaned[field.id] = field.type === 'checkbox' ? [] : '';
      continue;
    }

    if (field.type === 'checkbox') {
      const selected = (Array.isArray(raw) ? raw : [raw]).map((v) => String(v).trim()).filter(Boolean);
      if (field.options.length && selected.some((v) => !field.options.includes(v))) {
        return { error: `Invalid option for ${field.label}.` };
      }
      cleaned[field.id] = selected;
      continue;
    }

    const value = String(raw).trim();
    if ((field.type === 'select' || field.type === 'radio') && field.options.length && !field.options.includes(value)) {
      return { error: `Invalid option for ${field.label}.` };
    }
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { error: `Enter a valid email for ${field.label}.` };
    }
    if (field.type === 'url') {
      const href = normalizeHttpUrl(value);
      if (!href) {
        return { error: `Enter a valid link for ${field.label} (e.g. https://example.com).` };
      }
      cleaned[field.id] = href;
      continue;
    }
    cleaned[field.id] = value;
  }

  return { answers: cleaned };
}

router.get('/public', async (_req, res) => {
  try {
    const form = await Form.findOne({ published: true }).sort({ updatedAt: -1 });
    if (!form) {
      return res.json({ form: null });
    }
    return res.json({ form: publicFormPayload(form) });
  } catch (err) {
    console.error('Public form error:', err);
    return res.status(500).json({ error: 'Could not load form.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return invalidId(res);
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }
    if (!form.published) {
      return res.status(404).json({ error: 'This form is not currently open.' });
    }
    return res.json({ form: publicFormPayload(form) });
  } catch (err) {
    console.error('Get form error:', err);
    return res.status(500).json({ error: 'Could not load form.' });
  }
});

router.post('/:id/responses', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return invalidId(res);
    const form = await Form.findById(req.params.id);
    if (!form || !form.published) {
      return res.status(404).json({ error: 'This form is not currently open.' });
    }
    const format = ensureFormat(form);
    if (!format.fields.length) {
      return res.status(400).json({ error: 'This form has no questions yet.' });
    }

    const checked = validateAnswers(format.fields, req.body.answers);
    if (checked.error) {
      return res.status(400).json({ error: checked.error });
    }

    const response = await FormResponse.create({
      formId: form._id,
      answers: checked.answers,
      format,
    });
    return res.status(201).json({ response: serializeResponse(response) });
  } catch (err) {
    console.error('Submit form response error:', err);
    return res.status(500).json({ error: 'Could not submit the form.' });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  try {
    const forms = await Form.find().sort({ updatedAt: -1 }).lean();
    const counts = await FormResponse.aggregate([
      { $group: { _id: '$formId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
    return res.json({
      forms: forms.map((form) =>
        serializeForm({ ...form, responseCount: countMap.get(String(form._id)) || 0 }, { includeMeta: true })
      ),
    });
  } catch (err) {
    console.error('List forms error:', err);
    return res.status(500).json({ error: 'Could not load forms.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Form title is required.' });
    }

    const fields = normalizeFields(req.body.fields);
    const published = Boolean(req.body.published);
    const form = await Form.create({
      title,
      description: String(req.body.description || '').trim(),
      buttonLabel: String(req.body.buttonLabel || title).trim(),
      submitLabel: String(req.body.submitLabel || 'Submit').trim() || 'Submit',
      published,
      fields,
    });
    stampFormat(form);
    await form.save();

    if (published) {
      await unpublishOthers(form._id);
    }

    return res.status(201).json({ form: serializeForm(form, { includeMeta: true }) });
  } catch (err) {
    console.error('Create form error:', err);
    return res.status(500).json({ error: 'Could not create form.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return invalidId(res);
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    if (req.body.title != null) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ error: 'Form title is required.' });
      form.title = title;
    }
    if (req.body.description != null) form.description = String(req.body.description).trim();
    if (req.body.buttonLabel != null) form.buttonLabel = String(req.body.buttonLabel).trim();
    if (req.body.submitLabel != null) {
      form.submitLabel = String(req.body.submitLabel).trim() || 'Submit';
    }
    if (Array.isArray(req.body.fields)) {
      form.fields = normalizeFields(req.body.fields);
    }
    if (req.body.published != null) {
      form.published = Boolean(req.body.published);
    }

    if (!form.buttonLabel) form.buttonLabel = form.title;
    stampFormat(form);
    await form.save();

    if (form.published) {
      await unpublishOthers(form._id);
    }

    const responseCount = await FormResponse.countDocuments({ formId: form._id });
    return res.json({ form: serializeForm({ ...form.toObject(), responseCount }, { includeMeta: true }) });
  } catch (err) {
    console.error('Update form error:', err);
    return res.status(500).json({ error: 'Could not update form.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return invalidId(res);
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    const responseCount = await FormResponse.countDocuments({ formId: form._id });
    if (responseCount > 0) {
      return res.status(409).json({
        error: `This form has ${responseCount} saved response(s). Unpublish it instead of deleting so answers stay on record.`,
      });
    }

    await Form.findByIdAndDelete(form._id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete form error:', err);
    return res.status(500).json({ error: 'Could not delete form.' });
  }
});

router.get('/:id/responses', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return invalidId(res);
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }
    const responses = await FormResponse.find({ formId: form._id }).sort({ createdAt: -1 });
    return res.json({
      form: serializeForm(form, { includeMeta: true }),
      responses: responses.map(serializeResponse),
    });
  } catch (err) {
    console.error('List form responses error:', err);
    return res.status(500).json({ error: 'Could not load responses.' });
  }
});

export default router;
