// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import BookmarkCard from '../components/BookmarkCard'; // This will be created next
import { Link } from 'react-router-dom'; // Import Link here

function Dashboard({ API_BASE_URL }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You are not logged in.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setBookmarks(data);
      } else {
        setError(data.message || 'Failed to fetch bookmarks.');
      }
    } catch (err) {
      setError('An error occurred while fetching bookmarks.');
      console.error('Fetch bookmarks error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this bookmark?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setBookmarks(bookmarks.filter(b => b.id !== id));
          alert('Bookmark deleted successfully!');
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to delete bookmark.');
        }
      } catch (err) {
        alert('An error occurred during deletion.');
        console.error('Delete bookmark error:', err);
      }
    }
  };

  if (loading) return <p>Loading bookmarks...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>Your Saved Links</h2>
      {bookmarks.length === 0 ? (
        <p>No links saved yet. <Link to="/add">Add one!</Link></p>
      ) : (
        <div className="bookmark-grid">
          {bookmarks.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;