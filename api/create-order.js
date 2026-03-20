import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, dob } = req.body;

  if (!name || !email || !phone || !dob) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Generate unique order ID
  const orderId = 'GV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();

  try {
    // Create Cashfree order
    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: 399,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'CUST_' + Date.now(),
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `${process.env.SITE_URL}/thank-you.html?order_id=${orderId}&status=success`,
          notify_url: `${process.env.SITE_URL}/api/webhook`,
        },
        order_note: 'Personalized Numerology Report — GrahaVeda',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree error:', data);
      return res.status(500).json({ error: 'Failed to create order', details: data });
    }

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
          subject: `🪐 New Order — ${name} | ₹399 | ${orderId}`,
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
                  <td style="padding: 12px 16px; font-weight: bold; color: #5C2D91; border: 1px solid #e8e0f0;">Order ID</td>
                  <td style="padding: 12px 16px; color: #333; font-size: 13px; border: 1px solid #e8e0f0;">${orderId}</td>
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
      console.error('Email failed:', emailErr);
    }

    // Send Purchase event to Meta Conversions API
    try {
      const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
      const hashedPhone = crypto.createHash('sha256').update(phone.trim()).digest('hex');

      await fetch(`https://graph.facebook.com/v19.0/1332282788942150/events?access_token=${process.env.META_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              event_id: orderId,
              action_source: 'website',
              event_source_url: process.env.SITE_URL,
              user_data: {
                em: [hashedEmail],
                ph: [hashedPhone],
              },
              custom_data: {
                currency: 'INR',
                value: 399,
                content_name: 'Personalized Numerology Report',
                content_type: 'product',
                order_id: orderId,
              },
            },
          ],
          test_event_code: process.env.META_TEST_CODE || undefined,
        }),
      });
    } catch (metaErr) {
      console.error('Meta CAPI failed:', metaErr);
    }

    // Return Cashfree payment link
    return res.status(200).json({
      order_id: orderId,
      payment_url: data.payment_link,
      payment_session_id: data.payment_session_id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
