# SMEPay API Documentation

## Overview
SMEPay provides a comprehensive payment solution with both Widget Integration and Direct QR Code APIs. This documentation covers both implementation methods.

---

## 🎯 Widget Integration (Recommended)

### Step 1: Include the SMEPay Checkout Script

Place the following script **before the closing `</body>` tag** of your HTML or frontend app:

```html
<script src="https://typof.co/smepay/checkout.js"></script>
```

### Step 2: Create Order & Launch Payment Widget

Before launching the payment widget, your backend should call the `create-order` API to generate an `order_slug`.

#### JavaScript Implementation

```javascript
const handleOpenSMEPay = () => {
  if (window.smepayCheckout) {
    window.smepayCheckout({
      slug: "YOUR_DYNAMIC_SLUG_HERE", // Replace with slug from create-order API
      onSuccess: (data) => {
        console.log("✅ Payment successful:", data);
        // Handle success - redirect to callback URL
        const callbackUrl = data.callback_url;
        const orderId = data.order_id;
        if (callbackUrl && orderId) {
          const redirectUrl = `${callbackUrl}?order_id=${encodeURIComponent(orderId)}`;
          window.location.href = redirectUrl;
        }
      },
      onFailure: () => {
        console.log("❌ Payment failed or closed.");
        // Handle failure
      },
    });
  } else {
    alert("SMEPay widget is not loaded.");
  }
};
```

#### Complete Example with Backend Integration

```javascript
function upiProcess(order_id) {
  $.get("/pay-qr/" + order_id, function(response) {
    // This request creates order and gets slug in response
    const handleOpenSMEPay = () => {
      if (window.smepayCheckout) {
        window.smepayCheckout({
          slug: response.order_slug,
          onSuccess: (data) => {
            const callbackUrl = data.callback_url;
            const orderId = data.order_id;
            if (callbackUrl && orderId) {
              const redirectUrl = `${callbackUrl}?order_id=${encodeURIComponent(orderId)}`;
              window.location.href = redirectUrl;
            }
          },
          onFailure: () => {
            console.log("❌ Payment failed or closed.");
          },
        });
      } else {
        alert("SMEPay widget is not loaded.");
      }
    };
    handleOpenSMEPay();
  }).fail(function(response) {
    console.log(response.responseText);
  });
}
```

### Step 3: Validate Payment

Once the user pays successfully:
- Widget closes automatically
- Redirects to the `callback_url` (defined in create-order)
- Sends POST request to callback URL with `order_id`
- Validate payment using the `validate-order` API

---

## 🔐 API Authentication

### POST /api/external/auth

**Endpoint:** `https://apps.typof.in/api/external/auth`

**Request Body:**
```json
{
  "client_id": "DOWNLOAD THE CLIENT_ID FROM DASHBOARD",
  "client_secret": "DOWNLOAD THE CLIENT_SECRET FROM DASHBOARD"
}
```

**cURL Example:**
```bash
curl --location 'https://apps.typof.in/api/external/auth' \
--data '{
  "client_id": "OTA0MDY2MDQ2M3xXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA0LTEw",
  "client_secret": "01JRCMFNQTKBXF9ZWYPD33JB4N"
}'
```

**Response (200 OK):**
```json
{
  "access_token": "mxqxFcblb5fqDAFS7nApKhpAJwUL1cMf4zENXKyXeaLDVB2Nu48fduZLqF0Y@$#OTA0MDY2MDQ2M3xXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA0LTEwshK9Dl8lEy"
}
```

---

## 📦 Order Management APIs

### POST /api/external/create-order

**Endpoint:** `https://apps.typof.in/api/external/create-order`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "client_id": "DOWNLOAD THE CLIENT_ID FROM DASHBOARD",
  "amount": "10",
  "order_id": "1sdhds8",
  "callback_url": "https://google.com",
  "customer_details": {
    "email": "donation@gmail.com",
    "mobile": "9040660463",
    "name": "Testing"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://apps.typof.in/api/external/create-order' \
--header 'Authorization: Bearer <token>' \
--data '{
  "client_id": "OTA0MDY2MDQ2M3xXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA0LTEw",
  "amount": "10"
}'
```

**Response (200 OK):**
```json
{
  "status": true,
  "order_slug": "cL1mom1am6qG",
  "message": "QR code created successfully"
}
```

### POST /api/external/validate-order

**Endpoint:** `https://apps.typof.in/api/external/validate-order`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "client_id": "DOWNLOAD THE CLIENT_ID FROM DASHBOARD",
  "amount": "4398.9",
  "slug": "sjZNcZLIGagSSSU"
}
```

**cURL Example:**
```bash
curl --location 'https://apps.typof.in/api/external/validate-order' \
--header 'Authorization: Bearer <token>' \
--data '{
  "client_id": "OTA0MDY2MDQ2M3xXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA0LTEw",
  "amount": "4398.9",
  "slug": "sjZNcZLIGagU"
}'
```

**Response (200 OK):**
```json
{
  "status": true,
  "payment_status": "paid"
}
```

---

## 📱 Direct QR Code APIs

### POST /api/external/generate-qr

**Endpoint:** `https://apps.typof.com/api/external/generate-qr`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Query Parameters:**
- `slug`: The order slug (e.g., "30wxyXWIHsAU")

