# ==============================================================================
# Google Cloud Run One-Click Deployment Script (PowerShell)
# ==============================================================================
# 사용법: .\deploy-gcp.ps1 -ProjectId "내-gcp-프로젝트-id" -Region "asia-northeast3"

param (
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "",

    [Parameter(Mandatory=$false)]
    [string]$Region = "asia-northeast3", # 서울 리전

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "alpha-quant-app"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Google Cloud Run 배포 시작: $ServiceName" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Project ID 확인
if (-not $ProjectId) {
    $ProjectId = gcloud config get-value project 2>$null
    if (-not $ProjectId) {
        Write-Error "GCP 프로젝트 ID가 지정되지 않았습니다. 'gcloud config set project [PROJECT_ID]' 또는 파라미터로 지정해주세요."
        exit 1
    }
}

Write-Host "📌 대상 GCP 프로젝트: $ProjectId" -ForegroundColor Yellow
Write-Host "📌 배포 리전: $Region (서울)" -ForegroundColor Yellow

# 2. Cloud Run 컨테이너 빌드 및 배포
Write-Host "`n🔨 Cloud Build 및 Cloud Run 배포 중..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 2 `
    --project $ProjectId

if ($LASTEXITCODE -eq 0) {
    $ServiceUrl = gcloud run services describe $ServiceName --region $Region --format "value(status.url)" --project $ProjectId
    Write-Host "`n🎉 배포 성공!" -ForegroundColor Green
    Write-Host "🌐 웹앱 배포 URL: $ServiceUrl" -ForegroundColor Cyan
    
    Write-Host "`n🕒 [선택 사항] 장 마감 후 자동 수집을 위한 Cloud Scheduler 등록 명령어:" -ForegroundColor Yellow
    Write-Host "gcloud scheduler jobs create http daily-stock-sync --schedule='30 16 * * 1-5' --time-zone='Asia/Seoul' --uri='$ServiceUrl/api/collect/realtime' --http-method=POST" -ForegroundColor Gray
} else {
    Write-Error "배포 중 오류가 발생했습니다."
}
