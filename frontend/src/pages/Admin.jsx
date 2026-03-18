import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import API from "../api";

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.is_admin || user.role === "admin" || user.email === "admin@eshop.com";
  }, [user]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", { state: { from: "/admin" } });
      return;
    }
    setUser(JSON.parse(storedUser));
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

  const revenueSeries = useMemo(() => {
    const series = [...orders]
      .sort((a, b) => new Date(a.created_at || a.order_date || 0) - new Date(b.created_at || b.order_date || 0))
      .slice(-12)
      .map((order, idx) => ({
        x: idx,
        y: Number(order.total_amount ?? order.amount ?? 0) || 0,
      }));

    if (series.length === 0) return [];
    const maxY = Math.max(...series.map((p) => p.y)) || 1;
    const width = 220;
    const height = 80;
    return series.map((p, idx) => {
      const x = (idx / Math.max(1, series.length - 1)) * width;
      const y = height - (p.y / maxY) * height;
      return `${x},${y}`;
    });
  }, [orders]);

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

  const goToAddProduct = () => navigate("/admin/add-product");

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
                    <h3>Revenue Snapshot</h3>
                    <span className="panel-meta">Using total_amount/amount</span>
                  </div>
                  <div className="snapshot-grid">
                    <div>
                      <p className="stat-label">Total Revenue</p>
                      <p className="stat-value">{formatINRShort(totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="stat-label">Orders</p>
                      <p className="stat-value">{orders.length}</p>
                    </div>
                    <div>
                      <p className="stat-label">Avg Order</p>
                      <p className="stat-value">{formatINRShort(orders.length ? totalRevenue / orders.length : 0)}</p>
                    </div>
                    <div className="sparkline-card">
                      <p className="stat-label">Recent Trend</p>
                      {revenueSeries.length === 0 ? (
                        <p className="muted">No data</p>
                      ) : (
                        <svg className="sparkline" viewBox="0 0 220 80" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            points={revenueSeries.join(" ")}
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Top Categories</h3>
                    <span className="panel-meta">Units by count</span>
                  </div>
                  {topCategories.length === 0 ? (
                    <p className="muted">No categories found.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCategories.map((cat) => (
                          <tr key={cat.name}>
                            <td>{cat.name}</td>
                            <td>{cat.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="dashboard-layout">
                <div className="panel" style={{ gridColumn: "1 / -1" }}>
                  <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <div>
                      <h3>Add Product</h3>
                      <span className="panel-meta">Opens dedicated product creation page</span>
                    </div>
                    <button className="btn btn-primary" onClick={goToAddProduct}>Go to Add Product</button>
                  </div>
                  <p className="muted">Use the add-product page to create items with image upload and stock fields.</p>
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
