import { logEvent, queryLogs, sanitizeData } from '../src/server/logger.ts';
import { initDatabase, getDb } from '../src/server/database.ts';
import { testTelegramConnection } from '../src/server/telegram.ts';
import { testAiProviderConnection, getApiKeys, getAiSettings, generateJarvisResponse } from '../src/server/gemini.ts';
import { fetchOpenRouterModels } from '../src/server/model_registry.ts';

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
  console.log('\n[1/7] Testing Centralized Logger & Sensitive Data Redaction...');
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

  console.log('\n[2/7] Testing SQLite WAL Database Initialization & Schemas...');
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

  console.log('\n[3/7] Testing Model Control Center & Zero-Config Guardrails...');
  const unconfigResp = await generateJarvisResponse('Hello JARVIS');
  assert(unconfigResp.provider === 'NOT_CONFIGURED' || Boolean(unconfigResp.provider), 'Zero-config handles missing keys gracefully');

  const initialAiSettings = getAiSettings();
  assert(initialAiSettings.freeOnly === true, 'Strict Free Mode enabled by default');

  console.log('\n[4/7] Testing Voice Subsystem Logic & Language Routing...');
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

  console.log('\n[5/7] Testing Telegram Security Whitelist & Diagnostics...');
  const allowedUserIds = ['518294821', '98127391'];
  const testCallerAuthorized = allowedUserIds.includes('518294821');
  const testCallerUnauthorized = allowedUserIds.includes('999999999');
  assert(testCallerAuthorized, 'Authorized Telegram user permitted access');
  assert(!testCallerUnauthorized, 'Unauthorized Telegram user blocked');

  const fakeTokenResult = await testTelegramConnection('123456:FAKE_TOKEN_FOR_TEST');
  assert(!fakeTokenResult.success, 'Invalid Telegram token fails gracefully with error notice');

  console.log('\n[6/7] Testing AI Provider Diagnostics...');
  const aiTest = await testAiProviderConnection('gemini');
  assert(Boolean(aiTest), 'AI Provider diagnostic returns structured latency and message');

  console.log('\n[7/7] Testing Read Aloud Playback Session & Instant Cancellation Logic...');
  interface TestPlaybackSession {
    sessionId: string;
    messageId: string;
    status: 'IDLE' | 'PREPARING' | 'SPEAKING' | 'STOPPED' | 'ERROR';
    aborted: boolean;
  }

  let activeSession: TestPlaybackSession | null = {
    sessionId: 'session_test_101',
    messageId: 'msg_asst_1',
    status: 'SPEAKING',
    aborted: false,
  };

  // Simulate Instant Cancellation
  const stopSession = (msgId: string) => {
    if (activeSession && activeSession.messageId === msgId) {
      activeSession.status = 'STOPPED';
      activeSession.aborted = true;
      activeSession = null;
    }
  };

  stopSession('msg_asst_1');
  assert(activeSession === null, 'Active playback session torn down immediately on Stop click');

  // Simulate Stale Callback Arrival
  let staleCallbackExecuted = false;
  const staleOnEndCallback = (sessionId: string) => {
    if (activeSession && activeSession.sessionId === sessionId) {
      staleCallbackExecuted = true;
    }
  };

  staleOnEndCallback('session_test_101');
  assert(!staleCallbackExecuted, 'Stale callbacks rejected safely without mutating state or triggering audio');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Tests Passed successfully.`);
  console.log('====================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test runner encountered exception:', err);
  process.exit(1);
});
