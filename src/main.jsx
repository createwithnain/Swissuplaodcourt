import React from 'react';
import { createRoot } from 'react-dom/client';
import SwishUploader from './SwishUploader.jsx';

async function uploadFile(file, { signal }) {
  const response = await fetch('/api/upload?' + new URLSearchParams({name:file.name}), { method: 'POST', body: file, signal });
  if (!response.ok) throw new Error('Upload failed. Please try again.');
  return response.json();
}
createRoot(document.querySelector('#root')).render(<SwishUploader onUpload={uploadFile} />);
