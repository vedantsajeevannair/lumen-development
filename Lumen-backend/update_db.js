const Database = require('better-sqlite3');
const db = new Database('D:/Lumen-Web/LUMEN-website/backend/database/lumen.db');

db.prepare(`
  INSERT INTO AiPrediction (
    id, complaintId, damageClass, confidenceScore, boundingBoxes, metadata, createdAt
  ) VALUES (
    'manual-id-10500', 'd32bd653-ab38-4133-a64e-de493d364a76', 'UNKNOWN', 0.0, '[]', null, CURRENT_TIMESTAMP
  ) ON CONFLICT(id) DO NOTHING;
`).run();
db.prepare("UPDATE Complaint SET confidence = 0.0 WHERE trackingId = 'CMP-10500'").run();
console.log('Inserted AI Prediction for 10500');
