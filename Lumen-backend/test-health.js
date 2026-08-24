const http = require('http');

http.get('http://localhost:4000/api/health', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log("Health response:", data));
}).on('error', (err) => console.error("Error:", err));
