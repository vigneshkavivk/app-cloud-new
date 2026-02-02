// server/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Register from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import logger from '../utils/logger.js';

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: '24h' }
  );
};

// 🔐 Register with invite validation (password only)
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await Register.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ Validate pending invitation
    const invitation = await InviteUser.findOne({
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (!invitation) {
      return res.status(400).json({
        message: 'No pending invitation found. Please get invited first.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Register({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: invitation.role,
      // Optional: mark as SSO=false
      isSSO: false
    });
    await newUser.save();

    // ✅ Add to workspace
    const workspace = await Workspace.findById(invitation.workspace);
    if (workspace) {
      if (!workspace.members) workspace.members = [];
      workspace.members.push({
        userId: newUser._id,
        role: invitation.role,
        joinedAt: new Date()
      });
      await workspace.save();
    }

    // ✅ Mark invite as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isSSO: false
      },
      token
    });
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

// 🔑 Login: supports both password AND Google SSO
const loginUser = async (req, res) => {
  const { email, password, googleId } = req.body;

  try {
    const user = await Register.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // ✅ Handle Google SSO
    if (googleId) {
      if (!user.googleId) {
        return res.status(400).json({ message: 'This account was not created with Google SSO' });
      }
      if (user.googleId !== googleId) {
        return res.status(400).json({ message: 'Google ID mismatch' });
      }
      // SSO: no password check needed
    }
    // ✅ Handle password login
    else if (password) {
      if (user.googleId) {
        return res.status(400).json({ message: 'This account uses Google SSO. Please log in with Google.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }
    // ❌ Neither provided
    else {
      return res.status(400).json({ message: 'Password or Google ID is required' });
    }

    // ✅ Update activity
    user.lastActive = new Date();
    user.isActive = true;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSSO: !!user.googleId
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 👤 Get profile
const getUserProfile = async (req, res) => {
  try {
    const user = await Register.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🚪 Logout (client-side token removal for JWT)
const logoutUser = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser
};
