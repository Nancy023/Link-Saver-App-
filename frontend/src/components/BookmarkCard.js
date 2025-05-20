// frontend/src/components/BookmarkCard.js
import React from 'react';

function BookmarkCard({ bookmark, onDelete }) {
  return (
    <div className="link-card">
      <div className="header">
        {bookmark.favicon && (
          <img src={bookmark.favicon} alt="Favicon" className="favicon" />
        )}
        <h3>{bookmark.title || bookmark.url}</h3> {/* Display title if available, otherwise URL */}
      </div>
      <p>{bookmark.summary || 'No summary available.'}</p> {/* Display summary */}
      <p>
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
          {bookmark.url}
        </a>
      </p>
      <button onClick={() => onDelete(bookmark.id)} className="delete-button">
        Delete
      </button>
    </div>
  );
}

export default BookmarkCard;