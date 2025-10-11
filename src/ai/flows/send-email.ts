
'use server';

/**
 * @fileOverview A placeholder flow for sending a single transactional email.
 * This is not functional in the MVP.
 *
 * - sendEmail - A placeholder function for sending an email.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmailSchema = z.object({
  to: z.string().email().describe("Recipient's email address."),
  subject: z.string().describe("The subject of the email."),
  body: z.string().describe("The HTML body of the email."),
  attachment: z.object({
    filename: z.string(),
    content: z.string().describe("Base64 encoded content"),
    contentType: z.string(),
  }).optional().describe("Optional email attachment."),
});

const EmailResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});


export const sendEmail = ai.defineFlow(
  {
    name: 'sendEmail',
    inputSchema: EmailSchema,
    outputSchema: EmailResultSchema,
  },
  async (input) => {
    console.log(`Sending email to ${input.to} with subject "${input.subject}".`);
    
    // Placeholder logic. This would call a backend function to send an email.
    // This feature is not functional in the MVP.
    return { 
      success: true, 
      message: 'Email sending is a placeholder and not functional in the MVP.'
    };
  }
);
