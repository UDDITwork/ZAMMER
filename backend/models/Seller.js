const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sellerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true
  },
  shop: {
    name: {
      type: String,
      required: [true, 'Shop name is required']
    },
    address: {
      type: String,
      required: [true, 'Shop address is required']
    },
    gstNumber: {
      type: String,
      default: ''
    },
    phoneNumber: {
      main: {
        type: String,
        default: ''
      },
      alternate: {
        type: String,
        default: ''
      }
    },
    category: {
      type: String,
      enum: ['Men', 'Women', 'Kids'],
      required: [true, 'Shop category is required']
    },
    openTime: {
      type: String,
      default: ''
    },
    closeTime: {
      type: String,
      default: ''
    },
    workingDays: {
      type: String,
      default: ''
    },
    location: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    images: {
      type: [String],
      default: []
    },
    mainImage: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Shop description cannot be more than 500 characters']
    }
  },
  bankDetails: {
    accountNumber: {
      type: String,
      default: ''
    },
    ifscCode: {
      type: String,
      default: ''
    },
    bankName: {
      type: String,
      default: ''
    },
    accountType: {
      type: String,
      default: ''
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
}, { timestamps: true });

// Index for geolocation queries
sellerSchema.index({ "shop.location": "2dsphere" });

// Hash password before saving
sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
sellerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get main shop image or default
sellerSchema.methods.getMainShopImage = function() {
  if (this.shop.mainImage) {
    return this.shop.mainImage;
  }
  if (this.shop.images && this.shop.images.length > 0) {
    return this.shop.images[0];
  }
  return null;
};

// Virtual for shop image URL
sellerSchema.virtual('shop.mainImageUrl').get(function() {
  const mainImage = this.getMainShopImage();
  if (mainImage) {
    // Return the URL as is since it will be a Cloudinary URL
    return mainImage;
  }
  return null;
});

// Ensure virtual fields are included in JSON output
sellerSchema.set('toJSON', { virtuals: true });
sellerSchema.set('toObject', { virtuals: true });

const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;