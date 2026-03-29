import os
import requests
import base64
import time

def generate_and_save_image():
    # The execution environment provides the key at runtime
    api_key = ""
    
    # Prompt for the image of AI as a tool for engineering mentorship
    # A professional portrait of a Ghanaian developer, focusing on a clear laptop screen showing simple Python code for a Socratic middle-ware interface. 
    # A soft, warm glowing overlay is projected on the screen and keyboard, blending a modern minimalist Accra tech hub background with abstract, flowing compass and shield icons. 
    # The image uses golden-hour sunset lighting, creating an elegant, professional, and ethical atmosphere. Shot on a Sony A1, high resolution, soft bokeh.
    prompt = "A high-quality professional photography of a modern minimalist Accra workspace in Ghana, focusing on a laptop screen with a glowing shield and compass overlay, blending ethical AI concept with engineering mentorship. High resolution, warm golden hour lighting, soft bokeh."
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

    # Implement exponential backoff for the API call: retry up to 5 times
    # Delays: 1s, 2s, 4s, 8s, 16s
    for i in range(6):
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                
                # Extract base64 image data
                if 'predictions' in result and len(result['predictions']) > 0:
                    base64_data = result['predictions'][0]['bytesBase64Encoded']
                    
                    # Ensure the directory structure exists
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)
                    
                    # Decode and save the image
                    with open(target_path, "wb") as f:
                        f.write(base64.b64decode(base64_data))
                    
                    print(f"Successfully generated and saved image to {target_path}")
                    return
            
        except Exception:
            # Silent failure for retries as per instructions
            pass
        
        # Wait before retrying (exponential backoff)
        if i < 5:
            time.sleep(2**i)

    # User-friendly error message after all retries fail
    print("Unable to generate the image at this time. Please check your connection or try again later.")

if __name__ == "__main__":
    generate_and_save_image()