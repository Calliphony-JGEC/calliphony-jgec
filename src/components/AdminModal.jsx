import React, { useState } from 'react';

export default function AdminModal({ isOpen, onClose, onAddEvent }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Live Concert');
  const [date, setDate] = useState('October 18, 2026');
  const [type, setType] = useState('photo');
  const [description, setDescription] = useState('');
  const [isBlankPlaceholder, setIsBlankPlaceholder] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Please provide at least a title and description.");
      return;
    }

    const newEvent = {
      id: Date.now(),
      title,
      category,
      date,
      type,
      mediaUrl: isBlankPlaceholder ? "" : "/images/concert.png",
      description,
      tag: isBlankPlaceholder ? "New Slot" : "Live Feed",
      isBlankPlaceholder
    };

    onAddEvent(newEvent);
    alert("Event added to the showcase. In production this syncs to Firebase.");
    onClose();
    setTitle('');
    setDescription('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ×
        </button>

        <span style={{ color: 'var(--riso-red)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ■ Admin Portal
        </span>
        <h2 className="section-heading" style={{ marginTop: '8px', marginBottom: '8px', fontSize: '2rem' }}>
          upload content.
        </h2>
        
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.92rem', marginBottom: '24px' }}>
          Upload pictures, videos, or reserve blank feature slots directly 
          onto the public landing page — no backend code required.
        </p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ev-title">Event Title</label>
            <input 
              id="ev-title"
              type="text" 
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="ev-cat">Category</label>
              <select 
                id="ev-cat"
                className="form-select" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Live Concert">Live Concert</option>
                <option value="Acoustic Session">Acoustic Session</option>
                <option value="Workshop">Workshop</option>
                <option value="Competition">Competition</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ev-date">Date</label>
              <input 
                id="ev-date"
                type="text" 
                className="form-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="ev-type">Media Type</label>
              <select 
                id="ev-type"
                className="form-select" 
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={isBlankPlaceholder}
                  onChange={(e) => setIsBlankPlaceholder(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--riso-red)' }}
                />
                <span style={{ color: 'var(--ink-black)', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal' }}>Blank placeholder</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ev-desc">Description</label>
            <textarea 
              id="ev-desc"
              className="form-textarea" 
              rows="3"
              placeholder="Describe the event highlights..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Publish →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
