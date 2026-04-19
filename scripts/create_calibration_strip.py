import os
from PIL import Image
import argparse

def create_calibration_strip(input_dir, output_path):
    """
    Stitches reference images (Empty, 55ml, 750ml, 1500ml) into a vertical strip.
    Resizes each to 256x512 and converts to grayscale for token optimization.
    """
    # Expected filenames
    files = ["empty.jpg", "55ml.jpg", "750ml.jpg", "1500ml.jpg"]
    
    images = []
    target_width = 256
    target_height = 512

    print(f"Searching for reference images in: {input_dir}")
    
    for filename in files:
        full_path = os.path.join(input_dir, filename)
        if not os.path.exists(full_path):
            print(f"Warning: {filename} not found in {input_dir}. Skipping.")
            continue
            
        try:
            with Image.open(full_path) as img:
                # Convert to grayscale
                img = img.convert("L")
                # Resize to target
                img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
                images.append(img)
                print(f"Processed: {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    if not images:
        print("Error: No images were successfully processed.")
        return

    # Create vertical strip
    total_height = target_height * len(images)
    strip = Image.new("L", (target_width, total_height))

    for i, img in enumerate(images):
        strip.paste(img, (0, i * target_height))

    # Save as highly compressed JPEG
    strip.save(output_path, "JPEG", quality=60, optimize=True)
    print(f"Success! Calibration strip saved to: {output_path}")
    print(f"Final dimensions: {target_width}x{total_height}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a vertical calibration strip for Afia App Stage 1.")
    parser.add_argument("--input", default="oil-bottle-frames/1.5L_refs", help="Directory containing empty.jpg, 55ml.jpg, etc.")
    parser.add_argument("--output", default="public/calibration_strip.jpg", help="Where to save the final strip.")
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    create_calibration_strip(args.input, args.output)
