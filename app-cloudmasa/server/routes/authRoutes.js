// server/routes/authRoutes.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import authenticate from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as awsController from '../controllers/awsController.js';
import serverConfig from '../config/serverConfig.js';

import Register from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';

const router = express.Router();

/* =====================================================
  AWS ROUTES (protected)
===================================================== */
router.post('/validate-aws-credentials', authenticate, awsController.validateAWSCredentials);
router.post('/connect-to-aws', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);

/* =====================================================
  GOOGLE OAUTH
===================================================== */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, googleProfile) => {
    if (err || !googleProfile) {
      console.error('Google OAuth error:', err || 'No profile returned');
      return res.redirect(`${serverConfig.frontendUrl}/login?error=google_auth_failed`);
    }

    try {
      const email = googleProfile.emails?.[0]?.value?.toLowerCase();
      const name = googleProfile.displayName || googleProfile.name?.givenName || 'Unknown';

      if (!email) {
        return res.redirect(`${serverConfig.frontendUrl}/login?error=email_missing`);
      }

      // 🔐 Step 1: Require accepted invite
      const invite = await InviteUser.findOne({
        email,
        status: 'accepted' // Only allow login if already accepted via registration
      });

      if (!invite) {
        return res.redirect(`${serverConfig.frontendUrl}/login?error=invite_required`);
      }

      // 🔍 Step 2: Find or create user
      let user = await Register.findOne({ email });

      if (!user) {
        user = await Register.create({
          name,
          email,
          googleId: googleProfile.id,
          provider: 'google',
          role: invite.role
        });

        // ➕ Add to workspace
        const workspace = await Workspace.findById(invite.workspace);
        if (workspace) {
          workspace.members = workspace.members || [];
          workspace.members.push({
            userId: user._id,
            role: invite.role,
            joinedAt: new Date()
          });
          await workspace.save();
        }
      } else if (!user.googleId) {
        // If existing user didn't use Google before, link it
        user.googleId = googleProfile.id;
        user.provider = 'google';
        await user.save();
      }

      // 🎫 Step 3: Generate JWT
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: 'google'
        },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: '7d' }
      );

      // ↪️ Step 4: Redirect with token
      return res.redirect(`${serverConfig.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error('Google callback internal error:', error);
      return res.redirect(`${serverConfig.frontendUrl}/login?error=server_error`);
    }
  })(req, res, next);
});

/* =====================================================
  GITHUB OAUTH
===================================================== */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })
);

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, async (err, githubProfile) => {
    if (err || !githubProfile) {
      return res.redirect(`${serverConfig.frontendUrl}/login?error=github_auth_failed`);
    }

    try {
      const email = githubProfile.emails?.[0]?.value?.toLowerCase();
      const name = githubProfile.displayName || githubProfile.username || 'Unknown';

      if (!email) {
        return res.redirect(`${serverConfig.frontendUrl}/login?error=email_missing`);
      }

      // 🔐 Require accepted invite
      const invite = await InviteUser.findOne({
        email,
        status: 'accepted'
      });

      if (!invite) {
        return res.redirect(`${serverConfig.frontendUrl}/login?error=invite_required`);
      }

      let user = await Register.findOne({ email });

      if (!user) {
        user = await Register.create({
          name,
          email,
          provider: 'github',
          role: invite.role
          // No password needed
        });

        const workspace = await Workspace.findById(invite.workspace);
        if (workspace) {
          workspace.members = workspace.members || [];
          workspace.members.push({
            userId: user._id,
            role: invite.role,
            joinedAt: new Date()
          });
          await workspace.save();
        }
      } else if (user.provider !== 'github') {
        user.provider = 'github';
        await user.save();
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: 'github'
        },
        process.env.JWT_SECRET || 'your_jwt_secret_key',
        { expiresIn: '7d' }
      );

      return res.redirect(`${serverConfig.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      return res.redirect(`${serverConfig.frontendUrl}/login?error=server_error`);
    }
  })(req, res, next);
});

/* =====================================================
  EMAIL/PASSWORD AUTH
===================================================== */
router.post('/register', authController.registerUser);   // Requires invite + password
router.post('/login', authController.loginUser);        // Handles password or SSO fallback
router.get('/logout', authController.logoutUser);
router.get('/profile', authenticate, authController.getUserProfile);

export default router;
