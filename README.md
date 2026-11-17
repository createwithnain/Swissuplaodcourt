# Swish — basketball file uploader for React

Drop files anywhere on the uploader to shoot from the drop position. Multiple dropped files take turns. Alternatively, browse for files, start a drag anywhere on the court and release over the rim or flick toward it from any side. The rim flexes and the net sways on contact. A miss returns the file to the court. Auto shoot and keyboard activation offer the same upload flow. The scoreboard increments only after the upload promise resolves.

## Run the demo

Use Node 22.12 or later. From the extracted project directory:

    npm ci
    npm run dev

Open the URL printed by Vite. For a phone on the same Wi-Fi, run `npm run dev -- --host 0.0.0.0` and open the network URL on the phone.

The included local demo API accepts a raw POST body at /api/upload and stores its exact bytes under a generated ID in .uploads/ (excluded from Git). It returns JSON containing id and downloadUrl. Each completed upload shows its own Download and Copy link controls. The 25 MiB limit applies per file. The download URL includes the original filename and retrieves the stored bytes as an attachment. Anyone who has the URL and can reach the server can download it. A localhost link works on the same computer. Use the LAN address for Wi-Fi sharing or host the API at a public address with persistent storage for internet sharing. Uploaded files persist across restarts. The queue and score last for the current page session.

## Reuse in another app

Copy src/SwishUploader.jsx, src/CourtArt.jsx and src/swish.css into your React web project. Import SwishUploader and pass an async onUpload function. The component uses scoped styles and the browser File and Pointer Events APIs. Use it inside a client component in frameworks that render on the server.

```jsx
import SwishUploader from './SwishUploader.jsx';

export default function Attachments() {
  async function save(file, { signal }) {
    const data = new FormData();
    data.append('file', file, file.name);
    const result = await fetch('/api/attachments', {
      method: 'POST', body: data, signal
    });
    if (!result.ok) throw new Error('Upload failed');
    return result.json(); // { downloadUrl: 'https://your-api.example/files/...' }
  }
  return <SwishUploader onUpload={save} maxBytes={25 * 1024 * 1024} />;
}
```

Use your own endpoint for the multipart example. Resolve only after storage succeeds and reject on failure. Failed files stay at the front of the queue for retry. maxBytes limits selection in bytes (default 25 MiB). Apply your app's authorization, quota and file validation on its upload endpoint.

## GitHub and static hosting

Commit the extracted contents, including package-lock.json, to your repository. Run npm run build to produce dist/. Run npm run preview to test that build locally with the demo upload API. GitHub Pages serves only the static frontend. Set the upload callback to your hosted API before deploying there.
