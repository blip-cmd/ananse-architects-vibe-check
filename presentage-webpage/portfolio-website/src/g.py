import os
import requests
import base64
import time

def generate_and_save_image():
    # The execution environment provides the key at runtime
    api_key = ""
    
    # Final optimized prompt for the Accra tech hub aesthetic
    prompt = "A high-quality professional photograph of a modern minimalist Accra workspace in Ghana, focusing on a laptop screen with a glowing shield and compass overlay, blending ethical AI concept with engineering mentorship. High resolution, warm golden hour lighting, soft bokeh."
    target_path = "./assets/images/conclusion_ethical.jpg"
    
    # API endpoint for Imagen 4.0
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key={api_key}"
    
    payload = {
        "instances": {
            "prompt": prompt
        },
        "parameters": {
            "sampleCount": 1
        }
    }

    # Exponential backoff for reliability
    for i in range(6):
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                
                if 'predictions' in result and len(result['predictions']) > 0:
                    base64_data = result['predictions'][0]['bytesBase64Encoded']
                    
                    # Ensure the assets/images path exists
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)
                    
                    # Save the generated image
                    with open(target_path, "wb") as f:
                        f.write(base64.b64decode(base64_data))
                    
                    print(f"Successfully generated and saved image to {target_path}")
                    return
            
        except Exception:
            pass
        
        if i < 5:
            time.sleep(2**i)

    print("Unable to generate the image at this time. Please check your connection or try again later.")

if __name__ == "__main__":
    generate_and_save_image()