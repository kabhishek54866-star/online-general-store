import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Cart({ cart, updateQty, removeFromCart }) {
  const navigate = useNavigate();
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = subtotal > 500 ? 0 : 30;
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <h2>Shopping Cart</h2>
        <div className="cart-empty">
          <div className="emoji">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything to your cart yet. Browse our store and find something you love!</p>
          <Link to="/">Start Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h2>Shopping Cart ({cart.reduce((s, i) => s + i.qty, 0)} items)</h2>

      {cart.map(item => (
        <div key={item.id} className="cart-item">
          <img
            src={item.imageUrl || 'https://via.placeholder.com/80?text=Item'}
            alt={item.name}
          />
          <div className="item-details">
            <div className="item-name">{item.name}</div>
            <div className="item-price">₹{item.price} each</div>
          </div>
          <div className="qty-controls">
            <button onClick={() => updateQty(item.id, -1)}>−</button>
            <span>{item.qty}</span>
            <button onClick={() => updateQty(item.id, 1)}>+</button>
          </div>
          <div className="item-total">₹{(item.price * item.qty).toFixed(0)}</div>
          <button className="remove-btn" onClick={() => removeFromCart(item.id)} title="Remove">✕</button>
        </div>
      ))}

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(0)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? <span style={{ color: '#10B981', fontWeight: 700 }}>FREE</span> : `₹${deliveryFee}`}</span>
        </div>
        {subtotal <= 500 && (
          <div className="summary-row" style={{ color: '#10B981', fontWeight: 600 }}>
            <span>💡 Add ₹{(501 - subtotal).toFixed(0)} more for free delivery!</span>
          </div>
        )}
        <div className="summary-row total">
          <span>Total</span>
          <span className="value">₹{total.toFixed(0)}</span>
        </div>
      </div>

      <button className="checkout-btn" onClick={() => navigate('/checkout')}>
        Proceed to Checkout →
      </button>
    </div>
  );
}

export default Cart;
