import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { checkMediaValidity, filterValidEvents } from '../../utils/mediaValidity';


const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;


async function uploadToCloudinary(file, folderName, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  // store specifically in calliphony-events / <Event Name>
  const cleanFolderName = folderName.trim().replace(/\/+/g, '-');
  formData.append('folder', `calliphony-events/${cleanFolderName}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          secure_url: data.secure_url,
          resource_type: data.resource_type, // 'image' or 'video'
        });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

export default function AdminUpload() {
  // new/existing modess
  const [mode, setMode] = useState('new');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');

  const [selectedEventName, setSelectedEventName] = useState('');
  const [existingEventsList, setExistingEventsList] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  
  const fetchEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'events'));
      const evList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = (data.eventName || data.title || '').trim();
        if (name) {
          let mediaList = Array.isArray(data.mediaList) ? [...data.mediaList] : [];
          if (data.mediaUrl && !mediaList.some(m => m.url === data.mediaUrl)) {
            mediaList.unshift({ url: data.mediaUrl, type: data.mediaType || 'image' });
          }
          evList.push({
            docId: docSnap.id,
            name,
            ...data,
            mediaList,
          });
        }
      });
      evList.sort((a, b) => a.name.localeCompare(b.name));
      const validEvList = await filterValidEvents(evList);
      // prune the docs from firestore if deleted from cloudinary
      evList.forEach(async (ev) => {
        if (!validEvList.some(v => v.docId === ev.docId)) {
          try { await deleteDoc(doc(db, 'events', ev.docId)); } catch (e) { console.warn(e); }
        }
      });
      setExistingEventsList(validEvList);
    } catch (err) {
      console.warn('Could not fetch existing events:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const syncExistingMedia = async () => {
      if (mode === 'existing' && selectedEventName) {
        const found = existingEventsList.find((ev) => ev.name === selectedEventName);
        if (found && !isCancelled) {
          setEditEventName(found.eventName || found.title || found.name || '');
          setEditEventDate(found.eventDate || found.date || '');
          setEditEventDescription(found.eventDescription || found.description || '');
        }
        if (found && Array.isArray(found.mediaList)) {
          const validity = await Promise.all(
            found.mediaList.map((item) => checkMediaValidity(item.url, item.type))
          );
          if (!isCancelled) {
            const liveMedia = found.mediaList.filter((_, i) => validity[i]);
            setExistingMedia(liveMedia);
          }
        } else if (!isCancelled) {
          setExistingMedia([]);
        }
      } else if (!isCancelled) {
        setExistingMedia([]);
        setEditEventName('');
        setEditEventDate('');
        setEditEventDescription('');
      }
    };
    syncExistingMedia();
    return () => { isCancelled = true; };
  }, [mode, selectedEventName, existingEventsList]);

  const removeExistingMediaItem = (indexToRemove) => {
    setExistingMedia((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    const newFiles = selected.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const getMediaType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'unknown';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resetForm = () => {
    setEventTitle('');
    setEventDate('');
    setEventDescription('');
    setSelectedEventName('');
    setEditEventName('');
    setEditEventDate('');
    setEditEventDescription('');
    setExistingMedia([]);
    setError('');
    setFiles((prev) => {
      prev.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      return [];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setError('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
      return;
    }

    const finalEventName = (mode === 'new' ? eventTitle : selectedEventName).trim();

    if (!finalEventName) {
      setError(mode === 'new' ? 'Please enter an event title.' : 'Please select an existing event.');
      return;
    }

    if (mode === 'new' && !eventDate.trim()) {
      setError('Please enter the event date.');
      return;
    }

    if (mode === 'new' && files.length === 0) {
      setError('Please select at least one image or video file to publish a new showcase.');
      return;
    }
    if (mode === 'existing' && files.length === 0 && existingMedia.length === 0) {
      setError('An event cannot have zero media items. Please retain at least one existing item or upload new files.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;
      const uploadedMedia = [];

      if (totalFiles > 0) {
        for (const fileObj of files) {
          const { file } = fileObj;
          // upload to cloudinary under subfolder calliphony-events/<Event Name>
          const result = await uploadToCloudinary(file, finalEventName, (fileProgress) => {
            const overallProgress = ((completedFiles + fileProgress) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });

          uploadedMedia.push({
            url: result.secure_url,
            type: result.resource_type === 'video' ? 'video' : 'image',
          });

          completedFiles++;
          setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
        }
      }

      if (mode === 'new') {
        const docData = {
          eventName: finalEventName,
          title: finalEventName,
          eventDate: eventDate.trim(),
          eventDescription: eventDescription.trim(),
          mediaList: uploadedMedia,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'events'), docData);
        setSuccessMessage(`Successfully published ${totalFiles} file${totalFiles > 1 ? 's' : ''} to Cloudinary folder "calliphony-events/${finalEventName}" and created event in Firestore!`);
        resetForm();
        await fetchEvents();
      } else {
        const foundEvent = existingEventsList.find((ev) => ev.name === finalEventName);
        let targetDocId = foundEvent ? foundEvent.docId : null;

        if (!targetDocId) {
          const q = query(collection(db, 'events'), where('eventName', '==', finalEventName));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetDocId = snapshot.docs[0].id;
          } else {
            const q2 = query(collection(db, 'events'), where('title', '==', finalEventName));
            const snapshot2 = await getDocs(q2);
            if (!snapshot2.empty) targetDocId = snapshot2.docs[0].id;
          }
        }

        if (targetDocId) {
          // synchronize the retained existing media plus any newly uploaded cloudinary items and updated metadata
          const updatedMediaList = [...existingMedia, ...uploadedMedia];
          const newName = (editEventName || finalEventName).trim();
          await updateDoc(doc(db, 'events', targetDocId), {
            eventName: newName,
            title: newName,
            eventDate: (editEventDate || '').trim(),
            eventDescription: (editEventDescription || '').trim(),
            mediaList: updatedMediaList
          });
          setSuccessMessage(`Successfully synchronized changes with Cloudinary and Firestore! Archive updated for "${newName}".`);
          setSelectedEventName(newName);
          setFiles((prev) => {
            prev.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
            return [];
          });
          await fetchEvents();
        } else {
          setError(`Could not locate existing event "${finalEventName}" in Firestore.`);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(`Upload failed: ${err.message || 'Unknown error. Please try again.'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // auto-scroll to top when a showcase is published, changes are saved, or an error occurs
  useEffect(() => {
    if (successMessage || error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [successMessage, error]);

  // auto-dismiss success message after 6s
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  return (
    <div className="admin-upload-container">
      <div className="admin-upload-header" style={{ marginBottom: '32px' }}>
        <span className="admin-tag">■ Upload Dashboard</span>
        <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px', marginBottom: '8px' }}>
          upload content.
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-body)', maxWidth: '600px' }}>
          Upload images and videos directly to dedicated Cloudinary folders.
        </p>
      </div>

      
      {successMessage && (
        <div className="admin-success-banner">
          <span>✓</span> {successMessage}
        </div>
      )}

      
      {error && (
        <div className="admin-error-banner">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="admin-upload-card glass-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          {/* mode toggle */}
          <div className="admin-mode-toggle">
            <button
              type="button"
              className={`admin-mode-btn ${mode === 'new' ? 'active' : ''}`}
              onClick={() => setMode('new')}
              disabled={uploading}
            >
              + New Event
            </button>
            <button
              type="button"
              className={`admin-mode-btn ${mode === 'existing' ? 'active' : ''}`}
              onClick={() => setMode('existing')}
              disabled={uploading}
            >
              ↻ Existing Event
            </button>
          </div>

          
          {mode === 'new' ? (
            <>
              <div className="form-group">
                <label htmlFor="upload-event-title">Event Title</label>
                <input
                  id="upload-event-title"
                  type="text"
                  className="form-input"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  disabled={uploading}
                  required
                />
                {/* <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)', marginTop: '4px', display: 'block' }}>
                  A Cloudinary folder named <strong>calliphony-events/{eventTitle.trim() || 'EventName'}</strong> will automatically store these files.
                </span> */}
              </div>

              <div className="form-group">
                <label htmlFor="upload-event-date">Event Date</label>
                <input
                  id="upload-event-date"
                  type="date"
                  className="form-input"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="upload-event-desc">Description</label>
                <textarea
                  id="upload-event-desc"
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe the event highlights, performers, venue..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  disabled={uploading}
                ></textarea>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="upload-existing-event">Select Event to Manage Media Archive</label>
                {existingEventsList.length > 0 ? (
                  <select
                    id="upload-existing-event"
                    className="form-select"
                    value={selectedEventName}
                    onChange={(e) => setSelectedEventName(e.target.value)}
                    disabled={uploading}
                    required
                  >
                    <option value="">— Choose an existing event —</option>
                    {existingEventsList.map((ev) => (
                      <option key={ev.docId} value={ev.name}>{ev.name}</option>
                    ))}
                  </select>
                ) : (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '12px 0' }}>
                    No events found in archive yet. Create a new event first.
                  </p>
                )}
                {selectedEventName && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)', marginTop: '4px', display: 'block' }}>
                    Manage existing media below or append new photos/videos into Cloudinary folder <strong>calliphony-events/{selectedEventName}</strong>.
                  </span>
                )}
              </div>

              {selectedEventName && (
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-paper)', border: '1px solid var(--border-ink)', marginTop: '20px', marginBottom: '24px' }}>
                  <span style={{ display: 'block', color: 'var(--riso-red)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-label)' }}>
                    ■ Edit Event Details & Metadata
                  </span>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-event-title" style={{ fontSize: '0.88rem' }}>Event Title / Name</label>
                    <input
                      id="edit-event-title"
                      type="text"
                      className="form-input"
                      value={editEventName}
                      onChange={(e) => setEditEventName(e.target.value)}
                      disabled={uploading}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-event-date" style={{ fontSize: '0.88rem' }}>Event Date</label>
                    <input
                      id="edit-event-date"
                      type="date"
                      className="form-input"
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      disabled={uploading}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="edit-event-desc" style={{ fontSize: '0.88rem' }}>Description</label>
                    <textarea
                      id="edit-event-desc"
                      className="form-textarea"
                      rows="3"
                      value={editEventDescription}
                      onChange={(e) => setEditEventDescription(e.target.value)}
                      disabled={uploading}
                      placeholder="Describe the showcase highlights..."
                    ></textarea>
                  </div>
                </div>
              )}

              {selectedEventName && (
                <div className="form-group" style={{ marginTop: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink-black)' }}>
                      Existing Media Archive ({existingMedia.length} item{existingMedia.length !== 1 ? 's' : ''})
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--riso-red)', fontWeight: 600, padding: '4px 10px', background: 'oklch(52% 0.23 27 / 0.08)', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid oklch(52% 0.23 27 / 0.2)' }}>
                      ⚠ Changes occur only when "SAVE CHANGES" is clicked
                    </span>
                  </div>
                  {existingMedia.length > 0 ? (
                    <div className="admin-file-previews" style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px', border: '1px solid var(--border-ink)', borderRadius: 'var(--radius-md)', background: 'var(--bg-paper)' }}>
                      {existingMedia.map((item, idx) => (
                        <div key={item.url || idx} className="admin-file-preview-item glass-card" style={{ position: 'relative' }}>
                          <div className="admin-file-preview-media">
                            {item.type === 'video' ? (
                              <div className="admin-file-preview-video">
                                <span>🎬</span>
                              </div>
                            ) : (
                              <img src={item.url} alt={`Archive asset ${idx + 1}`} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                            )}
                          </div>
                          <div className="admin-file-preview-info">
                            <span className="admin-file-preview-name" title={item.url} style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>
                              {item.url.split('/').pop() || `Asset #${idx + 1}`}
                            </span>
                            <span className="admin-file-preview-size" style={{ color: 'var(--ink-light)', fontWeight: 600 }}>
                              Cloudinary ({item.type || 'image'})
                            </span>
                          </div>
                          {!uploading && (
                            <button
                              type="button"
                              className="admin-file-remove-btn"
                              onClick={() => removeExistingMediaItem(idx)}
                              title="Remove item (will sync when SAVE CHANGES is clicked)"
                              style={{ background: 'var(--riso-red)', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '16px', border: '1px dashed var(--border-ink)', borderRadius: 'var(--radius-md)' }}>
                      No existing media items remain in this event archive.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>{mode === 'existing' ? 'Append New Photos & Videos (Optional)' : 'Photos & Videos'}</label>
            <div
              className={`admin-drop-zone ${files.length > 0 ? 'has-files' : ''}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              <div className="admin-drop-zone-content">
                <span className="admin-drop-icon">
                  {files.length > 0 ? '📎' : '📷'}
                </span>
                <strong>
                  {files.length > 0
                    ? `${files.length} file${files.length > 1 ? 's' : ''} selected — click to add more`
                    : 'Click to select photos or videos from your computer'}
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>
                  Accepts images (.jpg, .png, .webp) and videos (.mp4, .mov, .webm) · Min 1 file
                </span>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="admin-file-previews">
              {files.map((fileObj) => (
                <div key={fileObj.id} className="admin-file-preview-item glass-card">
                  <div className="admin-file-preview-media">
                    {fileObj.preview ? (
                      <img src={fileObj.preview} alt={fileObj.file.name} />
                    ) : (
                      <div className="admin-file-preview-video">
                        <span>🎬</span>
                      </div>
                    )}
                  </div>
                  <div className="admin-file-preview-info">
                    <span className="admin-file-preview-name" title={fileObj.file.name}>
                      {fileObj.file.name}
                    </span>
                    <span className="admin-file-preview-size">
                      {formatFileSize(fileObj.file.size)} · {getMediaType(fileObj.file)}
                    </span>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      className="admin-file-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeFile(fileObj.id); }}
                      title="Remove file"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="admin-progress-container">
              <div className="admin-progress-bar">
                <div
                  className="admin-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="admin-progress-text">
                Uploading...{uploadProgress}%
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn-secondary btn-ink-stamp"
              onClick={resetForm}
              disabled={uploading}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn-primary btn-ink-stamp"
              disabled={uploading || (mode === 'new' ? files.length === 0 : !selectedEventName)}
            >
              {uploading ? (
                <>
                  <span className="admin-spinner"></span>
                  {mode === 'existing' ? 'Saving Changes...' : 'Publishing Showcase...'}
                </>
              ) : (
                mode === 'existing'
                  ? 'SAVE CHANGES →'
                  : `Publish ${files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Showcase'} →`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
