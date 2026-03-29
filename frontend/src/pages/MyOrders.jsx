import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import API from "../api";
import { getStoredUser } from "../utils/authStorage";

export default function MyOrders() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.is_admin || user.role === "admin" || user.email === "admin@eshop.com";
  }, [user]);

  useEffect(() => {
    const userData = getStoredUser();

    if (!userData) {
      navigate("/login", { state: { from: "/my-orders" } });
      return;
    }

    let parsedUser = null;
    try {
      parsedUser = userData;
      setUser(parsedUser);
    } catch (err) {
      navigate("/login", { state: { from: "/my-orders" } });
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await API.get("/orders");
        const allOrders = res.data || [];
        const userOrders = allOrders
          .filter((order) => String(order.user_id) === String(parsedUser.user_id))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setOrders(userOrders);
      } catch (err) {
        console.error("My orders load error", err);
        setError("Unable to load your orders right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [navigate]);

  if (!user) {
    return null;
  }

  if (isAdmin) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <h2>Orders view not available for admin</h2>
              <p>Admin accounts do not place customer orders.</p>
              <button className="btn" onClick={() => navigate("/admin")}>Go to dashboard</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Nav />
      <main className="main">
        <div className="container">
          <div className="page-header">
            <h1>My Orders</h1>
            <p className="subtitle">Your order history and statuses</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading">Loading your orders...</div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <h2>No orders yet</h2>
              <p>You have not placed any orders yet.</p>
              <button className="btn btn-primary" onClick={() => navigate("/")}>Start shopping</button>
            </div>
          ) : (
            <div className="panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id || order._id}>
                      <td>{order.order_id || order._id}</td>
                      <td>{new Date(order.created_at || Date.now()).toLocaleString()}</td>
                      <td>{order.status || "processing"}</td>
                      <td>Rs {Number(order.amount ?? order.total_amount ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
