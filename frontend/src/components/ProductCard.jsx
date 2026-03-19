import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  const imageSrc = product.image_url;

  return (
    <Link to={`/product/${product._id}`} className="product-card">
      <div className="product-image-placeholder">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.product_name}
            className="product-image"
            loading="lazy"
          />
        ) : (
          product.category
        )}
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
