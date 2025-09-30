import { useRef } from 'react';

export default function CameraInput({ onCapture }) {
  const fileRef = useRef();
  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataURL = await toDataURL(file, 0.6);
    onCapture?.(dataURL);
  };
  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handle}
        className="hidden"
      />
      <button className="btn w-full" onClick={() => fileRef.current?.click()}>Open Camera</button>
    </div>
  );
}

function toDataURL(file, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1024;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}