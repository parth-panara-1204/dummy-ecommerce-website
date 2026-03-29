import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import API from "../api";
import { getStoredUser } from "../utils/authStorage";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Lightweight WebSocket hook with reconnect and pause support
function useLiveWebSocket({ url, onMessage, paused }) {
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  useEffect(() => {
    if (paused) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("paused");
      return () => {};
    }

    let shouldReconnect = true;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setStatus("connected");
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          onMessage?.(payload);
        } catch (err) {
          console.error("WS message parse error", err);
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;
        if (shouldReconnect) {
          retryRef.current = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (wsRef.current) wsRef.current.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [url, onMessage, paused]);

  return status;
}

export default function Admin() {
  const navigate = useNavigate();
  const LIVE_FEED_LIMIT = 10;
  const WS_ENDPOINT = "ws://localhost:8080/stream";
  const revenueSpikeThreshold = 50000;
  const kafkaLagThreshold = 500;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [liveKpis, setLiveKpis] = useState({ revenue: 0, ordersPerSec: 0, users: 0, eventsPerSec: 0 });
  const [revenuePoints, setRevenuePoints] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [health, setHealth] = useState({ kafkaLag: 0, messagesPerSec: 0, sparkBatchTime: 0 });
  const [eventsFeed, setEventsFeed] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [archivedEventsLoading, setArchivedEventsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [paused, setPaused] = useState(false);
  const lastRevenueRef = useRef(0);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.is_admin || user.role === "admin" || user.email === "admin@eshop.com";
  }, [user]);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate("/login", { state: { from: "/admin" } });
      return;
    }
    setUser(storedUser);
  }, [navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [productRes, orderRes, userRes] = await Promise.all([
          API.get("/products"),
          API.get("/orders").catch(() => ({ data: [] })),
          API.get("/users").catch(() => ({ data: [] }))
        ]);
        setProducts(productRes.data || []);
        setOrders(orderRes.data || []);
        setUsers(userRes.data || []);
      } catch (err) {
        console.error("Admin dashboard load error", err);
        setError("Unable to load dashboard data. Try again shortly.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const fetchArchivedEvents = async () => {
      setArchivedEventsLoading(true);
      try {
        const res = await API.get("/archived-events?limit=20");
        setArchivedEvents(res.data.events || []);
      } catch (err) {
        console.error("Failed to fetch archived events:", err);
        // Silently fail - this is optional enhancement
      } finally {
        setArchivedEventsLoading(false);
      }
    };

    fetchArchivedEvents();
  }, [user, isAdmin]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + (Number(order.total_amount ?? order.amount ?? 0) || 0), 0),
    [orders]
  );

  const avgRating = useMemo(() => {
    if (!products.length) return 0;
    const sum = products.reduce((acc, p) => acc + (Number(p.rating) || 0), 0);
    return sum / products.length;
  }, [products]);

  const topCategories = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const cat = p.category || "Unknown";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [products]);

  const topBrands = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const brand = p.brand || "Unknown";
      counts[brand] = (counts[brand] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [products]);

  const uniqueCategories = useMemo(() => new Set(products.map((p) => p.category || "Unknown")).size, [products]);
  const uniqueBrands = useMemo(() => new Set(products.map((p) => p.brand || "Unknown")).size, [products]);
  const topCategoryName = topCategories[0]?.name || "-";
  const topBrandName = topBrands[0]?.name || "-";

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0))
      .slice(0, 6);
  }, [orders]);

  const recentUsers = useMemo(() => {
    return [...users].slice(0, 6);
  }, [users]);

  const liveTopCategories = useMemo(() => {
    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [categoryCounts]);

  const formatINRShort = (value) => {
    const num = Number(value) || 0;
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pushAlert = useCallback((title, level = "info") => {
    setAlerts((prev) => [{ id: Date.now() + Math.random(), title, level }, ...prev].slice(0, 6));
  }, []);

  const handleStreamMessage = useCallback(
    (msg) => {
      const ts = msg.timestamp ? msg.timestamp * 1000 : Date.now();
      const eventType = msg.eventType || msg.event_type || "unknown";
      const userId = msg.userId || msg.user_id || "-";
      const orderId = msg.orderId || msg.order_id || null;
      const productId = msg.productId || msg.product_id || null;
      const quantity = Number(msg.quantity ?? 0) || 0;
      const amount = Number(msg.amount ?? msg.item_total ?? msg.total_amount ?? 0) || 0;

      setLiveKpis((prev) => ({
        revenue: msg.revenue ?? prev.revenue,
        ordersPerSec: msg.ordersPerSec ?? prev.ordersPerSec,
        users: msg.users ?? prev.users,
        eventsPerSec: msg.eventsPerSec ?? prev.eventsPerSec,
      }));

      setRevenuePoints((prev) => {
        const nextPoint = { time: ts, revenue: msg.revenue ?? prev[prev.length - 1]?.revenue ?? 0 };
        const next = [...prev, nextPoint];
        return next.slice(-100);
      });

      if (msg.category) {
        setCategoryCounts((prev) => {
          const next = { ...prev };
          next[msg.category] = (next[msg.category] || 0) + 1;
          return next;
        });
      }

      setHealth((prev) => ({
        kafkaLag: msg.kafkaLag ?? prev.kafkaLag,
        messagesPerSec: msg.messagesPerSec ?? prev.messagesPerSec,
        sparkBatchTime: msg.sparkBatchTime ?? msg.batchTime ?? prev.sparkBatchTime,
      }));

      if (eventType !== "unknown" || orderId || userId !== "-" || productId) {
        setEventsFeed((prev) => [
          {
            orderId,
            userId,
            productId,
            eventType,
            quantity,
            amount,
            timestamp: ts,
          },
          ...prev,
        ].slice(0, LIVE_FEED_LIMIT));
      }

      const prevRevenue = lastRevenueRef.current || 0;
      if (msg.revenue && msg.revenue - prevRevenue > revenueSpikeThreshold) {
        pushAlert(`Revenue spike detected (+₹${(msg.revenue - prevRevenue).toFixed(0)})`, "warn");
      }
      lastRevenueRef.current = msg.revenue ?? lastRevenueRef.current;

      if ((msg.kafkaLag ?? 0) > kafkaLagThreshold) {
        pushAlert(`High Kafka lag: ${msg.kafkaLag}`, "error");
      }
    },
    [kafkaLagThreshold, pushAlert, revenueSpikeThreshold]
  );

  const connectionStatus = useLiveWebSocket({ url: WS_ENDPOINT, onMessage: handleStreamMessage, paused });
  const togglePause = () => setPaused((p) => !p);
  const statusColor = connectionStatus === "connected" ? "#16a34a" : connectionStatus === "connecting" ? "#f59e0b" : connectionStatus === "paused" ? "#6b7280" : "#dc2626";

  const liveLineData = useMemo(
    () => revenuePoints.map((p) => ({ ...p, label: new Date(p.time).toLocaleTimeString() })),
    [revenuePoints]
  );
  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 5);
  }, [products]);

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <h2>Access restricted</h2>
              <p>You need admin privileges to view the dashboard.</p>
              <button className="btn" onClick={() => navigate("/")}>Back to store</button>
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
            <h1>Admin Dashboard</h1>
            <p className="subtitle">Store performance overview</p>
          </div>

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          {loading ? (
            <div className="loading">Loading dashboard...</div>
          ) : (
            <>
              <div className="panel" style={{ marginBottom: 12 }}>
                <div className="panel-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      aria-label="connection-status"
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: statusColor,
                      }}
                    />
                    <div>
                      <h3>Live Stream</h3>
                      <span className="panel-meta">Status: {connectionStatus}</span>
                    </div>
                  </div>
                  <button className="btn" onClick={togglePause}>{paused ? "Resume" : "Pause"} Stream</button>
                </div>
                <div className="kpi-grid">
                  <div className="stat-card">
                    <p className="stat-label">Revenue</p>
                    <p className="stat-value">{formatINRShort(liveKpis.revenue)}</p>
                    <p className="stat-meta">Live total</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Orders / sec</p>
                    <p className="stat-value">{liveKpis.ordersPerSec.toFixed(1)}</p>
                    <p className="stat-meta">Incoming</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Active Users</p>
                    <p className="stat-value">{liveKpis.users}</p>
                    <p className="stat-meta">Concurrent</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Events / sec</p>
                    <p className="stat-value">{liveKpis.eventsPerSec.toFixed(1)}</p>
                    <p className="stat-meta">Throughput</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>Top Categories (Live)</h3>
                    <span className="panel-meta">Sliding window</span>
                  </div>
                  {liveTopCategories.length === 0 ? (
                    <p className="muted">Waiting for category signals...</p>
                  ) : (
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liveTopCategories} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>System Health</h3>
                    <span className="panel-meta">Kafka & Spark</span>
                  </div>
                  <div className="snapshot-grid">
                    <div>
                      <p className="stat-label">Kafka Lag</p>
                      <p className="stat-value" style={{ color: health.kafkaLag > kafkaLagThreshold ? "#dc2626" : "inherit" }}>
                        {health.kafkaLag}
                      </p>
                      <p className="stat-meta">Partitions delay</p>
                    </div>
                    <div>
                      <p className="stat-label">Messages / sec</p>
                      <p className="stat-value">{health.messagesPerSec}</p>
                      <p className="stat-meta">Broker throughput</p>
                    </div>
                    <div>
                      <p className="stat-label">Spark Batch (ms)</p>
                      <p className="stat-value">{health.sparkBatchTime}</p>
                      <p className="stat-meta">Processing time</p>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>Alerts</h3>
                    <span className="panel-meta">Auto detected</span>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="muted">No active alerts.</p>
                  ) : (
                    <ul style={{ listStyle: "none", paddingLeft: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {alerts.map((a) => (
                        <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: a.level === "error" ? "#dc2626" : a.level === "warn" ? "#f59e0b" : "#2563eb",
                              flexShrink: 0,
                            }}
                          />
                          <span>{a.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>Live Event Feed</h3>
                    <span className="panel-meta">Latest {LIVE_FEED_LIMIT}</span>
                  </div>
                  {eventsFeed.length === 0 ? (
                    <p className="muted">Waiting for events...</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>User</th>
                          <th>Product / Order</th>
                          <th>Amount / Qty</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventsFeed.slice(0, LIVE_FEED_LIMIT).map((evt, idx) => (
                          <tr key={`${evt.orderId || evt.productId || idx}-${evt.timestamp}`}>
                            <td>{evt.eventType || "-"}</td>
                            <td>{evt.userId || "-"}</td>
                            <td>{evt.orderId ? `Order ${evt.orderId}` : evt.productId ? `Product ${evt.productId}` : "-"}</td>
                            <td>{evt.amount > 0 ? formatINRShort(evt.amount) : evt.quantity > 0 ? `Qty ${evt.quantity}` : "-"}</td>
                            <td>{new Date(evt.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>Archived Events (Parquet)</h3>
                    <span className="panel-meta">{archivedEventsLoading ? "Loading..." : `${archivedEvents.length} events`}</span>
                  </div>
                  {archivedEventsLoading ? (
                    <p className="muted">Loading archived events from MinIO...</p>
                  ) : archivedEvents.length === 0 ? (
                    <p className="muted">No archived events found. Spark is writing to parquet...</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Product ID</th>
                          <th>Event Type</th>
                          <th>Timestamp</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedEvents.map((evt, idx) => (
                          <tr key={`archived-${idx}`}>
                            <td>{evt.userId || evt.user_id || "-"}</td>
                            <td>{evt.productId || evt.product_id || "-"}</td>
                            <td>{evt.eventType || evt.event_type || "-"}</td>
                            <td>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "-"}</td>
                            <td><span className="muted">{evt._source || "unknown"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <h3>Revenue Snapshot</h3>
                    <span className="panel-meta">Using total_amount/amount</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div className="snapshot-grid" style={{ marginBottom: "16px" }}>
                      <div>
                        <p className="stat-label">Total Revenue</p>
                        <p className="stat-value">{formatINRShort(totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="stat-label">Orders</p>
                        <p className="stat-value">{orders.length}</p>
                      </div>
                    </div>
                    <div style={{ flex: 1, minHeight: "180px" }}>
                      <p className="stat-label" style={{ marginBottom: "8px" }}>Recent Trend</p>
                      {liveLineData.length === 0 ? (
                        <p className="muted">No data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={liveLineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Line 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={false} 
                              isAnimationActive={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-grid">
                <div className="stat-card">
                  <p className="stat-label">Products</p>
                  <p className="stat-value">{products.length}</p>
                  <p className="stat-meta">Active SKUs</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Orders</p>
                  <p className="stat-value">{orders.length}</p>
                  <p className="stat-meta">Total placed</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Revenue</p>
                  <p className="stat-value">{formatINRShort(totalRevenue)}</p>
                  <p className="stat-meta">Sum of order amounts</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Avg Rating</p>
                  <p className="stat-value">{avgRating.toFixed(1)}</p>
                  <p className="stat-meta">Across all products</p>
                </div>
              </div>

              <div className="kpi-grid">
                <div className="stat-card">
                  <p className="stat-label">Avg Order Value</p>
                  <p className="stat-value">{formatINRShort(orders.length ? totalRevenue / orders.length : 0)}</p>
                  <p className="stat-meta">Revenue / order</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Unique Categories</p>
                  <p className="stat-value">{uniqueCategories}</p>
                  <p className="stat-meta">Catalog breadth</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Unique Brands</p>
                  <p className="stat-value">{uniqueBrands}</p>
                  <p className="stat-meta">Brand coverage</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Top Category</p>
                  <p className="stat-value">{topCategoryName}</p>
                  <p className="stat-meta">By SKU count</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Top Brand</p>
                  <p className="stat-value">{topBrandName}</p>
                  <p className="stat-meta">By SKU count</p>
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Top Rated Products</h3>
                    <span className="panel-meta">Rating sorted</span>
                  </div>
                  {topProducts.length === 0 ? (
                    <p className="muted">No products yet.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Brand</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p) => (
                          <tr key={p._id}>
                            <td>{p.product_name}</td>
                            <td>{p.brand}</td>
                            <td>{p.category}</td>
                            <td>₹{p.price}</td>
                            <td>{p.rating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Top Brands</h3>
                    <span className="panel-meta">By SKU count</span>
                  </div>
                  {topBrands.length === 0 ? (
                    <p className="muted">No brand data.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Brand</th>
                          <th>Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topBrands.map((brand) => (
                          <tr key={brand.name}>
                            <td>{brand.name}</td>
                            <td>{brand.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Recent Orders</h3>
                    <span className="panel-meta">Latest 6</span>
                  </div>
                  {recentOrders.length === 0 ? (
                    <p className="muted">No orders placed yet.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.order_id || order._id}>
                            <td>{order.order_id || order._id}</td>
                            <td>{order.status || "processing"}</td>
                            <td>₹{Number(order.total_amount ?? order.amount ?? 0).toFixed(2)}</td>
                            <td>{order.user_id || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Recent Users</h3>
                    <span className="panel-meta">First 6</span>
                  </div>
                  {recentUsers.length === 0 ? (
                    <p className="muted">User list unavailable.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>City</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentUsers.map((u) => (
                          <tr key={u.user_id || u._id}>
                            <td>{u.user_id || u._id}</td>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.city || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
