import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PetPhotoUploadProps {
  onPhotoUrl?: (url: string) => void;
  initialUrl?: string | null;
}

const PetPhotoUpload = ({ onPhotoUrl, initialUrl }: PetPhotoUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl || null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setPreviewUrl(initialUrl);
      setUploadedUrl(initialUrl);
    }
  }, [initialUrl]);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please use an image file (JPG, PNG, or WEBP).");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl(null);
    setIsUploading(true);

    try {
      const tempId = crypto.randomUUID();
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${tempId}/photo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("soul_assets")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("soul_assets")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setUploadedUrl(urlData.publicUrl);
        onPhotoUrl?.(urlData.publicUrl);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed. Please try again.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
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
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
            dragging
              ? "border-gold bg-gold/10"
              : "border-border hover:border-gold/50 bg-background"
          }`}
        >
          <ImagePlus className={`w-8 h-8 transition-colors ${dragging ? "text-gold" : "text-muted-foreground/50"}`} />
          <span className="text-sm font-sans text-foreground/80">
            {dragging ? "Drop your photo" : "Drag a photo here, or tap to upload"}
          </span>
          <span className="text-[12px] text-muted-foreground/60 font-sans">JPG, PNG, or WEBP</span>
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
            className="relative w-full rounded-2xl overflow-hidden ring-1 ring-gold/30 shadow-[0_24px_60px_-40px_rgba(90,60,30,0.45)]"
            style={{ minHeight: "160px" }}
          >
            <div
              className="absolute inset-0 scale-110 blur-2xl opacity-30"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <img
              src={previewUrl}
              alt="Memory photo preview"
              className="relative z-10 w-full max-h-64 object-contain mx-auto"
            />
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-card/70 backdrop-blur-sm z-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
              <p className="text-[12px] text-gold font-sans animate-pulse">
                Preserving your memory…
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={clearPhoto}
            disabled={isUploading}
            aria-label="Remove photo"
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-card/90 ring-1 ring-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
          >
            <X className="w-4 h-4" />
          </button>
          {uploadedUrl && (
            <div className="flex items-center justify-center gap-2 mt-3 animate-[step-pop_0.35s_ease-out]">
              <Check className="w-4 h-4 text-gold" />
              <span className="text-[13px] text-gold font-sans">Photo saved to your Soul Page</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PetPhotoUpload;
