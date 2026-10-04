const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Criar/atualizar tabela
async function init() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL não configurada.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      ip TEXT,
      timezone TEXT,
      resolution TEXT,
      os TEXT,
      cores TEXT,
      memory TEXT,
      browser TEXT,
      language TEXT,
      color_depth TEXT,
      device_type TEXT,
      user_agent TEXT,
      timestamp TIMESTAMPTZ NOT NULL
    )
  `);

  const columns = [
    ["cores", "TEXT"],
    ["memory", "TEXT"],
    ["browser", "TEXT"],
    ["language", "TEXT"],
    ["color_depth", "TEXT"],
    ["device_type", "TEXT"]
  ];

  for (const [name, type] of columns) {
    await pool.query(
      `ALTER TABLE records ADD COLUMN IF NOT EXISTS ${name} ${type}`
    );
  }
}

// Autenticação do painel
function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Painel"');
    return res.status(401).send("Autenticação necessária.");
  }

  const decoded = Buffer.from(
    header.slice(6),
    "base64"
  ).toString();

  const password = decoded
    .split(":")
    .slice(1)
    .join(":");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).send("Senha incorreta.");
  }

  next();
}

// Descobrir IP
app.get("/api/ip", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];

  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress;

  res.json({
    ip: ip || "Indisponível"
  });
});

// Receber dados
app.post("/api/records", async (req, res) => {
  try {
    const data = req.body;

    if (!data.timestamp) {
      return res.status(400).json({
        error: "Timestamp ausente."
      });
    }

    await pool.query(
      `
      INSERT INTO records (
        ip,
        timezone,
        resolution,
        os,
        cores,
        memory,
        browser,
        language,
        color_depth,
        device_type,
        user_agent,
        timestamp
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      `,
      [
        data.ip,
        data.timezone,
        data.resolution,
        data.os,
        data.cores,
        data.memory,
        data.browser,
        data.language,
        data.colorDepth,
        data.deviceType,
        data.userAgent,
        data.timestamp
      ]
    );

    res.status(201).json({
      ok: true
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao salvar os dados."
    });
  }
});

// Consultar registros
app.get("/api/records", auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM records
      ORDER BY timestamp DESC
      LIMIT 1000
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

// Apagar registros
app.delete("/api/records", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM records");

    res.json({
      ok: true
    });

  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

// Painel administrativo
app.get("/admin", auth, (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

// Inicializar banco e servidor
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor iniciado na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao iniciar:", error);
    process.exit(1);
  });
