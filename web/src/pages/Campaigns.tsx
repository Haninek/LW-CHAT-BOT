import { useEffect, useMemo, useState } from "react";
import { sendSmsBlast } from "../lib/sms";

type Merchant = { id: string; status: "new"|"existing"; firstName?: string; phone?: string; email?: string; fields?: Record<string, any> };

const token = (len=20) => Array.from(crypto.getRandomValues(new Uint8Array(len))).map(b=>("0"+b.toString(16)).slice(-2)).join("").slice(0,len);

const tmpl = (text:string, ctx:Record<string,any>) =>
  text.replace(/\{\{([^}]+)\}\}/g, (_,k)=> (ctx[k.trim()] ?? ""));

const ensureSTOP = (s:string) => /stop to opt out/i.test(s) ? s : `${s} Reply STOP to opt out.`;

const SMS_TEMPLATES = [
  { id: "sms_outreach_potential", label: "Potential (Chad)", text: "Hi, this is Chad with {{lenderName}}. Still looking for working capital? We can review and decide fast. Start here: {{intakeLink}}." },
  { id: "sms_outreach_existing",  label: "Existing (Chad)",  text: "Hey {{firstName}} — Chad at {{lenderName}}. Want me to refresh your options? Quick check here: {{intakeLink}}." }
];

export default function Campaigns() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [templateId, setTemplateId] = useState("sms_outreach_potential");
  const [custom, setCustom] = useState("");
  const [campaignName, setCampaignName] = useState("September Outreach");
  const [sending, setSending] = useState(false);
  const [host, setHost] = useState<string>(() => localStorage.getItem("WIDGET_HOST") || "https://example.com");

  // Load merchants (try backend, else seeds from LocalStorage)
  useEffect(() => {
    const apiBase = localStorage.getItem("API_BASE");
    (async () => {
      try {
        if (apiBase) {
          const r = await fetch(`${apiBase}/api/merchants`);
          if (r.ok) { setMerchants(await r.json()); return; }
        }
      } catch {}
      // fallback: demo data
      const seeds = JSON.parse(localStorage.getItem("LW_MERCHANTS") || "[]");
      const mapped = (seeds as any[]).map((m,i)=> ({
        id: m.id || `m${i+1}`,
        status: m.status || "new",
        firstName: m.fields?.["owner.first"] || (i===0?"Ava":"Luis"),
        phone: m.fields?.["contact.phone"] || (i===0?"9735550188":"2015559922"),
        email: m.fields?.["contact.email"],
        fields: m.fields || {}
      }));
      setMerchants(mapped);
    })();
  }, []);

  const chosen = useMemo(()=> merchants.filter(m => selection[m.id]), [selection, merchants]);

  const templateText = useMemo(() => {
    if (custom.trim()) return custom;
    return SMS_TEMPLATES.find(t => t.id === templateId)?.text || "";
  }, [templateId, custom]);

  const buildLink = (m: Merchant) => {
    const t = token();
    return `${host.replace(/\/$/,"")}/chat?tenant=TENANT123&token=${t}&m=${encodeURIComponent(m.id)}`;
  };

  const previews = chosen.map(m => {
    const ctx = {
      lenderName: "UW Wizard",
      firstName: m.firstName || "there",
      intakeLink: buildLink(m)
    };
    const body = ensureSTOP(tmpl(templateText, ctx));
    return { m, to: m.phone || "", body, len: body.length, parts: Math.ceil(body.length / 160) };
  });

  const send = async () => {
    if (!previews.length) return;
    setSending(true);
    try {
      await sendSmsBlast({
        campaignName,
        messages: previews.map(p => ({ to: p.to, body: p.body, merchant_id: p.m.id }))
      });
      alert("Campaign sent (check Events for delivery)!");
      setSelection({});
    } catch (e:any) {
      alert(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-4 rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-3 gap-3 items-center">
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Campaign name"
                 value={campaignName} onChange={e=>setCampaignName(e.target.value)} />
          <select className="rounded-xl border px-3 py-2 text-sm" value={templateId} onChange={e=>setTemplateId(e.target.value)}>
            {SMS_TEMPLATES.map(t=> <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Widget/Chat host (for {{intakeLink}})"
                 value={host} onChange={e=>{setHost(e.target.value); localStorage.setItem("WIDGET_HOST", e.target.value)}}/>
        </div>
        <textarea className="mt-3 w-full rounded-xl border p-3 text-sm h-28"
                  placeholder="Or write a custom message..."
                  value={custom} onChange={e=>setCustom(e.target.value)} />
        <div className="mt-2 text-xs text-gray-500">Available tokens: lenderName, firstName, intakeLink. We'll append "Reply STOP to opt out." if missing.</div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-700">Selected: <b>{chosen.length}</b> / {merchants.length}</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-xl border text-sm" onClick={()=>setSelection(Object.fromEntries(merchants.map(m=>[m.id,true])))}>
            Select All
          </button>
          <button className="px-3 py-2 rounded-xl border text-sm" onClick={()=>setSelection({})}>Clear</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Audience</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500">
              <th className="py-2">Select</th><th>Name</th><th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {merchants.map(m=> (
                <tr key={m.id} className="border-t">
                  <td className="py-2">
                    <input type="checkbox" checked={!!selection[m.id]} onChange={e=>setSelection(s=>({...s, [m.id]: e.target.checked}))}/>
                  </td>
                  <td>{m.fields?.["business.legal_name"] || "—"}</td>
                  <td>{m.phone || "—"}</td>
                  <td><span className="text-xs rounded-full px-2 py-0.5 bg-gray-100">{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Preview ({previews.length})</div>
          <div className="space-y-2 text-sm max-h-[420px] overflow-auto">
            {previews.map(p=> (
              <div key={p.m.id} className="rounded-xl border p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.m.fields?.["business.legal_name"] || p.m.firstName || p.m.id}</div>
                  <div className="text-xs text-gray-500">{p.len} chars • {p.parts} SMS part(s)</div>
                </div>
                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{p.body}</div>
              </div>
            ))}
            {!previews.length && <div className="text-xs text-gray-500">Select merchants to see personalized previews.</div>}
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={!previews.length||sending} onClick={send}
                    className="px-3 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-50">
              {sending ? "Sending…" : "Send Campaign"}
            </button>
            <button className="px-3 py-2 rounded-xl border text-sm"
                    onClick={()=> alert("We'll send a single test SMS to your number (wire /api/sms/cherry/send with `test=true`).")}>
              Send Test SMS
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">We respect opt-outs automatically via webhook (STOP/HELP).</div>
        </div>
      </div>
    </div>
  );
}