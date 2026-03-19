import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import API from "../api";

export default function AddProduct() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [existingCategories, setExistingCategories] = useState([]);
  const [productForm, setProductForm] = useState({
    product_name: "",
    brand: "",
    category: "",
    price: "",
    stock: "",
    image_filename: ""
  });
  const [imageData, setImageData] = useState("");
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", { state: { from: "/admin/add-product" } });
      return;
    }
    setUser(JSON.parse(storedUser));

    API.get("/products")
      .then((res) => {
        const categories = Array.from(
          new Set(
            (res.data || [])
              .map((p) => (p.category || "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setExistingCategories(categories);
      })
      .catch((err) => {
        console.error("Load categories error", err);
      });
  }, [navigate]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.is_admin || user.role === "admin" || user.email === "admin@eshop.com";
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageData("");
      setPreview("");
      setProductForm((p) => ({ ...p, image_filename: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      setImageData(String(result));
      setPreview(String(result));
      setProductForm((p) => ({ ...p, image_filename: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const payload = {
        product_name: productForm.product_name.trim(),
        brand: productForm.brand.trim(),
        category: productForm.category.trim(),
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        image_filename: productForm.image_filename.trim(),
        image_data: imageData,
      };

      const res = await API.post("/products", payload);
      setMessage(`Product created (id: ${res.data?._id || res.data?.product_id || "new"}).`);
      setProductForm({ product_name: "", brand: "", category: "", price: "", stock: "", image_filename: "" });
      setImageData("");
      setPreview("");
      setTimeout(() => navigate("/admin"), 1200);
    } catch (err) {
      console.error("Create product error", err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || "Failed to create product. Check backend.";
      setMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="app">
        <Nav />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <h2>Access restricted</h2>
              <p>Admins only can add products.</p>
              <button className="btn" onClick={() => navigate("/")}>Back to store</button>
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
          <div className="page-header">
            <h1>Add Product</h1>
            <p className="subtitle">Create new catalog item with image upload</p>
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="p-name">Product Name</label>
                <input id="p-name" className="form-input" value={productForm.product_name} onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="p-brand">Brand</label>
                <input id="p-brand" className="form-input" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="p-category">Category</label>
                <input
                  id="p-category"
                  list="category-options"
                  className="form-input"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  placeholder="Select existing or type a new category"
                  required
                />
                <datalist id="category-options">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="p-price">Price</label>
                <input id="p-price" type="number" min="0" step="0.01" className="form-input" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="p-stock">Stock</label>
                <input id="p-stock" type="number" min="0" step="1" className="form-input" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="p-image-file">Upload Image</label>
                <input id="p-image-file" type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
              </div>
            </div>

            <div className="image-preview">
              <p className="stat-label">Preview</p>
              {preview ? (
                <img src={preview} alt="Preview" />
              ) : (
                <div className="image-placeholder">No image selected</div>
              )}
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Product"}
            </button>
            {message && <p className="muted" style={{ marginTop: "8px" }}>{message}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}
