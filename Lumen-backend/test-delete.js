const axios = require('axios');

async function testDelete() {
  try {
    const res = await axios.delete('http://localhost:3000/api/v1/complaints/8c8efc94-995d-47d3-80fe-1ece81e72718');
    console.log("Success:", res.status, res.data);
  } catch (err) {
    console.log("Failed:", err.response ? err.response.status : err.message);
    if (err.response) {
      console.log("Data:", err.response.data);
    }
  }
}

testDelete();
