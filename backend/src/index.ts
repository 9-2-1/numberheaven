import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';
import type { NumberRecord, NumberWithHistory, HistoryRecord } from './types';

const app = express();
const port = 32451;

app.use(morgan('combined'));
app.use(express.text({ type: () => true }));
app.use(cors());

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, '../../dist')));

// 初始化数据库
const db = new Database('../../data/numbering/data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS number (
    name TEXT PRIMARY KEY,
    color TEXT,
    "order" TEXT,
    value REAL,
    last REAL
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS history (
    time REAL,
    name TEXT,
    value REAL,
    PRIMARY KEY (time, name)
  ) WITHOUT ROWID;

  CREATE INDEX IF NOT EXISTS number_order ON number("order");
`);

// 获取所有数字及其历史记录，按order和name排序
app.get('/api/get_numbers', (req, res) => {
  try {
    // 从数据库中直接按order和name排序获取数字
    const numbers: NumberRecord[] = db
      .prepare('SELECT * FROM number ORDER BY "order" ASC, name ASC')
      .all() as NumberRecord[];

    const numbersWithHistory: NumberWithHistory[] = [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const number of numbers) {
      // 获取最近7天的历史记录
      const history: HistoryRecord[] = db
        .prepare<
          [string, number],
          HistoryRecord
        >('SELECT * FROM history WHERE name = ? AND time >= ? ORDER BY time ASC')
        .all(number.name, sevenDaysAgo);

      // 如果历史记录少于7天，补充7天前的最后一个点
      if (history.length > 0) {
        const earliestPoint = history[0].time;
        if (earliestPoint > sevenDaysAgo) {
          const earliestPointRecord = db
            .prepare<
              [string, number],
              HistoryRecord
            >('SELECT * FROM history WHERE name = ? AND time <= ? ORDER BY time DESC LIMIT 1')
            .get(number.name, sevenDaysAgo);

          if (earliestPointRecord) {
            history.unshift(earliestPointRecord);
          }
        }
      }

      numbersWithHistory.push({ ...number, history });
    }

    res.json(numbersWithHistory);
  } catch (error) {
    console.error('Error fetching numbers:', error);
    res.status(500).json({ error: 'Failed to fetch numbers' });
  }
});

// 验证APPID
const validAppIds = new Set(
  fs
    .readFileSync(path.join(__dirname, '../../APPID.txt'), 'utf8')
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
);

// 更新数字
app.post('/api/post_update', (req, res) => {
  // 验证APPID请求头
  const appId = req.headers['appid'];
  if (!appId || !validAppIds.has(appId as string)) {
    return res.status(401).json({ error: 'Invalid or missing APPID header' });
  }

  // 从query string获取参数
  const name = req.query.name as string;
  const color = req.query.color as string | undefined;
  const order = req.query.order as string | undefined;

  // 从body获取value
  let value: number;
  if (typeof req.body === 'string') {
    const trimmedBody = req.body.trim();
    value = parseFloat(trimmedBody);
    if (isNaN(value)) {
      return res.status(400).json({ error: 'Invalid numeric value in request body' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid request body format' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Name is required as query parameter' });
  }

  try {
    const now = Date.now();

    // 检查是否已存在该数字
    const existing = db.prepare('SELECT * FROM number WHERE name = ?').get(name) as
      | NumberRecord
      | undefined;

    if (existing) {
      // 更新现有数字
      db.prepare(
        'UPDATE number SET color = ?, "order" = ?, value = ?, last = ? WHERE name = ?'
      ).run(color || existing.color, order || existing.order, value, now, name);
    } else {
      // 插入新数字
      db.prepare(
        'INSERT INTO number (name, color, "order", value, last) VALUES (?, ?, ?, ?, ?)'
      ).run(name, color || '#66ccff', order || '', value, now);
    }

    // 插入历史记录
    db.prepare('INSERT INTO history (time, name, value) VALUES (?, ?, ?)').run(now, name, value);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating number:', error);
    res.status(500).json({ error: 'Failed to update number' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Handle SPA routing - serve index.html for any non-API routes
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});
