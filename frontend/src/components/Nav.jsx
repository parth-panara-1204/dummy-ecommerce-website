import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useState, useEffect, useRef } from "react";

export default function Nav() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = user && (user.is_admin || user.role === "admin" || user.email === "admin@eshop.com");

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setShowProfileMenu(false);
    navigate("/");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <Link to="/" className="nav-item">Products</Link>
        {user && !isAdmin && (
          <Link to="/my-orders" className="nav-item">My Orders</Link>
        )}
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
      </div>
      
      <div className="nav-right">
        {user ? (
          <div className="profile-container" ref={profileRef}>
            <button 
              className="profile-button" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="profile-avatar">{getInitials(user.name)}</div>
              <span className="profile-name">Profile</span>
              <span className="profile-arrow">{showProfileMenu ? "▲" : "▼"}</span>
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-avatar-large">{getInitials(user.name)}</div>
                  <div className="profile-info">
                    <div className="profile-user-name">{user.name}</div>
                    <div className="profile-user-email">{user.email}</div>
                    {isAdmin && <div className="profile-badge">Admin</div>}
                  </div>
                </div>
                <div className="profile-divider"></div>
                <div className="profile-details">
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">User ID:</span>
                    <span className="profile-detail-value">{user.user_id}</span>
                  </div>
                  {user.city && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">City:</span>
                      <span className="profile-detail-value">{user.city}</span>
                    </div>
                  )}
                  {user.gender && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Gender:</span>
                      <span className="profile-detail-value">{user.gender}</span>
                    </div>
                  )}
                </div>
                <div className="profile-divider"></div>
                <button onClick={handleLogout} className="profile-logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="nav-item">Login</Link>
        )}
      </div>
    </nav>
  );
}
