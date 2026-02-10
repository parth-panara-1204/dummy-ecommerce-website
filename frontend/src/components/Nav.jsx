import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Nav() {
  const { cart } = useCart();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="nav-bar">
      <Link to="/" className="nav-item">Products</Link>
      <Link to="/cart" className="nav-item">
        Cart {itemCount > 0 && `(${itemCount})`}
      </Link>
    </nav>
  );
}
