import { useEffect, useMemo, useState } from "react";
import { sendSmsBlast } from "../lib/sms";
import { motion } from 'framer-motion'
import { 
  Send, 
  Users, 
  MessageSquare, 
  Target, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Zap,
  TrendingUp
} from 'lucide-react'

type Merchant = { 
  id: string; 
  status: "new"|"existing"; 
  firstName?: string; 
  phone?: string; 
  email?: string; 
  fields?: Record<string, any> 
};

const token = (len=20) => Array.from(crypto.getRandomValues(new Uint8Array(len))).map(b=>("0"+b.toString(16)).slice(-2)).join("").slice(0,len);

const tmpl = (text:string, ctx:Record<string,any>) =>
  text.replace(/\{\{([^}]+)\}\}/g, (_,k)=> (ctx[k.trim()] ?? ""));

const ensureSTOP = (s:string) => /stop to opt out/i.test(s) ? s : `${s} Reply STOP to opt out.`;

const SMS_TEMPLATES = [
  { 
    id: "sms_outreach_potential", 
    label: "Potential (Chad)", 
    text: "Hi, this is Chad with {{lenderName}}. Still looking for working capital? We can review and decide fast. Start here: {{intakeLink}}.",
    type: "outreach",
    color: "from-blue-500 to-blue-600"
  },
  { 
    id: "sms_outreach_existing", 
    label: "Existing (Chad)", 
    text: "Hey {{firstName}} — Chad at {{lenderName}}. Want me to refresh your options? Quick check here: {{intakeLink}}.",
    type: "follow_up",
    color: "from-emerald-500 to-emerald-600"
  }
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
          if (r.ok) { 
            setMerchants(await r.json()); 
            return; 
          }
        }
      } catch {}
      // fallback: demo data
      const demoMerchants = [
        {
          id: "m1",
          status: "new" as const,
          firstName: "Ava",
          phone: "9735550188", 
          email: "ava@example.com",
          fields: {"owner.first": "Ava", "contact.phone": "9735550188"}
        },
        {
          id: "m2", 
          status: "existing" as const,
          firstName: "Luis",
          phone: "2015559922",
          email: "luis@example.com", 
          fields: {"owner.first": "Luis", "contact.phone": "2015559922"}
        }
      ];
      setMerchants(demoMerchants);
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
      // Use real SMS sending logic
      const results = await Promise.all(
        previews.map(p => sendSmsBlast(p.to, p.body))
      );
      const successCount = results.filter(r => r.success).length;
      alert(`Campaign "${campaignName}" sent! ${successCount}/${previews.length} messages delivered.`);
    } catch (error) {
      console.error('SMS campaign failed:', error);
      alert(`Campaign failed to send. Please check your SMS configuration.`);
    } finally {
      setSending(false);
    }
  };

  const selectedTemplate = SMS_TEMPLATES.find(t => t.id === templateId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center">
                <Target className="w-8 h-8 mr-3 text-emerald-600" />
                SMS Campaigns
              </h1>
              <p className="text-slate-600 mt-1">
                Create and manage SMS outreach campaigns for your merchants
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                <Users className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">{merchants.length} Merchants</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Campaign Setup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Campaign Details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                Campaign Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Widget Host URL
                  </label>
                  <input
                    type="url"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Message Template */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Message Template</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SMS_TEMPLATES.map((template) => (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        templateId === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setTemplateId(template.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{template.label}</h4>
                        <div className={`w-8 h-8 bg-gradient-to-r ${template.color} rounded-lg flex items-center justify-center`}>
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{template.text}</p>
                    </motion.div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    rows={4}
                    placeholder="Enter custom message template using {{variables}}..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Available variables: {{lenderName}}, {{firstName}}, {{intakeLink}}
                  </p>
                </div>
              </div>
            </div>

            {/* Merchant Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-emerald-600" />
                  Select Recipients
                </span>
                <span className="text-sm text-slate-500">
                  {chosen.length} of {merchants.length} selected
                </span>
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {merchants.map((merchant) => (
                  <motion.div
                    key={merchant.id}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selection[merchant.id]
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelection(prev => ({ ...prev, [merchant.id]: !prev[merchant.id] }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          merchant.status === 'existing'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {merchant.firstName?.[0] || 'M'}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {merchant.firstName || 'Unknown'}
                          </h4>
                          <p className="text-sm text-slate-500">{merchant.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          merchant.status === 'existing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {merchant.status}
                        </div>
                        {selection[merchant.id] && (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Campaign Preview & Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Campaign Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Campaign Stats
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-sm font-medium text-blue-700">Recipients</span>
                  <span className="text-lg font-bold text-blue-800">{chosen.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                  <span className="text-sm font-medium text-emerald-700">Estimated Cost</span>
                  <span className="text-lg font-bold text-emerald-800">
                    ${(chosen.length * 0.02).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <span className="text-sm font-medium text-purple-700">SMS Parts</span>
                  <span className="text-lg font-bold text-purple-800">
                    {previews.reduce((sum, p) => sum + p.parts, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Preview */}
            {chosen.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-purple-600" />
                  Message Preview
                </h3>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {previews.slice(0, 3).map((preview) => (
                    <div key={preview.m.id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          To: {preview.m.firstName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {preview.parts} part{preview.parts > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        {preview.body}
                      </p>
                    </div>
                  ))}
                  {previews.length > 3 && (
                    <p className="text-center text-sm text-slate-500 py-2">
                      +{previews.length - 3} more messages
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Send Campaign */}
            <motion.button
              onClick={send}
              disabled={chosen.length === 0 || sending}
              whileHover={{ scale: chosen.length > 0 ? 1.02 : 1 }}
              whileTap={{ scale: chosen.length > 0 ? 0.98 : 1 }}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                chosen.length > 0 && !sending
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending Campaign...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send Campaign ({chosen.length})
                </>
              )}
            </motion.button>

            {chosen.length === 0 && (
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-amber-700">
                  Select recipients to send the campaign
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}