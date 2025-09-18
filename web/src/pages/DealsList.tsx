import { useEffect, useState } from "react";
import { api } from "../lib/api";

type DealRow = {
  deal_id: string;
  status: string;
  created_at: string;
  funding_amount?: number;
  merchant: {
    id: string;
    legal_name: string;
    phone?: string;
    email?: string;
    state?: string;
  };
  metrics_summary?: any;
  background?: any;
};

export default function DealsList() {
  const [rows, setRows] = useState<DealRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      
      const response = await api.request(`/api/deals?${params}`);
      setRows(response.items || []);
    } catch (error) {
      console.error("Failed to load deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // Initial load

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [q, status]); // Debounced search

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

  const getBackgroundStatus = (background: any) => {
    if (!background) return "—";
    const status = background.status || "UNKNOWN";
    const colors = {
      OK: "text-green-600",
      REVIEW: "text-yellow-600", 
      DECLINE: "text-red-600"
    };
    return (
      <span className={colors[status] || "text-gray-600"}>
        {status}
      </span>
    );
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleRowClick = (dealId: string) => {
    window.location.href = `/deals/${dealId}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
        <div className="flex gap-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            placeholder="Search name/phone/email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="offer">Offer</option>
            <option value="accepted">Accepted</option>
            <option value="signed">Signed</option>
            <option value="declined">Declined</option>
            <option value="closed">Closed</option>
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

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-3 font-medium">Deal</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Background</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.deal_id}
                className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(row.deal_id)}
              >
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 font-mono">
                    {row.deal_id.slice(0, 8)}...
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.merchant.legal_name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{row.merchant.phone || "—"}</div>
                  <div className="text-xs text-gray-500">
                    {row.merchant.email || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {row.merchant.state || "—"}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {formatAmount(row.funding_amount)}
                </td>
                <td className="px-4 py-3">
                  <span className={getStatusBadge(row.status)}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {getBackgroundStatus(row.background)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(row.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
            
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  {q || status
                    ? "No deals match your search criteria."
                    : "No deals found."}
                </td>
              </tr>
            )}
            
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  Loading deals...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {rows.length} deals
        </div>
      )}
    </div>
  );
}