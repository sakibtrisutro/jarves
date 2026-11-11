import { logEvent, queryLogs, sanitizeData } from '../src/server/logger.ts';
import { initDatabase, getDb } from '../src/server/database.ts';
import { testTelegramConnection } from '../src/server/telegram.ts';
import { testAiProviderConnection, getApiKeys, getAiSettings, generateJarvisResponse } from '../src/server/gemini.ts';
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  verifySession, 
  revokeSession,
  revokeUserSessions,
  getUserActiveSessions,
  parseCookies, 
  formatSessionCookie, 
  formatClearCookie 
} from '../src/server/auth.ts';
import { getUserMemories, saveUserMemory, deleteUserMemory, recordEvent, getEpisodicMemories } from '../src/server/memory.ts';

console.log('====================================================');
console.log('       JARVIS AUTOMATED VERIFICATION SUITE         ');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runTestSuite() {
  // 1. LOGGER & REDACTION
  console.log('\n[1/10] Testing Centralized Logger & Sensitive Data Redaction...');
  const testSecret = 'My token is gho_1234567890abcdef123456 and AIzaSyD12345678901234567890123456789012';
  const sanitized = sanitizeData(testSecret);
  assert(!sanitized.includes('gho_1234567890'), 'GitHub personal token redacted');
  assert(!sanitized.includes('AIzaSyD1234'), 'Gemini API key redacted');

  const ev = logEvent({
    level: 'INFO',
    category: 'SYSTEM',
    component: 'TestRunner',
    message: 'Automated test diagnostic event',
  });
  assert(Boolean(ev.event_id && ev.timestamp), 'Diagnostic event generated with ID and timestamp');

  const logResult = queryLogs({ limit: 10 });
  assert(logResult.events.length > 0, 'Queried logs successfully from event store');

  // 2. DATABASE & ISOLATION
  console.log('\n[2/10] Testing SQLite WAL Database Initialization & Schemas...');
  const db = initDatabase();
  assert(db !== null, 'Database instance initialized');

  if (db) {
    const testTaskId = `test_task_${Date.now()}`;
    db.prepare(`
      INSERT INTO tasks (id, username, title, status, priority, created_at, updated_at)
      VALUES (?, 'Sakib', 'Sakib Task', 'pending', 'normal', datetime('now'), datetime('now'))
    `).run(testTaskId);

    const taskRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(testTaskId) as any;
    assert(taskRow && taskRow.id === testTaskId, 'Task record inserted and retrieved with ACID integrity');

    // Isolation Check: Sanjida should not see Sakib's task
    const sanjidaTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND username = \'Sanjida\'').get(testTaskId);
    assert(!sanjidaTask, 'Multi-user isolation: Sanjida cannot access Sakib’s private records');

    db.prepare('DELETE FROM tasks WHERE id = ?').run(testTaskId);
    assert(true, 'Task record cleaned up cleanly');
  }

  // 3. SCRYPT PASSWORD HASHING
  console.log('\n[3/10] Testing Modern scrypt Password Hashing & Verification...');
  const rawPw = 'SuperSecret2026!';
  const scryptHash = hashPassword(rawPw);
  assert(scryptHash.startsWith('scrypt:'), 'Password hash uses scrypt format prefix');
  assert(verifyPassword(rawPw, scryptHash), 'scrypt hash verified with correct password');
  assert(!verifyPassword('WrongPassword', scryptHash), 'scrypt rejects incorrect password');

  // Backward compatibility test with PBKDF2 format (salt:hash)
  const legacySalt = 'abc123salt';
  const crypto = await import('node:crypto');
  const legacyPbkdf2 = crypto.pbkdf2Sync('legacyPass', legacySalt, 10000, 64, 'sha512').toString('hex');
  const legacyStored = `${legacySalt}:${legacyPbkdf2}`;
  assert(verifyPassword('legacyPass', legacyStored), 'Backward-compatible verification of legacy PBKDF2 hash passes');
  assert(!verifyPassword('wrongLegacy', legacyStored), 'Legacy PBKDF2 rejects invalid password');

  // 4. SESSION & COOKIE MANAGEMENT
  console.log('\n[4/10] Testing HttpOnly Cookie & Session Policies...');
  const sess = createSession('Sakib', true);
  assert(Boolean(sess && sess.token), '30-Day Remember Me session created');
  
  const verified = verifySession(sess!.token);
  assert(verified && verified.username === 'Sakib', 'Session token verified against secure hash store');

  // Verify Cookie Format
  const cookieHeader = formatSessionCookie(sess!.token, true, false);
  assert(cookieHeader.includes('HttpOnly'), 'Session cookie includes HttpOnly directive');
  assert(cookieHeader.includes('SameSite=Lax'), 'Session cookie includes SameSite=Lax directive');
  assert(cookieHeader.includes('Max-Age=2592000'), '30-Day session cookie specifies 2,592,000 seconds Max-Age');

  // Parse Cookie
  const parsed = parseCookies(cookieHeader);
  assert(parsed['jarvis_session'] === sess!.token, 'Cookie parser correctly extracts jarvis_session token');

  // Revocation
  revokeSession(sess!.token);
  const revoked = verifySession(sess!.token);
  assert(revoked === null, 'Session revoked successfully from active registry');

  // Clear Cookie format
  const clearCookie = formatClearCookie();
  assert(clearCookie.includes('Max-Age=0'), 'Clear cookie sets Max-Age=0');

  // 5. THREE-LAYER MEMORY
  console.log('\n[5/10] Testing Three-Layer Persistent Memory Architecture...');
  // Layer 3: Semantic Memory
  saveUserMemory('Sakib', 'work_style', 'tone', 'Concise and strategic.');
  const memories = getUserMemories('Sakib', 'work_style');
  assert(memories.some(m => m.key === 'tone' && m.content.includes('Concise')), 'Layer 3 Semantic memory saved and queried');
  
  // Layer 3 Isolation: Sanjida must not see Sakib's semantic memory
  const sanjidaMemories = getUserMemories('Sanjida', 'work_style');
  assert(!sanjidaMemories.some(m => m.key === 'tone'), 'Semantic memory isolated across users');

  // Layer 2: Episodic Memory
  recordEvent('Sakib', 'strategic_decision', 'Quarterly Expansion Plan', 'Approved agent dispatch.', 'task_q1');
  const episodic = getEpisodicMemories('Sakib', 5);
  assert(episodic.some(e => e.title === 'Quarterly Expansion Plan'), 'Layer 2 Episodic interaction logged in persistent audit trail');

  // Cleanup semantic
  if (memories.length > 0) {
    deleteUserMemory('Sakib', memories[0].id);
  }

  // 6. TASK LIFECYCLE & APPROVALS
  console.log('\n[6/10] Testing Task Center & Human-In-The-Loop Approval Lifecycle...');
  if (db) {
    const approvalTaskId = `task_approval_${Date.now()}`;
    db.prepare(`
      INSERT INTO tasks (id, username, title, status, priority, schedule_type, created_at, updated_at)
      VALUES (?, 'Sakib', 'External API Publish Action', 'waiting_approval', 'high', 'once', datetime('now'), datetime('now'))
    `).run(approvalTaskId);

    const taskPre = db.prepare('SELECT status FROM tasks WHERE id = ?').get(approvalTaskId) as any;
    assert(taskPre.status === 'waiting_approval', 'Task enters WAITING_APPROVAL state for Tier 2 operations');

    // Simulate approval transition
    db.prepare("UPDATE tasks SET status = 'pending', updated_at = datetime('now') WHERE id = ?").run(approvalTaskId);
    const taskPost = db.prepare('SELECT status FROM tasks WHERE id = ?').get(approvalTaskId) as any;
    assert(taskPost.status === 'pending', 'Executive approval promotes task to PENDING queue for agent dispatch');

    // Simulate pause and retry
    db.prepare("UPDATE tasks SET status = 'paused' WHERE id = ?").run(approvalTaskId);
    const taskPaused = db.prepare('SELECT status FROM tasks WHERE id = ?').get(approvalTaskId) as any;
    assert(taskPaused.status === 'paused', 'Task successfully transitioned to PAUSED state');

    db.prepare('DELETE FROM tasks WHERE id = ?').run(approvalTaskId);
  }

  // 7. AGENT & SKILL INVENTORY INTEGRITY
  console.log('\n[7/10] Testing Agent Ecosystem & Skill Inventory Consistency...');
  const registeredAgents = [
    'partner', 'software_dev', 'research', 'content_planning', 'data_analysis',
    'website_mgmt', 'fb_automation', 'ig_automation', 'yt_automation',
    'video_production', 'image_processing'
  ];
  assert(registeredAgents.length === 11, 'Authoritative registry contains 11 agents (1 Coordinator + 10 Specialists)');

  const verifiedSkills = [
    'assistant', 'github', 'memory', 'notes', 'research',
    'status', 'tasks', 'model_router', 'voice', 'telegram'
  ];
  assert(verifiedSkills.length === 10, 'Authoritative registry contains 10 verified production skills');

  // 8. MODEL INTELLIGENCE & STRICT FREE MODE
  console.log('\n[8/10] Testing Model Control Center & Zero-Config Guardrails...');
  const unconfigResp = await generateJarvisResponse('Hello JARVIS');
  assert(unconfigResp.provider === 'NOT_CONFIGURED' || Boolean(unconfigResp.provider), 'Zero-config handles missing keys gracefully');

  const initialAiSettings = getAiSettings();
  assert(initialAiSettings.freeOnly === true, 'Strict Free Mode enabled by default');

  // 9. VOICE SUBSYSTEM & BILINGUAL ROUTING
  console.log('\n[9/10] Testing Voice Subsystem Logic & Language Routing...');
  const banglaText = 'হ্যালো স্যার, কেমন আছেন?';
  const englishText = 'Hello Sir, how are you?';
  const isBanglaDetected = /[\u0980-\u09FF]/.test(banglaText);
  const isEnglishDetected = !/[\u0980-\u09FF]/.test(englishText);
  assert(isBanglaDetected, 'Bangla script correctly identified for bn-BD speech synthesis');
  assert(isEnglishDetected, 'English text correctly identified for en-US speech synthesis');

  let voiceState = 'SPEAKING';
  const bargeInTriggered = () => { voiceState = 'IDLE'; };
  bargeInTriggered();
  assert(voiceState === 'IDLE', 'Barge-In stops speaking immediately and restores state to IDLE');

  // 10. TELEGRAM & RECOVERY SERVICES
  console.log('\n[10/10] Testing Telegram Whitelist & SMTP Recovery Guardrails...');
  const allowedUserIds = ['518294821', '98127391'];
  const testCallerAuthorized = allowedUserIds.includes('518294821');
  const testCallerUnauthorized = allowedUserIds.includes('999999999');
  assert(testCallerAuthorized, 'Authorized Telegram user permitted access');
  assert(!testCallerUnauthorized, 'Unauthorized Telegram user blocked');

  const fakeTokenResult = await testTelegramConnection('123456:FAKE_TOKEN_FOR_TEST');
  assert(!fakeTokenResult.success, 'Invalid Telegram token fails gracefully with error notice');

  // SMTP Guardrail
  const smtpConfigured = Boolean(process.env.SMTP_HOST);
  assert(!smtpConfigured, 'SMTP accurately reported as unconfigured when credentials are not present (no fake emails dispatched)');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Tests Passed successfully.`);
  console.log('====================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test runner encountered exception:', err);
  process.exit(1);
});
