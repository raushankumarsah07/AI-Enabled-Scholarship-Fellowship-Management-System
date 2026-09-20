import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return null;
  }

  // Custom SMTP configuration if host is specified
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  // Default to standard Gmail service
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

/**
 * Send real 6-digit verification OTP email to user
 */
export const sendOtpEmail = async ({ toEmail, name, otp }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Ministry of Tribal Affairs (MoTA)" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@mota.gov.in'}>`,
    to: toEmail,
    subject: `🔐 ${otp} is your MoTA Scholarship Portal Verification Code`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background-color: #0B2545; color: #ffffff; padding: 16px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #fbbf24;">🏛️ Ministry of Tribal Affairs (MoTA)</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #e2e8f0;">National Fellowship & Scholarship Management System (SIH-26239)</p>
          </div>
          <div style="height: 4px; background: linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%);"></div>
        </div>

        <div style="background-color: #ffffff; padding: 28px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${name || 'Applicant'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Thank you for registering on the <strong>AI-Enabled Scholarship & Fellowship Management System for Scheduled Tribes (ST)</strong>.
          </p>
          
          <p style="font-size: 14px; color: #475569; margin-bottom: 12px;">
            Please use the following 6-digit One-Time Password (OTP) to verify your account:
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 8px; padding: 14px 32px;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: monospace;">${otp}</span>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">⏳ Valid for <strong>15 minutes</strong></div>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
              ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone. Ministry officials will never ask for your password or verification code.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 4px 0;">Government of India | Ministry of Tribal Affairs (MoTA)</p>
          <p style="margin: 4px 0;">Smart India Hackathon 2026 — Problem Statement 26239</p>
        </div>
      </div>
    `,
    text: `Ministry of Tribal Affairs (MoTA)\n\nDear ${name || 'Applicant'},\n\nYour 6-digit verification code is: ${otp}\nThis code is valid for 15 minutes.\n\nNever share your OTP with anyone.`
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service]: ✅ OTP Email sent successfully to ${toEmail} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Service Error]: ❌ Failed to deliver email to ${toEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`\n================== [EMAIL SERVICE (SMTP NOT CONFIGURED)] ==================`);
    console.log(`[TO]: ${toEmail}`);
    console.log(`[OTP CODE]: ${otp}`);
    console.log(`[NOTE]: To send real emails to inboxes, set EMAIL_USER and EMAIL_PASS in server/.env`);
    console.log(`===========================================================================\n`);
    return { success: false, reason: 'NO_SMTP_CONFIG' };
  }
};
