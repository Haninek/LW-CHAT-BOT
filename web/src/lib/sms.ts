// Simple API client for SMS (Cherry). Uses API base/key from LocalStorage.
import { v4 as uuid } from "uuid";

const cfg = () => ({
  base: localStorage.getItem("API_BASE") || "http://localhost:8000",
  key:  localStorage.getItem("API_KEY") || ""
});

export async function sendSmsBlast(payload: {
  campaignName: string;
  messages: { to: string; body: string; merchant_id?: string }[];
}) {
  const { base, key } = cfg();
  const res = await fetch(`${base}/api/sms/cherry/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      "Idempotency-Key": uuid()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`SMS send failed: ${res.status}`);
  return res.json();
}