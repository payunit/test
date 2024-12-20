// CrossPay Payment Gateway Integration using Node.js

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Load CrossPay API credentials from .env file
const CROSSPAY_API_DATA = process.env.CROSSPAY_API_DATA;
const CROSSPAY_API_KEY = process.env.CROSSPAY_API_KEY;
const CROSSPAY_API_ENDPOINT = 'https://crosspayonline.com/api/createInvoiceByAccountLahza';

// Endpoint to initiate payment request to CrossPay
app.post('/initiatePayment', async (req, res) => {
  try {
    const params = req.body;

    // Validate required parameters
    const requiredParams = ['invoiceid', 'amount', 'currency', 'clientdetails'];
    requiredParams.forEach((param) => {
      if (!params[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    });

    console.log(`Initiating CrossPay payment for Invoice #${params.invoiceid}`);

    // Prepare post fields for API request
    const postFields = preparePostFields(params);

    // Make API request using axios
    const response = await axios.post(CROSSPAY_API_ENDPOINT, postFields, {
      headers: {
        'Content-Type': 'application/json', // استخدام JSON بدلاً من x-www-form-urlencoded
        Accept: 'application/json',
      },
    });

    // Handle response
    if (response.status === 200) {
      const result = response.data;
      if (result.invoice_id_crosspay) {
        console.log(`CrossPay Invoice ID: ${result.invoice_id_crosspay}`);
      }

      // Check the payment status
      if (result.paid === 1) {
        // Payment successful
        res.json({
          status: 'success',
          crosspay_invoice_id: result.invoice_id_crosspay,
          amount: params.amount,
          our_invoice_id: params.invoiceid,
        });
      } else {
        // Payment failed
        res.json({
          status: 'failed',
          crosspay_invoice_id: result.invoice_id_crosspay,
          amount: params.amount,
          our_invoice_id: params.invoiceid,
        });
      }
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error(`CrossPay API Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Function to prepare post fields for the API request
function preparePostFields(params) {
  const { clientdetails, invoiceid, amount, currency } = params;

  return {
    api_data: CROSSPAY_API_DATA,
    invoice_id: invoiceid,
    apiKey: CROSSPAY_API_KEY,
    total: amount,
    currency: currency,
    email: clientdetails.email,
    mobile: validateAndCleanPhoneNumber(clientdetails.phonenumber),
    name: `${clientdetails.firstname} ${clientdetails.lastname}`,
    description: `Transaction ID: ${invoiceid}`,
  };
}

// Function to validate and clean phone number
function validateAndCleanPhoneNumber(phone) {
  if (!phone) return '';

  // Remove non-digit characters
  const cleanedPhone = phone.replace(/\D/g, '');

  // Check if number is between 7 and 15 digits
  if (cleanedPhone.length < 7 || cleanedPhone.length > 15) {
    console.warn(`Warning: Phone number length is not standard: ${cleanedPhone}`);
  }

  return cleanedPhone;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
