# AnimalID service and worker (CPU). For a GPU host, start from a CUDA PyTorch image instead.
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch \
 && pip install --no-cache-dir "transformers>=4.44" "pillow>=10" "numpy>=1.26" "fastapi>=0.110" "uvicorn>=0.29" "python-multipart>=0.0.9" "httpx>=0.27"
COPY animalid ./animalid
# Weights are fetched on first start (facebook/dinov2-base, Apache-2.0) and cached in /root/.cache.
ENV ANIMALID_BACKBONE=dinov2_vitb14
# Worker: python -m animalid.worker   API: uvicorn animalid.api:app --host 0.0.0.0 --port 8080
CMD ["python", "-m", "animalid.worker"]
