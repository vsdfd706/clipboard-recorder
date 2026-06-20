const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDatabase(dataDir) {
  ensureDir(dataDir);

  const imagesDir = path.join(dataDir, 'images');
  const filesDir = path.join(dataDir, 'files');
  ensureDir(imagesDir);
  ensureDir(filesDir);

  const dbPath = path.join(dataDir, 'data.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL CHECK(type IN ('text','image','file')),
      content     TEXT,
      file_path   TEXT,
      file_name   TEXT,
      source_app  TEXT,
      note        TEXT DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      is_deleted  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trash (
      id          TEXT PRIMARY KEY,
      record_id   TEXT NOT NULL,
      type        TEXT NOT NULL,
      content     TEXT,
      file_path   TEXT,
      file_name   TEXT,
      source_app  TEXT,
      note        TEXT DEFAULT '',
      original_created_at TEXT NOT NULL,
      deleted_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
    CREATE INDEX IF NOT EXISTS idx_records_deleted ON records(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_trash_deleted ON trash(deleted_at DESC);
  `);

  return { db, dataDir, imagesDir, filesDir };
}

function addRecord(db, { id, type, content, filePath, fileName, sourceApp }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO records (id, type, content, file_path, file_name, source_app, created_at, updated_at)
    VALUES (@id, @type, @content, @filePath, @fileName, @sourceApp, @now, @now)
  `);
  stmt.run({ id, type, content: content || null, filePath: filePath || null,
             fileName: fileName || null, sourceApp: sourceApp || null, now });
  return { id };
}

function getRecords(db, { search, type, timeRange, limit, offset } = {}) {
  let sql = 'SELECT * FROM records WHERE is_deleted = 0';
  const params = {};

  if (type && type !== 'all') {
    sql += ' AND type = @type';
    params.type = type;
  }
  if (search) {
    sql += ' AND (content LIKE @search OR file_name LIKE @search OR note LIKE @search)';
    params.search = `%${search}%`;
  }
  if (timeRange) {
    const ranges = {
      today: "datetime('now', 'start of day')",
      week: "datetime('now', '-7 days')",
      month: "datetime('now', '-30 days')",
    };
    if (ranges[timeRange]) {
      sql += ` AND created_at >= ${ranges[timeRange]}`;
    }
  }

  sql += ' ORDER BY created_at DESC';

  if (limit != null) {
    sql += ' LIMIT @limit';
    params.limit = limit;
  }
  if (offset != null) {
    sql += ' OFFSET @offset';
    params.offset = offset;
  }

  return db.prepare(sql).all(params);
}

function getRecordById(db, id) {
  return db.prepare('SELECT * FROM records WHERE id = ?').get(id);
}

function getRecordCount(db) {
  return db.prepare('SELECT COUNT(*) as count FROM records WHERE is_deleted = 0').get().count;
}

function updateRecord(db, id, { content, note }) {
  const now = new Date().toISOString();
  const fields = [];
  const params = { id, now };

  if (content !== undefined) {
    fields.push('content = @content');
    params.content = content;
  }
  if (note !== undefined) {
    fields.push('note = @note');
    params.note = note;
  }

  if (fields.length === 0) return;

  fields.push('updated_at = @now');
  db.prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = @id`).run(params);
}

function softDelete(db, id) {
  db.prepare('UPDATE records SET is_deleted = 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id);
}

function moveToTrash(db, id) {
  const record = getRecordById(db, id);
  if (!record) throw new Error(`未找到记录: ${id}`);

  const trashId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO trash (id, record_id, type, content, file_path, file_name, source_app, note, original_created_at, deleted_at)
    VALUES (@trashId, @recordId, @type, @content, @filePath, @fileName, @sourceApp, @note, @originalCreatedAt, @deletedAt)
  `).run({
    trashId, recordId: record.id, type: record.type,
    content: record.content, filePath: record.file_path,
    fileName: record.file_name, sourceApp: record.source_app,
    note: record.note, originalCreatedAt: record.created_at, deletedAt: now,
  });

  softDelete(db, id);
}

function getTrashRecords(db) {
  return db.prepare('SELECT * FROM trash ORDER BY deleted_at DESC').all();
}

function restoreFromTrash(db, trashId) {
  const trashRecord = db.prepare('SELECT * FROM trash WHERE id = ?').get(trashId);
  if (!trashRecord) throw new Error(`回收站中未找到记录: ${trashId}`);

  const now = new Date().toISOString();

  // 恢复原记录，替换软删除的条目
  db.prepare(`
    INSERT OR REPLACE INTO records (id, type, content, file_path, file_name, source_app, note, created_at, updated_at, is_deleted)
    VALUES (@id, @type, @content, @filePath, @fileName, @sourceApp, @note, @originalCreatedAt, @now, 0)
  `).run({
    id: trashRecord.record_id, type: trashRecord.type,
    content: trashRecord.content, filePath: trashRecord.file_path,
    fileName: trashRecord.file_name, sourceApp: trashRecord.source_app,
    note: trashRecord.note, originalCreatedAt: trashRecord.original_created_at, now,
  });

  db.prepare('DELETE FROM trash WHERE id = ?').run(trashId);
}

function permanentDelete(db, trashId) {
  const trashRecord = db.prepare('SELECT * FROM trash WHERE id = ?').get(trashId);
  if (!trashRecord) throw new Error(`回收站中未找到记录: ${trashId}`);

  const deletedFiles = [];
  if (trashRecord.file_path && fs.existsSync(trashRecord.file_path)) {
    fs.unlinkSync(trashRecord.file_path);
    deletedFiles.push(trashRecord.file_path);
  }

  db.prepare('DELETE FROM trash WHERE id = ?').run(trashId);
  return { deletedFiles };
}

function emptyTrash(db) {
  const allTrash = getTrashRecords(db);
  const deletedFiles = [];

  for (const item of allTrash) {
    if (item.file_path && fs.existsSync(item.file_path)) {
      fs.unlinkSync(item.file_path);
      deletedFiles.push(item.file_path);
    }
  }

  db.prepare('DELETE FROM trash').run();
  return { deletedFiles };
}

function getStats(db) {
  const records = db.prepare('SELECT COUNT(*) as count FROM records WHERE is_deleted = 0').get().count;
  const trash = db.prepare('SELECT COUNT(*) as count FROM trash').get().count;
  return { records, trash };
}

function deleteOldestRecords(db, count) {
  const oldest = db.prepare(
    'SELECT id, file_path FROM records WHERE is_deleted = 0 ORDER BY created_at ASC LIMIT ?'
  ).all(count);

  const deletedFiles = [];
  for (const rec of oldest) {
    if (rec.file_path && fs.existsSync(rec.file_path)) {
      fs.unlinkSync(rec.file_path);
      deletedFiles.push(rec.file_path);
    }
  }

  if (oldest.length > 0) {
    const ids = oldest.map(r => r.id);
    db.prepare(`DELETE FROM records WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  }

  return { deletedFiles };
}

module.exports = {
  initDatabase, addRecord, getRecords, getRecordById, updateRecord,
  softDelete, moveToTrash, getTrashRecords, restoreFromTrash,
  permanentDelete, emptyTrash, getStats, getRecordCount, deleteOldestRecords,
};
