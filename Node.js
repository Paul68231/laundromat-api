const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// MPesa Config
const consumerKey = process.env.MPESA_KEY;
const consumerSecret = process.env.MPESA_SECRET;
const shortCode = "174379";
const passkey = process.env.MPESA_PASSKEY;

// Generate Token
async function getAccessToken() {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return response.data.access_token;
}

// Generate Password + Timestamp
function generateCredentials() {
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");
  return { timestamp, password };
}

// Initiate Payment
app.post("/mpesa/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const token = await getAccessToken();
    const { timestamp, password } = generateCredentials();

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "Laundromat",
        TransactionDesc: "Laundry Payment"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Africa's Talking SMS
app.post("/sms", async (req, res) => {
  try {
    const { phone, message } = req.body;
    const response = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      `username=${process.env.AT_USERNAME}&to=${phone}&message=${message}`,
      {
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
