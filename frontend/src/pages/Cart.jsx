import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();

  if (cart.length === 0) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <h2>Your cart is empty</h2>
              <p>Add some products to get started</p>
              <button onClick={() => navigate("/")} className="btn btn-primary">
                Shop Now
              </button>
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
              <button className="btn btn-primary btn-checkout">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
