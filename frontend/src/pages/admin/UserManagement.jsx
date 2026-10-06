import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../../services/api";
import { getCustomers } from "../../services/customerService";

export default function UserManagement() {
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setCustomers(await getCustomers()); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <>
    <div className="section-head"><h2>Customers</h2><button className="btn outline" onClick={load} disabled={loading}>Refresh</button></div>
    {error && <p className="error admin-message" role="alert">{error}</p>}
    {loading ? <p role="status">Loading customers...</p> : <div className="card table-wrap"><table>
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Joined</th></tr></thead>
      <tbody>{customers.map((customer) => <tr key={customer.id}>
        <td>{customer.id}</td><td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone || "—"}</td><td>{customer.address || "—"}</td><td>{customer.created_at ? new Date(customer.created_at).toLocaleString() : "—"}</td>
      </tr>)}</tbody></table>{!customers.length && !error && <p className="empty">No customers yet.</p>}</div>}
  </>;
}
