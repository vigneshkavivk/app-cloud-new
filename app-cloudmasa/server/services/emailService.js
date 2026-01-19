import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendSupportTicketEmail = (ticket) =>
  resend.emails.send({
    from: 'CloudMasa Support <support@cloudmasa.com>',
    to: 'support@cloudmasa.com',
    subject: `[Ticket #${ticket._id}] ${ticket.type}: ${ticket.subject}`,
    text: `From: ${ticket.username}\n\n${ticket.description}`,
  });
