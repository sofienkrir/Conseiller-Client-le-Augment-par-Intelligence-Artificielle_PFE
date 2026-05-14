from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_name = "tunchat/tunchat-v0.2"  # غيّر حسب الموديل متاعك
cache_dir = "C:/huggingface_cache"   # فولدر لتخزين الملفات

# تحميل التوكنيزر
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)

# تحميل الموديل مرة واحدة فقط
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    cache_dir=cache_dir,
    torch_dtype=torch.float16  # يقلل استهلاك RAM
)

# مثال على توليد نص
input_text = "📨 test@gmail.com\n❓ شنوّة الخدمات غير المالية اللي نجم نستفيدو منها مع Offre Siggnature؟"
inputs = tokenizer(input_text, return_tensors="pt")

with torch.no_grad():
    outputs = model.generate(**inputs, max_length=200)

print(tokenizer.decode(outputs[0], skip_special_tokens=True))