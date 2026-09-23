import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { sendNotification } from '../services/notificationService.js';
import { sendOtpEmail } from '../services/emailService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'development_jwt_secret_key_change_in_production', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role = 'applicant', preferredLanguage = 'en', profile = {} } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      passwordHash: password,
      role: ['applicant', 'verifier', 'officer', 'admin'].includes(role) ? role : 'applicant',
      isVerified: false,
      otp,
      otpExpiry,
      preferredLanguage,
      profile: {
        category: 'ST',
        ...profile
      }
    });

    // Send real OTP email to user's registered inbox
    await sendOtpEmail({
      toEmail: user.email,
      name: user.name,
      otp
    });

    console.log('\n================== [REGISTRATION OTP GENERATED] ==================');
    console.log(`[USER]: ${user.name} (${user.phone}) | [EMAIL]: ${user.email}`);
    console.log(`[VERIFICATION OTP]: ${otp}`);
    console.log(`[VALID FOR]: 15 Minutes`);
    console.log('==================================================================\n');

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification OTP sent to your registered email address.',
      userId: user._id,
      email: user.email,
      otpDebug: otp
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email address.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified. Please log in.' });
    }

    // Generate fresh 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Send real email
    await sendOtpEmail({
      toEmail: user.email,
      name: user.name,
      otp
    });

    console.log(`[Auth]: Resent fresh OTP ${otp} to ${user.email}`);

    res.json({
      success: true,
      message: 'A fresh OTP has been sent to your email address.',
      email: user.email,
      otpDebug: otp
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isVerified) {
      const token = generateToken(user._id);
      return res.json({
        success: true,
        message: 'Account is already verified.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          profile: user.profile
        }
      });
    }

    if (!otp || String(user.otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered. Please check the code sent to your email.' });
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please click Resend OTP.' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Mobile number and email verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        profile: user.profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials entered.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials entered.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        preferredLanguage: user.preferredLanguage,
        profile: user.profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const { name, phone, preferredLanguage, profile } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (profile) {
      user.profile = {
        ...user.profile.toObject(),
        ...profile
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user
    });
  } catch (error) {
    next(error);
  }
};
