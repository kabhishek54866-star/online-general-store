import React from 'react';
import { Link } from 'react-router-dom';

function Wishlist({ wishlist, moveToCart, toggleWishlist }) {
  if (wishlist.length === 0) {
    return (
      <div className="cart-page">
        <h2>My Wishlist</h2>
        <div className="cart-empty">
          <div className="emoji">❤️</div>
          <h3>Your wishlist is empty</h3>
          <p>Save products you love by clicking the heart icon while browsing the store.</p>
          <Link to="/">Browse Store</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h2>My Wishlist ({wishlist.length} items)</h2>

      {wishlist.map(item => (
        <div key={item.id} className="cart-item wishlist-item">
          <img
            src={item.imageUrl || 'https://via.placeholder.com/80?text=Item'}
            alt={item.name}
          />
          <div className="item-details">
            <Link to={`/product/${item.id}`} className="item-name" style={{ textDecoration: 'none', color: 'inherit' }}>
              {item.name}
            </Link>
            <div className="item-price">₹{item.price}</div>
            {item.stockQuantity > 0 ? (
              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>
                ✓ In Stock
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>
                ✕ Out of Stock
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="checkout-btn"
              style={{ width: 'auto', padding: '10px 20px', fontSize: '13px', margin: 0 }}
              onClick={() => moveToCart(item)}
              disabled={item.stockQuantity <= 0}
            >
              🛒 Move to Cart
            </button>
            <button
              className="remove-btn"
              onClick={() => toggleWishlist(item)}
              title="Remove from wishlist"
              style={{ fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <Link to="/" className="back-link" style={{ display: 'inline-block', marginTop: '20px' }}>
        ← Continue Shopping
      </Link>
    </div>
  );
}

export default Wishlist;
