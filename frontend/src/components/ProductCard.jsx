import { Link } from "react-router-dom";
import API from "../api";

export default function ProductCard({ product }) {
  const handleClick = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const userId = user && user.user_id ? user.user_id : null;
      API.post('/click', {
        userId,
        productId: product._id
      }).catch(err => console.error('Click track error:', err));
    } catch (err) {
      console.error('Error reading user for click event:', err);
    }
  };

  return (
    <Link to={`/product/${product._id}`} className="product-card" onClick={handleClick}>
      <div className="product-image-placeholder">
        {product.category}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.product_name}</h3>
        <p className="product-brand">{product.brand}</p>
        <div className="product-footer">
          <span className="product-price">₹{product.price}</span>
          <span className="product-rating"> {product.rating}</span>
        </div>
      </div>
    </Link>
  );
}
