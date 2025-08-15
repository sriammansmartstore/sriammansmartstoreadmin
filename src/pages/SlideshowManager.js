import React, { useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import BackButton from '../components/BackButton';
import './SlideshowManager.css';


function SlideshowManager() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  // Fetch slideshow images from Firebase Storage
  const fetchImages = async () => {
    try {
      const folderRef = ref(storage, 'slideshow');
      const res = await listAll(folderRef);
      const urls = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url, ref: itemRef };
        })
      );
      setImages(urls);
    } catch (err) {
      setError('Failed to fetch images.');
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Upload new images
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    setError('');
    setSuccess('');
    setProgress(0);
    try {
      let total = selectedFiles.length;
      let completed = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const imageRef = ref(storage, `slideshow/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(imageRef, file);
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setProgress(Math.round(((completed + percent / 100) / total) * 100));
            },
            (err) => reject(err),
            () => {
              completed++;
              setProgress(Math.round((completed / total) * 100));
              resolve();
            }
          );
        });
      }
      setSuccess('Images uploaded successfully!');
      setSelectedFiles([]);
      fetchImages();
    } catch (err) {
      setError('Failed to upload images.');
    }
    setUploading(false);
    setProgress(0);
  };

  // Delete image
  const handleDelete = async (imgRef) => {
    if (window.confirm('Delete this image?')) {
      try {
        await deleteObject(imgRef);
        setSuccess('Image deleted successfully!');
        fetchImages();
      } catch (err) {
        setError('Failed to delete image.');
      }
    }
  };

  return (
    <div className="slideshow-manager-container">
      <BackButton />
      <h2 className="slideshow-title">Slideshow Images</h2>
      <form className="slideshow-upload-form" onSubmit={handleUpload}>
        <input type="file" accept="image/*" multiple onChange={e => setSelectedFiles(Array.from(e.target.files))} />
        <button type="submit" disabled={uploading || selectedFiles.length === 0}>
          {uploading ? 'Uploading...' : 'Upload Images'}
        </button>
      </form>
      {uploading && (
        <div className="upload-progress-bar">
          <div className="upload-progress" style={{ width: `${progress}%` }}></div>
          <span className="upload-progress-label">{progress}%</span>
        </div>
      )}
      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}
      <div className="slideshow-images-list">
        {images.length === 0 ? <div className="no-images">No images uploaded.</div> : images.map(img => (
          <div key={img.name} className="slideshow-image-card">
            <img src={img.url} alt={img.name} className="slideshow-image" />
            <button className="delete-image-btn" onClick={() => handleDelete(img.ref)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SlideshowManager;
