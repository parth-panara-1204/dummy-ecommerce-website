import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import { useCart } from "../context/CartContext";
import API from "../api";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const handleCheckout = async () => {
    // Check if user is logged in
    const userData = localStorage.getItem("user");
    
    if (!userData) {
      // User not logged in - redirect to login
      alert("Please login first to place an order");
      navigate("/login", { state: { from: "/cart" } });
      return;
    }

    const user = JSON.parse(userData);
    setIsProcessing(true);

    try {
      const totalAmount = getTotal();
      
      // Create order
      const orderResponse = await API.post("/orders", {
        user_id: user.user_id,
        amount: totalAmount,
        status: "processing"
      });

      const order = orderResponse.data;

      // Create order items for each cart item
      const orderItemPromises = cart.map(item => 
        API.post("/order_items", {
          order_id: order.order_id,
          product_id: item.product_id,
          user_id: user.user_id,
          quantity: item.quantity,
          item_price: item.price,
          item_total: item.price * item.quantity
        })
      );

      await Promise.all(orderItemPromises);

      // Track purchase events for each product
      const eventPromises = cart.map(item =>
        API.post("/events", {
          user_id: `U${String(user.user_id).padStart(6, '0')}`,
          user_name: user.name,
          product_id: item.product_id,
          product_name: item.product_name,
          event_type: "purchase"
        })
      );

      await Promise.all(eventPromises);

      // Show success and clear cart
      setOrderSuccess(true);
      clearCart();
      
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      console.error("Error placing order:", err);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <h2>{orderSuccess ? "Order Placed Successfully!" : "Your cart is empty"}</h2>
              <p>{orderSuccess ? "Thank you for your order. Redirecting to home..." : "Add some products to get started"}</p>
              {!orderSuccess && (
                <button onClick={() => navigate("/")} className="btn btn-primary">
                  Shop Now
                </button>
              )}
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
          <div className="cart-header">
            <h1>Shopping Cart</h1>
            <button onClick={clearCart} className="btn btn-secondary">
              Clear Cart
            </button>
          </div>

          <div className="cart-content">
            <div className="cart-items">
              {cart.map(item => (
                <div key={item._id} className="cart-item">
                  <div className="cart-item-info">
                  <h3>{item.product_name}</h3>
                    <p className="cart-item-brand">{item.brand}</p>
                    <p className="cart-item-category">{item.category}</p>
                  </div>
                  
                  <div className="cart-item-controls">
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="qty-btn"
                      >
                        −
                      </button>
                      <span className="qty-display">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="cart-item-price">
                      <span className="price">₹{(item.price * item.quantity).toFixed(2)}</span>
                      <span className="price-unit">₹{item.price} each</span>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>₹{getTotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{getTotal().toFixed(2)}</span>
              </div>
              <button 
                className="btn btn-primary btn-checkout"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
