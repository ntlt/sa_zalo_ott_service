# Script cấu hình PATH cho Node.js
# Chạy lệnh này trong PowerShell của VS Code (nhấn Ctrl+@)

# Thêm Node.js vào PATH cho phiên bản hiện tại
$nodePath = "D:\Software\NodeJs"
$nodeBin = Join-Path $nodePath ""

# Kiểm tra thư mục tồn tại
if (Test-Path $nodePath) {
    # Thêm vào PATH nếu chưa có
    if ($env:PATH -notcontains $nodePath) {
        $env:PATH = $nodePath + ";" + $env:PATH
        Write-Host "✅ Đã thêm $nodePath vào PATH" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ $nodePath đã có trong PATH" -ForegroundColor Cyan
    }
    
    # Thêm node_modules .bin nếu có
    $binPath = Join-Path $nodePath "node_modules\.bin"
    if (Test-Path $binPath -and $env:PATH -notcontains $binPath) {
        $env:PATH = $binPath + ";" + $env:PATH
        Write-Host "✅ Đã thêm $binPath vào PATH" -ForegroundColor Green
    }
    
    Write-Host "🔄 Cập nhật PATH xong - có thể đóng và mở lại terminal" -ForegroundColor Yellow
} else {
    Write-Host "❌ Không tìm thấy thư mục Node.js: $nodePath" -ForegroundColor Red
    Write-Host "Vui lòng kiểm tra lại đường dẫn cài đặt Node.js" -ForegroundColor Red
}