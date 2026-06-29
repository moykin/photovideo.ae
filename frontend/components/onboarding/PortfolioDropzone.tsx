'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LocalUpload {
  id: string;
  file: File;
  preview: string;
}

export function PortfolioDropzone({
  files,
  onAdd,
  onRemove,
}: {
  files: LocalUpload[];
  onAdd: (uploads: LocalUpload[]) => void;
  onRemove: (id: string) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const uploads = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
      onAdd(uploads);
    },
    [onAdd],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 15 * 1024 * 1024,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          isDragActive
            ? 'border-gold-500 bg-gold-50'
            : 'border-sand-400 bg-cream-200 hover:border-gold-400 hover:bg-cream-300',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-600">
          <UploadCloud className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">
            {isDragActive ? 'Drop your photos here' : 'Drag & drop your best work'}
          </p>
          <p className="mt-1 text-xs text-ink-300">
            or click to browse — JPG / PNG up to 15MB each
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-sand-300 bg-cream-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-cream opacity-0 backdrop-blur-sm transition-opacity hover:bg-ink group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-300">
          <ImageIcon className="h-3.5 w-3.5" />
          No photos added yet — you can always add more later.
        </p>
      )}
    </div>
  );
}
