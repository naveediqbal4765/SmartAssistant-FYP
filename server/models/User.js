const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: ['elder', 'volunteer', 'caregiver'],
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String,
    priority: { type: Number, default: 1 }
  }],

  // ========== PRIVACY SETTINGS ==========
  privacySettings: {
    showPhone: { type: Boolean, default: true },
    showAddress: { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
    showDateOfBirth: { type: Boolean, default: false },
    showEmergencyContacts: { type: Boolean, default: false }
  },
  // ==========================================
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },
  
  // ========== OTP FIELDS for Registration ==========
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  otp: {
    code: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  
  // ========== PASSWORD RESET FIELDS ==========
  resetOtp: {
    code: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  resetVerified: {
    type: Boolean,
    default: false
  },
  // ==========================================
  
  // ========== GOOGLE & FACEBOOK OAUTH FIELDS (ADDED) ==========
  googleId: {
    type: String,
    default: null,
    sparse: true
  },
  facebookId: {
    type: String,
    default: null,
    sparse: true
  },
  // ==========================================

  // ========== SENIOR ↔ CAREGIVER LINKING ==========
  // Invitation code generated on senior signup or manual regeneration.
  caregiverLinkCode: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  linkedSeniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  linkedCaregivers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  // ==========================================

  hiddenHistoryTaskIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    default: []
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

UserSchema.index({ location: '2dsphere' });
UserSchema.index({ role: 1, 'caregiverLinkCode.code': 1 });
UserSchema.index({ linkedSeniorId: 1 });

module.exports = mongoose.model('User', UserSchema);