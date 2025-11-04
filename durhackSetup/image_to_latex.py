from transformers import TrOCRProcessor, VisionEncoderDecoderModel, pipeline
from PIL import Image
from io import BytesIO
import sys

image = Image.open(BytesIO(sys.stdin.buffer.read())).convert("RGB")

processor = TrOCRProcessor.from_pretrained('fhswf/TrOCR_Math_handwritten')
model = VisionEncoderDecoderModel.from_pretrained('fhswf/TrOCR_Math_handwritten')

pixel_values = processor(images=image, return_tensors="pt").pixel_values
generated_ids = model.generate(pixel_values)
generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

print(generated_text)
