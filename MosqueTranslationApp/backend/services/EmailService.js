// Email service for Mosque Translation App
const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      if (!config.email.user || !config.email.password) {
        console.warn('⚠️ Email credentials not configured. Email functionality will be disabled.');
        return;
      }

      // Enhanced configuration with explicit SMTP settings and timeout handling
      const transportConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      };

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection with timeout
      const verifyWithTimeout = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Email service verification timeout'));
          }, 30000); // 30 second timeout

          this.transporter.verify((error, success) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              resolve(success);
            }
          });
        });
      };

      verifyWithTimeout()
        .then(() => {
          console.log('✅ Email service ready');
        })
        .catch((error) => {
          console.error('❌ Email service configuration error:', error);
          console.log('📧 Email functionality will be disabled for this session');
          this.transporter = null;
        });

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        console.warn('Email service not configured, skipping email send');
        return { success: false, message: 'Email service not configured' };
      }

      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      // Add timeout to email sending
      const sendWithTimeout = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Email send timeout'));
          }, 60000); // 60 second timeout

          this.transporter.sendMail(mailOptions, (error, result) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
      };

      const result = await sendWithTimeout();
      console.log(`✅ Email sent successfully to ${to}`);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);

      // If it's a connection error, try to reinitialize the transporter
      if (error.code === 'EDNS' || error.code === 'ETIMEOUT' || error.code === 'ECONNECTION') {
        console.log('🔄 Attempting to reinitialize email service...');
        this.initializeTransporter();
      }

      return { success: false, message: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Send email verification
  async sendVerificationEmail(email, token, mosqueName) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const subject = 'Verify Your Mosque Account - Mosque Translation App';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .islamic-pattern { border-top: 3px solid #FFD700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header islamic-pattern">
            <h1>🕌 Mosque Translation App</h1>
            <p>Assalamu Alaikum wa Rahmatullahi wa Barakatuh</p>
          </div>
          
          <div class="content">
            <h2>Welcome to Mosque Translation App!</h2>
            
            <p>Dear ${mosqueName} Administrator,</p>
            
            <p>Thank you for registering your mosque with our Islamic community platform. To complete your registration and start serving your community, please verify your email address.</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
            
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Complete your mosque profile with photos</li>
              <li>Set up prayer times and services</li>
              <li>Start broadcasting live translations</li>
              <li>Connect with your community</li>
            </ul>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p>May Allah bless your efforts in serving the Muslim community.</p>
            
            <p>Barakallahu feekum,<br>
            The Mosque Translation App Team</p>
          </div>
          
          <div class="footer">
            <p>"And whoever does good deeds, whether male or female, while being a believer, those will enter Paradise." - Quran 4:124</p>
            <p>© 2024 Mosque Translation App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token, mosqueName) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const subject = 'Reset Your Password - Mosque Translation App';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .islamic-pattern { border-top: 3px solid #FFD700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header islamic-pattern">
            <h1>🕌 Mosque Translation App</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div class="content">
            <h2>Reset Your Password</h2>
            
            <p>Assalamu Alaikum,</p>
            
            <p>We received a request to reset the password for your ${mosqueName} account.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul>
                <li>This password reset link will expire in 10 minutes</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>For security reasons, please:</p>
            <ul>
              <li>Choose a strong password with at least 8 characters</li>
              <li>Include uppercase and lowercase letters, numbers, and symbols</li>
              <li>Don't reuse passwords from other accounts</li>
            </ul>
            
            <p>If you continue to have problems, please contact our support team.</p>
            
            <p>May Allah protect and guide you.</p>
            
            <p>Barakallahu feekum,<br>
            The Mosque Translation App Team</p>
          </div>
          
          <div class="footer">
            <p>"And Allah is the best protector, and He is the most merciful of the merciful." - Quran 12:64</p>
            <p>© 2024 Mosque Translation App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  // Send welcome email after successful registration
  async sendWelcomeEmail(email, mosqueName) {
    const subject = 'Welcome to Mosque Translation App!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2E7D32; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .islamic-pattern { border-top: 3px solid #FFD700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header islamic-pattern">
            <h1>🕌 Welcome to Mosque Translation App!</h1>
            <p>Assalamu Alaikum wa Rahmatullahi wa Barakatuh</p>
          </div>
          
          <div class="content">
            <h2>Your mosque is now connected to the community!</h2>
            
            <p>Dear ${mosqueName} Administrator,</p>
            
            <p>Alhamdulillah! Your mosque account has been successfully created and verified. You can now start using all the features to better serve your community.</p>
            
            <h3>🌟 Available Features:</h3>
            
            <div class="feature">
              <h4>📡 Live Translation Broadcasting</h4>
              <p>Start real-time Arabic-to-English translation sessions during prayers and speeches.</p>
            </div>
            
            <div class="feature">
              <h4>👥 Community Management</h4>
              <p>View and communicate with community members who follow your mosque.</p>
            </div>
            
            <div class="feature">
              <h4>📅 Prayer Times & Events</h4>
              <p>Customize prayer times and create community events and announcements.</p>
            </div>
            
            <div class="feature">
              <h4>📊 Analytics Dashboard</h4>
              <p>Track engagement and see how your mosque is serving the community.</p>
            </div>
            
            <h3>🚀 Getting Started:</h3>
            <ol>
              <li>Complete your mosque profile with photos</li>
              <li>Set up your prayer time preferences</li>
              <li>Configure notification settings</li>
              <li>Start your first live translation session</li>
            </ol>
            
            <p>May Allah accept your efforts and make this platform a means of bringing the community closer to Islam.</p>
            
            <p>If you need any assistance, please don't hesitate to contact our support team.</p>
            
            <p>Barakallahu feekum,<br>
            The Mosque Translation App Team</p>
          </div>
          
          <div class="footer">
            <p>"And whoever does good deeds, whether male or female, while being a believer, those will enter Paradise." - Quran 4:124</p>
            <p>© 2024 Mosque Translation App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  // Send notification email for new followers
  async sendNewFollowerNotification(mosqueEmail, mosqueName, followerCount) {
    const subject = `New Community Member - ${mosqueName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🕌 New Community Member!</h1>
          </div>
          
          <div class="content">
            <p>Assalamu Alaikum,</p>
            
            <p>Great news! A new community member has started following ${mosqueName} on the Mosque Translation App.</p>
            
            <div class="stats">
              <h2 style="color: #2E7D32; margin: 0;">${followerCount}</h2>
              <p style="margin: 5px 0;">Total Community Members</p>
            </div>
            
            <p>This means more people in your community will receive:</p>
            <ul>
              <li>Prayer time notifications</li>
              <li>Live translation alerts</li>
              <li>Mosque announcements and events</li>
              <li>Friday prayer reminders</li>
            </ul>
            
            <p>Keep up the excellent work in serving the Muslim community!</p>
            
            <p>Barakallahu feekum,<br>
            The Mosque Translation App Team</p>
          </div>
          
          <div class="footer">
            <p>"And cooperate in righteousness and piety" - Quran 5:2</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(mosqueEmail, subject, html);
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
