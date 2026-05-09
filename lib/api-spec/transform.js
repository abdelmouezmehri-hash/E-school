const fs = require('fs');
const yaml = require('js-yaml');

const yamlContent = fs.readFileSync('openapi.yaml', 'utf8');
const spec = yaml.load(yamlContent);

// Add requested details into the spec info
spec.info.description = spec.info.description || '';
spec.info.description += `

### Additional Project Information
**1. Backend API Base URL and Port:**
- Base URL: http://localhost:8080
- Port: 8080

**2. Frontend URL and Port:**
- Frontend URL: http://localhost:5173
- Port: 5173

**3. Authentication Method:**
- Session-based authentication using cookies (cookie-parser).
- Obtain a session token cookie by calling POST /api/auth/login.

**4. Environment Variables (from .env.development):**
- DATABASE_URL=file:./dev.db
- DATABASE_PROVIDER=sqlite
- PORT=8080
- NODE_ENV=development
- SESSION_SECRET=local-dev-secret-change-in-production
- CORS_ORIGIN=http://localhost:5173
- AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
- AI_INTEGRATIONS_ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE

**5. Database Models:**
The database uses Drizzle ORM. Models include:
- \`usersTable\` (id, email, passwordHash, name, role, status)
- \`studentsTable\` (id, name, levelId, branchId, behavioralFlags, status)
- \`levelsTable\` (id, name, description)
- \`paymentsTable\` (id, studentId, levelId, branchId, amountDue, amountPaid, discount, status, dueDate)
- \`evaluationsTable\` (id, studentId, progressScore, speakingScore, confidenceScore, participationScore)
- \`branchesTable\` (id, name, address, managerName)
...and several others including evaluations, payments, news, media, ideas, events, consultations, etc.
`;

fs.writeFileSync('../../artifacts/openapi_spec.json', JSON.stringify(spec, null, 2));
console.log('Successfully wrote openapi_spec.json to artifacts');
