import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { AvatarPlaceholder } from './AvatarPlaceholder';

type AvatarUploadCardProps = {
  imageUrl?: string | null;
  displayName?: string | null;
  uploading?: boolean;
  helperText: string;
  uploadLabel: string;
  removeLabel?: string;
  onFile: (file: File | null) => void;
  onRemove?: () => void;
};

export function AvatarUploadCard({ imageUrl, displayName, uploading, helperText, uploadLabel, removeLabel, onFile, onRemove }: AvatarUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Card className="avatar-upload-card" variant="soft">
      <AvatarPlaceholder src={imageUrl} name={displayName} size="lg" />
      <div className="avatar-upload-body">
        <strong>{displayName}</strong>
        <span>{helperText}</span>
        <div className="avatar-upload-actions">
          <Button type="button" variant="secondary" icon={<ImagePlus size={18} />} loading={uploading} onClick={() => inputRef.current?.click()}>
            {uploadLabel}
          </Button>
          {onRemove ? (
            <Button type="button" variant="ghost" icon={<Trash2 size={16} />} onClick={onRemove}>
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
    </Card>
  );
}
