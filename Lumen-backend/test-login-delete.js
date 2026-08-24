const axios = require('axios');

async function runTest() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      email: 'samarthastha.brt@gmail.com', // use known email
      password: 'password123' // assuming default password
    }).catch(() => null);

    let token = '';
    if (loginRes && loginRes.data) {
        token = loginRes.data.access_token;
    } else {
        // Just try to fetch without login to see if GET /complaints works
        const comps = await axios.get('http://localhost:3000/complaints').catch(e => {
             console.log("Failed to fetch complaints:", e.message);
             return null;
        });
        if (comps && comps.data && comps.data.length > 0) {
            console.log("First complaint ID:", comps.data[0].id);
        }
        return;
    }

    // 2. Fetch all complaints
    const comps = await axios.get('http://localhost:3000/complaints', {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!comps.data || comps.data.length === 0) {
        console.log("No complaints found.");
        return;
    }
    
    const target = comps.data[0];
    console.log(`Trying to delete complaint ${target.id}`);
    
    // 3. Try to delete
    const delRes = await axios.delete(`http://localhost:3000/complaints/${target.id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Delete response:", delRes.status, delRes.data);
    
  } catch (err) {
    console.log("Error:", err.response ? err.response.status : err.message);
    if (err.response) console.log(err.response.data);
  }
}

runTest();
