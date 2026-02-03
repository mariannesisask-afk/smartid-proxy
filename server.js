import https from "https";
import fetch from "node-fetch";

const SMARTID_HOST = "sid.smart-id.sk.ee";
const SMARTID_IP = "217.146.76.53";

// Custom HTTPS agent for Smart-ID (forces SNI, TLS1.2+, correct certs)
const smartIdAgent = new https.Agent({
  host: SMARTID_HOST,
  servername: SMARTID_HOST,   // <—— THIS forces correct SNI
  rejectUnauthorized: true,
  keepAlive: true,
  minVersion: "TLSv1.2"        // Smart-ID requires TLS 1.2+
});

function smartIdFetch(path, options = {}) {
  return fetch(`https://${SMARTID_IP}${path}`, {
    agent: smartIdAgent,
    ...options,
    headers: {
      Host: SMARTID_HOST, // HTTP Host header override
      ...(options.headers || {})
    }
  });
}
