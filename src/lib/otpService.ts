// src/lib/otpService.ts
import { Resend } from 'resend';

// Initialize Resend if the API key exists in environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Generate a random 6-digit OTP code
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Email (with automatic fallback to terminal simulation)
export async function sendEmailOtp(toEmail: string, otp: string) {
  try {
    if (!resend) {
      // Simulation mode: Prints code to your terminal if no Resend API key is found
      console.log('\n----------------------------------------');
      console.log(`[DEV EMAIL OTP SIMULATION]`);
      console.log(`To: ${toEmail}`);
      console.log(`Verification Code: ${otp}`);
      console.log('----------------------------------------\n');
      return { success: true };
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `Chamber Portal <${senderEmail}>`,
      to: [toEmail],
      subject: 'Your Chamber Portal Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Chamber Portal Security</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #2563eb; letter-spacing: 4px;">${otp}</h1>
          <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { success: false, error: 'Failed to send email OTP via Resend.' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email OTP:', error);
    return { success: false, error: 'Failed to send email OTP.' };
  }
}

// Send OTP via SMS
export async function sendSmsOtp(phone: string, otp: string) {
  try {
    console.log(`[REAL SMS SIMULATION] To: ${phone} | Code: ${otp}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS OTP:', error);
    return { success: false, error: 'Failed to send SMS OTP.' };
  }
}