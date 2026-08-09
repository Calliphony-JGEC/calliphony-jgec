import React, { useState, useEffect, useRef, useMemo } from 'react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../utils/cloudinary';
import { api } from '../../api/client';

const ICON_OPTIONS = [
  { value: '\ud83c\udfb5', label: '\ud83c\udfb5' },
  { value: '\ud83c\udfa4', label: '\ud83c\udfa4' },
  { value: '\ud83c\udfb8', label: '\ud83c\udfb8' },
  { value: '\ud83e\udd41', label: '\ud83e\udd41' },
  { value: '\ud83c\udfb9', label: '\ud83c\udfb9' },
];

export default function AdminSecretaries() {
  const [mode, setMode] = useState('new');

  const [year, setYear] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [icon, setIcon] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [selectedSecId, setSelectedSecId] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [secretariesList, setSecretariesList] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Optional autocomplete from years already saved — does not limit what you can type
  const existingYearHints = useMemo(() => {
    return [...new Set(secretariesList.map((s) => (s.year || '').trim()).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a));
  }, [secretariesList]);

  const fetchSecretaries = async () => {
    try {
      const data = await api.getSecretaries();
      const list = (data.secretaries || []).map((item) => ({
        docId: item.id || item.docId,
        ...item,
      }));
      list.sort((a, b) => {
        const yearCmp = (b.year || '').localeCompare(a.year || '');
        if (yearCmp !== 0) return yearCmp;
        return (a.name || '').localeCompare(b.name || '');
      });
      setSecretariesList(list);
    } catch (err) {
      console.warn('Could not fetch secretaries:', err);
    }
  };

  useEffect(() => {
    fetchSecretaries();
  }, []);

  useEffect(() => {
    setDeleteConfirmId(null);
    if (mode === 'existing' && selectedSecId) {
      const found = secretariesList.find((s) => s.docId === selectedSecId);
      if (found) {
        setEditName(found.name || '');
        setEditRole(found.role || '');
        setEditIcon(found.icon || '');
        setEditYear(found.year || '');
        setEditImageUrl(found.image || '');
      }
    } else {
      setEditName('');
      setEditRole('');
      setEditIcon('');
      setEditYear('');
      setEditImageUrl('');
      clearEditImage();
    }
  }, [mode, selectedSecId, secretariesList]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditImageFile(file);
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const clearEditImage = () => {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(null);
    setEditImagePreview(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const resetForm = () => {
    setYear('');
    setName('');
    setRole('');
    setIcon('');
    removeImage();
    setSelectedSecId('');
    setEditName('');
    setEditRole('');
    setEditIcon('');
    setEditYear('');
    setEditImageUrl('');
    clearEditImage();
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isCloudinaryConfigured()) {
      setError('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
      return;
    }

    if (mode === 'new') {
      if (!year) {
        setError('Please select an academic year.');
        return;
      }
      if (!name.trim()) {
        setError('Please enter the secretary name.');
        return;
      }
      if (!role.trim()) {
        setError('Please enter the role.');
        return;
      }
      if (!imageFile) {
        setError('Please select a photo for this secretary.');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const result = await uploadToCloudinary(imageFile, 'calliphony-secretaries', (progress) => {
          setUploadProgress(Math.round(progress * 100));
        });

        await api.createSecretary({
          year: year,
          name: name.trim(),
          role: role.trim(),
          icon: icon || '\ud83c\udfb5',
          image: result.secure_url,
          imagePublicId: result.public_id || '',
        });

        setSuccessMessage(`Successfully added ${name.trim()} as ${role.trim()} for ${year}.`);
        resetForm();
        await fetchSecretaries();
      } catch (err) {
        console.error('Failed to add secretary:', err);
        setError(`Failed to add secretary: ${err.message || 'Unknown error.'}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    } else {
      if (!selectedSecId) {
        setError('Please select a secretary to edit.');
        return;
      }
      if (!editName.trim()) {
        setError('Name cannot be empty.');
        return;
      }
      if (!editRole.trim()) {
        setError('Role cannot be empty.');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        let finalImageUrl = editImageUrl;
        let finalPublicId;

        if (editImageFile) {
          const result = await uploadToCloudinary(editImageFile, 'calliphony-secretaries', (progress) => {
            setUploadProgress(Math.round(progress * 100));
          });
          finalImageUrl = result.secure_url;
          finalPublicId = result.public_id || '';
        }

        const updatePayload = {
          year: editYear,
          name: editName.trim(),
          role: editRole.trim(),
          icon: editIcon || '\ud83c\udfb5',
          image: finalImageUrl,
        };
        if (finalPublicId != null) {
          updatePayload.imagePublicId = finalPublicId;
        }

        await api.updateSecretary(selectedSecId, updatePayload);

        setSuccessMessage(`Successfully updated ${editName.trim()}.`);
        clearEditImage();
        if (editFileInputRef.current) editFileInputRef.current.value = '';
        await fetchSecretaries();
      } catch (err) {
        console.error('Failed to update secretary:', err);
        setError(`Failed to update: ${err.message || 'Unknown error.'}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleDelete = async (docId, secName) => {
    if (deleteConfirmId !== docId) {
      setDeleteConfirmId(docId);
      return;
    }

    try {
      const result = await api.deleteSecretary(docId);
      const deletedCount = Number(result?.cloudinary?.deletedCount || 0);
      if (deletedCount === 0) {
        setSuccessMessage(
          `Removed ${secName} from the roster, but the Cloudinary image was not deleted. Check the API terminal for details.`
        );
      } else {
        setSuccessMessage(`Removed ${secName} from the roster (Cloudinary image deleted).`);
      }
      setDeleteConfirmId(null);
      if (selectedSecId === docId) {
        setSelectedSecId('');
      }
      await fetchSecretaries();
    } catch (err) {
      console.error('Delete failed:', err);
      setError(`Failed to delete: ${err.message}`);
      setDeleteConfirmId(null);
    }
  };

  useEffect(() => {
    if (successMessage || error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [successMessage, error]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const groupedByYear = {};
  secretariesList.forEach((sec) => {
    const y = sec.year || 'Unknown';
    if (!groupedByYear[y]) groupedByYear[y] = [];
    groupedByYear[y].push(sec);
  });
  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a));

  const currentPhoto = editImagePreview || editImageUrl;

  return (
    <div className="admin-upload-container">
      <div className="admin-upload-header" style={{ marginBottom: '32px' }}>
        <span className="admin-tag">{'\u25a0'} Secretaries Dashboard</span>
        <h1 className="section-heading" style={{ fontSize: '2.2rem', marginTop: '8px', marginBottom: '8px' }}>
          manage secretaries.
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-body)', maxWidth: '600px' }}>
          Add, edit, and remove club secretaries. Photos are stored in Cloudinary and metadata in MongoDB.
        </p>
      </div>

      {successMessage && (
        <div className="admin-success-banner">
          <span>{'\u2713'}</span> {successMessage}
        </div>
      )}

      {error && (
        <div className="admin-error-banner">
          <span>{'\u26a0'}</span> {error}
        </div>
      )}

      <div className="admin-upload-card glass-card">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-mode-toggle">
            <button
              type="button"
              className={`admin-mode-btn ${mode === 'new' ? 'active' : ''}`}
              onClick={() => setMode('new')}
              disabled={uploading}
            >
              + New Secretary
            </button>
            <button
              type="button"
              className={`admin-mode-btn ${mode === 'existing' ? 'active' : ''}`}
              onClick={() => setMode('existing')}
              disabled={uploading}
            >
              {'\u21bb'} Edit Secretary
            </button>
          </div>

          {mode === 'new' ? (
            <>
              <div className="form-group">
                <label htmlFor="sec-year">Academic Year</label>
                <input
                  id="sec-year"
                  type="text"
                  className="form-input"
                  list={existingYearHints.length ? 'sec-year-hints' : undefined}
                  placeholder="Type any year (e.g. 2019-2020 or 2030-2031)"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={uploading}
                  required
                  autoComplete="off"
                />
                {existingYearHints.length > 0 && (
                  <datalist id="sec-year-hints">
                    {existingYearHints.map((yr) => (
                      <option key={yr} value={yr} />
                    ))}
                  </datalist>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sec-name">Name</label>
                <input
                  id="sec-name"
                  type="text"
                  className="form-input"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sec-role">Role</label>
                <input
                  id="sec-role"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Secretary, President"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sec-icon">Icon</label>
                <select
                  id="sec-icon"
                  className="form-select"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">Default</option>
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Photo</label>
                <div
                  className={`admin-drop-zone ${imageFile ? 'has-files' : ''}`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  <div className="admin-drop-zone-content">
                    <span className="admin-drop-icon">
                      {imageFile ? '\ud83d\udcce' : '\ud83d\udcf7'}
                    </span>
                    <strong>
                      {imageFile ? imageFile.name : 'Click to select a photo'}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>
                      Accepts .jpg, .png, .webp
                    </span>
                  </div>
                </div>
              </div>

              {imagePreview && (
                <div className="admin-file-previews">
                  <div className="admin-file-preview-item glass-card" style={{ position: 'relative' }}>
                    <div className="admin-file-preview-media">
                      <img src={imagePreview} alt="Preview" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    </div>
                    <div className="admin-file-preview-info">
                      <span className="admin-file-preview-name" title={imageFile?.name}>
                        {imageFile?.name || 'Photo'}
                      </span>
                      <span className="admin-file-preview-size">
                        {imageFile ? `${(imageFile.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                      </span>
                    </div>
                    {!uploading && (
                      <button
                        type="button"
                        className="admin-file-remove-btn"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        title="Remove photo"
                        style={{ background: 'var(--riso-red)', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
                      >
                        {'\u00d7'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="sec-select">Select Secretary to Edit</label>
                {secretariesList.length > 0 ? (
                  <select
                    id="sec-select"
                    className="form-select"
                    value={selectedSecId}
                    onChange={(e) => setSelectedSecId(e.target.value)}
                    disabled={uploading}
                    required
                  >
                    <option value="">Choose a secretary</option>
                    {secretariesList.map((sec) => (
                      <option key={sec.docId} value={sec.docId}>
                        {sec.name} ({sec.year}) - {sec.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '12px 0' }}>
                    No secretaries found yet. Add one first.
                  </p>
                )}
              </div>

              {selectedSecId && (
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-paper)', border: '1px solid var(--border-ink)', marginTop: '20px', marginBottom: '24px' }}>
                  <span style={{ display: 'block', color: 'var(--riso-red)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-label)' }}>
                    {'\u25a0'} Edit Details
                  </span>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-sec-year" style={{ fontSize: '0.88rem' }}>Academic Year</label>
                    <input
                      id="edit-sec-year"
                      type="text"
                      className="form-input"
                      list={existingYearHints.length ? 'edit-sec-year-hints' : undefined}
                      placeholder="Type any year (e.g. 2019-2020 or 2030-2031)"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      disabled={uploading}
                      required
                      autoComplete="off"
                    />
                    {existingYearHints.length > 0 && (
                      <datalist id="edit-sec-year-hints">
                        {existingYearHints.map((yr) => (
                          <option key={yr} value={yr} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-sec-name" style={{ fontSize: '0.88rem' }}>Name</label>
                    <input
                      id="edit-sec-name"
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={uploading}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-sec-role" style={{ fontSize: '0.88rem' }}>Role</label>
                    <input
                      id="edit-sec-role"
                      type="text"
                      className="form-input"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={uploading}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="edit-sec-icon" style={{ fontSize: '0.88rem' }}>Icon</label>
                    <select
                      id="edit-sec-icon"
                      className="form-select"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      disabled={uploading}
                    >
                      <option value="">Default</option>
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.88rem' }}>Current Photo</label>
                    {currentPhoto && (
                      <div className="admin-file-previews" style={{ marginBottom: '12px' }}>
                        <div className="admin-file-preview-item glass-card" style={{ position: 'relative' }}>
                          <div className="admin-file-preview-media">
                            <img src={currentPhoto} alt="Current" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          </div>
                          <div className="admin-file-preview-info">
                            <span className="admin-file-preview-name">
                              {editImageFile ? editImageFile.name : 'Current Photo'}
                            </span>
                            <span className="admin-file-preview-size" style={{ color: 'var(--ink-light)', fontWeight: 600 }}>
                              {editImageFile ? `New upload (${(editImageFile.size / (1024 * 1024)).toFixed(1)} MB)` : 'Cloudinary'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      className={`admin-drop-zone ${editImageFile ? 'has-files' : ''}`}
                      onClick={() => !uploading && editFileInputRef.current?.click()}
                    >
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                      <div className="admin-drop-zone-content">
                        <span className="admin-drop-icon">{'\ud83d\udcf7'}</span>
                        <strong>
                          {editImageFile ? `Replacing with: ${editImageFile.name}` : 'Click to replace photo (optional)'}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>
                          New photo will replace the existing one on save
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
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
            {mode === 'existing' && selectedSecId && (
              <button
                type="button"
                className="btn-secondary btn-ink-stamp"
                onClick={() => handleDelete(selectedSecId, editName)}
                disabled={uploading}
                style={{
                  marginRight: 'auto',
                  background: deleteConfirmId === selectedSecId ? '#dc2626' : 'transparent',
                  color: deleteConfirmId === selectedSecId ? '#fff' : 'var(--riso-red)',
                  border: deleteConfirmId === selectedSecId ? '2px solid #dc2626' : '2px solid var(--riso-red)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s ease'
                }}
              >
                {deleteConfirmId === selectedSecId ? 'CONFIRM DELETE' : 'DELETE SECRETARY'}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary btn-ink-stamp"
              onClick={() => { resetForm(); setDeleteConfirmId(null); }}
              disabled={uploading}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn-primary btn-ink-stamp"
              disabled={uploading || (mode === 'new' ? !imageFile : !selectedSecId)}
            >
              {uploading ? (
                <>
                  <span className="admin-spinner"></span>
                  {mode === 'existing' ? 'Saving Changes...' : 'Adding Secretary...'}
                </>
              ) : (
                mode === 'existing'
                  ? 'SAVE CHANGES \u2192'
                  : 'Add Secretary \u2192'
              )}
            </button>
          </div>
        </form>
      </div>

      {secretariesList.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          <div className="admin-upload-header" style={{ marginBottom: '24px' }}>
            <span className="admin-tag">{'\u25a0'} Current Roster</span>
            <h2 className="section-heading" style={{ fontSize: '1.8rem', marginTop: '8px', marginBottom: '4px' }}>
              all secretaries.
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
              {secretariesList.length} member{secretariesList.length !== 1 ? 's' : ''} across {sortedYears.length} year{sortedYears.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {sortedYears.map((yr) => (
            <div key={yr} style={{ marginBottom: '36px' }}>
              <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.4rem', color: 'var(--riso-red)', borderBottom: '1px solid var(--border-ink)', paddingBottom: '10px', marginBottom: '16px' }}>
                {yr}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedByYear[yr].map((sec) => (
                  <div key={sec.docId} className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-ink)', background: 'var(--bg-paper-dark)' }}>
                      <img src={sec.image} alt={sec.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ fontSize: '1.6rem', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-paper-dark)', border: '1px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {sec.icon || '\ud83c\udfb5'}
                    </div>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--ink-black)', fontFamily: 'var(--font-header)', display: 'block' }}>
                        {sec.name}
                      </strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--riso-red)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {sec.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-ink-stamp"
                      onClick={() => { setMode('existing'); setSelectedSecId(sec.docId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      style={{ flexShrink: 0 }}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-ink-stamp"
                      onClick={() => handleDelete(sec.docId, sec.name)}
                      style={{
                        background: deleteConfirmId === sec.docId ? '#dc2626' : 'transparent',
                        color: deleteConfirmId === sec.docId ? '#fff' : 'var(--riso-red)',
                        border: deleteConfirmId === sec.docId ? '2px solid #dc2626' : '2px solid var(--riso-red)',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      {deleteConfirmId === sec.docId ? 'CONFIRM' : 'DELETE'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
