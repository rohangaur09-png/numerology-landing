export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone } = req.body;

  // Basic validation
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email and phone are required' });
  }

  // Generate unique order ID
  const orderId = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();

  try {
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
        order_note: 'Personalized Numerology Report',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree error:', data);
      return res.status(500).json({ error: 'Failed to create order', details: data });
    }

    // Return the payment session URL to redirect the user
    return res.status(200).json({
      order_id: orderId,
      payment_session_id: data.payment_session_id,
      payment_url: data.payment_link,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
