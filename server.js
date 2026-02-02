import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Smart-ID proxy start
app.post("/smartid/start", async (req, res) => {
  const { path, payload, headers, method } = req.body;

  if (!path) {
    return res.status(400).json({ error: "Missing path" });
  }

  const url = `https://sid.smart-id.sk.ee/smart-id-rp/v2${path}`;

  try {
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {})
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Smart-ID session status via proxy
app.get("/smartid/session/:id", async (req, res) => {
  const { id } = req.params;
  const { timeoutMs } = req.query;

  const url = `https://sid.smart-id.sk.ee/smart-id-rp/v2/authentication/etsi/${id}?timeoutMs=${timeoutMs || 10000}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Smart-ID proxy running on port ${port}`));
