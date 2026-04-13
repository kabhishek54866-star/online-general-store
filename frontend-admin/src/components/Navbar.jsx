export default function Navbar() {
  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '15px 40px', 
      backgroundColor: '#ffffff', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0
    }}>
      
      {/* Store Logo/Name */}
      <h2 style={{ margin: 0, color: '#0c831f', fontSize: '24px' }}>
        🛒 General Store
      </h2>

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontWeight: 'bold', color: '#333' }}>
        <span style={{ cursor: 'pointer' }}>Home</span>
        <span style={{ cursor: 'pointer' }}>Categories</span>
        
        {/* Shopping Cart Button */}
        <button style={{ 
          padding: '10px 20px', 
          backgroundColor: '#0c831f', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          Cart (0)
        </button>
      </div>

    </nav>
  );
}