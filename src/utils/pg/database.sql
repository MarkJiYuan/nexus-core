CREATE TABLE incident_report (
  incident_id VARCHAR(255) NOT NULL,
  report_id VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  incident_ts BIGINT,  -- 这里假设时间戳以UNIX时间格式存储
  report_ts BIGINT,
  tags TEXT[],  -- 存储字符串数组
  solution TEXT,
  score FLOAT,
  PRIMARY KEY (incident_id, report_id)
);

CREATE TABLE opc_data (
  ts BIGINT NOT NULL,
  body jsonb NOT NULL,
  PRIMARY KEY (ts)
);