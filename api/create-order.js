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
  const surl = `${process.env.SITE_URL}/thank-you.html`; // success URL
  const furl = `${process.env.SITE_URL}/?payment=failed`;  // failure URL

  // PayU hash formula:
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
  const hashString = `${key}|${txnId}|${amount}|${productInfo}|${name}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  // Return all fields needed for PayU form POST
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
    action: 'https://secure.payu.in/_payment', // live endpoint
  });
}
