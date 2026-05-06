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

  // Add after emergencyContacts
documents: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Document'
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
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Geospatial index for future volunteer matching
UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('User', UserSchema);