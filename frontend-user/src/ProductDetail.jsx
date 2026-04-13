import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = 'http://localhost:8080/api';

function ProductDetail({ addToCart, toggleWishlist, isInWishlist }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [recommendations, setRecommendations] = useState([]);

  // Review form state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Image zoom
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => { fetchProduct(); fetchReviews(); fetchRecommendations(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`${API}/products`);
      const products = await res.json();
      const found = products.find(p => p.id === parseInt(id));
      setProduct(found || null);
    } catch (err) { console.error('Failed to fetch product:', err); }
    finally { setLoading(false); }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API}/reviews/${id}`);
      setReviews(await res.json());
      const avgRes = await fetch(`${API}/reviews/average/${id}`);
      setAvgRating(await avgRes.json());
    } catch (err) { console.error('Failed to fetch reviews:', err); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API}/analytics/recommendations/${id}`);
      setRecommendations(await res.json());
    } catch (err) { console.error('Failed to fetch recommendations:', err); }
  };

  const handleSubmitReview = async () => {
    if (!reviewName.trim() || reviewRating === 0) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: parseInt(id), customerName: reviewName, rating: reviewRating, comment: reviewComment, reviewDate: new Date().toLocaleString() })
      });
      setReviewName(''); setReviewRating(0); setReviewComment('');
      fetchReviews();
    } catch (err) { console.error('Failed to submit review:', err); }
    finally { setSubmitting(false); }
  };

  const renderStars = (rating) => { let stars = ''; for (let i = 1; i <= 5; i++) stars += i <= rating ? '★' : '☆'; return stars; };

  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  if (loading) return <div className="loading"><div className="spinner"></div><p>Loading product...</p></div>;
  if (!product) return (
    <div className="product-detail-page"><Link to="/" className="back-link">← Back to Store</Link><div className="cart-empty"><div className="emoji">😕</div><h3>Product not found</h3><p>This product doesn't exist or has been removed.</p></div></div>
  );

  return (
    <div className="product-detail-page">
      <Link to="/" className="back-link">← Back to Store</Link>

      <div className="product-detail">
        <div className="detail-image" onMouseEnter={() => setIsZooming(true)} onMouseLeave={() => setIsZooming(false)} onMouseMove={handleImageMouseMove} style={{ cursor: 'zoom-in', overflow: 'hidden' }}>
          <img
            src={product.imageUrl || 'https://via.placeholder.com/300?text=Product'}
            alt={product.name}
            style={{ transform: isZooming ? 'scale(1.8)' : 'scale(1)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transition: isZooming ? 'none' : 'transform 0.3s' }}
          />
        </div>
        <div className="detail-info">
          {product.category && <span className="detail-category">{product.category}</span>}
          <h1 className="detail-name">{product.name}</h1>
          {avgRating > 0 && (
            <div className="product-rating" style={{ marginBottom: '12px' }}>
              <span className="stars" style={{ fontSize: '18px' }}>{renderStars(Math.round(avgRating))}</span>
              <span className="count" style={{ fontSize: '15px' }}>{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
            </div>
          )}
          <p className="detail-desc">{product.description || 'A high-quality product from our general store. Fresh, reliable, and delivered to your doorstep.'}</p>
          <div className="detail-price">₹{product.price}</div>
          <div className="detail-stock" style={{ color: product.stockQuantity < 10 ? '#EF4444' : '#10B981' }}>
            {product.stockQuantity > 0 ? `✓ ${product.stockQuantity} units in stock${product.stockQuantity < 10 ? ' — Hurry, limited stock!' : ''}` : '✕ Out of Stock'}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="detail-add-btn" onClick={() => addToCart(product)} disabled={product.stockQuantity <= 0}>
              {product.stockQuantity > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
            </button>
            <button className={`detail-wish-btn ${isInWishlist(product.id) ? 'active' : ''}`} onClick={() => toggleWishlist(product)}>
              {isInWishlist(product.id) ? '❤️ Wishlisted' : '🤍 Wishlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>🛍️ Frequently Bought Together</h3>
          <div className="rec-grid">
            {recommendations.map(rec => (
              <Link key={rec.id} to={`/product/${rec.id}`} className="rec-card">
                <img src={rec.imageUrl || 'https://via.placeholder.com/100'} alt={rec.name} />
                <div className="rec-name">{rec.name}</div>
                <div className="rec-price">₹{rec.price}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="reviews-section">
        <h3>Customer Reviews ({reviews.length})</h3>
        <div className="review-form">
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-secondary)' }}>Write a Review</h4>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onMouseEnter={() => setReviewHover(star)} onMouseLeave={() => setReviewHover(0)} onClick={() => setReviewRating(star)} style={{ color: star <= (reviewHover || reviewRating) ? '#F59E0B' : '#CBD5E1' }}>★</button>
            ))}
            {reviewRating > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>{reviewRating}/5</span>}
          </div>
          <input type="text" placeholder="Your name" value={reviewName} onChange={e => setReviewName(e.target.value)} />
          <textarea placeholder="Share your experience with this product... (optional)" value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} />
          <button className="submit-review-btn" onClick={handleSubmitReview} disabled={submitting || !reviewName.trim() || reviewRating === 0}>
            {submitting ? '⏳ Submitting...' : '✍️ Submit Review'}
          </button>
        </div>
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontSize: '14px' }}>No reviews yet. Be the first to review this product!</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <span className="reviewer">{review.customerName}</span>
                <span className="review-date">{review.reviewDate}</span>
              </div>
              <div className="review-stars">{renderStars(review.rating)}</div>
              {review.comment && <p className="review-text">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
