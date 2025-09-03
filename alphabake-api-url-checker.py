
from urllib import request
import base64
import io
from PIL import Image

def get_image_from_input(image_input):

    if image_input.startswith('http://') or image_input.startswith('https://'):
        # Download image from URL
        try:
            req = request.Request(
                image_input,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with request.urlopen(req) as response:
                image_bytes = response.read()
        except Exception as e:
            print("error in get_image_from_input", str(e))
            raise
    else:
        # Assume base64
        image_bytes = base64.b64decode(image_input)

    # --- Check file size ---
    if len(image_bytes) > 2*1_048_576:  # 2MB
        raise ValueError("Image file size exceeds 2MB limit.")

    # --- Check resolution and convert to JPEG ---
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        if width > 2048 or height > 2048:
            raise ValueError("Image resolution exceeds 2048x2048 limit.")
        
        # Convert to RGB if not already
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        # Save as JPEG to a buffer
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=100)
        jpeg_bytes = buffer.getvalue()
        
        return jpeg_bytes
        
    except Exception as e:
        raise ValueError(f"Invalid image or failed to check resolution/convert to JPEG: {e}")




image_input = "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h40__g20/human.jpg" # PASS
# image_input = "https://454b-2401-4900-1f30-251b-5cd2-63e0-7cb7-fb2d.ngrok-free.app/CLOTHING_IMAGES/01608041700-016-p.jpg" # FAIL
image_bytes = get_image_from_input(image_input)

with open("image.jpg", "wb") as f:
    f.write(image_bytes)

    