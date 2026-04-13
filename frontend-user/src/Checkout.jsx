import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:8080/api';

function Checkout({ cart, clearCart, showToast }) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [paymentMode, setPaymentMode] = useState('Cash on Delivery');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [billNumber, setBillNumber] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = subtotal > 500 ? 0 : 30;
  const total = subtotal + deliveryFee - couponDiscount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch(`${API}/coupons/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderTotal: subtotal })
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discount);
        setCouponMsg(data.message);
        setCouponApplied(true);
        showToast(`🎉 ${data.message}`);
      } else {
        setCouponMsg(data.message);
        setCouponDiscount(0);
        setCouponApplied(false);
      }
    } catch (err) {
      setCouponMsg('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode(''); setCouponDiscount(0); setCouponMsg(''); setCouponApplied(false);
    showToast('Coupon removed');
  };

  const handlePlaceOrder = async () => {
    if (!customer.name.trim()) return showToast('⚠️ Please enter your name');
    if (!customer.phone.trim() || customer.phone.length < 10) return showToast('⚠️ Please enter a valid phone number');
    if (!customer.address.trim()) return showToast('⚠️ Please enter your delivery address');
    if (cart.length === 0) return showToast('⚠️ Cart is empty!');

    // Save phone for notifications
    localStorage.setItem('gs-phone', customer.phone);

    setLoading(true);
    const bill = "ORD-" + Math.floor(Math.random() * 90000 + 10000);

    const orderData = {
      customerName: customer.name, contactNumber: customer.phone, address: customer.address,
      paymentMode: paymentMode, totalAmount: total,
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      billNumber: bill, orderDate: new Date().toLocaleString(),
      status: 'Order Received',
      paymentStatus: paymentMode === 'Cash on Delivery' ? 'Unpaid' : 'Paid',
      deliveryBoy: 'Pending Assignment'
    };

    try {
      await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
      for (const item of cart) {
        const updatedProduct = { id: item.id, name: item.name, price: item.price, description: item.description, imageUrl: item.imageUrl, category: item.category, stockQuantity: item.stockQuantity - item.qty };
        await fetch(`${API}/products/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) });
      }
      setBillNumber(bill); setOrderPlaced(true); clearCart();
    } catch (error) { showToast('❌ Order failed. Check backend connection.'); }
    finally { setLoading(false); }
  };

  if (orderPlaced) {
    return (
      <div className="order-success">
        <div className="check-circle">✓</div>
        <h2>Order Placed Successfully!</h2>
        <p>Your order <strong>{billNumber}</strong> has been placed.{couponDiscount > 0 && ` You saved ₹${couponDiscount} with your coupon!`} Track it using your phone number.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/orders" className="checkout-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '14px 28px', width: 'auto' }}>📦 Track My Order</Link>
          <Link to="/" className="place-order-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '14px 28px', width: 'auto', textAlign: 'center' }}>🏪 Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <h2>Checkout</h2>
        <div className="cart-empty">
          <div className="emoji">🛒</div>
          <h3>Nothing to checkout</h3>
          <p>Your cart is empty. Add some products first!</p>
          <Link to="/">Browse Store</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link to="/cart" className="back-link">← Back to Cart</Link>
      <h2>Checkout</h2>

      <div className="checkout-form">
        <div className="form-group">
          <label>Full Name *</label>
          <input type="text" placeholder="Enter your full name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Phone Number *</label>
          <input type="tel" placeholder="10-digit phone number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} maxLength={10} />
        </div>
        <div className="form-group">
          <label>Delivery Address *</label>
          <textarea placeholder="House no, Street, Landmark, City, PIN" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Payment Method</label>
          <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
            <option value="Cash on Delivery">💵 Cash on Delivery</option>
            <option value="UPI">📱 UPI Payment</option>
            <option value="Card">💳 Credit/Debit Card</option>
          </select>
        </div>

        {/* Coupon Input */}
        <div className="coupon-section">
          <label>🎫 Have a coupon code?</label>
          {!couponApplied ? (
            <div className="coupon-input-row">
              <input placeholder="Enter coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
              <button onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? '...' : 'Apply'}</button>
            </div>
          ) : (
            <div className="coupon-applied">
              <span>🎉 <strong>{couponCode}</strong> — Save ₹{couponDiscount}</span>
              <button onClick={removeCoupon}>Remove</button>
            </div>
          )}
          {couponMsg && !couponApplied && <p className="coupon-error">{couponMsg}</p>}
        </div>

        {/* Order Summary */}
        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '14px', marginTop: '20px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Order Summary</h4>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>{item.qty}× {item.name}</span>
              <span style={{ fontWeight: 700 }}>₹{(item.price * item.qty).toFixed(0)}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid var(--border)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Delivery</span>
            <span style={{ fontWeight: 700, color: deliveryFee === 0 ? '#10B981' : 'inherit' }}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
          </div>
          {couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontWeight: 700, color: '#10B981' }}>Coupon Discount</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>-₹{couponDiscount}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <strong style={{ fontSize: '18px' }}>Total</strong>
            <strong style={{ fontSize: '18px', color: '#10B981' }}>₹{total.toFixed(0)}</strong>
          </div>
        </div>

        <button className="place-order-btn" onClick={handlePlaceOrder} disabled={loading}>
          {loading ? '⏳ Placing Order...' : `🛒 Place Order — ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}

export default Checkout;
