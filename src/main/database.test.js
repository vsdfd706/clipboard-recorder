const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const dbModule = require('./database');

const testDir = path.join(os.tmpdir(), 'clipboard-recorder-test-' + Date.now());
const { db, imagesDir, filesDir } = dbModule.initDatabase(testDir);

let hasFailed = false;
const originalAssert = console.assert;
console.assert = (condition, message) => {
  if (!condition) {
    hasFailed = true;
    originalAssert.call(console, condition, message);
  }
};

// Test: add text record
const id1 = crypto.randomUUID();
dbModule.addRecord(db, { id: id1, type: 'text', content: 'Hello world', sourceApp: 'test' });
const rec = dbModule.getRecordById(db, id1);
console.assert(rec.content === 'Hello world', 'addRecord text failed');
console.assert(rec.type === 'text', 'type mismatch');

// Test: getRecords with search
const results = dbModule.getRecords(db, { search: 'Hello' });
console.assert(results.length === 1, 'search failed');

// Test: update
dbModule.updateRecord(db, id1, { content: 'Updated text' });
const updated = dbModule.getRecordById(db, id1);
console.assert(updated.content === 'Updated text', 'update failed');

// Test: soft delete to trash to restore
dbModule.moveToTrash(db, id1);
const trashed = dbModule.getTrashRecords(db);
console.assert(trashed.length === 1, 'moveToTrash failed');

dbModule.restoreFromTrash(db, trashed[0].id);
const restored = dbModule.getRecordById(db, id1);
console.assert(restored && restored.is_deleted === 0, 'restore failed');

// Test: permanent delete
dbModule.moveToTrash(db, id1);
const trashed2 = dbModule.getTrashRecords(db);
dbModule.permanentDelete(db, trashed2[0].id);
console.assert(dbModule.getTrashRecords(db).length === 0, 'permanentDelete failed');

// Test: stats
const stats = dbModule.getStats(db);
console.assert(stats.trash === 0, 'stats trash failed');

// Cleanup
db.close();
fs.rmSync(testDir, { recursive: true, force: true });

if (hasFailed) {
  console.error('Some database tests failed!');
  process.exit(1);
} else {
  console.log('All database tests passed!');
  process.exit(0);
}
