import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";

type DealDetailData = {
  deal: {
    id: string;
    status: string;
    funding_amount?: number;
    created_at: string;
    completed_at?: string;
  };
  merchant: {
    id: string;
    legal_name: string;
    phone?: string;
    email?: string;
    state?: string;
    ein?: string;
    address?: string;
    city?: string;
    zip?: string;
  };
  intake: {
    fields: Array<{
      field_id: string;
      value: string;
      source: string;
      last_verified_at?: string;
      confidence: number;
    }>;
    missing: string[];
    confirm: string[];
  };
  documents: Array<{
    id: string;
    filename: string;
    parsed: boolean;
    month?: string;
    created_at: string;
  }>;
  metrics?: any;
  offers: Array<{
    id: string;
    payload: any;
    status: string;
    created_at: string;
  }>;
  background?: any;
  signing: {
    sent?: any;
    signed?: any;
  };
  timeline: Array<{
    type: string;
    data: any;
    created_at: string;
  }>;
};

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const [data, setData] = useState<DealDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!dealId) return;
    
    setLoading(true);
    try {
      const response = await api.request(`/api/deals/${dealId}`);
      setData(response);
    } catch (error) {
      console.error("Failed to load deal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dealId]);

  const uploadDocuments = async () => {
    if (!data || files.length !== 3) {
      alert("Please select exactly 3 PDF files for bank statements.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const params = new URLSearchParams({
        merchant_id: data.merchant.id,
        deal_id: data.deal.id,
      });

      await api.request(`/api/documents/bank/upload?${params}`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type, let browser set it with boundary
        headers: undefined,
      });

      alert("Bank statements uploaded and processed successfully!");
      setFiles([]);
      await load(); // Refresh data
    } catch (error: any) {
      alert(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const generateOffers = async () => {
    if (!data?.metrics) {
      alert("Upload bank statements first to compute metrics.");
      return;
    }

    setGenerating(true);
    try {
      const response = await api.request(`/api/offers/`, {
        method: "POST",
        body: JSON.stringify({
          deal_id: data.deal.id,
          ...data.metrics,
        }),
      });

      if (response.blocked) {
        alert(`Offer generation blocked: ${response.reason}`);
      } else {
        alert("Offers generated successfully!");
        await load(); // Refresh data
      }
    } catch (error: any) {
      alert(`Failed to generate offers: ${error.message || "Unknown error"}`);
    } finally {
      setGenerating(false);
    }
  };

  const acceptOffer = async (offer: any) => {
    const confirmed = confirm(
      `Accept offer for ${formatAmount(offer.amount)} with ${offer.term_days} day term?`
    );
    if (!confirmed) return;

    try {
      await api.request(`/api/deals/${dealId}/accept`, {
        method: "POST",
        body: JSON.stringify({
          offer_id: offer.id,
          terms_accepted: true,
        }),
      });

      // Trigger background check
      await api.request(`/api/queue/background`, {
        method: "POST",
        body: JSON.stringify({
          deal_id: data!.deal.id,
          merchant_id: data!.merchant.id,
        }),
      });

      alert("Offer accepted and background check queued!");
      await load(); // Refresh data
    } catch (error: any) {
      alert(`Failed to accept offer: ${error.message || "Unknown error"}`);
    }
  };

  const sendForSignature = async () => {
    if (!data) return;

    const email = prompt("Recipient email:", data.merchant.email || "");
    if (!email) return;

    const force = confirm(
      "Force send even if background check is not OK? Click OK to force, Cancel for normal send."
    );

    try {
      const params = new URLSearchParams({
        deal_id: data.deal.id,
        recipient_email: email,
        force: force.toString(),
      });

      await api.request(`/api/sign/send?${params}`, {
        method: "POST",
      });

      alert("Contract sent for signature!");
      await load(); // Refresh data
    } catch (error: any) {
      alert(`Failed to send contract: ${error.message || "Unknown error"}`);
    }
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-xs rounded-full px-2 py-0.5 font-medium";
    switch (status) {
      case "open":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "offer":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "accepted":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "signed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "declined":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "closed":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getFieldLabel = (fieldId: string) => {
    const labels: { [key: string]: string } = {
      "business.legal_name": "Business Name",
      "business.address": "Address",
      "business.city": "City",
      "business.state": "State",
      "business.zip": "ZIP Code",
      "business.ein": "EIN",
      "contact.phone": "Phone",
      "contact.email": "Email",
      "owner.dob": "Owner DOB",
      "owner.ssn_last4": "SSN Last 4",
    };
    return labels[fieldId] || fieldId;
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading deal details...</div>
        </div>
      </div>
    );
  }

  const { deal, merchant, intake, documents, metrics, offers, background, signing, timeline } = data;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/deals"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Deals
        </Link>
        <div className="h-4 border-l border-gray-300"></div>
        <h1 className="text-2xl font-bold text-gray-900">Deal Details</h1>
      </div>

      {/* Deal Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {merchant.legal_name}
            </h2>
            <div className="text-sm text-gray-600 mt-1">
              {merchant.phone || "—"} · {merchant.email || "—"}
              {merchant.state && ` · ${merchant.state}`}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-1">
              Deal ID: {deal.id}
            </div>
          </div>
          <div className="text-right">
            <div className={getStatusBadge(deal.status)}>{deal.status}</div>
            {deal.funding_amount && (
              <div className="text-lg font-semibold text-gray-900 mt-2">
                {formatAmount(deal.funding_amount)}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Created: {new Date(deal.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Intake Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Intake Status
        </h3>
        
        {intake.missing.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-red-700 mb-2">
              Missing Information ({intake.missing.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {intake.missing.map((fieldId) => (
                <span
                  key={fieldId}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800"
                >
                  {getFieldLabel(fieldId)}
                </span>
              ))}
            </div>
          </div>
        )}

        {intake.confirm.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-yellow-700 mb-2">
              Needs Confirmation ({intake.confirm.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {intake.confirm.map((fieldId) => (
                <span
                  key={fieldId}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  {getFieldLabel(fieldId)}
                </span>
              ))}
            </div>
          </div>
        )}

        {intake.missing.length === 0 && intake.confirm.length === 0 && (
          <div className="text-sm text-green-600 font-medium">
            ✓ All required information collected
          </div>
        )}
      </div>

      {/* Documents & Upload */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bank Statements ({documents.length})
        </h3>

        {documents.length > 0 && (
          <div className="mb-4">
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{doc.filename}</div>
                    <div className="text-xs text-gray-500">
                      {doc.month && `Month: ${doc.month} · `}
                      Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      doc.parsed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {doc.parsed ? "Parsed" : "Processing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length < 3 && (
          <div>
            <div className="text-sm text-gray-600 mb-3">
              Upload 3 consecutive months of bank statements (PDF format):
            </div>
            <div className="space-y-3">
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {files.length > 0 && (
                <div className="text-sm text-gray-600">
                  Selected: {files.length} file(s)
                </div>
              )}
              <button
                onClick={uploadDocuments}
                disabled={uploading || files.length !== 3}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload & Process"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Monthly Revenue</div>
              <div className="font-semibold">
                {formatAmount(metrics.avg_monthly_revenue)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Daily Balance</div>
              <div className="font-semibold">
                {formatAmount(metrics.avg_daily_balance_3m)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">NSF Count</div>
              <div className="font-semibold">{metrics.total_nsf_3m || 0}</div>
            </div>
            <div>
              <div className="text-gray-600">Risk Score</div>
              <div className="font-semibold">
                {(metrics.underwriting_risk_score * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Offers */}
      {metrics && offers.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Generate Offers
          </h3>
          <button
            onClick={generateOffers}
            disabled={generating}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Funding Offers"}
          </button>
        </div>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Funding Offers ({offers.length})
          </h3>
          <div className="space-y-4">
            {offers.map((offer) => {
              const payload = typeof offer.payload === 'string' 
                ? JSON.parse(offer.payload) 
                : offer.payload;
              
              return (
                <div
                  key={offer.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">
                      Tier {payload.tier} - {formatAmount(payload.amount)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          offer.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {offer.status}
                      </span>
                      {offer.status === "pending" && deal.status === "offer" && (
                        <button
                          onClick={() => acceptOffer(payload)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>Term: {payload.term_days} days</div>
                    <div>Factor: {payload.factor}x</div>
                    <div>Fee: {payload.fee}x</div>
                    <div>Daily Payment: {formatAmount(payload.daily_payment)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Background Check */}
      {background && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Background Check
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-sm px-2 py-1 rounded-full font-medium ${
                background.status === "OK"
                  ? "bg-green-100 text-green-800"
                  : background.status === "REVIEW"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {background.status}
            </span>
          </div>
          {background.reasons && (
            <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32 text-gray-700">
              {JSON.stringify(background.reasons, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Contract Signing */}
      {deal.status === "accepted" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contract Signing
          </h3>
          {signing.sent ? (
            <div className="space-y-2">
              <div className="text-sm text-green-600">
                ✓ Contract sent to {signing.sent.recipient_email}
              </div>
              {signing.signed && (
                <div className="text-sm text-green-600">
                  ✓ Contract signed on{" "}
                  {new Date(signing.signed.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={sendForSignature}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Send for Signature
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Timeline ({timeline.length})
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {timeline.map((event, index) => (
            <div key={index} className="flex gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{event.type}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
                {event.data && Object.keys(event.data).length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {JSON.stringify(event.data, null, 2).slice(0, 200)}
                    {JSON.stringify(event.data).length > 200 && "..."}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}