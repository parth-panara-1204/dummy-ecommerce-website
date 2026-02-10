import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import Nav from "../components/Nav";
import { useCart } from "../context/CartContext";


export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    API.get("/products")
      .then(res => {
        const foundProduct = res.data.find(p => p._id === id);
        setProduct(foundProduct);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="loading">Loading product...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <p>Product not found</p>
              <button onClick={() => navigate("/")} className="btn">
                Back to Products
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
          <button onClick={() => navigate("/")} className="back-btn">
            ← Back
          </button>
          
          <div className="product-detail">
            <div className="product-detail-image">
              {product.category}
            </div>
            
            <div className="product-detail-info">
              <h1>{product.product_name}</h1>
              <p className="brand-badge">{product.brand}</p>
              
              <div className="rating-section">
                <span className="rating">⭐ {product.rating}</span>
                <span className="category-tag">{product.category}</span>
              </div>
              
              <div className="price-section">
                <span className="price-large">₹{product.price}</span>
              </div>
              
              <div className="quantity-section">
                <label htmlFor="quantity">Quantity:</label>
                <div className="quantity-controls">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="qty-btn"
                  >
                    −
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="qty-input"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleAddToCart}
                className={`btn btn-primary ${added ? "btn-success" : ""}`}
              >
                {added ? "✓ Added to Cart" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
