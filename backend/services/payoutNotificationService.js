// backend/services/payoutNotificationService.js
// 🎯 CASHFREE PAYOUT NOTIFICATIONS - Complete notification system for sellers

const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Enhanced logging for payout notifications
const logPayoutNotification = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '📧',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [PAYOUT-NOTIFICATION] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

class PayoutNotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  // Initialize email and SMS services
  async initializeServices() {
    try {
      // Initialize email service
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        // Test email connection
        await this.emailTransporter.verify();
        logPayoutNotification('EMAIL_SERVICE_INITIALIZED', { host: process.env.SMTP_HOST }, 'success');
      } else {
        logPayoutNotification('EMAIL_SERVICE_SKIPPED', { reason: 'SMTP credentials not configured' }, 'warning');
      }

      // Initialize SMS service
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        logPayoutNotification('SMS_SERVICE_INITIALIZED', { accountSid: process.env.TWILIO_ACCOUNT_SID }, 'success');
      } else {
        logPayoutNotification('SMS_SERVICE_SKIPPED', { reason: 'Twilio credentials not configured' }, 'warning');
      }

    } catch (error) {
      logPayoutNotification('NOTIFICATION_SERVICE_INIT_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }
  }

  // Send payout status notification to seller
  async sendPayoutStatusNotification(payoutData, sellerData, notificationType = 'status_update') {
    try {
      const { payout, order, beneficiary } = payoutData;
      const { seller } = sellerData;

      logPayoutNotification('SEND_PAYOUT_NOTIFICATION_START', {
        payoutId: payout._id,
        orderId: order._id,
        sellerId: seller._id,
        notificationType,
        payoutStatus: payout.status,
        payoutAmount: payout.payoutAmount
      });

      // Prepare notification data
      const notificationData = {
        seller: {
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.email,
          mobileNumber: seller.mobileNumber,
          shopName: seller.shop?.name || 'Your Shop'
        },
        payout: {
          amount: payout.payoutAmount,
          status: payout.status,
          transferId: payout.transferId,
          transferUtr: payout.transferUtr,
          processedAt: payout.processedAt,
          commission: payout.totalCommission
        },
        order: {
          orderNumber: order.orderNumber,
          orderAmount: order.totalPrice,
          orderDate: order.createdAt
        },
        beneficiary: {
          bankAccount: beneficiary?.bankAccountNumber ? `****${beneficiary.bankAccountNumber.slice(-4)}` : 'N/A',
          bankName: beneficiary?.bankName || 'N/A'
        }
      };

      // Send notifications based on type and status
      const notifications = [];

      // Email notification
      if (this.emailTransporter && seller.email) {
        try {
          await this.sendPayoutEmailNotification(notificationData, notificationType);
          notifications.push('email');
          logPayoutNotification('PAYOUT_EMAIL_SENT', {
            payoutId: payout._id,
            sellerEmail: seller.email,
            notificationType
          }, 'success');
        } catch (emailError) {
          logPayoutNotification('PAYOUT_EMAIL_FAILED', {
            payoutId: payout._id,
            sellerEmail: seller.email,
            error: emailError.message
          }, 'error');
        }
      }

      // SMS notification for critical status updates
      if (this.twilioClient && seller.mobileNumber && this.shouldSendSMS(payout.status)) {
        try {
          await this.sendPayoutSMSNotification(notificationData, notificationType);
          notifications.push('sms');
          logPayoutNotification('PAYOUT_SMS_SENT', {
            payoutId: payout._id,
            sellerMobile: seller.mobileNumber,
            notificationType
          }, 'success');
        } catch (smsError) {
          logPayoutNotification('PAYOUT_SMS_FAILED', {
            payoutId: payout._id,
            sellerMobile: seller.mobileNumber,
            error: smsError.message
          }, 'error');
        }
      }

      // Real-time notification (if socket is available)
      if (global.emitToSeller && seller._id) {
        try {
          await this.sendRealtimePayoutNotification(notificationData, notificationType);
          notifications.push('realtime');
          logPayoutNotification('PAYOUT_REALTIME_SENT', {
            payoutId: payout._id,
            sellerId: seller._id,
            notificationType
          }, 'success');
        } catch (realtimeError) {
          logPayoutNotification('PAYOUT_REALTIME_FAILED', {
            payoutId: payout._id,
            sellerId: seller._id,
            error: realtimeError.message
          }, 'warning');
        }
      }

      logPayoutNotification('PAYOUT_NOTIFICATION_COMPLETE', {
        payoutId: payout._id,
        sellerId: seller._id,
        notificationsSent: notifications,
        totalNotifications: notifications.length
      }, 'success');

      return {
        success: true,
        notificationsSent: notifications,
        payoutId: payout._id,
        sellerId: seller._id
      };

    } catch (error) {
      logPayoutNotification('PAYOUT_NOTIFICATION_ERROR', {
        payoutId: payoutData?.payout?._id,
        sellerId: payoutData?.seller?._id,
        error: error.message,
        stack: error.stack
      }, 'error');

      throw error;
    }
  }

  // Send email notification for payout status
  async sendPayoutEmailNotification(notificationData, notificationType) {
    if (!this.emailTransporter) {
      throw new Error('Email service not initialized');
    }

    const { seller, payout, order, beneficiary } = notificationData;
    
    // Email templates based on payout status
    const emailTemplates = {
      payout_eligible: {
        subject: `🎉 Payout Ready - ₹${payout.amount} from ${seller.shopName}`,
        html: this.getPayoutEligibleEmailTemplate(notificationData)
      },
      payout_processing: {
        subject: `⏳ Payout Processing - ₹${payout.amount} from ${seller.shopName}`,
        html: this.getPayoutProcessingEmailTemplate(notificationData)
      },
      payout_completed: {
        subject: `✅ Payout Completed - ₹${payout.amount} received in your account`,
        html: this.getPayoutCompletedEmailTemplate(notificationData)
      },
      payout_failed: {
        subject: `❌ Payout Failed - ₹${payout.amount} from ${seller.shopName}`,
        html: this.getPayoutFailedEmailTemplate(notificationData)
      },
      beneficiary_created: {
        subject: `🏦 Bank Account Verified - Ready for payouts from ${seller.shopName}`,
        html: this.getBeneficiaryCreatedEmailTemplate(notificationData)
      },
      beneficiary_verification_failed: {
        subject: `⚠️ Bank Account Verification Failed - ${seller.shopName}`,
        html: this.getBeneficiaryVerificationFailedEmailTemplate(notificationData)
      }
    };

    const template = emailTemplates[notificationType] || emailTemplates.payout_processing;
    
    const mailOptions = {
      from: {
        name: 'Zammer Payouts',
        address: process.env.SMTP_FROM || process.env.SMTP_USER
      },
      to: seller.email,
      subject: template.subject,
      html: template.html,
      text: this.getPlainTextVersion(template.html)
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Send SMS notification for payout status
  async sendPayoutSMSNotification(notificationData, notificationType) {
    if (!this.twilioClient) {
      throw new Error('SMS service not initialized');
    }

    const { seller, payout, order } = notificationData;
    
    // SMS templates based on payout status
    const smsTemplates = {
      payout_eligible: `Hi ${seller.name}! Your payout of ₹${payout.amount} from order ${order.orderNumber} is ready and will be processed soon. - Zammer`,
      payout_processing: `Hi ${seller.name}! Your payout of ₹${payout.amount} is being processed and will reach your account within 24 hours. - Zammer`,
      payout_completed: `Hi ${seller.name}! Your payout of ₹${payout.amount} has been successfully transferred to your account. UTR: ${payout.transferUtr || 'N/A'}. - Zammer`,
      payout_failed: `Hi ${seller.name}! Your payout of ₹${payout.amount} failed. Please contact support or check your bank details. - Zammer`,
      beneficiary_created: `Hi ${seller.name}! Your bank account has been verified successfully. You're now ready to receive payouts from Zammer. - Zammer`,
      beneficiary_verification_failed: `Hi ${seller.name}! Your bank account verification failed. Please update your bank details in your seller dashboard. - Zammer`
    };

    const message = smsTemplates[notificationType] || smsTemplates.payout_processing;
    
    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${seller.mobileNumber}` // Assuming Indian mobile numbers
    });
  }

  // Send real-time notification via socket
  async sendRealtimePayoutNotification(notificationData, notificationType) {
    if (!global.emitToSeller) {
      throw new Error('Socket service not available');
    }

    const { seller, payout, order } = notificationData;
    
    const realtimeData = {
      type: 'payout_notification',
      notificationType,
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        transferId: payout.transferId,
        transferUtr: payout.transferUtr,
        processedAt: payout.processedAt
      },
      order: {
        orderNumber: order.orderNumber,
        orderAmount: order.orderAmount
      },
      timestamp: new Date(),
      message: this.getRealtimeMessage(notificationType, notificationData)
    };

    global.emitToSeller(seller._id, 'payout-notification', realtimeData);
  }

  // Determine if SMS should be sent based on payout status
  shouldSendSMS(status) {
    const smsWorthyStatuses = ['SUCCESS', 'FAILED', 'ELIGIBLE'];
    return smsWorthyStatuses.includes(status);
  }

  // Get real-time notification message
  getRealtimeMessage(notificationType, notificationData) {
    const { seller, payout, order } = notificationData;
    
    const messages = {
      payout_eligible: `Your payout of ₹${payout.amount} from order ${order.orderNumber} is ready for processing.`,
      payout_processing: `Your payout of ₹${payout.amount} is being processed and will reach your account soon.`,
      payout_completed: `Your payout of ₹${payout.amount} has been successfully transferred to your account.`,
      payout_failed: `Your payout of ₹${payout.amount} failed. Please contact support.`,
      beneficiary_created: `Your bank account has been verified successfully. You're ready to receive payouts.`,
      beneficiary_verification_failed: `Your bank account verification failed. Please update your details.`
    };

    return messages[notificationType] || 'Payout status updated.';
  }

  // Email templates
  getPayoutEligibleEmailTemplate(data) {
    const { seller, payout, order } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payout Ready - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .payout-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Payout Ready!</h1>
            <p>Your earnings are ready for processing</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>Great news! Your payout from <strong>${seller.shopName}</strong> is ready and will be processed in the next batch.</p>
            
            <div class="payout-card">
              <h3>Payout Details</h3>
              <p><strong>Amount:</strong> <span class="amount">₹${payout.amount}</span></p>
              <p><strong>Order:</strong> ${order.orderNumber}</p>
              <p><strong>Order Amount:</strong> ₹${order.orderAmount}</p>
              <p><strong>Commission:</strong> ₹${payout.commission}</p>
              <p><strong>Status:</strong> Ready for Processing</p>
            </div>
            
            <p>The payout will be transferred to your verified bank account within 24 hours.</p>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPayoutCompletedEmailTemplate(data) {
    const { seller, payout, order, beneficiary } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payout Completed - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .utr { background: #e8f5e8; padding: 10px; border-radius: 4px; font-family: monospace; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payout Completed!</h1>
            <p>Your money has been transferred successfully</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>Excellent! Your payout has been successfully transferred to your bank account.</p>
            
            <div class="success-card">
              <h3>Transfer Details</h3>
              <p><strong>Amount Received:</strong> <span class="amount">₹${payout.amount}</span></p>
              <p><strong>Bank Account:</strong> ${beneficiary.bankAccount} (${beneficiary.bankName})</p>
              <p><strong>Transfer ID:</strong> ${payout.transferId}</p>
              ${payout.transferUtr ? `<p><strong>UTR:</strong> <span class="utr">${payout.transferUtr}</span></p>` : ''}
              <p><strong>Processed At:</strong> ${new Date(payout.processedAt).toLocaleString('en-IN')}</p>
            </div>
            
            <p>You can view your complete payout history in your seller dashboard.</p>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPayoutFailedEmailTemplate(data) {
    const { seller, payout, order } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payout Failed - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .error-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
          .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payout Failed</h1>
            <p>We need your attention</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>Unfortunately, your payout could not be processed due to a technical issue.</p>
            
            <div class="error-card">
              <h3>Failed Payout Details</h3>
              <p><strong>Amount:</strong> <span class="amount">₹${payout.amount}</span></p>
              <p><strong>Order:</strong> ${order.orderNumber}</p>
              <p><strong>Transfer ID:</strong> ${payout.transferId}</p>
              <p><strong>Failed At:</strong> ${new Date(payout.lastStatusUpdate).toLocaleString('en-IN')}</p>
            </div>
            
            <p><strong>What to do next:</strong></p>
            <ul>
              <li>Check your bank account details in your seller dashboard</li>
              <li>Ensure your account is active and can receive transfers</li>
              <li>Contact our support team if the issue persists</li>
            </ul>
            
            <p>We will automatically retry the payout, or you can contact our support team for assistance.</p>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getBeneficiaryCreatedEmailTemplate(data) {
    const { seller, beneficiary } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bank Account Verified - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 Bank Account Verified!</h1>
            <p>You're ready to receive payouts</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>Great news! Your bank account has been successfully verified and you're now ready to receive automatic payouts.</p>
            
            <div class="success-card">
              <h3>Verified Account Details</h3>
              <p><strong>Account Holder:</strong> ${beneficiary.beneficiaryName}</p>
              <p><strong>Bank Account:</strong> ****${beneficiary.bankAccountNumber.slice(-4)}</p>
              <p><strong>Bank:</strong> ${beneficiary.bankName}</p>
              <p><strong>IFSC:</strong> ${beneficiary.bankIfsc}</p>
              <p><strong>Status:</strong> ✅ Verified</p>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>All future orders will be eligible for automatic payouts</li>
              <li>Payouts will be processed 3 days after order delivery</li>
              <li>You'll receive notifications for each payout</li>
              <li>View your payout history in your seller dashboard</li>
            </ul>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getBeneficiaryVerificationFailedEmailTemplate(data) {
    const { seller } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bank Account Verification Failed - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Verification Failed</h1>
            <p>Please update your bank details</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>We were unable to verify your bank account details. This means we cannot process automatic payouts to your account.</p>
            
            <div class="warning-card">
              <h3>What you need to do:</h3>
              <ul>
                <li>Check your account number and IFSC code</li>
                <li>Ensure your account is active</li>
                <li>Verify the account holder name matches exactly</li>
                <li>Update your bank details in your seller dashboard</li>
              </ul>
            </div>
            
            <p><strong>Important:</strong> Until your bank account is verified, you won't receive automatic payouts. Please update your details as soon as possible.</p>
            
            <p>If you need help, please contact our support team.</p>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPayoutProcessingEmailTemplate(data) {
    const { seller, payout, order } = data;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payout Processing - Zammer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .processing-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8; }
          .amount { font-size: 24px; font-weight: bold; color: #17a2b8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Payout Processing</h1>
            <p>Your money is on the way</p>
          </div>
          <div class="content">
            <p>Hi ${seller.name},</p>
            <p>Your payout is currently being processed and will reach your bank account within 24 hours.</p>
            
            <div class="processing-card">
              <h3>Processing Details</h3>
              <p><strong>Amount:</strong> <span class="amount">₹${payout.amount}</span></p>
              <p><strong>Order:</strong> ${order.orderNumber}</p>
              <p><strong>Transfer ID:</strong> ${payout.transferId}</p>
              <p><strong>Status:</strong> Processing</p>
              <p><strong>Expected Completion:</strong> Within 24 hours</p>
            </div>
            
            <p>You'll receive another notification once the transfer is completed successfully.</p>
            
            <p>Best regards,<br>Zammer Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Convert HTML to plain text
  getPlainTextVersion(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Send batch notification for multiple payouts
  async sendBatchPayoutNotifications(batchData) {
    try {
      logPayoutNotification('SEND_BATCH_NOTIFICATIONS_START', {
        batchTransferId: batchData.batchTransferId,
        totalPayouts: batchData.payouts.length,
        batchStatus: batchData.status
      });

      const notifications = [];
      
      for (const payoutData of batchData.payouts) {
        try {
          const result = await this.sendPayoutStatusNotification(payoutData, {
            seller: payoutData.seller
          }, 'batch_processing');
          
          notifications.push(result);
        } catch (error) {
          logPayoutNotification('BATCH_NOTIFICATION_INDIVIDUAL_ERROR', {
            payoutId: payoutData.payout._id,
            error: error.message
          }, 'error');
        }
      }

      logPayoutNotification('SEND_BATCH_NOTIFICATIONS_COMPLETE', {
        batchTransferId: batchData.batchTransferId,
        totalNotifications: notifications.length,
        successfulNotifications: notifications.filter(n => n.success).length
      }, 'success');

      return {
        success: true,
        batchTransferId: batchData.batchTransferId,
        totalNotifications: notifications.length,
        successfulNotifications: notifications.filter(n => n.success).length,
        notifications
      };

    } catch (error) {
      logPayoutNotification('SEND_BATCH_NOTIFICATIONS_ERROR', {
        batchTransferId: batchData.batchTransferId,
        error: error.message
      }, 'error');

      throw error;
    }
  }

  // Send notification when payout eligibility is updated
  async sendEligibilityUpdateNotification(orderData, sellerData, isEligible, reason) {
    try {
      const notificationType = isEligible ? 'payout_eligible' : 'payout_not_eligible';
      
      const notificationData = {
        seller: sellerData,
        payout: {
          amount: orderData.payout.sellerAmount,
          status: isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
          transferId: null,
          transferUtr: null,
          processedAt: null,
          commission: orderData.payout.totalCommission
        },
        order: {
          orderNumber: orderData.orderNumber,
          orderAmount: orderData.totalPrice,
          orderDate: orderData.createdAt
        },
        beneficiary: {
          bankAccount: 'N/A',
          bankName: 'N/A'
        },
        reason
      };

      return await this.sendPayoutStatusNotification(notificationData, sellerData, notificationType);

    } catch (error) {
      logPayoutNotification('ELIGIBILITY_NOTIFICATION_ERROR', {
        orderId: orderData._id,
        sellerId: sellerData._id,
        isEligible,
        error: error.message
      }, 'error');

      throw error;
    }
  }

  // Send beneficiary creation notification
  async sendBeneficiaryNotification(beneficiaryData, sellerData, notificationType = 'beneficiary_created') {
    try {
      logPayoutNotification('SEND_BENEFICIARY_NOTIFICATION_START', {
        beneficiaryId: beneficiaryData.beneficiaryId,
        sellerId: sellerData._id,
        notificationType
      });

      const notificationData = {
        seller: {
          name: `${sellerData.firstName} ${sellerData.lastName || ''}`,
          email: sellerData.email,
          mobileNumber: sellerData.mobileNumber,
          shopName: sellerData.shop?.name || 'Your Shop'
        },
        beneficiary: {
          beneficiaryId: beneficiaryData.beneficiaryId,
          status: beneficiaryData.beneficiaryStatus,
          bankAccount: beneficiaryData.maskedAccountNumber,
          bankName: beneficiaryData.bankName,
          ifscCode: beneficiaryData.bankIfsc
        },
        payout: {
          amount: 0,
          status: beneficiaryData.beneficiaryStatus,
          transferId: null,
          transferUtr: null,
          processedAt: null,
          commission: 0
        },
        order: {
          orderNumber: 'N/A',
          orderAmount: 0,
          orderDate: new Date()
        }
      };

      return await this.sendPayoutStatusNotification(notificationData, sellerData, notificationType);

    } catch (error) {
      logPayoutNotification('BENEFICIARY_NOTIFICATION_ERROR', {
        beneficiaryId: beneficiaryData.beneficiaryId,
        sellerId: sellerData._id,
        error: error.message
      }, 'error');

      throw error;
    }
  }

  // Send payout reminder notification
  async sendPayoutReminderNotification(payoutData, sellerData, reminderType = 'payout_reminder') {
    try {
      logPayoutNotification('SEND_PAYOUT_REMINDER_START', {
        payoutId: payoutData._id,
        sellerId: sellerData._id,
        reminderType
      });

      const notificationData = {
        seller: {
          name: `${sellerData.firstName} ${sellerData.lastName || ''}`,
          email: sellerData.email,
          mobileNumber: sellerData.mobileNumber,
          shopName: sellerData.shop?.name || 'Your Shop'
        },
        payout: {
          amount: payoutData.payoutAmount,
          status: payoutData.status,
          transferId: payoutData.transferId,
          transferUtr: payoutData.transferUtr,
          processedAt: payoutData.processedAt,
          commission: payoutData.totalCommission
        },
        order: {
          orderNumber: payoutData.order?.orderNumber || 'N/A',
          orderAmount: payoutData.orderAmount,
          orderDate: payoutData.order?.createdAt || new Date()
        },
        beneficiary: {
          bankAccount: payoutData.beneficiary?.maskedAccountNumber || 'N/A',
          bankName: payoutData.beneficiary?.bankName || 'N/A'
        }
      };

      return await this.sendPayoutStatusNotification(notificationData, sellerData, reminderType);

    } catch (error) {
      logPayoutNotification('PAYOUT_REMINDER_ERROR', {
        payoutId: payoutData._id,
        sellerId: sellerData._id,
        error: error.message
      }, 'error');

      throw error;
    }
  }
}

// Create singleton instance
const payoutNotificationService = new PayoutNotificationService();

module.exports = payoutNotificationService;
