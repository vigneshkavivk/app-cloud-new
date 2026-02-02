// server/services/emailService.js
import { Resend } from 'resend';

let resend;

// Only initialize Resend in production (or when API key is available)
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export const sendSupportTicketEmail = async (ticket) => {
  const emailData = {
    from: 'CloudMasa Support <support@cloudmasa.com>',
    to: 'support@cloudmasa.com',
    subject: `[Ticket #${ticket._id}] ${ticket.type}: ${ticket.subject}`,
    text: `From: ${ticket.username}\n\n${ticket.description}`,
  };

  if (resend) {
    // Real send (production)
    return await resend.emails.send(emailData);
  } else {
    // Dev mode: log instead of sending
    console.log('📧 [DEV] Support ticket email would be sent:');
    console.log(JSON.stringify(emailData, null, 2));
    return { success: true, id: 'mock_email_id' };
  }
};
