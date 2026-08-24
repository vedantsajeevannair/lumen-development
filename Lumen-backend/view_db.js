const Database = require('better-sqlite3');
const db = new Database('D:/Lumen-Web/LUMEN-website/backend/database/lumen.db');
const row = db.prepare("SELECT imageUrl FROM Complaint WHERE trackingId = 'CMP-10500'").get();
console.log(JSON.stringify(row, null, 2));
