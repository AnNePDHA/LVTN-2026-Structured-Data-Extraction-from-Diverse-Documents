# DocuExtract: Structured Data Extraction from Diverse Documents

Web app trích xuất dữ liệu có cấu trúc từ hóa đơn, CCCD và hợp đồng, hỗ trợ hai pipeline VLM Direct và OCR-LLM.

## Cấu trúc

```
config/       danh sách mô hình, engine OCR, schema trường, prompt template
pipelines/    Pipeline A (VLM Direct), Pipeline B (OCR-LLM), engine OCR, client gọi mô hình
system/       backend (FastAPI + SQLite) và frontend (React + Vite)
data-processed/  ba tài liệu mẫu dùng ở bước tải tài liệu
```

## Chạy

Cần Python 3.11+ và Node.js LTS.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt -r system/backend/requirements.txt
copy .env.example .env      # điền khóa API của nhà cung cấp mô hình
cd system/frontend && npm install && npm run build && cd ../..
python -m uvicorn system.backend.app.main:app --port 8000
```

Mở `http://127.0.0.1:8000` (giao diện) hoặc `http://127.0.0.1:8000/docs` (API).

Khóa API chỉ đặt trong `.env`. `config/models.json` chỉ lưu tên biến môi trường chứa khóa.

Triển khai giao diện lên Vercel (Root Directory `system/frontend`) và công khai backend qua Cloudflare Tunnel: điền URL tunnel vào `apiOrigin` trong `system/frontend/public/config.js`.
