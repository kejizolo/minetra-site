-- D1 数据库初始化脚本
-- 创建询盘表
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, read, replied, archived
  notes TEXT, -- 管理员备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_email ON inquiries(email);

-- 插入测试数据（可选）
-- INSERT INTO inquiries (name, email, phone, subject, message, status) 
-- VALUES ('Test User', 'test@example.com', '1234567890', 'General Inquiry', 'This is a test message', 'new');
