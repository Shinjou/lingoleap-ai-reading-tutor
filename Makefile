.PHONY: dev dev-frontend dev-backend install test

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && uvicorn app.main:app --reload

dev:
	@echo "Starting frontend and backend in parallel..."
	$(MAKE) dev-frontend & $(MAKE) dev-backend

install:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt

test:
	cd backend && pytest tests/ -v
