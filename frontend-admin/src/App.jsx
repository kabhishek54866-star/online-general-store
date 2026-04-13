import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8080/api';

const ORDER_STEPS = ['Order Received', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'];

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin-dark') === 'true');

  // POS / Billing State
  const [cart, setCart] = useState([]);
  const [billType, setBillType] = useState('Retail');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', gst: '' });
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');

  // Delivery Simulation
  const [deliveryBoys] = useState(['Rahul Kumar', 'Amit Singh', 'Sumit Oraon']);

  // Invoice Modal
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Alert Center
  const [showAlerts, setShowAlerts] = useState(false);

  // Charts data
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [statusDist, setStatusDist] = useState({});

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', expiryDate: '', usageLimit: '', description: '', isActive: true });

  // Chat
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState('');
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // Returns
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnModal, setReturnModal] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');

  useEffect(() => { localStorage.setItem('admin-dark', darkMode); }, [darkMode]);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, oRes] = await Promise.all([fetch(`${API}/products`), fetch(`${API}/orders`)]);
      setProducts(await pRes.json());
      setOrders(await oRes.json());
    } catch (err) { console.error("System Offline", err); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [sRes, tRes, rtRes, csRes, sdRes] = await Promise.all([
        fetch(`${API}/analytics/summary`),
        fetch(`${API}/analytics/top-products`),
        fetch(`${API}/analytics/revenue-trend`),
        fetch(`${API}/analytics/category-sales`),
        fetch(`${API}/analytics/status-distribution`)
      ]);
      setAnalytics(await sRes.json());
      setTopProducts(await tRes.json());
      setRevenueTrend(await rtRes.json());
      setCategorySales(await csRes.json());
      setStatusDist(await sdRes.json());
    } catch (err) { console.error("Analytics unavailable", err); }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try { const res = await fetch(`${API}/coupons`); setCoupons(await res.json()); } catch (e) { console.error(e); }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const [cRes, uRes] = await Promise.all([
        fetch(`${API}/messages/conversations`),
        fetch(`${API}/messages/unread-count`)
      ]);
      setConversations(await cRes.json());
      const u = await uRes.json();
      setUnreadMsgCount(u.count || 0);
    } catch (e) { console.error(e); }
  }, []);

  const fetchReturns = useCallback(async () => {
    try { const res = await fetch(`${API}/returns`); setReturnRequests(await res.json()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); fetchAnalytics(); fetchCoupons(); fetchConversations(); fetchReturns(); }, []);

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Low stock products
  const lowStockProducts = products.filter(p => p.stockQuantity < 10);
  const criticalStock = products.filter(p => p.stockQuantity <= 3);

  // --- POS FUNCTIONS ---
  const addToCart = (p) => {
    const existingInCart = cart.find(i => i.id === p.id);
    const currentQnty = existingInCart ? existingInCart.qnty : 0;
    if (p.stockQuantity <= currentQnty) { alert(`Stock Exhausted! Only ${p.stockQuantity} units available.`); return; }
    if (existingInCart) { setCart(cart.map(i => i.id === p.id ? { ...i, qnty: i.qnty + 1 } : i)); }
    else { setCart([...cart, { ...p, qnty: 1 }]); }
  };

  const handleCreateOrder = async () => {
    if (!customer.name || !customer.phone) return alert("Customer Name and Phone are required!");
    if (cart.length === 0) return alert("Cart is empty!");
    const orderData = {
      customerName: customer.name, contactNumber: customer.phone, address: customer.address,
      totalAmount: cart.reduce((s, i) => s + (i.price * i.qnty), 0),
      items: cart.map(i => `${i.qnty}x ${i.name}`).join(', '),
      billNumber: (billType === 'Wholesale' ? "GST-" : "RET-") + Math.floor(Math.random() * 90000),
      orderDate: new Date().toLocaleString(), status: 'Order Received',
      paymentStatus: paymentStatus, deliveryBoy: 'Pending Assignment'
    };
    try {
      await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
      for (const item of cart) {
        const updatedProduct = { ...item, stockQuantity: item.stockQuantity - item.qnty };
        delete updatedProduct.qnty;
        await fetch(`${API}/products/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) });
      }
      alert(`Success! ${billType} Invoice generated and Inventory updated!`);
      setCart([]); setCustomer({ name: '', phone: '', address: '', gst: '' });
      fetchData(); fetchAnalytics();
    } catch (error) { alert("Error processing order. Check backend connection."); }
  };

  // --- ORDER STATUS UPDATE ---
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await fetch(`${API}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...order, status: newStatus }) });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const assignDeliveryBoy = async (orderId, boy) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await fetch(`${API}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...order, deliveryBoy: boy }) });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const updatePayment = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await fetch(`${API}/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...order, paymentStatus: 'Paid' }) });
      fetchData(); fetchAnalytics();
    } catch (err) { console.error(err); }
  };

  // --- COUPON FUNCTIONS ---
  const handleCreateCoupon = async () => {
    if (!couponForm.code || !couponForm.discountValue) return alert("Code and Discount Value required!");
    try {
      await fetch(`${API}/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...couponForm, discountValue: Number(couponForm.discountValue), minOrderValue: couponForm.minOrderValue ? Number(couponForm.minOrderValue) : null, maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : null, usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null }) });
      setCouponForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', expiryDate: '', usageLimit: '', description: '', isActive: true });
      setShowCouponForm(false);
      fetchCoupons();
    } catch (e) { alert("Error creating coupon"); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try { await fetch(`${API}/coupons/${id}`, { method: 'DELETE' }); fetchCoupons(); } catch (e) { console.error(e); }
  };

  const toggleCoupon = async (coupon) => {
    try {
      await fetch(`${API}/coupons/${coupon.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...coupon, isActive: !coupon.isActive }) });
      fetchCoupons();
    } catch (e) { console.error(e); }
  };

  // --- CHAT FUNCTIONS ---
  const openChat = async (phone) => {
    setActiveChat(phone);
    try {
      const res = await fetch(`${API}/messages/${phone}`);
      setChatMessages(await res.json());
      await fetch(`${API}/messages/read/${phone}?readerType=ADMIN`, { method: 'PUT' });
      fetchConversations();
    } catch (e) { console.error(e); }
  };

  const sendAdminReply = async () => {
    if (!chatReply.trim() || !activeChat) return;
    try {
      await fetch(`${API}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderType: 'ADMIN', senderName: 'Store Admin', customerPhone: activeChat, content: chatReply }) });
      setChatReply('');
      openChat(activeChat);
    } catch (e) { console.error(e); }
  };

  // --- RETURN FUNCTIONS ---
  const handleReturnAction = async (returnReq, action) => {
    try {
      await fetch(`${API}/returns/${returnReq.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...returnReq, status: action, adminNotes: returnNotes, refundAmount: action === 'Approved' ? returnReq.refundAmount || 0 : 0 }) });
      setReturnModal(null); setReturnNotes('');
      fetchReturns(); fetchData();
    } catch (e) { console.error(e); }
  };

  // --- CSV EXPORT ---
  const exportCSV = (data, filename) => {
    if (!data.length) return alert("No data to export!");
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Theme colors
  const t = darkMode ? {
    bg: '#0B0F1A', sidebar: '#0D1117', card: '#161B22', cardBorder: '#21262D', text: '#E6EDF3', textSec: '#8B949E', textMuted: '#484F58',
    input: '#0D1117', inputBorder: '#30363D', accent: '#10B981', hover: '#1C2333', badge: '#21262D'
  } : {
    bg: '#F1F5F9', sidebar: '#0F172A', card: '#FFFFFF', cardBorder: '#F1F5F9', text: '#1E293B', textSec: '#64748B', textMuted: '#94A3B8',
    input: '#FAFBFC', inputBorder: '#E2E8F0', accent: '#10B981', hover: '#F8FAFC', badge: '#F1F5F9'
  };

  const sidebarStyle = { width: '280px', backgroundColor: t.sidebar, color: 'white', padding: '40px 20px', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 50 };
  const navBtn = (active) => ({ width: '100%', padding: '14px 16px', textAlign: 'left', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: active ? t.accent : 'transparent', color: active ? 'white' : '#94A3B8', fontWeight: 800, fontSize: '14px', transition: 'all 0.2s' });
  const panelCard = { background: t.card, padding: '35px', borderRadius: '24px', border: `1px solid ${t.cardBorder}` };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', color: t.text };
  const inputStyle = { width: '100%', padding: '14px', marginBottom: '12px', borderRadius: '10px', border: `1px solid ${t.inputBorder}`, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px', background: t.input, color: t.text };
  const smallBtn = (color) => ({ background: color, color: 'white', border: 'none', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s' });

  const pendingReturns = returnRequests.filter(r => r.status === 'Requested').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: t.bg, color: t.text }}>

      {/* ===== SIDEBAR ===== */}
      <div style={sidebarStyle}>
        <h2 style={{ color: '#10B981', marginBottom: '40px', letterSpacing: '1px', fontSize: '22px' }}>
          RANCHI<span style={{ color: '#fff' }}>POS</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button onClick={() => setCurrentView('dashboard')} style={navBtn(currentView === 'dashboard')}>📊 Dashboard</button>
          <button onClick={() => setCurrentView('pos')} style={navBtn(currentView === 'pos')}>🛒 Shop Billing</button>
          <button onClick={() => setCurrentView('orders')} style={navBtn(currentView === 'orders')}>📦 Order Ledger</button>
          <button onClick={() => setCurrentView('delivery')} style={navBtn(currentView === 'delivery')}>🚚 Dispatch Hub</button>
          <button onClick={() => setCurrentView('inventory')} style={navBtn(currentView === 'inventory')}>🛠️ Stock Master</button>
          <button onClick={() => setCurrentView('coupons')} style={navBtn(currentView === 'coupons')}>🎫 Coupons</button>
          <button onClick={() => setCurrentView('chat')} style={navBtn(currentView === 'chat')}>
            💬 Support{unreadMsgCount > 0 && <span style={{ background: '#EF4444', color: 'white', borderRadius: '50%', padding: '2px 7px', fontSize: '10px', marginLeft: '8px', fontWeight: 900 }}>{unreadMsgCount}</span>}
          </button>
          <button onClick={() => setCurrentView('returns')} style={navBtn(currentView === 'returns')}>
            📦 Returns{pendingReturns > 0 && <span style={{ background: '#F59E0B', color: 'white', borderRadius: '50%', padding: '2px 7px', fontSize: '10px', marginLeft: '8px', fontWeight: 900 }}>{pendingReturns}</span>}
          </button>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '30px', borderTop: '1px solid #1E293B', fontSize: '12px', color: '#64748B' }}>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: '1px solid #30363D', color: '#94A3B8', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', width: '100%', marginBottom: '10px' }}>
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <div>v3.0 — Full Suite</div>
          <div style={{ marginTop: '4px' }}>© RanchiPOS 2026</div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={{ flex: 1, marginLeft: '280px', padding: '30px 40px' }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: t.text }}>
              {currentView === 'dashboard' && '📊 Business Dashboard'}
              {currentView === 'pos' && '🛒 Point of Sale'}
              {currentView === 'orders' && '📦 Order Ledger'}
              {currentView === 'delivery' && '🚚 Dispatch Hub'}
              {currentView === 'inventory' && '🛠️ Stock Master'}
              {currentView === 'coupons' && '🎫 Coupon Manager'}
              {currentView === 'chat' && '💬 Support Inbox'}
              {currentView === 'returns' && '📦 Returns & Refunds'}
            </h1>
            <p style={{ color: t.textMuted, fontSize: '13px', margin: '4px 0 0' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Alert Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowAlerts(!showAlerts)} style={{ background: t.card, border: `2px solid ${t.cardBorder}`, borderRadius: '14px', padding: '10px 14px', fontSize: '20px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
              🔔
              {lowStockProducts.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{lowStockProducts.length}</span>}
            </button>
            {showAlerts && (
              <div style={{ position: 'absolute', top: '55px', right: 0, width: '360px', background: t.card, borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${t.cardBorder}`, zIndex: 100, maxHeight: '400px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: t.text }}>⚠️ Stock Alerts</h4>
                {lowStockProducts.length === 0 ? (
                  <p style={{ color: t.textMuted, fontSize: '13px' }}>All inventory levels healthy! ✅</p>
                ) : (
                  lowStockProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '10px', background: p.stockQuantity <= 3 ? (darkMode ? '#2D1215' : '#FEF2F2') : (darkMode ? '#2D2305' : '#FFFBEB'), marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={p.imageUrl} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} alt="" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: p.stockQuantity <= 3 ? '#EF4444' : '#F59E0B', fontWeight: 800 }}>
                            {p.stockQuantity <= 3 ? `🔴 CRITICAL — ${p.stockQuantity} left` : `⚠️ Low — ${p.stockQuantity} left`}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setCurrentView('inventory'); setShowAlerts(false); }} style={{ background: t.badge, border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: t.textSec }}>Restock</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== VIEW: DASHBOARD ===== */}
        {currentView === 'dashboard' && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <SummaryCard icon="💰" label="Total Revenue" value={`₹${analytics?.totalRevenue?.toLocaleString() || 0}`} color="#10B981" bg={darkMode ? '#0D2818' : '#ECFDF5'} t={t} />
              <SummaryCard icon="📦" label="Total Orders" value={analytics?.totalOrders || 0} color="#3B82F6" bg={darkMode ? '#0D1F3C' : '#EFF6FF'} t={t} />
              <SummaryCard icon="📊" label="Avg Order Value" value={`₹${analytics?.avgOrderValue || 0}`} color="#8B5CF6" bg={darkMode ? '#1A0D3C' : '#F5F3FF'} t={t} />
              <SummaryCard icon="⚠️" label="Low Stock Items" value={analytics?.lowStockCount || 0} color="#EF4444" bg={darkMode ? '#2D1215' : '#FEF2F2'} t={t} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Revenue Chart */}
              <div style={panelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ marginTop: 0, fontSize: '16px' }}>📈 Revenue Trend</h3>
                  <button onClick={() => exportCSV(revenueTrend, 'revenue_trend.csv')} style={smallBtn('#3B82F6')}>📤 Export</button>
                </div>
                <MiniBarChart data={revenueTrend} t={t} />
              </div>

              {/* Category Sales */}
              <div style={panelCard}>
                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>🏷️ Category Sales</h3>
                <DonutChart data={categorySales} t={t} />
              </div>

              {/* Payment Breakdown */}
              <div style={panelCard}>
                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>💳 Payment Overview</h3>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    {[{ label: 'Paid', count: analytics?.paidOrders || 0, color: '#10B981' }, { label: 'Unpaid', count: analytics?.unpaidOrders || 0, color: '#EF4444' }, { label: 'Delivered', count: analytics?.deliveredOrders || 0, color: '#3B82F6' }].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.cardBorder}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: r.color, display: 'inline-block' }}></span>
                          <span style={{ fontWeight: 600, color: t.textSec }}>{r.label}</span>
                        </div>
                        <strong style={{ color: r.color }}>{r.count}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: '120px', height: '120px' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#10B981 0% ${((analytics?.paidOrders || 0) / Math.max(analytics?.totalOrders || 1, 1)) * 100}%, #EF4444 ${((analytics?.paidOrders || 0) / Math.max(analytics?.totalOrders || 1, 1)) * 100}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: t.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px' }}>{analytics?.totalOrders || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div style={panelCard}>
                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>🏆 Top Selling Products</h3>
                {topProducts.length === 0 ? (
                  <p style={{ color: t.textMuted, fontSize: '13px' }}>No sales data yet. Start taking orders!</p>
                ) : (
                  topProducts.map((tp, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', background: idx === 0 ? '#FEF3C7' : idx === 1 ? t.badge : '#FFF7ED', color: idx === 0 ? '#B45309' : idx === 1 ? t.textSec : '#C2410C' }}>{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{tp.name}</div>
                        <div style={{ width: '100%', height: '6px', background: t.badge, borderRadius: '3px', marginTop: '4px' }}>
                          <div style={{ width: `${Math.min((tp.totalSold / Math.max(topProducts[0]?.totalSold || 1, 1)) * 100, 100)}%`, height: '6px', borderRadius: '3px', background: idx === 0 ? '#10B981' : idx === 1 ? '#3B82F6' : '#8B5CF6', transition: 'width 1s ease' }}></div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '14px', color: '#10B981' }}>{tp.totalSold}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Order Status Distribution + Recent Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '24px' }}>
              <div style={panelCard}>
                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>📊 Order Status</h3>
                {Object.entries(statusDist).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${t.cardBorder}` }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: t.textSec }}>{status}</span>
                    <span style={{ background: t.badge, padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 800 }}>{count}</span>
                  </div>
                ))}
              </div>
              <div style={panelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ marginTop: 0, fontSize: '16px' }}>🕐 Recent Activity</h3>
                  <button onClick={() => exportCSV(orders, 'all_orders.csv')} style={smallBtn('#3B82F6')}>📤 Export All</button>
                </div>
                {orders.length === 0 ? (
                  <p style={{ color: t.textMuted, fontSize: '13px' }}>No recent activity</p>
                ) : (
                  [...orders].reverse().slice(0, 8).map(o => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: `1px solid ${t.cardBorder}` }}>
                      <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: o.status === 'Delivered' ? (darkMode ? '#0D2818' : '#ECFDF5') : (darkMode ? '#2D2305' : '#FEF3C7') }}>{o.status === 'Delivered' ? '✅' : '📦'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{o.customerName} — <span style={{ color: '#10B981' }}>{o.billNumber}</span></div>
                        <div style={{ fontSize: '11px', color: t.textMuted }}>{o.orderDate}</div>
                      </div>
                      <strong>₹{o.totalAmount}</strong>
                      <span style={{ background: o.paymentStatus === 'Paid' ? (darkMode ? '#0D2818' : '#ECFDF5') : (darkMode ? '#2D1215' : '#FEF2F2'), color: o.paymentStatus === 'Paid' ? '#059669' : '#EF4444', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900 }}>{o.paymentStatus}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== VIEW: POS ===== */}
        {currentView === 'pos' && (
          <div style={{ display: 'flex', gap: '30px' }}>
            <div style={{ flex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Product Catalog</h2>
                <div style={{ background: t.badge, padding: '6px', borderRadius: '12px', display: 'flex', gap: '5px' }}>
                  <button onClick={() => setBillType('Retail')} style={{ padding: '8px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', backgroundColor: billType === 'Retail' ? t.card : 'transparent', fontWeight: 800, color: billType === 'Retail' ? t.text : t.textSec }}>{`Retail`}</button>
                  <button onClick={() => setBillType('Wholesale')} style={{ padding: '8px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', backgroundColor: billType === 'Wholesale' ? t.card : 'transparent', fontWeight: 800, color: billType === 'Wholesale' ? t.text : t.textSec }}>Wholesale (GST)</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: t.card, padding: '15px', borderRadius: '20px', border: `1px solid ${t.cardBorder}`, textAlign: 'center', transition: 'all 0.2s' }}>
                    <div style={{ background: t.badge, borderRadius: '12px', padding: '10px', marginBottom: '12px' }}>
                      <img src={p.imageUrl || 'https://via.placeholder.com/150?text=Product'} alt={p.name} style={{ width: '100%', height: '120px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '5px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: p.stockQuantity < 10 ? '#EF4444' : t.textSec, fontWeight: 600, marginBottom: '10px' }}>Stock: {p.stockQuantity}</div>
                    <div style={{ color: '#10B981', fontWeight: 800, fontSize: '18px', marginBottom: '12px' }}>₹{p.price}</div>
                    <button onClick={() => addToCart(p)} style={{ width: '100%', padding: '10px', background: darkMode ? '#21262D' : '#0F172A', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={p.stockQuantity <= 0}>{p.stockQuantity > 0 ? 'Add to Bill' : 'Out of Stock'}</button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, background: t.card, padding: '30px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', height: 'fit-content', position: 'sticky', top: '40px' }}>
              <h3 style={{ marginTop: 0, borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: '15px' }}>Checkout Details</h3>
              <input placeholder="Customer Name *" style={inputStyle} value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
              <input placeholder="Phone Number *" style={inputStyle} value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
              {billType === 'Wholesale' && <input placeholder="GSTIN" style={inputStyle} onChange={e => setCustomer({ ...customer, gst: e.target.value })} />}
              <textarea placeholder="Delivery Address" style={{ ...inputStyle, height: '70px' }} value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
              <div style={{ marginTop: '15px' }}>
                <label style={{ fontSize: '12px', color: t.textSec, fontWeight: 'bold' }}>PAYMENT STATUS</label>
                <select style={inputStyle} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="Unpaid">Unpaid / Cash on Delivery</option>
                  <option value="Paid">Paid / Digital Payment</option>
                </select>
              </div>
              <div style={{ background: t.badge, padding: '20px', borderRadius: '16px', marginTop: '20px' }}>
                {cart.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span>{i.qnty}x {i.name}</span>
                    <span style={{ fontWeight: 'bold' }}>₹{i.price * i.qnty}</span>
                  </div>
                ))}
                <div style={{ borderTop: `2px solid ${t.cardBorder}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '18px' }}>Total</strong>
                  <strong style={{ fontSize: '18px', color: '#10B981' }}>₹{cart.reduce((s, i) => s + (i.price * i.qnty), 0)}</strong>
                </div>
              </div>
              <button onClick={handleCreateOrder} style={{ width: '100%', marginTop: '25px', padding: '18px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}>FINALIZE & UPDATE STOCK</button>
            </div>
          </div>
        )}

        {/* ===== VIEW: ORDER LEDGER ===== */}
        {currentView === 'orders' && (
          <div style={panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0 }}>Order Fulfillment Tracking</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: 600 }}>{orders.length} total orders</span>
                <button onClick={() => exportCSV(orders, 'orders_export.csv')} style={smallBtn('#3B82F6')}>📤 Export CSV</button>
              </div>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: t.textSec, borderBottom: `2px solid ${t.cardBorder}` }}>
                  <th style={{ padding: '15px' }}>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...orders].reverse().map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    <td style={{ padding: '15px', fontWeight: 700 }}>{o.billNumber}</td>
                    <td><div style={{ fontWeight: 700 }}>{o.customerName}</div><div style={{ fontSize: '11px', color: t.textMuted }}>{o.contactNumber}</div></td>
                    <td style={{ fontSize: '12px', color: t.textSec, maxWidth: '200px' }}>{o.items}</td>
                    <td style={{ fontWeight: 800 }}>₹{o.totalAmount}</td>
                    <td>{o.paymentStatus === 'Paid' ? <span style={{ color: '#10B981', fontWeight: 'bold' }}>✅ Paid</span> : <button onClick={() => updatePayment(o.id)} style={smallBtn('#EF4444')}>Mark Paid</button>}</td>
                    <td><select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: `2px solid ${t.inputBorder}`, fontWeight: 700, fontSize: '12px', cursor: 'pointer', background: t.input, color: t.text }}>{ORDER_STEPS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td><button onClick={() => setInvoiceOrder(o)} style={smallBtn('#3B82F6')}>🧾 Invoice</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== VIEW: DELIVERY HUB ===== */}
        {currentView === 'delivery' && (
          <div style={panelCard}>
            <h2 style={{ marginTop: 0 }}>Delivery Assignment & Tracking</h2>
            <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
              {[...orders].reverse().filter(o => o.status !== 'Delivered').map(o => (
                <div key={o.id} style={{ background: t.badge, padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 800, marginBottom: '4px' }}>{o.billNumber} — {o.customerName}</div>
                    <div style={{ fontSize: '12px', color: t.textSec }}>{o.address || 'No address provided'}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>{o.items}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select value={o.deliveryBoy || ''} onChange={(e) => assignDeliveryBoy(o.id, e.target.value)} style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${t.inputBorder}`, fontWeight: 700, fontSize: '12px', cursor: 'pointer', background: t.input, color: t.text }}>
                      <option value="Pending Assignment">Assign Rider</option>
                      {deliveryBoys.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 900, background: o.status === 'Out for Delivery' ? '#FEF3C7' : o.status === 'Packed' ? '#E0E7FF' : '#DBEAFE', color: o.status === 'Out for Delivery' ? '#B45309' : o.status === 'Packed' ? '#4338CA' : '#1D4ED8' }}>{o.status}</span>
                  </div>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    {ORDER_STEPS.map((step, idx) => {
                      const currentIdx = ORDER_STEPS.indexOf(o.status);
                      return (
                        <React.Fragment key={step}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: idx <= currentIdx ? '#10B981' : (darkMode ? '#30363D' : '#E2E8F0'), color: idx <= currentIdx ? 'white' : t.textMuted, fontWeight: 800, transition: 'all 0.3s' }}>{idx < currentIdx ? '✓' : idx + 1}</div>
                          {idx < ORDER_STEPS.length - 1 && <div style={{ flex: 1, height: '3px', background: idx < currentIdx ? '#10B981' : (darkMode ? '#30363D' : '#E2E8F0'), borderRadius: '2px' }}></div>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status !== 'Delivered').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                  <p>All orders delivered! No pending dispatches.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VIEW: STOCK MASTER ===== */}
        {currentView === 'inventory' && (
          <div style={panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0 }}>Warehouse Management</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {criticalStock.length > 0 && <span style={{ background: darkMode ? '#2D1215' : '#FEF2F2', color: '#EF4444', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '12px' }}>🔴 {criticalStock.length} Critical</span>}
                <button onClick={() => exportCSV(products, 'inventory_export.csv')} style={smallBtn('#3B82F6')}>📤 Export CSV</button>
              </div>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: t.textSec, borderBottom: `2px solid ${t.cardBorder}` }}>
                  <th style={{ padding: '15px' }}>Product</th><th>Category</th><th>Rate</th><th>Stock</th><th>Bar</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                    <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><img src={p.imageUrl} style={{ width: '40px', height: '40px', objectFit: 'contain' }} alt="" /><strong>{p.name}</strong></td>
                    <td><span style={{ background: t.badge, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{p.category || '—'}</span></td>
                    <td style={{ fontWeight: 700 }}>₹{p.price}</td>
                    <td style={{ fontWeight: 900, color: p.stockQuantity < 10 ? (p.stockQuantity <= 3 ? '#EF4444' : '#F59E0B') : t.text }}>{p.stockQuantity}</td>
                    <td style={{ minWidth: '120px' }}><div style={{ width: '100%', height: '8px', background: t.badge, borderRadius: '4px' }}><div style={{ width: `${Math.min((p.stockQuantity / 100) * 100, 100)}%`, height: '8px', borderRadius: '4px', background: p.stockQuantity <= 3 ? '#EF4444' : p.stockQuantity < 10 ? '#F59E0B' : '#10B981', transition: 'width 0.5s' }}></div></div></td>
                    <td>{p.stockQuantity <= 3 ? <span style={{ color: '#EF4444', fontWeight: 900, fontSize: '12px' }}>🔴 CRITICAL</span> : p.stockQuantity < 10 ? <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: '12px' }}>⚠️ Low Stock</span> : <span style={{ color: '#10B981', fontWeight: 900, fontSize: '12px' }}>✅ Healthy</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== VIEW: COUPONS ===== */}
        {currentView === 'coupons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div></div>
              <button onClick={() => setShowCouponForm(!showCouponForm)} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>
                {showCouponForm ? '✕ Close' : '+ Create Coupon'}
              </button>
            </div>

            {showCouponForm && (
              <div style={{ ...panelCard, marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>Create New Coupon</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input placeholder="Coupon Code (e.g., WELCOME10)" style={inputStyle} value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value })} />
                  <select style={inputStyle} value={couponForm.discountType} onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                  <input placeholder="Discount Value" type="number" style={inputStyle} value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} />
                  <input placeholder="Min Order Value (optional)" type="number" style={inputStyle} value={couponForm.minOrderValue} onChange={e => setCouponForm({ ...couponForm, minOrderValue: e.target.value })} />
                  <input placeholder="Max Discount Cap (optional)" type="number" style={inputStyle} value={couponForm.maxDiscount} onChange={e => setCouponForm({ ...couponForm, maxDiscount: e.target.value })} />
                  <input placeholder="Usage Limit (optional)" type="number" style={inputStyle} value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: e.target.value })} />
                  <input placeholder="Expiry Date" type="date" style={inputStyle} value={couponForm.expiryDate} onChange={e => setCouponForm({ ...couponForm, expiryDate: e.target.value })} />
                  <input placeholder="Description" style={inputStyle} value={couponForm.description} onChange={e => setCouponForm({ ...couponForm, description: e.target.value })} />
                </div>
                <button onClick={handleCreateCoupon} style={{ marginTop: '16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}>✅ Create Coupon</button>
              </div>
            )}

            <div style={panelCard}>
              <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '20px' }}>Active Coupons ({coupons.length})</h3>
              {coupons.length === 0 ? (
                <p style={{ color: t.textMuted, textAlign: 'center', padding: '40px' }}>No coupons yet. Create your first coupon!</p>
              ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {coupons.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: t.badge, borderRadius: '14px', opacity: c.isActive ? 1 : 0.5 }}>
                      <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', padding: '12px 18px', borderRadius: '12px', fontWeight: 900, fontSize: '14px', letterSpacing: '1px', fontFamily: 'monospace' }}>{c.code}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}</div>
                        <div style={{ fontSize: '12px', color: t.textMuted }}>{c.description || 'No description'} • Min: ₹{c.minOrderValue || 0} • Used: {c.usedCount}/{c.usageLimit || '∞'}</div>
                      </div>
                      <button onClick={() => toggleCoupon(c)} style={smallBtn(c.isActive ? '#F59E0B' : '#10B981')}>{c.isActive ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => deleteCoupon(c.id)} style={smallBtn('#EF4444')}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VIEW: CHAT ===== */}
        {currentView === 'chat' && (
          <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 160px)' }}>
            <div style={{ width: '340px', ...panelCard, overflowY: 'auto', padding: '20px' }}>
              <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '16px' }}>Conversations</h3>
              {conversations.length === 0 ? (
                <p style={{ color: t.textMuted, fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No conversations yet</p>
              ) : (
                conversations.map(c => (
                  <div key={c.customerPhone} onClick={() => openChat(c.customerPhone)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', cursor: 'pointer', background: activeChat === c.customerPhone ? (darkMode ? '#1C2333' : '#EFF6FF') : 'transparent', marginBottom: '4px', transition: 'all 0.2s' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '16px' }}>{(c.customerName || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.customerName}</div>
                      <div style={{ fontSize: '12px', color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage}</div>
                    </div>
                    {c.unreadCount > 0 && <span style={{ background: '#10B981', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '11px', fontWeight: 900 }}>{c.unreadCount}</span>}
                  </div>
                ))
              )}
            </div>
            <div style={{ flex: 1, ...panelCard, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              {!activeChat ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                    <p>Select a conversation to start replying</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: '12px', marginBottom: '16px' }}>
                    <strong>Chat with {conversations.find(c => c.customerPhone === activeChat)?.customerName || activeChat}</strong>
                    <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: '10px' }}>📞 {activeChat}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {chatMessages.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.senderType === 'ADMIN' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                        <div style={{ maxWidth: '70%', background: m.senderType === 'ADMIN' ? 'linear-gradient(135deg, #10B981, #059669)' : t.badge, color: m.senderType === 'ADMIN' ? 'white' : t.text, padding: '12px 16px', borderRadius: '16px', borderBottomRightRadius: m.senderType === 'ADMIN' ? '4px' : '16px', borderBottomLeftRadius: m.senderType === 'ADMIN' ? '16px' : '4px' }}>
                          <div style={{ fontSize: '14px' }}>{m.content}</div>
                          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>{m.timestamp?.split(' ')[1] || ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <input placeholder="Type a reply..." style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={chatReply} onChange={e => setChatReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAdminReply()} />
                    <button onClick={sendAdminReply} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Send</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== VIEW: RETURNS ===== */}
        {currentView === 'returns' && (
          <div style={panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0 }}>Return & Refund Management</h2>
              <span style={{ fontSize: '13px', color: t.textMuted }}>{returnRequests.length} total requests</span>
            </div>
            {returnRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: t.textMuted }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                <p>No return requests yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {[...returnRequests].reverse().map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: t.badge, borderRadius: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: r.status === 'Requested' ? '#FEF3C7' : r.status === 'Approved' ? '#D1FAE5' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {r.status === 'Requested' ? '⏳' : r.status === 'Approved' ? '✅' : '❌'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{r.customerName} — <span style={{ color: '#10B981' }}>{r.billNumber}</span></div>
                      <div style={{ fontSize: '12px', color: t.textMuted }}>{r.reason} • {r.requestDate}</div>
                      {r.description && <div style={{ fontSize: '12px', color: t.textSec, marginTop: '4px' }}>"{r.description}"</div>}
                      {r.adminNotes && <div style={{ fontSize: '12px', color: '#3B82F6', marginTop: '4px' }}>Admin: {r.adminNotes}</div>}
                    </div>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 900, background: r.status === 'Requested' ? '#FEF3C7' : r.status === 'Approved' ? '#D1FAE5' : '#FEE2E2', color: r.status === 'Requested' ? '#B45309' : r.status === 'Approved' ? '#065F46' : '#991B1B' }}>{r.status}</span>
                    {r.status === 'Requested' && (
                      <button onClick={() => { setReturnModal(r); setReturnNotes(''); }} style={smallBtn('#3B82F6')}>Review</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== INVOICE MODAL ===== */}
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} billType={invoiceOrder.billNumber?.startsWith('GST') ? 'Wholesale' : 'Retail'} t={t} />}

      {/* ===== RETURN REVIEW MODAL ===== */}
      {returnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setReturnModal(null)}>
          <div style={{ background: t.card, padding: '30px', borderRadius: '24px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Review Return Request</h3>
            <div style={{ background: t.badge, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ margin: '4px 0' }}><strong>Order:</strong> {returnModal.billNumber}</p>
              <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {returnModal.customerName} ({returnModal.customerPhone})</p>
              <p style={{ margin: '4px 0' }}><strong>Reason:</strong> {returnModal.reason}</p>
              {returnModal.description && <p style={{ margin: '4px 0' }}><strong>Details:</strong> {returnModal.description}</p>}
            </div>
            <textarea placeholder="Admin notes / response to customer..." style={{ ...inputStyle, height: '80px' }} value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleReturnAction(returnModal, 'Approved')} style={{ flex: 1, padding: '14px', background: '#10B981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>✅ Approve & Refund</button>
              <button onClick={() => handleReturnAction(returnModal, 'Rejected')} style={{ flex: 1, padding: '14px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>❌ Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SUMMARY CARD COMPONENT =====
function SummaryCard({ icon, label, value, color, bg, t }) {
  return (
    <div style={{ background: t.card, padding: '24px', borderRadius: '20px', border: `1px solid ${t.cardBorder}`, transition: 'all 0.3s', cursor: 'default' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 900, color: t.text }}>{value}</div>
    </div>
  );
}

// ===== MINI BAR CHART (SVG) =====
function MiniBarChart({ data, t }) {
  if (!data || data.length === 0) return <p style={{ color: t.textMuted, fontSize: '13px' }}>No revenue data yet</p>;
  const maxVal = Math.max(...data.map(d => d.revenue || 0), 1);
  const barWidth = Math.max(20, Math.min(40, 600 / data.length - 8));
  const width = data.length * (barWidth + 8) + 40;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(width, 400)} height="200" viewBox={`0 0 ${Math.max(width, 400)} 200`}>
        {data.map((d, i) => {
          const h = (d.revenue / maxVal) * 150;
          const x = 30 + i * (barWidth + 8);
          return (
            <g key={i}>
              <rect x={x} y={180 - h} width={barWidth} height={h} rx="6" fill="url(#barGrad)" opacity="0.9" />
              <text x={x + barWidth / 2} y={195} textAnchor="middle" fontSize="9" fill={t.textMuted}>{d.date?.split('/')[0] || i + 1}</text>
              <text x={x + barWidth / 2} y={175 - h} textAnchor="middle" fontSize="10" fill={t.accent} fontWeight="700">₹{Math.round(d.revenue)}</text>
            </g>
          );
        })}
        <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs>
      </svg>
    </div>
  );
}

// ===== DONUT CHART (SVG) =====
function DonutChart({ data, t }) {
  if (!data || data.length === 0) return <p style={{ color: t.textMuted, fontSize: '13px' }}>No category data yet</p>;
  const total = data.reduce((s, d) => s + (d.sales || 0), 0) || 1;
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width="140" height="140" viewBox="0 0 36 36">
        {data.map((d, i) => {
          const pct = (d.sales / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const el = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={colors[i % colors.length]} strokeWidth="3.5" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += pct;
          return el;
        })}
        <circle cx="18" cy="18" r="12" fill={t.card} />
        <text x="18" y="19" textAnchor="middle" fontSize="4" fontWeight="900" fill={t.text}>₹{Math.round(total)}</text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.slice(0, 5).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: colors[i % colors.length], display: 'inline-block' }}></span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: t.textSec, flex: 1 }}>{d.category}</span>
            <span style={{ fontSize: '13px', fontWeight: 800 }}>₹{d.sales}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== INVOICE MODAL COMPONENT =====
function InvoiceModal({ order, onClose, billType, t }) {
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-printable');
    const win = window.open('', '', 'width=800,height=900');
    win.document.write(`<html><head><title>Invoice - ${order.billNumber}</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1E293B; } .header { text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 20px; } .header h1 { color: #10B981; margin: 0; } .header p { color: #64748B; margin: 4px 0; font-size: 13px; } table { width: 100%; border-collapse: collapse; margin: 20px 0; } th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E2E8F0; } th { background: #F8FAFC; font-weight: 700; font-size: 12px; text-transform: uppercase; color: #64748B; } .total-row td { font-weight: 900; font-size: 16px; border-top: 2px solid #1E293B; } .footer { text-align: center; margin-top: 40px; color: #94A3B8; font-size: 12px; }</style></head><body>${printContent.innerHTML}</body></html>`);
    win.document.close(); win.print();
  };

  const items = order.items ? order.items.split(',').map(item => { const parts = item.trim().split('x '); return { qty: parseInt(parts[0]) || 1, name: parts[1] || item.trim() }; }) : [];
  const subtotal = order.totalAmount || 0;
  const isGST = billType === 'Wholesale';
  const gstAmount = isGST ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + gstAmount;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: t.card, padding: '30px', borderRadius: '24px', width: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🧾 Invoice Preview</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrint} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>🖨️ Print</button>
            <button onClick={onClose} style={{ background: t.badge, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', color: t.text }}>✕</button>
          </div>
        </div>
        <div id="invoice-printable" style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#1E293B' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', marginBottom: '20px' }}>
            <h1 style={{ color: '#10B981', margin: 0, fontSize: '24px' }}>RANCHI<span style={{ color: '#1E293B' }}>POS</span></h1>
            <p style={{ color: '#64748B', margin: '4px 0', fontSize: '13px' }}>General Store — Ranchi, Jharkhand</p>
            <p style={{ color: '#64748B', margin: '2px 0', fontSize: '12px' }}>{isGST ? 'TAX INVOICE (GST)' : 'RETAIL INVOICE'}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
            <div><strong>Bill To:</strong><br />{order.customerName}<br />{order.contactNumber}<br />{order.address || '—'}</div>
            <div style={{ textAlign: 'right' }}><strong>Invoice:</strong> {order.billNumber}<br /><strong>Date:</strong> {order.orderDate}<br /><strong>Payment:</strong> {order.paymentStatus}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F8FAFC' }}><th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>#</th><th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Item</th><th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Qty</th></tr></thead>
            <tbody>{items.map((item, idx) => (<tr key={idx}><td style={{ padding: '10px', borderBottom: '1px solid #F1F5F9' }}>{idx + 1}</td><td style={{ padding: '10px', borderBottom: '1px solid #F1F5F9', fontWeight: 600 }}>{item.name}</td><td style={{ padding: '10px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>{item.qty}</td></tr>))}</tbody>
          </table>
          <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '14px' }}>
            <div style={{ marginBottom: '6px' }}>Subtotal: <strong>₹{subtotal}</strong></div>
            {isGST && <div style={{ marginBottom: '6px', color: '#64748B' }}>GST (18%): <strong>₹{gstAmount}</strong></div>}
            <div style={{ fontSize: '20px', fontWeight: 900, borderTop: '2px solid #1E293B', paddingTop: '10px', marginTop: '10px' }}>Grand Total: <span style={{ color: '#10B981' }}>₹{grandTotal}</span></div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#94A3B8', fontSize: '12px' }}><p>Thank you for your business! — RanchiPOS</p></div>
        </div>
      </div>
    </div>
  );
}

export default App;