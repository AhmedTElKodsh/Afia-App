import { useRef, useState, type ChangeEvent } from "react";

interface ImageUploadProps {
  onImageSelect: (base64Data: string, fileName: string) => void;
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = result.split(",")[1];
      onImageSelect(base64Data, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <p className="file-name">{fileName}</p>
          <button className="btn btn-outline" onClick={handleButtonClick}>
            Change Image
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={handleButtonClick}>
          Select Image
        </button>
      )}
    </div>
  );
}
