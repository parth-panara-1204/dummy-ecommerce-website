import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API from "../api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    city: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  
  // Get the redirect path from location state or default to home
  const from = location.state?.from || "/";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSignup) {
      // Sign up - create new user
      try {
        const response = await API.post("/users", formData);
        setMessage(`Account created! User ID: ${response.data.user_id}`);
        localStorage.setItem("user", JSON.stringify(response.data));
        setTimeout(() => navigate(from), 2000);
      } catch (err) {
        if (err.response && err.response.status === 409) {
          setMessage("This email is already taken. Please use another one or log in.");
        } else {
          setMessage("Error creating account. Please try again.");
        }
        console.error(err);
      }
    } else {
      // Login - check email and password
      try {
        const response = await API.post("/users/login", {
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem("user", JSON.stringify(response.data));
        setMessage("Login successful!");
        setTimeout(() => navigate(from), 1000);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          setMessage("Invalid email or password.");
        } else {
          setMessage("Error logging in. Please try again.");
        }
        console.error(err);
      }
    }
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">🛍️ E-Shop</Link>
        </div>
      </nav>
      
      <main className="main">
        <div className="container" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="page-header">
            <h1>{isSignup ? "Sign Up" : "Login"}</h1>
            <p className="subtitle">
              {isSignup ? "Create a new account" : "Login to your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {isSignup && (
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            {isSignup && (
              <>
                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary">
              {isSignup ? "Sign Up" : "Login"}
            </button>

            {message && (
              <div className="message" style={{
                marginTop: "1rem",
                padding: "0.75rem",
                borderRadius: "4px",
                background: message.includes("Error") ? "#fee" : "#efe",
                color: message.includes("Error") ? "#c33" : "#363"
              }}>
                {message}
              </div>
            )}

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setMessage("");
                }}
                className="link-btn"
              >
                {isSignup
                  ? "Already have an account? Login"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
