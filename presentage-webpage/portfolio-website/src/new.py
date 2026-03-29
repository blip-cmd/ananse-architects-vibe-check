import os
import urllib.request

def download_images():
    # Define folder and assets
    folder = "images"
    assets = {
        "coding_speed.jpg": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
        "system_failure.jpg": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
        "african_dev.jpg": "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
        "security_shield.jpg": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
    }

    # Create directory if it doesn't exist
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Created folder: {folder}")
    else:
        print(f"Folder '{folder}' already exists.")

    # Download each asset
    for filename, url in assets.items():
        filepath = os.path.join(folder, filename)
        print(f"Downloading {filename}...")
        try:
            urllib.request.urlretrieve(url, filepath)
            print(f"Successfully saved to {filepath}")
        except Exception as e:
            print(f"Failed to download {filename}: {e}")

    print("\nDownload complete. You can now open vibe_check_pitch.html to see the images.")

if __name__ == "__main__":
    download_images()