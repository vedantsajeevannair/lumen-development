const https = require('https');
https.request('https://lumen-smartcity-storage.s3.ap-south-1.amazonaws.com/complaints/images/2026/08/17/44dae874-ec1d-4771-9977-76da60640e5c.jpeg', { method: 'HEAD' }, (res) => {
  console.log('Status:', res.statusCode);
  process.exit(0);
}).end();
