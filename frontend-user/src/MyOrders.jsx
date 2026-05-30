import React, { useState } from 'react';

const API = 'http://localhost:8080/api';

const ORDER_STEPS = [
  { key: 'Order Received', label: 'Order Placed', icon: '🛒' },
  { key: 'Confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'Packed', label: 'Packed', icon: '📦' },
  { key: 'Out for Delivery', label: 'Out for Delivery', icon: '🚚' },
  { key: 'Delivered', label: 'Delivered', icon: '🎉' }
];

function OrderTimeline({ status }) {
  const currentIdx = ORDER_STEPS.findIndex(s => s.key === status);
  return (
    <div className="timeline">
      {ORDER_STEPS.map((step, idx) => {
        let stepClass = '';
        if (idx < currentIdx) stepClass = 'completed';
        else if (idx === currentIdx) stepClass = 'active';
        return (
          <div key={step.key} className={`step ${stepClass}`}>
            <div className="dot">{step.icon}</div>
            <div className="label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function getStatusClass(status) {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('returned') || s.includes('refund')) return 'returned';
  if (s.includes('out')) return 'out';
  if (s.includes('packed')) return 'packed';
  if (s.includes('received') || s.includes('confirmed')) return 'received';
  return 'pending';
}

function MyOrders({ showToast }) {
  const [phone, setPhone] = useState(() => localStorage.getItem('gs-phone') || '');
  const [orders, setOrders] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Return request state
  const [returnModal, setReturnModal] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnDesc, setReturnDesc] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnStatuses, setReturnStatuses] = useState({});

  const handleSearch = async () => {
    if (!phone.trim() || phone.length < 10) return;
    localStorage.setItem('gs-phone', phone);
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/track?phone=${phone}`);
      const data = await res.json();
      setOrders(data.reverse());
      setSearched(true);

      // Check return statuses for each order
      const statuses = {};
      for (const order of data) {
        try {
          const rRes = await fetch(`${API}/returns/check/${order.id}`);
          const rData = await rRes.json();
          if (rData.hasReturn) statuses[order.id] = rData.status;
        } catch (e) { /* ignore */ }
      }
      setReturnStatuses(statuses);
    } catch (err) { console.error('Failed to fetch orders:', err); }
    finally { setLoading(false); }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };

  const submitReturn = async () => {
    if (!returnReason) return showToast('⚠️ Please select a reason');
    setReturnSubmitting(true);
    try {
      await fetch(`${API}/returns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: returnModal.id, billNumber: returnModal.billNumber,
          customerName: returnModal.customerName, customerPhone: returnModal.contactNumber,
          reason: returnReason, description: returnDesc,
          refundAmount: returnModal.totalAmount
        })
      });
      showToast('📦 Return request submitted successfully!');
      setReturnModal(null); setReturnReason(''); setReturnDesc('');
      handleSearch(); // Refresh
    } catch (e) { showToast('❌ Failed to submit return'); }
    finally { setReturnSubmitting(false); }
  };

  return (
    <div className="my-orders-page">
      <h2>Track My Orders</h2>
      <p className="subtitle">Enter your phone number to see all your orders and their current status.</p>

      <div className="phone-search">
        <input type="tel" placeholder="Enter your 10-digit phone number" value={phone} onChange={e => setPhone(e.target.value)} onKeyPress={handleKeyPress} maxLength={10} />
        <button onClick={handleSearch} disabled={loading}>{loading ? '⏳' : '🔍 Track'}</button>
      </div>

      {searched && orders.length === 0 && (
        <div className="cart-empty">
          <div className="emoji">📭</div>
          <h3>No orders found</h3>
          <p>We couldn't find any orders linked to this phone number.</p>
        </div>
      )}

      {orders.map(order => (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <span className="order-id">#{order.billNumber}</span>
            <span className="order-date">{order.orderDate}</span>
          </div>
          <div className="order-items">{order.items}</div>
          <div className="order-footer">
            <span className="order-total">₹{order.totalAmount}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`status-pill ${getStatusClass(order.status)}`}>{order.status}</span>
              {/* Return button for delivered orders */}
              {order.status === 'Delivered' && !returnStatuses[order.id] && (
                <button onClick={() => setReturnModal(order)} className="return-btn">↩️ Return</button>
              )}
              {returnStatuses[order.id] && (
                <span className={`status-pill ${returnStatuses[order.id] === 'Approved' ? 'delivered' : returnStatuses[order.id] === 'Rejected' ? 'returned' : 'pending'}`}>
                  Return: {returnStatuses[order.id]}
                </span>
              )}
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
              >
                {expandedOrder === order.id ? 'Hide' : 'Track'}
              </button>
            </div>
          </div>
          {expandedOrder === order.id && (
            <div className="purchase-details-section">
              {/* Order Timeline */}
              <OrderTimeline status={order.status} />

              {/* Purchase Details Grid */}
              <div className="purchase-details-grid">
                {/* Items Breakdown */}
                <div className="purchase-detail-card">
                  <div className="purchase-detail-card-header">
                    <span className="purchase-detail-icon">🧾</span>
                    <h4>Items Ordered</h4>
                  </div>
                  <div className="purchase-items-list">
                    {order.items ? order.items.split(',').map((item, idx) => {
                      const trimmed = item.trim();
                      const match = trimmed.match(/^(\d+)x\s+(.+)$/);
                      const qty = match ? match[1] : '1';
                      const name = match ? match[2] : trimmed;
                      return (
                        <div key={idx} className="purchase-item-row">
                          <div className="purchase-item-info">
                            <span className="purchase-item-qty">{qty}×</span>
                            <span className="purchase-item-name">{name}</span>
                          </div>
                        </div>
                      );
                    }) : <span className="purchase-detail-value">—</span>}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="purchase-detail-card">
                  <div className="purchase-detail-card-header">
                    <span className="purchase-detail-icon">💳</span>
                    <h4>Payment Details</h4>
                  </div>
                  <div className="purchase-detail-rows">
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Amount</span>
                      <span className="purchase-detail-value" style={{ color: '#10B981', fontWeight: 900, fontSize: '16px' }}>₹{order.totalAmount}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Payment Mode</span>
                      <span className="purchase-detail-value">{order.paymentMode || 'Cash on Delivery'}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Status</span>
                      <span className={`purchase-payment-badge ${order.paymentStatus === 'Paid' ? 'paid' : 'unpaid'}`}>
                        {order.paymentStatus === 'Paid' ? '✅ Paid' : '⏳ ' + (order.paymentStatus || 'Unpaid')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="purchase-detail-card">
                  <div className="purchase-detail-card-header">
                    <span className="purchase-detail-icon">🚚</span>
                    <h4>Delivery Info</h4>
                  </div>
                  <div className="purchase-detail-rows">
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Address</span>
                      <span className="purchase-detail-value">{order.address || 'Not provided'}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Delivery Partner</span>
                      <span className="purchase-detail-value">
                        {order.deliveryBoy && order.deliveryBoy !== 'Pending Assignment'
                          ? <>🚴 <strong>{order.deliveryBoy}</strong></>
                          : <span style={{ color: 'var(--text-muted)' }}>Pending Assignment</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="purchase-detail-card">
                  <div className="purchase-detail-card-header">
                    <span className="purchase-detail-icon">📋</span>
                    <h4>Order Info</h4>
                  </div>
                  <div className="purchase-detail-rows">
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Order ID</span>
                      <span className="purchase-detail-value" style={{ fontFamily: 'monospace', fontWeight: 800, color: '#10B981' }}>{order.billNumber}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Customer</span>
                      <span className="purchase-detail-value">{order.customerName}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Phone</span>
                      <span className="purchase-detail-value">{order.contactNumber}</span>
                    </div>
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Ordered On</span>
                      <span className="purchase-detail-value">{order.orderDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Return Request Modal */}
      {returnModal && (
        <div className="modal-overlay" onClick={() => setReturnModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>↩️ Request Return</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Order: <strong>{returnModal.billNumber}</strong> — ₹{returnModal.totalAmount}
            </p>
            <div className="form-group">
              <label>Reason for Return *</label>
              <select value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                <option value="">Select a reason</option>
                <option value="Wrong Item">Wrong Item Received</option>
                <option value="Damaged">Item Damaged/Broken</option>
                <option value="Not Satisfied">Not Satisfied with Quality</option>
                <option value="Size/Quantity Issue">Size/Quantity Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Additional Details (optional)</label>
              <textarea placeholder="Describe the issue..." value={returnDesc} onChange={e => setReturnDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="place-order-btn" style={{ flex: 1 }} onClick={submitReturn} disabled={returnSubmitting}>
                {returnSubmitting ? '⏳ Submitting...' : '📦 Submit Return Request'}
              </button>
              <button onClick={() => setReturnModal(null)} style={{ flex: 0, padding: '14px 24px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyOrders;
