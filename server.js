import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Smart-ID LIVE host + IP fallback
const SMARTID_HOST = "sid.smart-id.sk.ee";
const SMARTID_IP = "217.146.76.53";

// Fetch wrapper that forces TLS SNI to Smart-ID domain but connects via IPv4
function smartIdFetch(path, options = {}) {
  return fetch(`https://${SMARTID_IP}${path}`, {
    ...options,
    headers: {
      Host: SMARTID_HOST, // ensures TLS handshake + cert match
      ...(options.headers || {})
    }
  });
}

// -----------------------------
// Health check for Lovable
// -----------------------------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// -----------------------------
// Smart-ID start authentication
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
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Smart-ID session polling
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
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Start server
// -----------------------------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Smart-ID proxy running on port ${port}`);
});
