import { useState } from "react";
import { formatPrice } from "../../utils/currency";

export default function Products() {
  const [products] = useState([
    {
      _id: "1",
      name: "سكر أبيض",
      description: "كيس 1 كغ جودة عالية",
      price: 25,
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c"
    },
    {
      _id: "2",
      name: "زيت نباتي",
      description: "زيت طبخ صحي 2 لتر",
      price: 48,
      image: "https://images.unsplash.com/photo-1604908177522-040f8b8b1b5f"
    },
    {
      _id: "3",
      name: "أرز بسمتي",
      description: "أرز فاخر طويل الحبة",
      price: 60,
      image: "https://images.unsplash.com/photo-1603048297172-c92544798d5a"
    }
  ]);

  const handleAddToCart = (product) => {
    alert(`تمت إضافة ${product.name} إلى السلة 🛒`);
  };

  return (
    <div className="grid-page">
      <h2 className="title">📦 المنتجات المتاحة</h2>

      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p._id}>
            <img src={p.image} alt={p.name} />

            <div className="info">
              <h3>{p.name}</h3>
              <p>{p.description}</p>

              <div className="bottom">
                <span className="price">{formatPrice(p.price, p.currency)}</span>

                <button onClick={() => handleAddToCart(p)}>
                  إضافة للسلة
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}