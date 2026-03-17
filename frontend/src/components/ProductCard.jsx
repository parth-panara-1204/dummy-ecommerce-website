import { Link } from "react-router-dom";
import API from "../api";

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product._id}`} className="product-card">
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
