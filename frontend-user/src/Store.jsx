import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api';

function Store({ addToCart, toggleWishlist, isInWishlist }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({});

  // Advanced filter state
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [stockFilter, setStockFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(data);
      setLoading(false);
      if (data.length > 0) {
        const maxPrice = Math.max(...data.map(p => p.price));
        setPriceRange([0, maxPrice]);
      }
      const ratingMap = {};
      for (const p of data) {
        try { const rRes = await fetch(`${API}/reviews/average/${p.id}`); ratingMap[p.id] = await rRes.json(); }
        catch { ratingMap[p.id] = 0; }
      }
      setRatings(ratingMap);
    } catch (err) { console.error('Failed to fetch products:', err); setLoading(false); }
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = category === 'All' || p.category === category;
    const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchRating = (ratings[p.id] || 0) >= minRating;
    const matchStock = stockFilter === 'all' ? true : stockFilter === 'instock' ? p.stockQuantity > 0 : p.stockQuantity <= 0;
    return matchSearch && matchCategory && matchPrice && matchRating && matchStock;
  });

  // Sort
  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'rating') filtered.sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));
  else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '★';
    if (half) stars += '★';
    for (let i = stars.length; i < 5; i++) stars += '☆';
    return stars;
  };

  const maxPrice = products.length ? Math.max(...products.map(p => p.price)) : 10000;

  if (loading) {
    return <div className="loading"><div className="spinner"></div><p>Loading products...</p></div>;
  }

  return (
    <>
      {/* Hero Banner */}
      <div className="hero">
        <h1>Your Neighbourhood<br /><span>General Store</span></h1>
        <p>Fresh groceries, daily essentials, and everything your home needs — delivered fast and fresh to your doorstep.</p>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-bar">
          <input type="text" placeholder="Search for products, groceries, essentials..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>⚙️</button>
          <button className="search-icon">🔍</button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="default">Default</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Max Price: ₹{priceRange[1]}</label>
            <input type="range" min="0" max={maxPrice} value={priceRange[1]} onChange={e => setPriceRange([0, Number(e.target.value)])} />
          </div>
          <div className="filter-group">
            <label>Min Rating</label>
            <div className="rating-filter-btns">
              {[0, 1, 2, 3, 4].map(r => (
                <button key={r} className={minRating === r ? 'active' : ''} onClick={() => setMinRating(r)}>
                  {r === 0 ? 'All' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label>Stock</label>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="instock">In Stock Only</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="categories-section">
        <h3>Shop by Category</h3>
        <div className="category-pills">
          {categories.map(cat => (
            <button key={cat} className={category === cat ? 'active' : ''} onClick={() => setCategory(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="products-section">
        <div className="section-header">
          <h2>{category === 'All' ? 'All Products' : category}</h2>
          <span className="product-count">{filtered.length} products</span>
        </div>
        <div className="product-grid">
          {filtered.map(product => (
            <div key={product.id} className="product-card">
              {product.stockQuantity <= 0 && <div className="out-of-stock-overlay">OUT OF STOCK</div>}
              {/* Wishlist Heart */}
              <button className={`wishlist-heart ${isInWishlist(product.id) ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}>
                {isInWishlist(product.id) ? '❤️' : '🤍'}
              </button>
              <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-image">
                  {product.stockQuantity > 0 && product.stockQuantity < 10 && <span className="low-stock-tag">Only {product.stockQuantity} left!</span>}
                  {product.category && <span className="category-tag">{product.category}</span>}
                  <img src={product.imageUrl || 'https://via.placeholder.com/150?text=Product'} alt={product.name} />
                </div>
              </Link>
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                {ratings[product.id] > 0 && (
                  <div className="product-rating">
                    <span className="stars">{renderStars(ratings[product.id])}</span>
                    <span className="count">{ratings[product.id].toFixed(1)}</span>
                  </div>
                )}
                <div className="product-bottom">
                  <span className="product-price">₹{product.price}</span>
                  <button className="add-btn" onClick={(e) => { e.preventDefault(); addToCart(product); }} disabled={product.stockQuantity <= 0} title={product.stockQuantity <= 0 ? 'Out of stock' : 'Add to cart'}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="loading"><p>No products found matching your search.</p></div>}
      </div>
    </>
  );
}

export default Store;