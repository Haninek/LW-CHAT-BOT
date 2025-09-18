import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Item = {
  deal_id: string;
  merchant_id: string;
  legal_name: string;
  contact: { email?: string; phone?: string };
  deal_status: string;
  decision: "OK" | "REVIEW" | "DECLINE";
  reasons: any;
  created_at?: string;
};

export default function AdminBackgroundReview() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"" | "OK" | "REVIEW" | "DECLINE">("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      
      const response = await api.request(`/api/admin/background/review?${params}`);
      setItems(response.items || []);
    } catch (error) {
      console.error("Failed to load background reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const forceSend = async (deal_id: string, email?: string) => {
    const recipient = email || prompt("Recipient email?");
    if (!recipient) return;

    try {
      const params = new URLSearchParams({
        deal_id,
        recipient_email: recipient,
        force: "true"
      });

      const response = await api.request(`/api/sign/send?${params}`, {
        method: "POST",
      });

      if (response.success) {
        alert("Contract sent for signature (forced).");
        load(); // Refresh the list
      }
    } catch (error: any) {
      alert(`Failed: ${error.message || "Unknown error"}`);
    }
  };

  const getDecisionBadge = (decision: string) => {
    const baseClasses = "text-xs rounded-full px-2 py-0.5 font-medium";
    switch (decision) {
      case "OK":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "REVIEW":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "DECLINE":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Background Reviews</h1>
        <div className="flex items-center gap-4">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="">All Statuses</option>
            <option value="OK">OK</option>
            <option value="REVIEW">Review Required</option>
            <option value="DECLINE">Declined</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading background reviews...</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.deal_id}
              className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">
                    {item.legal_name}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">
                    {item.deal_id.slice(0, 8)}...
                  </span>
                </div>
                <span className={getDecisionBadge(item.decision)}>
                  {item.decision}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <span className="font-medium">Deal Status:</span>{" "}
                    <span className="capitalize">{item.deal_status}</span>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{" "}
                    {item.contact.email || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{" "}
                    {item.contact.phone || "—"}
                  </div>
                </div>
                {item.created_at && (
                  <div className="mt-1">
                    <span className="font-medium">Checked:</span>{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                )}
              </div>

              {item.reasons && Object.keys(item.reasons).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Background Check Details:
                  </h4>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-48 text-gray-700">
                    {JSON.stringify(item.reasons, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => forceSend(item.deal_id, item.contact.email)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  Force Send Contract
                </button>
                <button
                  onClick={() =>
                    window.open(`/deals/${item.deal_id}`, "_blank")
                  }
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Open Deal
                </button>
                <button
                  onClick={() =>
                    window.open(`/merchants/${item.merchant_id}`, "_blank")
                  }
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Open Merchant
                </button>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {filter
                  ? `No ${filter.toLowerCase()} background reviews found.`
                  : "No background reviews found."}
              </div>
              <button
                onClick={() => setFilter("")}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}