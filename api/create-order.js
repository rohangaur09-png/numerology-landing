import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, dob } = req.body;

  if (!name || !email || !phone || !dob) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Generate unique transaction ID
  const txnId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();

  const amount = '399.00';
  const productInfo = 'Personalized Numerology Report';
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_SALT;
  const surl = `${process.env.SITE_URL}/thank-you.html?order_id=${txnId}&status=success`;
  const furl = `${process.env.SITE_URL}/?payment=failed`;

  // PayU hash formula
  const hashString = `${key}|${txnId}|${amount}|${productInfo}|${name}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  // Send email notification via Resend
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GrahaVeda Orders <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL,
        subject: `🪐 New Order — ${name} | ₹399 | ${txnId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background: #2A0F52; padding: 20px 24px; border-radius: 6px 6px 0 0; margin: -24px -24px 24px;">
              <h1 style="color: #E8BC6A; margin: 0; font-size: 20px;">✦ GrahaVeda — New Order Received</h1>
            </div>

            <p style="color: #333; font-size: 15px;">A new customer has placed an order. Please prepare their numerology report.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f9f5ff;">
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; width: 40%; border: 1px solid #e8e0f0;">Customer Name</td>
                <td style="padding: 12px 16px; color: #333; border: 1px solid #e8e0f0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Email</td>
                <td style="padding: 12px 16px; color: #333; border: 1px solid #e8e0f0;">${email}</td>
              </tr>
              <tr style="background: #f9f5ff;">
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Mobile Number</td>
                <td style="padding: 12px 16px; color: #333; border: 1px solid #e8e0f0;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Date of Birth</td>
                <td style="padding: 12px 16px; color: #333; border: 1px solid #e8e0f0;">${dob}</td>
              </tr>
              <tr style="background: #f9f5ff;">
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Amount Paid</td>
                <td style="padding: 12px 16px; color: #2e7d32; font-weight: bold; border: 1px solid #e8e0f0;">₹399</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Transaction ID</td>
                <td style="padding: 12px 16px; color: #333; font-size: 13px; border: 1px solid #e8e0f0;">${txnId}</td>
              </tr>
              <tr style="background: #f9f5ff;">
                <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Order Time</td>
                <td style="padding: 12px 16px; color: #333; border: 1px solid #e8e0f0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>
            </table>

            <div style="background: #fff8e7; border: 1px solid #f0d080; border-radius: 6px; padding: 16px; margin-top: 20px;">
              <p style="margin: 0; color: #7a5c00; font-size: 14px;">
                <strong>Action required:</strong> Please deliver the numerology report to the customer's WhatsApp (<strong>${phone}</strong>) and email (<strong>${email}</strong>) within 4–5 working days.
              </p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">GrahaVeda · Ancient Wisdom · Cosmic Guidance</p>
          </div>
        `,
      }),
    });
  } catch (emailErr) {
    // Don't block payment if email fails — just log it
    console.error('Email failed:', emailErr);
  }

  // Return PayU payment fields
  return res.status(200).json({
    txnId,
    amount,
    productInfo,
    name,
    email,
    phone,
    key,
    hash,
    surl,
    furl,
    action: 'https://secure.payu.in/_payment',
  });
}
