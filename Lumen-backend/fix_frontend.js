const fs = require('fs');
const file = 'D:/Lumen-Web/LUMEN-website/frontend/src/pages/ComplaintDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('<img src={c.imageUrl} alt="Reported"', 
  '<img src={c.imageUrl?.startsWith("http") ? c.imageUrl : `http://localhost:4000${c.imageUrl?.startsWith("/") ? "" : "/"}${c.imageUrl}`} alt="Reported"');

fs.writeFileSync(file, content);
console.log('Fixed ComplaintDetail.tsx');
