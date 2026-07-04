import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Pillow is not installed. Installing it now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def convert_png_to_ico(png_path, ico_path):
    print(f"Converting {png_path} to {ico_path}...")
    img = Image.open(png_path)
    # Ensure RGBA
    img = img.convert("RGBA")
    
    # Standard ICO sizes
    sizes = [16, 32, 48, 64, 128, 256]
    icon_images = []
    
    # Resize the image for each target size
    # We use Resampling.LANCZOS for high-quality resizing
    for size in sizes:
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        icon_images.append(resized_img)
    
    # In Pillow, to save a multi-resolution ICO, we save the largest image
    # and pass the rest in the append_images list.
    icon_images[-1].save(ico_path, format='ICO', append_images=icon_images[:-1])
    print("Conversion complete!")

if __name__ == "__main__":
    png_file = "public/Icono_PCSHogar.png"
    ico_file = "public/icon.ico"
    
    if os.path.exists(png_file):
        convert_png_to_ico(png_file, ico_file)
    else:
        print(f"Error: {png_file} not found.")
