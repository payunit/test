// CrossPay Payment Gateway Integration using Node.js

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Define CrossPay API Endpoints and Keys
const CROSSPAY_API_DATA = '82e4b4fd3a16ad99229af9911ce8e6d2';
const CROSSPAY_API_ENDPOINT = 'https://crosspayonline.com/api/createInvoiceByAccountLahza';
const CROSSPAY_SECRET_KEY = 'c93854-d73bdb-13b176-088d64-606965'; // Secret key for verification

// Endpoint to initiate payment request to CrossPay
app.post('/initiatePayment', async (req, res) => {
  try {
    const params = req.body;

    // Validate required parameters
    const requiredParams = ['apiKey', 'invoiceid', 'amount', 'currency', 'clientdetails'];
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
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });

    // Handle response
    if (response.status === 200) {
      const result = response.data;
      if (result.invoice_id_crosspay) {
        console.log(`CrossPay Invoice ID: ${result.invoice_id_crosspay}`);
      }

      // Security: Verify response integrity
      if (verifyResponseIntegrity(result)) {
        console.log('Response verified successfully');

        // Check the payment status
        if (result.paid === 1) {
          // Payment successful, update user balance
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
        throw new Error('Response verification failed');
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
  const { clientdetails, invoiceid, amount, currency, apiKey } = params;

  return {
    api_data: CROSSPAY_API_DATA,
    invoice_id: invoiceid,
    apiKey: apiKey,
    total: amount,
    currency: currency,
    email: clientdetails.email,
    mobile: validateAndCleanPhoneNumber(clientdetails.phonenumber),
    name: `${clientdetails.firstname} ${clientdetails.lastname}`,
    description: `Transaction ID: ${invoiceid}`
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

// Function to verify the integrity of the response (using HMAC for verification)
function verifyResponseIntegrity(response) {
  if (!response.signature || !response.invoice_id_crosspay) {
    return false;
  }

  const dataString = `${response.invoice_id_crosspay}${response.paid}${response.amount}`;
  const expectedSignature = crypto
    .createHmac('sha256', CROSSPAY_SECRET_KEY)
    .update(dataString)
    .digest('hex');

  return response.signature === expectedSignature;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
