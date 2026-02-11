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
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review_text: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadReviews = () => {
    if (product) {
      API.get(`/reviews/product/${product.product_id}`)
        .then(reviewRes => {
          setReviews(reviewRes.data);
        })
        .catch(err => console.error("Error fetching reviews:", err));
    }
  };

  useEffect(() => {
    setLoading(true);
    API.get("/products")
      .then(res => {
        const foundProduct = res.data.find(p => p._id === id);
        setProduct(foundProduct);
        
        if (foundProduct) {
          // Fetch reviews for this product
          API.get(`/reviews/product/${foundProduct.product_id}`)
            .then(reviewRes => {
              setReviews(reviewRes.data);
            })
            .catch(err => console.error("Error fetching reviews:", err));
          
          // Track view event
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          API.post("/events", {
            user_id: user.user_id ? `U${String(user.user_id).padStart(6, '0')}` : "guest",
            user_name: user.name || "Guest",
            product_id: foundProduct.product_id,
            product_name: foundProduct.product_name,
            event_type: "view"
          }).catch(err => console.error("Error tracking event:", err));
        }
        
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
    
    // Track cart event
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    API.post("/events", {
      user_id: user.user_id ? `U${String(user.user_id).padStart(6, '0')}` : "guest",
      user_name: user.name || "Guest",
      product_id: product.product_id,
      product_name: product.product_name,
      event_type: "cart"
    }).catch(err => console.error("Error tracking event:", err));
    
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    const userData = localStorage.getItem("user");
    if (!userData) {
      alert("Please login to submit a review");
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }

    const user = JSON.parse(userData);
    setReviewSubmitting(true);

    try {
      await API.post("/reviews", {
        product_id: product.product_id,
        user_id: `U${String(user.user_id).padStart(6, '0')}`,
        rating: reviewForm.rating,
        review_text: reviewForm.review_text
      });

      // Track review event
      await API.post("/events", {
        user_id: `U${String(user.user_id).padStart(6, '0')}`,
        user_name: user.name,
        product_id: product.product_id,
        product_name: product.product_name,
        event_type: "review"
      });

      setReviewForm({ rating: 5, review_text: '' });
      setShowReviewForm(false);
      loadReviews(); // Reload reviews
      alert("Review submitted successfully!");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
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

          {/* Reviews Section */}
          <div className="reviews-section">
            <div className="reviews-header">
              <h2>Customer Reviews</h2>
              <button 
                onClick={() => {
                  const user = localStorage.getItem("user");
                  if (!user) {
                    alert("Please login to write a review");
                    navigate("/login", { state: { from: `/product/${id}` } });
                  } else {
                    setShowReviewForm(!showReviewForm);
                  }
                }}
                className="btn btn-secondary"
              >
                {showReviewForm ? "Cancel" : "Write a Review"}
              </button>
            </div>

            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="review-form">
                <div className="form-group">
                  <label htmlFor="rating">Rating *</label>
                  <select
                    id="rating"
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})}
                    className="form-input"
                    required
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                    <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                    <option value="3">⭐⭐⭐ (3 stars)</option>
                    <option value="2">⭐⭐ (2 stars)</option>
                    <option value="1">⭐ (1 star)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="review_text">Your Review *</label>
                  <textarea
                    id="review_text"
                    value={reviewForm.review_text}
                    onChange={(e) => setReviewForm({...reviewForm, review_text: e.target.value})}
                    className="form-input"
                    rows="4"
                    placeholder="Share your thoughts about this product..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="no-reviews">No reviews yet for this product.</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-card">
                    <div className="review-header">
                      <div className="review-rating">
                        {"⭐".repeat(review.rating)}
                        <span className="rating-number">({review.rating}/5)</span>
                      </div>
                      <div className="review-date">
                        {new Date(review.review_date).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="review-text">{review.review_text}</p>
                    <p className="review-user">User: {review.user_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
