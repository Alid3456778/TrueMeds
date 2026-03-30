const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@truemedspharmacy.com',
    pass: 'falsemedS@123',
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP is NOT working:', error);
  } else {
    console.log('✅ SMTP is working! Ready to send emails.');
  }
});