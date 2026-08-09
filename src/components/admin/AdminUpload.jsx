import React, { useState, useEffect, useRef } from 'react';
import { checkMediaValidity, filterValidEvents } from '../../utils/mediaValidity';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../utils/cloudinary';
import { getMediaPosterUrl } from '../../utils/mediaThumb';
import { api } from '../../api/client';


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
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFileId, setThumbnailFileId] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  
  const fetchEvents = async () => {
    try {
      const data = await api.getEvents();
      const evList = (data.events || []).map((item) => {
        const name = (item.eventName || item.title || '').trim();
        let mediaList = Array.isArray(item.mediaList) ? [...item.mediaList] : [];
        return {
          docId: item.id || item.docId,
          name,
          ...item,
          mediaList,
        };
      }).filter((ev) => ev.name);
      evList.sort((a, b) => a.name.localeCompare(b.name));
      const validEvList = await filterValidEvents(evList);
      // Do not auto-delete events when media checks fail — that left Cloudinary orphans.
      setExistingEventsList(validEvList.length ? validEvList : evList);
      return validEvList.length ? validEvList : evList;
    } catch (err) {
      console.warn('Could not fetch existing events:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Only re-sync form fields when the selected event (or mode) changes — not when the list refreshes,
  // so an in-progress thumbnail choice is not overwritten.
  useEffect(() => {
    let isCancelled = false;
    setDeleteConfirm(false);

    const syncExistingMedia = async () => {
      if (mode === 'existing' && selectedEventName) {
        const found = existingEventsList.find((ev) => ev.name === selectedEventName);
        if (found && !isCancelled) {
          setEditEventName(found.eventName || found.title || found.name || '');
          setEditEventDate(found.eventDate || found.date || '');
          setEditEventDescription(found.eventDescription || found.description || '');
          setThumbnailUrl(found.thumbnailUrl || found.mediaList?.[0]?.url || '');
          setThumbnailFileId('');
        }
        if (found && Array.isArray(found.mediaList)) {
          const validity = await Promise.all(
            found.mediaList.map((item) => checkMediaValidity(item.url, item.type))
          );
          if (!isCancelled) {
            const liveMedia = found.mediaList.filter((_, i) => validity[i]);
            setExistingMedia(liveMedia);
            const preferred =
              (found.thumbnailUrl && liveMedia.find((m) => m.url === found.thumbnailUrl)?.url) ||
              liveMedia[0]?.url ||
              '';
            setThumbnailUrl(preferred);
          }
        } else if (!isCancelled) {
          setExistingMedia([]);
        }
      } else if (!isCancelled) {
        setExistingMedia([]);
        setEditEventName('');
        setEditEventDate('');
        setEditEventDescription('');
        setThumbnailUrl('');
        setThumbnailFileId('');
      }
    };

    syncExistingMedia();
    return () => {
      isCancelled = true;
    };
    // intentionally not depending on existingEventsList — refreshed list is merged via fetchEvents callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedEventName]);

  const applyThumbnailSelection = async (url) => {
    setThumbnailUrl(url);
    setThumbnailFileId('');

    if (mode !== 'existing' || !selectedEventName) return;

    const foundEvent = existingEventsList.find((ev) => ev.name === selectedEventName);
    const targetDocId = foundEvent?.docId;
    if (!targetDocId || !url) return;

    const currentMedia = existingMedia.length
      ? existingMedia
      : foundEvent.mediaList || [];
    const cover = currentMedia.find((m) => m.url === url);
    if (!cover) {
      setError('Selected media was not found on this event.');
      return;
    }
    const reordered = [cover, ...currentMedia.filter((m) => m.url !== url)];

    try {
      setError('');
      const { event: updated } = await api.updateEvent(targetDocId, {
        thumbnailUrl: url,
        mediaList: reordered,
      });
      const nextThumb = updated?.thumbnailUrl || url;
      const nextMedia = updated?.mediaList || reordered;
      setThumbnailUrl(nextThumb);
      setExistingMedia(nextMedia);
      setExistingEventsList((prev) =>
        prev.map((ev) =>
          ev.docId === targetDocId
            ? { ...ev, thumbnailUrl: nextThumb, mediaList: nextMedia }
            : ev
        )
      );
      setSuccessMessage('Gallery thumbnail updated. Open Gallery to see the new cover.');
    } catch (err) {
      console.error('Failed to set thumbnail:', err);
      setError(`Could not save thumbnail: ${err.message || 'Unknown error'}`);
    }
  };
  const removeExistingMediaItem = (indexToRemove) => {
    setExistingMedia((prev) => {
      const removed = prev[indexToRemove];
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (removed && removed.url === thumbnailUrl) {
        setThumbnailUrl(next[0]?.url || '');
      }
      return next;
    });
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    const newFiles = selected.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : file.type.startsWith('video/')
          ? URL.createObjectURL(file)
          : null,
    }));

    setFiles((prev) => {
      const merged = [...prev, ...newFiles];
      if (!thumbnailFileId && !thumbnailUrl && merged.length > 0) {
        setThumbnailFileId(merged[0].id);
      }
      return merged;
    });
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      const remaining = prev.filter((f) => f.id !== id);
      if (remaining.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (thumbnailFileId === id) {
        setThumbnailFileId(remaining[0]?.id || '');
      }
      return remaining;
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
    setThumbnailUrl('');
    setThumbnailFileId('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFiles((prev) => {
      prev.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      return [];
    });
  };

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDeleteEvent = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    const foundEvent = existingEventsList.find((ev) => ev.name === selectedEventName);
    const targetDocId = foundEvent ? foundEvent.docId : null;

    if (!targetDocId) {
      setError(`Could not locate event "${selectedEventName}".`);
      setDeleteConfirm(false);
      return;
    }

    try {
      const result = await api.deleteEvent(targetDocId);
      const deletedCount = Number(result?.cloudinary?.deletedCount || 0);
      const failedCount = Number(result?.cloudinary?.failedCount || 0);
      if (deletedCount === 0) {
        setSuccessMessage(
          `Event "${selectedEventName}" was removed from the site, but no Cloudinary files were deleted. Check the API terminal for details.`
        );
      } else if (failedCount > 0) {
        setSuccessMessage(
          `Event "${selectedEventName}" removed. Deleted ${deletedCount} Cloudinary file(s); ${failedCount} could not be removed.`
        );
      } else {
        setSuccessMessage(
          `Event "${selectedEventName}" permanently deleted (${deletedCount} Cloudinary file(s) removed).`
        );
      }
      resetForm();
      await fetchEvents();
    } catch (err) {
      console.error('Delete failed:', err);
      setError(`Failed to delete event: ${err.message}`);
    } finally {
      setDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isCloudinaryConfigured()) {
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
          const { file, id: fileId } = fileObj;
          const cleanFolder = `calliphony-events/${finalEventName.trim().replace(/\/+/g, '-')}`;
          const result = await uploadToCloudinary(file, cleanFolder, (fileProgress) => {
            const overallProgress = ((completedFiles + fileProgress) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });

          const mediaItem = {
            url: result.secure_url,
            type: result.resource_type === 'video' ? 'video' : 'image',
            publicId: result.public_id || '',
            resourceType: result.resource_type === 'video' ? 'video' : 'image',
            thumbnailUrl: result.thumbnail_url || '',
            _localFileId: fileId,
          };
          uploadedMedia.push(mediaItem);

          completedFiles++;
          setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
        }
      }

      const uploadedThumb = uploadedMedia.find((m) => m._localFileId === thumbnailFileId);
      let resolvedThumbnail = '';
      if (uploadedThumb?.url) {
        resolvedThumbnail = uploadedThumb.url;
      } else if (
        thumbnailUrl &&
        (existingMedia.some((m) => m.url === thumbnailUrl) ||
          uploadedMedia.some((m) => m.url === thumbnailUrl))
      ) {
        resolvedThumbnail = thumbnailUrl;
      } else {
        resolvedThumbnail = existingMedia[0]?.url || uploadedMedia[0]?.url || '';
      }

      const stripLocal = (list) =>
        list.map(({ _localFileId, ...rest }) => rest);

      if (mode === 'new') {
        await api.createEvent({
          eventName: finalEventName,
          title: finalEventName,
          eventDate: eventDate.trim(),
          eventDescription: eventDescription.trim(),
          mediaList: stripLocal(uploadedMedia),
          thumbnailUrl: resolvedThumbnail,
        });
        setSuccessMessage(`Successfully published ${totalFiles} file${totalFiles > 1 ? 's' : ''} to Cloudinary folder "calliphony-events/${finalEventName}" and created the event!`);
        resetForm();
        await fetchEvents();
      } else {
        const foundEvent = existingEventsList.find((ev) => ev.name === finalEventName);
        const targetDocId = foundEvent ? foundEvent.docId : null;

        if (targetDocId) {
          const updatedMediaList = stripLocal([...existingMedia, ...uploadedMedia]);
          const newName = (editEventName || finalEventName).trim();
          await api.updateEvent(targetDocId, {
            eventName: newName,
            title: newName,
            eventDate: (editEventDate || '').trim(),
            eventDescription: (editEventDescription || '').trim(),
            mediaList: updatedMediaList,
            thumbnailUrl: resolvedThumbnail,
          });
          setSuccessMessage(`Successfully synchronized changes with Cloudinary and the database! Archive updated for "${newName}".`);
          setSelectedEventName(newName);
          setThumbnailUrl(resolvedThumbnail);
          setThumbnailFileId('');
          setExistingMedia(updatedMediaList);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setFiles((prev) => {
            prev.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
            return [];
          });
          const refreshed = await fetchEvents();
          const refreshedEvent = refreshed.find((ev) => ev.docId === targetDocId || ev.name === newName);
          if (refreshedEvent) {
            setExistingMedia(refreshedEvent.mediaList || updatedMediaList);
            setThumbnailUrl(refreshedEvent.thumbnailUrl || resolvedThumbnail);
          }
        } else {
          setError(`Could not locate existing event "${finalEventName}".`);
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
                      Thumbnail saves immediately · other edits need SAVE CHANGES
                    </span>
                  </div>
                  {existingMedia.length > 0 ? (
                    <div className="admin-file-previews" style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px', border: '1px solid var(--border-ink)', borderRadius: 'var(--radius-md)', background: 'var(--bg-paper)' }}>
                      {existingMedia.map((item, idx) => {
                        const isThumb = thumbnailUrl === item.url && !thumbnailFileId;
                        const poster = getMediaPosterUrl(item);
                        return (
                        <div key={item.url || idx} className="admin-file-preview-item glass-card" style={{ position: 'relative', outline: isThumb ? '2px solid var(--riso-red)' : undefined }}>
                          <div className="admin-file-preview-media">
                            <img src={poster} alt={`Archive asset ${idx + 1}`} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                            {item.type === 'video' && (
                              <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.7rem', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Video</span>
                            )}
                          </div>
                          <div className="admin-file-preview-info">
                            <span className="admin-file-preview-name" title={item.url} style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>
                              {item.url.split('/').pop() || `Asset #${idx + 1}`}
                            </span>
                            <span className="admin-file-preview-size" style={{ color: 'var(--ink-light)', fontWeight: 600 }}>
                              Cloudinary ({item.type || 'image'})
                            </span>
                            {!uploading && (
                              <button
                                type="button"
                                onClick={() => { applyThumbnailSelection(item.url); }}
                                style={{
                                  marginTop: 6,
                                  border: isThumb ? 'none' : '1px solid var(--border-accent)',
                                  background: isThumb ? 'var(--riso-red)' : 'transparent',
                                  color: isThumb ? '#fff' : 'var(--text-secondary)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                }}
                              >
                                {isThumb ? 'Thumbnail ✓' : 'Set thumbnail'}
                              </button>
                            )}
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
                        );
                      })}
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
              {files.map((fileObj) => {
                const isThumb = thumbnailFileId === fileObj.id;
                const isVideo = fileObj.file.type.startsWith('video/');
                return (
                <div key={fileObj.id} className="admin-file-preview-item glass-card" style={{ outline: isThumb ? '2px solid var(--riso-red)' : undefined }}>
                  <div className="admin-file-preview-media" style={{ position: 'relative' }}>
                    {fileObj.preview ? (
                      isVideo ? (
                        <video src={fileObj.preview} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={fileObj.preview} alt={fileObj.file.name} />
                      )
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
                    {!uploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFileId(fileObj.id);
                          setThumbnailUrl('');
                        }}
                        style={{
                          marginTop: 6,
                          border: isThumb ? 'none' : '1px solid var(--border-accent)',
                          background: isThumb ? 'var(--riso-red)' : 'transparent',
                          color: isThumb ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: 4,
                        }}
                      >
                        {isThumb ? 'Thumbnail ✓' : 'Set thumbnail'}
                      </button>
                    )}
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
                );
              })}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {mode === 'existing' && selectedEventName && (
              <button
                type="button"
                className="btn-secondary btn-ink-stamp"
                onClick={handleDeleteEvent}
                disabled={uploading}
                style={{
                  marginRight: 'auto',
                  background: deleteConfirm ? '#dc2626' : 'transparent',
                  color: deleteConfirm ? '#fff' : 'var(--riso-red)',
                  border: deleteConfirm ? '2px solid #dc2626' : '2px solid var(--riso-red)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s ease'
                }}
              >
                {deleteConfirm ? 'CONFIRM DELETE' : 'DELETE EVENT'}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary btn-ink-stamp"
              onClick={() => { resetForm(); setDeleteConfirm(false); }}
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
                  ? 'SAVE CHANGES \u2192'
                  : `Publish ${files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Showcase'} \u2192`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
