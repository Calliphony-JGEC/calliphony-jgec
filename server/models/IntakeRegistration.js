import mongoose from 'mongoose';

const intakeRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true, unique: true },
    role: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);



export default mongoose.model('IntakeRegistration', intakeRegistrationSchema);
