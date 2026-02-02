// server/controllers/userController.js
import Register from '../models/RegisterModel.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js'; // ✅ ADD THIS IMPORT

export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.status(200).json({ 
      user: req.user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Register.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
      },
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await Register.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Register({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [VALIDATE] STARTING TOKEN VALIDATION');
    console.log('='.repeat(80));
    console.log('🔍 [VALIDATE] Received token:', token);
    console.log('🔍 [VALIDATE] Token length:', token?.length || 0);
    console.log('='.repeat(80));

    // 🔍 SEARCH FOR INVITE - ✅ POPULATE WORKSPACE TO GET NAME
    console.log('\n🔍 [VALIDATE] Searching for invite with token...');
    const invite = await InviteUser.findOne({ inviteToken: token })
      .populate('workspace', 'name'); // ✅ CRITICAL FIX: Add this line
    
    if (!invite) {
      console.log('❌ [VALIDATE] ERROR: Invite NOT FOUND in database');
      
      // 🔍 LIST ALL INVITES IN DATABASE
      console.log('\n🔍 [VALIDATE] Checking ALL invites in database...');
      const allInvites = await InviteUser.find({}).select('email inviteToken status used expiresAt');
      console.log('🔍 [VALIDATE] Total invites in DB:', allInvites.length);
      
      if (allInvites.length > 0) {
        console.log('\n🔍 [VALIDATE] ALL INVITES IN DATABASE:');
        allInvites.forEach((inv, idx) => {
          console.log(`  ${idx + 1}. Email: ${inv.email}`);
          console.log(`     Token: ${inv.inviteToken.substring(0, 16)}...`);
          console.log(`     Status: ${inv.status}`);
          console.log(`     Used: ${inv.used}`);
          console.log(`     Expires: ${inv.expiresAt}`);
          console.log('     ' + '-'.repeat(60));
        });
      } else {
        console.log('⚠️ [VALIDATE] WARNING: NO INVITES FOUND IN DATABASE!');
      }
      
      console.log('='.repeat(80) + '\n');
      
      return res.status(400).json({
        success: false,
        message: 'Invalid invite link'
      });
    }

    console.log('\n✅ [VALIDATE] FOUND INVITE IN DATABASE!');
    console.log('✅ [VALIDATE] Invite details:');
    console.log('   ID:', invite._id);
    console.log('   Email:', invite.email);
    console.log('   Role:', invite.role);
    console.log('   Workspace Name:', invite.workspace?.name); // ✅ Add this for debugging
    console.log('   Status:', invite.status);
    console.log('   Used:', invite.used);
    console.log('   Expires at:', invite.expiresAt);
    console.log('   Token match:', invite.inviteToken === token);

    // 🔍 CHECK IF ALREADY USED
    if (invite.used) {
      console.log('\n❌ [VALIDATE] ERROR: Invite already USED');
      console.log('='.repeat(80) + '\n');
      return res.status(400).json({
        success: false,
        message: 'Invite already used'
      });
    }

    // 🔍 CHECK EXPIRATION
    console.log('\n🔍 [VALIDATE] Checking expiration...');
    console.log('   Expires at:', invite.expiresAt.toISOString());
    console.log('   Current time:', new Date().toISOString());
    console.log('   Is expired?', invite.expiresAt < new Date());

    if (invite.expiresAt < new Date()) {
      console.log('❌ [VALIDATE] ERROR: Invite EXPIRED');
      await InviteUser.findByIdAndUpdate(invite._id, { status: 'expired' });
      console.log('='.repeat(80) + '\n');
      return res.status(400).json({
        success: false,
        message: 'Invite expired'
      });
    }

    // 🔍 CHECK STATUS
    if (invite.status !== 'pending') {
      console.log('\n❌ [VALIDATE] ERROR: Status is', invite.status, '(expected: pending)');
      console.log('='.repeat(80) + '\n');
      return res.status(400).json({
        success: false,
        message: 'Invite no longer valid'
      });
    }

    console.log('\n✅ [VALIDATE] SUCCESS! Token is valid');
    console.log('='.repeat(80) + '\n');
    
    // ✅ FIXED RESPONSE - Include workspaceName
    res.status(200).json({
      success: true,
      email: invite.email,
      role: invite.role,
      workspaceId: invite.workspace?._id, // ✅ Send ID
      workspaceName: invite.workspace?.name || 'Workspace' // ✅ CRITICAL: Send name
    });
  } catch (error) {
    console.error('\n❌ [VALIDATE] CRASH:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({
      success: false,
      message: 'Server error while validating invite token'
    });
  }
};


export const registerViaInvite = async (req, res) => {
  const { token, name, password } = req.body;

  try {
    // 🔒 STEP 1: Re-validate token
    const invite = await InviteUser.findOne({ inviteToken: token })
      .populate('workspace', '_id name members');
    
    if (!invite || invite.used || invite.expiresAt < new Date() || invite.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired invite. Please request a new invitation.' 
      });
    }

    // 🔒 STEP 2: Prevent duplicate registration
    const existingUser = await Register.findOne({ email: invite.email });
    if (existingUser) {
      await InviteUser.findByIdAndUpdate(invite._id, { 
        status: 'failed', 
        used: true 
      });
      return res.status(409).json({ 
        success: false, 
        message: 'Account already exists for this email. Please login.' 
      });
    }

    // 🔒 STEP 3: Hash password & create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await Register.create({
      name,
      email: invite.email.toLowerCase(),
      password: hashedPassword,
      phone: req.body.phone, // Add this line
      role: invite.role,
      lastActive: new Date(),
      isActive: true
    });

    // 🔒 STEP 4: Add to workspace
    const workspace = invite.workspace;
    if (!workspace) throw new Error('Workspace not found');
    
    const isMember = workspace.members.some(m => 
      m.userId?.toString() === newUser._id.toString()
    );
    
    if (!isMember) {
      workspace.members.push({
        userId: newUser._id,
        role: invite.role,
        joinedAt: new Date()
      });
      await workspace.save();
    }

    // 🔒 STEP 5: Mark invite as used
    await InviteUser.findByIdAndUpdate(invite._id, {
      used: true,
      status: 'accepted',
      acceptedAt: new Date()
    });

    // 🔒 STEP 6: Return user data
    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to the workspace.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        workspace: workspace.name
      }
    });

  } catch (error) {
    console.error('Invite registration error:', error);
    
    // Cleanup on failure
    if (error.name === 'ValidationError' || error.code === 11000) {
      await InviteUser.findOneAndUpdate(
        { inviteToken: token },
        { status: 'failed', used: true }
      );
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.' 
    });
  }
};

