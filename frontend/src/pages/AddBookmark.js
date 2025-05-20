// frontend/src/pages/AddBookmark.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AddBookmark({ API_BASE_URL }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You are not logged in.');
      setLoading(false);
      return;
    }

    try {
      // Basic client-side URL validation
      try {
        new URL(url);
      } catch (err) {
        setError('Please enter a valid URL.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include the JWT token
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setUrl(''); // Clear the input field
        // Optionally redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(data.message || 'Failed to add bookmark.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Add bookmark error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add New Link</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="url">URL:</label>
          <input
            type="url" // Use type="url" for better browser validation
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., https://example.com"
            required
          />
        </div>
        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Adding...' : 'Add Link'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
}

export default AddBookmark;