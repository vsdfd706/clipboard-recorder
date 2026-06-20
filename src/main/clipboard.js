const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class ClipboardMonitor {
  /**
   * @param {object} db - better-sqlite3 database instance
   * @param {string} imagesDir - directory to save clipboard images
   * @param {string} filesDir - directory to save copied files
   * @param {function} onNewRecord - callback invoked with record object for each new clipboard entry.
   *   The callback should persist the record and notify the renderer.
   *   Signature: (record) => void
   */
  constructor(db, imagesDir, filesDir, onNewRecord) {
    this.db = db;
    this.imagesDir = imagesDir;
    this.filesDir = filesDir;
    this.onNewRecord = onNewRecord;
    this._running = false;
    this._timer = null;
    this._lastHash = null;
    this._interval = 200; // ms between polls
  }

  /**
   * Start polling the clipboard.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._poll();
  }

  /**
   * Stop polling the clipboard.
   */
  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Check whether the monitor is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  // ---- internal ----

  _poll() {
    if (!this._running) return;

    try {
      this._checkClipboard();
    } catch (err) {
      // Clipboard reads can fail transiently (e.g. no X selection on Linux,
      // or the clipboard is locked by another process). Silently retry.
    }

    this._timer = setTimeout(() => this._poll(), this._interval);
  }

  _checkClipboard() {
    const formats = clipboard.availableFormats();

    // --- Text ---
    const text = clipboard.readText();
    if (text && text.length > 0) {
      const hash = this._hash('text:' + text);
      if (hash !== this._lastHash) {
        this._lastHash = hash;
        this._emitRecord({ type: 'text', content: text });
        return;
      }
    }

    // --- Image ---
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const pngBuffer = img.toPNG();
      const hash = this._hash('image:' + pngBuffer.toString('base64'));
      if (hash !== this._lastHash) {
        this._lastHash = hash;
        this._emitRecord({ type: 'image', imageBuffer: pngBuffer });
        return;
      }
    }

    // --- File(s) ---
    // On Windows, file copies are exposed via the 'CF_HDROP' format.
    // Note: Electron does not provide a file-list API on the clipboard object,
    // so we detect the file path from the raw file list format and read the file.
    // If the file list has changed (different path), treat it as new content.
    if (formats.includes('CF_HDROP')) {
      const fileList = clipboard.read('CF_HDROP');
      if (fileList && fileList.length > 0) {
        // fileList is a raw string with null-separated file paths
        const files = fileList.replace(/\0+$/, '').split('\0');
        const hash = this._hash('files:' + files.join('\0'));
        if (hash !== this._lastHash) {
          this._lastHash = hash;
          const firstFile = files[0];
          const fileName = path.basename(firstFile);
          this._emitRecord({
            type: 'file',
            content: null,
            filePath: firstFile,
            fileName,
            files, // full list for downstream use
          });
          return;
        }
      }
    }
  }

  /**
   * Compute an MD5 hex hash of the input string.
   * @param {string} input
   * @returns {string}
   */
  _hash(input) {
    return crypto.createHash('md5').update(input, 'utf-8').digest('hex');
  }

  /**
   * Build the record object, save images/files to disk,
   * and invoke the onNewRecord callback.
   */
  _emitRecord({ type, content, imageBuffer, filePath, fileName, files }) {
    const id = crypto.randomUUID();
    let persistedFilePath = null;
    let persistedFileName = null;

    if (type === 'image' && imageBuffer) {
      persistedFileName = `${id}.png`;
      persistedFilePath = path.join(this.imagesDir, persistedFileName);

      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
      }
      fs.writeFileSync(persistedFilePath, imageBuffer);
    }

    if (type === 'file' && filePath && fileName) {
      persistedFileName = fileName;
      persistedFilePath = filePath;
      // For file records, store the joined file paths as content
      content = files ? files.join('\n') : filePath;
    }

    const record = {
      id,
      type,
      content: content || null,
      filePath: persistedFilePath,
      fileName: persistedFileName,
    };

    this.onNewRecord(record);
  }
}

module.exports = { ClipboardMonitor };
