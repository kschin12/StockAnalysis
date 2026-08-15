# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# 백엔드 의존성 설치
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# 백엔드 소스 복사
COPY server/ ./

# 빌드된 프론트엔드 정적 파일 복사
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 데이터 폴더 생성
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["node", "server.js"]
