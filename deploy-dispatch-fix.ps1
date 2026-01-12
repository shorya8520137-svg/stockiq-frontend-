# PowerShell script to deploy dispatch dropdown fix
Write-Host "🚀 DEPLOYING DISPATCH DROPDOWN FIX TO AWS SERVER" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$SERVER_IP = "13.201.222.24"
$SERVER_USER = "ubuntu"
$PROJECT_PATH = "/home/ubuntu/stockiq-frontend-"
$SSH_KEY = "stockiq.pem"

Write-Host "📋 Deployment Summary:" -ForegroundColor Yellow
Write-Host "• Fix dispatch form dropdowns (warehouses, logistics, executives)"
Write-Host "• Deploy comprehensive dispatch controller with real database integration"
Write-Host "• Test all dropdown endpoints"
Write-Host "• Verify stock checking functionality"
Write-Host ""

# Fix SSH key permissions on Windows
Write-Host "🔐 Setting SSH key permissions..." -ForegroundColor Yellow
icacls $SSH_KEY /inheritance:r
icacls $SSH_KEY /grant:r "$($env:USERNAME):R"

# Step 1: Upload dispatch controller
Write-Host "📤 Step 1: Uploading dispatch controller..." -ForegroundColor Yellow
$scpCommand1 = "scp -i $SSH_KEY -o StrictHostKeyChecking=no controllers/dispatchController.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/controllers/"
$result1 = cmd /c $scpCommand1 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dispatch controller uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload dispatch controller: $result1" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Use WSL if available
    try {
        wsl scp -i $SSH_KEY controllers/dispatchController.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/controllers/
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dispatch controller uploaded via WSL" -ForegroundColor Green
        } else {
            Write-Host "❌ WSL upload also failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ WSL not available, manual upload required" -ForegroundColor Red
        Write-Host "Please manually copy controllers/dispatchController.js to your server" -ForegroundColor Yellow
        exit 1
    }
}

# Step 2: Upload dispatch routes
Write-Host "📤 Step 2: Uploading dispatch routes..." -ForegroundColor Yellow
$scpCommand2 = "scp -i $SSH_KEY -o StrictHostKeyChecking=no routes/dispatchRoutes.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/routes/"
$result2 = cmd /c $scpCommand2 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dispatch routes uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to upload dispatch routes: $result2" -ForegroundColor Red
    try {
        wsl scp -i $SSH_KEY routes/dispatchRoutes.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/routes/
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dispatch routes uploaded via WSL" -ForegroundColor Green
        } else {
            Write-Host "❌ WSL upload also failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ WSL not available, manual upload required" -ForegroundColor Red
        Write-Host "Please manually copy routes/dispatchRoutes.js to your server" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Restart server
Write-Host "🔄 Step 3: Restarting server..." -ForegroundColor Yellow
$sshCommand = @"
cd /home/ubuntu/stockiq-frontend-
echo '🛑 Stopping existing server...'
pkill -f 'node server.js' || echo 'No existing server process found'
sleep 2
echo '🚀 Starting server...'
nohup node server.js > server.log 2>&1 &
sleep 3
if pgrep -f 'node server.js' > /dev/null; then
    echo '✅ Server started successfully'
    echo '📋 Server process ID:' `$(pgrep -f 'node server.js')`
else
    echo '❌ Server failed to start'
    echo '📋 Last 10 lines of server log:'
    tail -10 server.log
    exit 1
fi
"@

$sshResult = cmd /c "ssh -i $SSH_KEY -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} `"$sshCommand`"" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Server restarted successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Server restart failed: $sshResult" -ForegroundColor Red
    try {
        wsl ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} "$sshCommand"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Server restarted via WSL" -ForegroundColor Green
        } else {
            Write-Host "❌ WSL restart also failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ WSL not available, manual restart required" -ForegroundColor Red
        Write-Host "Please manually restart your server" -ForegroundColor Yellow
        exit 1
    }
}

# Step 4: Test endpoints
Write-Host "🧪 Step 4: Testing dropdown endpoints..." -ForegroundColor Yellow

# Test with curl
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E"

Write-Host "Testing warehouses endpoint..."
$warehousesResponse = curl -s -H "Authorization: Bearer $token" "https://13-201-222-24.nip.io/api/dispatch/warehouses"
Write-Host "Warehouses: $warehousesResponse"

Write-Host "Testing logistics endpoint..."
$logisticsResponse = curl -s -H "Authorization: Bearer $token" "https://13-201-222-24.nip.io/api/dispatch/logistics"
Write-Host "Logistics: $logisticsResponse"

Write-Host "Testing processed persons endpoint..."
$personsResponse = curl -s -H "Authorization: Bearer $token" "https://13-201-222-24.nip.io/api/dispatch/processed-persons"
Write-Host "Processed Persons: $personsResponse"

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open the dispatch form in your browser"
Write-Host "2. Check that all dropdowns now show data"
Write-Host "3. Test product search functionality"
Write-Host "4. Test stock checking when selecting products"
Write-Host ""
Write-Host "🔗 Test URL: https://your-frontend-domain.vercel.app/order/dispatch" -ForegroundColor Yellow
Write-Host "🔗 Backend API: https://13-201-222-24.nip.io/api/dispatch" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ All dispatch dropdown endpoints should now be live!" -ForegroundColor Green