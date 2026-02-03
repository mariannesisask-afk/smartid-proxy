import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import https from "https";

const app = express();
app.use(express.json());
app.use(cors());

// -----------------------------
// SMART-ID SETTINGS
// -----------------------------
const SMARTID_HOST = "sid.smart-id.sk.ee";   // TLS SNI host
const SMARTID_IP = "217.146.76.53";          // Direct IP (Render DNS bug bypass)

// Custom HTTPS agent (fixes certificate + SNI issues in Render)
const smartIdAgent = new https.Agent({
  host: SMARTID_HOST,
  servername: SMARTID_HOST,   // <— forces correct SNI for TLS handshake
  rejectUnauthorized: true,
  keepAlive: true,
  minVersion: "TLSv1.2"       // Smart-ID requires TLS 1.2+
});

// Wrapper: fetch Smart-ID using IP but SNI = domain
function smartIdFetch(path, options = {}) {
  return fetch(`https://${SMARTID_IP}${path}`, {
    agent: smartIdAgent,
    ...options,
    headers: {
      Host: SMARTID_HOST,     // <— HTTP Host override for certificate validation
      ...(options.headers || {})
    }
  });
}

// -----------------------------
// HEALTH ENDPOINT
// -----------------------------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// -----------------------------
// SMART-ID START
// Called by backend to start Smart-ID authentication
// -----------------------------
app.post("/smartid/start", async (req, res) => {
  const { path, payload, headers, method } = req.body;

  if (!path) {
    return res.status(400).json({ error: "Missing path" });
  }

  try {
    const response = await smartIdFetch(`/smart-id-rp/v2${path}`, {
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
    console.error("Smart-ID start error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// SMART-ID SESSION POLLING
// Called repeatedly until Smart-ID result arrives
// -----------------------------
app.get("/smartid/session/:id", async (req, res) => {
  const { id } = req.params;
  const { timeoutMs } = req.query;

  try {
    const response = await smartIdFetch(
      `/smart-id-rp/v2/authentication/etsi/${id}?timeoutMs=${timeoutMs || 10000}`
    );

    const data = await response.json();
    return res.json(data);

  } catch (err) {
    console.error("Smart-ID session error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// START SERVER
// -----------------------------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Smart-ID proxy is running on port ${port}`);
});
