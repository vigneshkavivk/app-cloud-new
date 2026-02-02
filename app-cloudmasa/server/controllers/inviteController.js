import { sendInvitationEmail } from '../services/inviteService.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import Role from '../models/Roles.js';
import Register from '../models/RegisterModel.js';
import { randomBytes } from 'crypto'; // ✅ CRITICAL FIX: Proper ES module import

// ✅ Blocklist of public email domains
const PUBLIC_EMAIL_DOMAINS = new Set([
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.in',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'inbox.com',
  'rediffmail.com',
  'msn.com',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sina.cn',
  'sohu.com',
  'foxmail.com',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
  'disroot.org',
  'mail.ru',
  'rambler.ru',
  'bk.ru',
  'list.ru',
  'uol.com.br',
  'terra.com.br',
  'ig.com.br',
]);

const sendInvite = async (req, res) => {
  try {
    const { name, email, role, workspaceId } = req.body;
    const userEmail = email.toLowerCase();

    console.log(`\n🚀 [INVITE] Starting invite process for: ${userEmail}`);
    
    // ✅ VALIDATION LOGIC
    if (!name || !email || !role || !workspaceId) {
      return res.status(400).json({ message: 'Name, email, role, and workspaceId are required' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    const domain = email.split('@')[1].toLowerCase();
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
      return res.status(400).json({ 
        message: 'Public email providers are not allowed. Please use your company email.' 
      });
    }
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const validRole = await Role.findOne({ name: role });
    if (!validRole) return res.status(400).json({ message: 'Invalid role selected' });
    
    // ✅ CHECK EXISTING MEMBERSHIP
    const userDoc = await Register.findOne({ email: userEmail }).select('_id');
    if (userDoc) {
      const existingWorkspace = await Workspace.findOne({
        _id: workspaceId,
        'members.userId': userDoc._id
      });
      if (existingWorkspace) {
        return res.status(409).json({ message: 'User is already a member of this workspace' });
      }
    }
    
    // ✅ CHECK EXISTING PENDING INVITE
    const existingPendingInvite = await InviteUser.findOne({
      email: userEmail,
      workspace: workspaceId,
      status: 'pending'
    });
    if (existingPendingInvite) {
      return res.status(409).json({ message: 'Invitation already pending for this user' });
    }

    // 🔑 CRITICAL FIX: EXPLICIT TOKEN GENERATION WITH PROPER IMPORT
    const inviteToken = randomBytes(32).toString('hex'); // ✅ USING NAMED IMPORT
    console.log(`🔑 [INVITE] Generated token: ${inviteToken} (length: ${inviteToken.length})`);

    // ✅ CREATE AND SAVE INVITE WITH EXPLICIT TOKEN
    const newInvite = new InviteUser({
      name,
      email: userEmail,
      role,
      workspace: workspaceId,
      status: 'pending',
      inviteToken // ✅ EXPLICITLY SET
    });

    // 🔒 SAVE WITH ERROR HANDLING FOR DUPLICATE TOKENS
    try {
      await newInvite.save();
      console.log(`✅ [INVITE] Invite SAVED to DB | ID: ${newInvite._id} | Token: ${inviteToken.substring(0, 8)}...`);
    } catch (saveError) {
      if (saveError.code === 11000 && saveError.keyPattern?.inviteToken) {
        console.error('⚠️ [INVITE] DUPLICATE TOKEN! Regenerating...');
        // Retry once with new token (extremely rare)
        const retryToken = randomBytes(32).toString('hex');
        newInvite.inviteToken = retryToken;
        await newInvite.save();
        console.log(`✅ [INVITE] Retry SUCCESS | New token: ${retryToken.substring(0, 8)}...`);
      } else {
        throw saveError;
      }
    }

    // 🔍 VERIFY TOKEN EXISTS IN DATABASE
    const verifiedInvite = await InviteUser.findById(newInvite._id).select('inviteToken email status');
    if (!verifiedInvite || verifiedInvite.inviteToken !== inviteToken) {
      console.error('❌ [INVITE] CRITICAL: Token mismatch after save!');
      console.error('Saved token:', verifiedInvite?.inviteToken);
      console.error('Expected token:', inviteToken);
      return res.status(500).json({ message: 'Invite creation failed. Please try again.' });
    }
    console.log(`🔍 [INVITE] DB VERIFICATION PASSED | Token matches: ${verifiedInvite.inviteToken === inviteToken}`);

    // ✅ SEND EMAIL WITH EXPLICIT TOKEN
    await sendInvitationEmail({ 
      name, 
      email, 
      role, 
      inviteToken, // ✅ GUARANTEED CORRECT VALUE
      workspaceName: workspace.name,
      invitedBy: req.user?.name || 'Admin'
    });

    console.log(`✅ [INVITE] FULL WORKFLOW SUCCESS for ${userEmail}\n`);
    
    res.status(201).json({
      success: true,
      message: 'Invitation sent and saved successfully',
      invite: {
        id: newInvite._id,
        name: newInvite.name,
        email: newInvite.email,
        role: newInvite.role,
        workspace: workspace.name,
        invitedAt: newInvite.invitedAt,
      }
    });
  } catch (error) {
    console.error('🔥 [INVITE] FATAL ERROR:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate invitation detected. Please check pending invites.' });
    }
    res.status(500).json({ 
      message: 'Failed to send invitation', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// ✅ FIXED: Return array directly (for frontend .map() compatibility)
const getAllInvitedUsers = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role;

    if (userRole === 'super-admin') {
      // Super-admin: see all pending invites
      const invites = await InviteUser.find({ status: 'pending' })
        .populate('workspace', 'name')
        .select('name email role invitedAt workspace status');
      return res.status(200).json(invites);
    } else {
      // Regular user: only invites for their workspaces
      const userWorkspaces = await Workspace.find({
        'members.userId': userId
      }).select('_id');
      const workspaceIds = userWorkspaces.map(ws => ws._id);

      if (workspaceIds.length === 0) {
        return res.status(200).json([]);
      }

      const invites = await InviteUser.find({
        workspace: { $in: workspaceIds },
        status: 'pending'
      })
      .populate('workspace', 'name')
      .select('name email role invitedAt workspace status');

      return res.status(200).json(invites);
    }
  } catch (error) {
    console.error('Error in getAllInvitedUsers:', error);
    return res.status(500).json([]);
  }
};

const deleteInvitedUser = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await InviteUser.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Invited user not found' });
    }
    return res.status(200).json({ message: 'Invited user deleted successfully' });
  } catch (error) {
    console.error('Error deleting invited user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { sendInvite, getAllInvitedUsers, deleteInvitedUser };

