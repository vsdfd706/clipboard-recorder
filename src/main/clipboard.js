const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class ClipboardMonitor {
  /**
   * @param {object} db - better-sqlite3 database instance
   * @param {string} imagesDir - 保存剪贴板图片的目录
   * @param {string} filesDir - 保存复制文件的目录
   * @param {function} onNewRecord - 监听到新内容时的回调，传入 record 对象。
   *   回调应负责持久化记录并通知渲染进程。
   *   签名: (record) => void
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
   * 开始轮询剪贴板。
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._poll();
  }

  /**
   * 停止轮询剪贴板。
   */
  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * 查询监控是否正在运行。
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  // ---- 内部方法 ----

  _poll() {
    if (!this._running) return;

    try {
      this._checkClipboard();
    } catch (err) {
      // 剪贴板读取可能瞬时失败（如 Linux 无 X selection，或被其他进程锁定），静默重试
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

    // --- 文件 ---
    // 在 Windows 上，文件复制通过 'CF_HDROP' 格式暴露。
    // 注意：Electron 未在 clipboard 对象上提供文件列表 API，
    // 所以我们从原始文件列表格式中检测文件路径并读取文件。
    // 如果文件列表发生了改变（不同路径），则视为新内容。
    if (formats.includes('CF_HDROP')) {
      const fileList = clipboard.read('CF_HDROP');
      if (fileList && fileList.length > 0) {
        // fileList 是一个以 null 分隔的原始文件路径字符串
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
   * 计算输入字符串的 MD5 哈希值。
   * @param {string} input
   * @returns {string}
   */
  _hash(input) {
    return crypto.createHash('md5').update(input, 'utf-8').digest('hex');
  }

  /**
   * 构建记录对象，将图片/文件保存到磁盘，
   * 并调用 onNewRecord 回调。
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
      // 文件记录：将文件路径拼接为 content
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
