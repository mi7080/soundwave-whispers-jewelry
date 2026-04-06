import { useState, useRef } from "react";
import { Camera, X, Check, Loader2 } from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "dsmbuwxqf";
const CLOUDINARY_UPLOAD_PRESET = "animus_unsigned";

interface PetPhotoUploadProps {
  onPhotoUrl?: (url: string) => void;
}

const PetPhotoUpload = ({ onPhotoUrl }: PetPhotoUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (data.secure_url) {
        setUploadedUrl(data.secure_url);
        onPhotoUrl?.(data.secure_url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Photo upload failed. Please try again.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    onPhotoUrl?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {!previewUrl ? (
        <label className="flex flex-col items-center justify-center gap-3 h-40 border-2 border-dashed border-border/50 rounded-sm cursor-pointer hover:border-gold/40 transition-colors bg-background/30">
          <Camera className="w-8 h-8 text-muted-foreground/40" />
          <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground/60 font-sans">
            Tap to upload photo
          </span>
          <span className="text-[10px] text-muted-foreground/40">JPG or PNG</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative max-w-xs mx-auto">
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-gold/30 shadow-[0_0_30px_rgba(183,142,72,0.1)]"
            style={{ minHeight: "160px" }}
          >
            {/* Blurred background fill */}
            <div
              className="absolute inset-0 scale-110 blur-2xl opacity-40"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <img
              src={previewUrl}
              alt="Pet photo preview"
              className="relative z-10 w-full max-h-64 object-contain mx-auto"
            />
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 z-20">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
          )}
          <button
            onClick={clearPhoto}
            className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-card/90 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {uploadedUrl && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Check className="w-4 h-4 text-gold" />
              <span className="text-xs text-gold font-sans">Photo uploaded</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PetPhotoUpload;
