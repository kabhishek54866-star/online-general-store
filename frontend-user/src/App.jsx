import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Store from './Store';
import Cart from './Cart';
import Checkout from './Checkout';
import MyOrders from './MyOrders';
import ProductDetail from './ProductDetail';
import Wishlist from './Wishlist';

const API = 'http://localhost:8080/api';

function Navbar({ cartCount, wishlistCount, darkMode, setDarkMode }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const userPhone = localStorage.getItem('gs-phone') || '';

  const fetchNotifications = async () => {
    if (!userPhone) return;
    try {
      const [nRes, uRes] = await Promise.all([
        fetch(`${API}/notifications/${userPhone}`),
        fetch(`${API}/notifications/unread/${userPhone}`)
      ]);
      setNotifications(await nRes.json());
      const u = await uRes.json();
      setUnreadCount(u.count || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [userPhone]);

  const markAllRead = async () => {
    if (!userPhone) return;
    try {
      await fetch(`${API}/notifications/read-all/${userPhone}`, { method: 'PUT' });
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${darkMode ? 'dark' : ''}`}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div className="logo">General<span>Store</span></div>
      </Link>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>🏪 Store</Link>
        <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''}>📦 Orders</Link>
        <Link to="/wishlist" className={location.pathname === '/wishlist' ? 'active' : ''}>
          ❤️ Wishlist
          {wishlistCount > 0 && <span className="badge wish-badge">{wishlistCount}</span>}
        </Link>
        <Link to="/cart" className={`cart-badge ${location.pathname === '/cart' ? 'active' : ''}`}>
          🛒 Cart
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </Link>

        {/* Notification Bell */}
        <button className="notif-bell" onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead(); }}>
          🔔
          {unreadCount > 0 && <span className="badge notif-badge">{unreadCount}</span>}
        </button>

        {/* Dark Mode Toggle */}
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Notification Dropdown */}
      {notifOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h4>🔔 Notifications</h4>
            <button onClick={() => setNotifOpen(false)}>✕</button>
          </div>
          {notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet</p>
          ) : (
            notifications.slice(0, 10).map(n => (
              <div key={n.id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{n.timestamp}</div>
              </div>
            ))
          )}
        </div>
      )}
    </nav>
  );
}

function AppContent() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gs-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('gs-wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gs-dark') === 'true');

  useEffect(() => { localStorage.setItem('gs-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('gs-wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => {
    localStorage.setItem('gs-dark', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQuantity) { showToast(`⚠️ Only ${product.stockQuantity} units available!`); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`✅ ${product.name} added to cart!`);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.qty + delta;
      if (newQty < 1) return i;
      if (newQty > i.stockQuantity) { showToast(`⚠️ Only ${i.stockQuantity} units available!`); return i; }
      return { ...i, qty: newQty };
    }));
  };

  const removeFromCart = (id) => { setCart(prev => prev.filter(i => i.id !== id)); showToast('🗑️ Item removed from cart'); };
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) { showToast(`💔 ${product.name} removed from wishlist`); return prev.filter(i => i.id !== product.id); }
      showToast(`❤️ ${product.name} added to wishlist!`);
      return [...prev, product];
    });
  };

  const moveToCart = (product) => {
    addToCart(product);
    setWishlist(prev => prev.filter(i => i.id !== product.id));
  };

  const isInWishlist = (id) => wishlist.some(i => i.id === id);

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlist.length} darkMode={darkMode} setDarkMode={setDarkMode} />
      <Routes>
        <Route path="/" element={<Store addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
        <Route path="/cart" element={<Cart cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} />} />
        <Route path="/checkout" element={<Checkout cart={cart} clearCart={clearCart} showToast={showToast} />} />
        <Route path="/orders" element={<MyOrders showToast={showToast} />} />
        <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
        <Route path="/wishlist" element={<Wishlist wishlist={wishlist} moveToCart={moveToCart} toggleWishlist={toggleWishlist} />} />
      </Routes>
      {toast && <div className="toast success">{toast}</div>}

      {/* Chat Bubble */}
      <ChatBubble />
    </>
  );
}

// ===== CHAT BUBBLE =====
function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [name, setName] = useState(() => localStorage.getItem('gs-chat-name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('gs-chat-phone') || '');
  const [chatStarted, setChatStarted] = useState(() => !!localStorage.getItem('gs-chat-phone'));

  const fetchMessages = async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/messages/${phone}`);
      setMessages(await res.json());
      await fetch(`${API}/messages/read/${phone}?readerType=CUSTOMER`, { method: 'PUT' });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (chatStarted && phone) { fetchMessages(); const i = setInterval(fetchMessages, 4000); return () => clearInterval(i); } }, [chatStarted, phone]);

  const startChat = () => {
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('gs-chat-name', name);
    localStorage.setItem('gs-chat-phone', phone);
    setChatStarted(true);
  };

  const sendMsg = async () => {
    if (!input.trim()) return;
    try {
      await fetch(`${API}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderType: 'CUSTOMER', senderName: name, customerPhone: phone, content: input }) });
      setInput('');
      fetchMessages();
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(!open)}>
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <span>💬 Chat with Store</span>
          </div>
          {!chatStarted ? (
            <div className="chat-start">
              <p>Enter your details to start chatting with us!</p>
              <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} />
              <button onClick={startChat}>Start Chat</button>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map(m => (
                  <div key={m.id} className={`chat-msg ${m.senderType === 'CUSTOMER' ? 'sent' : 'received'}`}>
                    <div className="chat-msg-content">{m.content}</div>
                    <div className="chat-msg-time">{m.timestamp?.split(' ')[1] || ''}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} />
                <button onClick={sendMsg}>➤</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;