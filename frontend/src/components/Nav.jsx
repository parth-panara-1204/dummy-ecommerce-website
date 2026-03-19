import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react";

export default function Nav() {
  const { cart } = useCart();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const isAdmin = user && (user.is_admin || user.role === "admin" || user.email === "admin@eshop.com");

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <nav className="nav-bar">
      <Link to="/" className="nav-item">Products</Link>
      {!isAdmin && (
        <Link to="/cart" className="nav-item">
          Cart {itemCount > 0 && `(${itemCount})`}
        </Link>
      )}
      {isAdmin && (
        <>
          <Link to="/admin" className="nav-item">Admin</Link>
          <Link to="/admin/add-product" className="nav-item">Add Product</Link>
        </>
      )}
      {user ? (
        <div className="nav-item" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>Hello, {user.name}</span>
          <button onClick={handleLogout} className="link-btn">Logout</button>
        </div>
      ) : (
        <Link to="/login" className="nav-item">Login</Link>
      )}
    </nav>
  );
}
