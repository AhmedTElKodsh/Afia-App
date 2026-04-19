const TARGET_WIDTH = 800;
const JPEG_QUALITY = 0.78;

export async function compressImage(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!img.width || !img.height) {
        reject(new Error("Invalid image dimensions"));
        return;
      }
      const canvas = document.createElement("canvas");
      // Only downscale — never upscale (would increase size without quality gain)
      const scale = Math.min(1, TARGET_WIDTH / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      // Strip the data URL prefix to get raw base64
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      resolve(base64);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}
