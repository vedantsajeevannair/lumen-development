const axios = require('axios');

async function run() {
  try {
    const res = await axios.post(
      'http://localhost:3000/complaints',
      {
        title: 'Test Complaint via Script',
        description: 'Testing AI fallback',
        category: 'road',
        priority: 'HIGH',
        latitude: 12.9716,
        longitude: 77.5946,
        imageUrl:
          'https://raw.githubusercontent.com/ultralytics/ultralytics/main/ultralytics/assets/bus.jpg',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('Success:', res.data);
  } catch (e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}
run();
