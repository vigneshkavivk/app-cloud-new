// src/components/AcceptInvite.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AcceptInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email');
  const role = params.get('role');

  useEffect(() => {
    // Always store invite context if email exists (for login page)
    if (email) {
      localStorage.setItem('invite_email', email);
      if (role) {
        localStorage.setItem('invite_role', role);
      }
    }

    // Redirect logic:
    // - If both email and role are present, assume pre-authenticated invite → go to dashboard
    // - Otherwise, go to login for authentication
    if (email && role) {
      localStorage.setItem('cloudmasa_user_email', email);
      localStorage.setItem('cloudmasa_user_role', role);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [email, role]);

  return <p>{email && role ? 'Redirecting to dashboard...' : 'Redirecting to login...'}</p>;
};

export default AcceptInvite;