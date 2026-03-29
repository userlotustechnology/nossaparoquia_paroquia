import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  preview: string | null;
  onChange: (file: File | null) => void;
  hint?: string;
  label?: string;
  className?: string;
}

export default function ImageUpload({
  preview,
  onChange,
  hint,
  label = 'Imagem',
  className = '',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido.');
      return;
    }
    onChange(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      {hint && (
        <p className="text-xs text-gray-400 mb-2">{hint}</p>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed
          cursor-pointer transition-colors select-none overflow-hidden
          ${dragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40'}
          ${preview ? 'min-h-[140px]' : 'min-h-[120px]'}
        `}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover absolute inset-0"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <span className="text-white text-xs font-medium bg-black/60 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Trocar imagem
                </span>
              </div>
            </div>
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Clique ou arraste uma imagem
              </p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP até 10 MB</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