**Request Body:**
```json
{
  "slug": "30wxyXWIHsAU",
  "client_id": "NjM4MDg3MDgzOXxXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA1LTAy"
}
```

**cURL Example:**
```bash
curl --location 'https://apps.typof.com/api/external/generate-qr' \
--header 'Authorization: Bearer <token>' \
--data '{
  "slug": "30wxyXWIHsAU",
  "client_id": "NjM4MDg3MDgzOXxXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA1LTAy"
}'
```

**Response (200 OK):**
```json
{
  "status": true,
  "qrcode": "RK5CYII=",
  "link": {
    "bhim": "upi://pay?pa=TYPOFTESTUAT%40ybl&pn=P2Mstore3&am=1000&mam=1000&tr=30wxyXWIHsAU1748523250&tn=PaymentforMD30wxyXWIHsAU1748523250&mc=5192&mode=04&purpose=00",
    "phonepe": "phonepe://pay?pa=TYPOFTESTUAT%40ybl&pn=P2Mstore3&am=1000&mam=1000&tr=30wxyXWIHsAU1748523250&tn=PaymentforMD30wxyXWIHsAU1748523250&mc=5192&mode=04&purpose=00",
    "paytm": "paytmmp://pay?pa=TYPOFTESTUAT%40ybl&pn=P2Mstore3&am=1000&mam=1000&tr=30wxyXWIHsAU1748523250&tn=PaymentforMD30wxyXWIHsAU1748523250&mc=5192&mode=04&purpose=00",
    "gpay": "tez://upi/pay?pa=TYPOFTESTUAT%40ybl&pn=P2Mstore3&am=1000&mam=1000&tr=30wxyXWIHsAU1748523250&tn=PaymentforMD30wxyXWIHsAU1748523250&mc=5192&mode=04&purpose=00"
  },
  "ref_id": "30wxyXWIHsAU1748523250",
  "data": {
    "company_name": "GREENY TRADERS PRO",
    "amount": 10,
    "type": "E",
    "payment_status": "unpaid"
  }
}
```

### POST /api/external/check-qr-status

**Endpoint:** `https://apps.typof.com/api/external/check-qr-status`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "client_id": "NjM4MDg3MDgzOXxXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA1LTAy",
  "slug": "30wxyXWIHsAU",
  "ref_id": "30wxyXWIHsAU1748523250"
}
```

**cURL Example:**
```bash
curl --location 'https://apps.typof.com/api/external/check-qr-status' \
--header 'Authorization: Bearer <token>' \
--data '{
  "client_id": "NjM4MDg3MDgzOXxXRVdJTExGSUdVUkVJVE9VVHwyMDI1LTA1LTAy",
  "slug": "30wxyXWIHsAU",
  "ref_id": "30wxyXWIHsAU1748523250"
}'
```

**Response (200 OK):**
```json
{
  "status": true,
  "payment_status": "unpaid",
  "order_id": "1sdhdsaes89",
  "callback_url": "https://google.com"
}
```

---

## 🔄 Integration Flow

### Widget Integration Flow
1. **Authentication**: Get access token using client credentials
2. **Create Order**: Generate order slug using create-order API
3. **Launch Widget**: Use JavaScript widget with the order slug
4. **Handle Payment**: Widget handles UPI payment process
5. **Validate**: Validate payment status using validate-order API

### Direct QR Integration Flow
1. **Authentication**: Get access token using client credentials
2. **Create Order**: Generate order slug using create-order API
3. **Generate QR**: Create QR code using generate-qr API
4. **Display QR**: Show QR code and UPI links to user
5. **Check Status**: Poll check-qr-status API for payment confirmation
6. **Validate**: Final validation using validate-order API

---

## 📝 Important Notes

- **Client ID & Secret**: Download from your SMEPay dashboard
- **Bearer Token**: Required for all API calls except authentication
- **Order Slug**: Generated from create-order API, used across all subsequent calls
- **Callback URL**: Used for post-payment redirects and webhooks
- **Payment Status**: Always validate using the validate-order API for security

## 🚀 Getting Started

1. Register on SMEPay platform
2. Download client_id and client_secret from dashboard
3. Choose integration method (Widget recommended for ease of use)
4. Implement authentication flow
5. Test with small amounts before going live