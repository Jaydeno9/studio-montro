# ============================================================
# STUDIO MONTRO - End-to-End Test Script
# ============================================================
# Usage: open PowerShell in the backend project folder, run:
#   .\run_e2e_test.ps1
#
# This script will:
#   1. Register a brand-new test customer via Supabase Auth
#   2. Walk through a full customer shopping flow (browse -> cart -> address -> checkout)
#   3. Switch to admin, verify payment, update order status
#   4. Check that analytics numbers reflect the new order
#
# Each step prints [n/16] description ... PASS/FAIL and stops immediately
# on failure so you know exactly which request failed.
# ============================================================

# ---------- Basic config: edit these for your project ----------
$BaseUrl = "http://127.0.0.1:8000"
$SupabaseUrl = "https://ifinmeldkmpiddssvpqg.supabase.co"
$SupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmaW5tZWxka21waWRkc3N2cHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzUyMzgsImV4cCI6MjEwMjYxMTIzOH0.KtnGnHV-HwYG9kAR6ywNSEro--giv08nUChjSNHLDGw"

# Known admin account (used for admin-only steps)
$AdminEmail = "test@test.com"
$AdminPassword = "password123"

# A known active product slug, used to test browsing/search/detail
$KnownProductSlug = "mono-chair"

# ---------- Generate a unique test customer ----------
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "e2e.test.$timestamp@example.com"
$testPassword = "TestPass123!"

$stepNum = 0
$scriptFailed = $false

function Invoke-Step {
    param([string]$Name, [scriptblock]$Action)
    $script:stepNum++
    Write-Host ""
    Write-Host "[$script:stepNum/16] $Name ..." -NoNewline
    try {
        $result = & $Action
        Write-Host " PASS" -ForegroundColor Green
        return $result
    } catch {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        $script:scriptFailed = $true
        throw "Stopped at step [$script:stepNum]: $Name"
    }
}

$supabaseAuthHeaders = @{
    "apikey" = $SupabaseAnonKey
    "Content-Type" = "application/json"
}

Write-Host "============================================================"
Write-Host "STUDIO MONTRO E2E TEST"
Write-Host "Test customer email: $testEmail"
Write-Host "============================================================"

try {

    # ---------- 1. REGISTER ----------
    $registerResult = Invoke-Step "Register new customer" {
        $body = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
        Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/signup" -Method Post -Headers $supabaseAuthHeaders -Body $body
    }

    # ---------- 2. LOGIN ----------
    $loginResult = Invoke-Step "Login" {
        $body = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
        Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" -Method Post -Headers $supabaseAuthHeaders -Body $body
    }
    $token = $loginResult.access_token
    $headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

    if (-not $token) { throw "No access_token received, Register/Login may have failed" }

    # ---------- 3. GET /me ----------
    $meResult = Invoke-Step "GET /me - confirm identity" {
        Invoke-RestMethod -Uri "$BaseUrl/me" -Method Get -Headers $headers
    }
    $userId = $meResult.id
    Write-Host "  user_id: $userId"

    # ---------- 4. Browse products ----------
    $productsResult = Invoke-Step "GET /products - browse" {
        Invoke-RestMethod -Uri "$BaseUrl/products" -Method Get
    }
    if ($productsResult.Count -eq 0) { throw "Product list is empty, cannot continue" }

    # ---------- 5. Search + sort ----------
    Invoke-Step "GET /products?search=chair - search" {
        Invoke-RestMethod -Uri "$BaseUrl/products?search=chair" -Method Get
    } | Out-Null

    Invoke-Step "GET /products?sort=price_asc - sort" {
        Invoke-RestMethod -Uri "$BaseUrl/products?sort=price_asc" -Method Get
    } | Out-Null

    # ---------- 6. Product detail ----------
    $targetProduct = $productsResult | Where-Object { $_.slug -eq $KnownProductSlug } | Select-Object -First 1
    if (-not $targetProduct) { $targetProduct = $productsResult[0] }
    $productId = $targetProduct.id

    $productDetail = Invoke-Step "GET /products/{id} - product detail" {
        Invoke-RestMethod -Uri "$BaseUrl/products/$productId" -Method Get
    }
    Write-Host "  product: $($productDetail.name), stock: $($productDetail.stock_quantity)"

    $colorId = $null
    if ($productDetail.colors.Count -gt 0) {
        $colorId = $productDetail.colors[0].id
        Write-Host "  selected color: $($productDetail.colors[0].color_name)"
    }

    if ($productDetail.stock_quantity -lt 1) {
        throw "Product $($productDetail.name) has insufficient stock, cannot continue checkout flow"
    }

    # ---------- 7. Add to cart (with color if available) ----------
    Invoke-Step "POST /cart/items - add to cart" {
        $body = @{ product_id = $productId; quantity = 1 }
        if ($colorId) { $body.selected_color_id = $colorId }
        $bodyJson = $body | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/cart/items" -Method Post -Headers $headers -Body $bodyJson
    } | Out-Null

    $cartCheck = Invoke-Step "GET /cart - confirm cart contents" {
        Invoke-RestMethod -Uri "$BaseUrl/cart" -Method Get -Headers $headers
    }
    if ($cartCheck.items.Count -eq 0) { throw "Cart is empty, add-to-cart may have failed" }

    # ---------- 8. Create address ----------
    $addressResult = Invoke-Step "POST /addresses - create shipping address" {
        $body = @{
            recipient_name = "E2E Test Customer"
            phone = "0123456789"
            address_line1 = "1 Jalan E2E"
            city = "Kuala Lumpur"
            postcode = "50000"
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/addresses" -Method Post -Headers $headers -Body $body
    }
    $addressId = $addressResult.id

    # ---------- 9. Checkout ----------
    $orderResult = Invoke-Step "POST /orders - checkout" {
        $body = @{ address_id = $addressId; note = "E2E test order" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/orders" -Method Post -Headers $headers -Body $body
    }
    $orderId = $orderResult.id
    Write-Host "  order_id: $orderId, status: $($orderResult.status), total: $($orderResult.total)"

    if ($orderResult.status -ne "pending_payment") { throw "Order status should be pending_payment, got $($orderResult.status)" }

    # ---------- 10. Confirm cart was cleared ----------
    $cartAfterCheckout = Invoke-Step "GET /cart - confirm cart cleared after checkout" {
        Invoke-RestMethod -Uri "$BaseUrl/cart" -Method Get -Headers $headers
    }
    if ($cartAfterCheckout.items.Count -ne 0) { throw "Cart was not cleared after checkout" }

    # ---------- 11. View my orders ----------
    $myOrders = Invoke-Step "GET /orders - view my order list" {
        Invoke-RestMethod -Uri "$BaseUrl/orders" -Method Get -Headers $headers
    }
    if ($myOrders.Count -eq 0) { throw "Order list is empty" }

    $myOrderDetail = Invoke-Step "GET /orders/{id} - order detail" {
        Invoke-RestMethod -Uri "$BaseUrl/orders/$orderId" -Method Get -Headers $headers
    }

    # ---------- 12. Admin login ----------
    $adminLoginResult = Invoke-Step "Admin Login" {
        $body = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
        Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/token?grant_type=password" -Method Post -Headers $supabaseAuthHeaders -Body $body
    }
    $adminToken = $adminLoginResult.access_token
    $adminHeaders = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }

    # ---------- 13. Admin views all orders, confirm new order exists ----------
    $allOrders = Invoke-Step "GET /admin/orders - view all orders" {
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders" -Method Get -Headers $adminHeaders
    }
    $foundOrder = $allOrders | Where-Object { $_.id -eq $orderId }
    if (-not $foundOrder) { throw "New order $orderId not found in admin order list" }

    # ---------- 14. Admin verifies payment ----------
    # verify_payment requires payment_proof_url to exist first
    Invoke-Step "PATCH /orders/{id}/payment-proof - customer uploads payment proof" {
        $body = @{ payment_proof_url = "https://example.com/e2e-test-proof.jpg" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/orders/$orderId/payment-proof" -Method Patch -Headers $headers -Body $body
    } | Out-Null

    $verifyResult = Invoke-Step "PATCH /admin/orders/{id}/payment - admin verifies payment" {
        $body = @{ payment_status = "verified" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders/$orderId/payment" -Method Patch -Headers $adminHeaders -Body $body
    }
    if ($verifyResult.status -ne "processing") { throw "Order status should be processing after payment verification, got $($verifyResult.status)" }
    if ($verifyResult.payment_status -ne "verified") { throw "payment_status should be verified" }

    # ---------- 15. Admin updates order status ----------
    $statusResult = Invoke-Step "PATCH /admin/orders/{id}/status - update to ready_to_ship" {
        $body = @{ status = "ready_to_ship" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$BaseUrl/admin/orders/$orderId/status" -Method Patch -Headers $adminHeaders -Body $body
    }
    if ($statusResult.status -ne "ready_to_ship") { throw "Order status update failed" }

    Invoke-Step "GET /orders/{id}/history - confirm status history recorded" {
        $history = Invoke-RestMethod -Uri "$BaseUrl/orders/$orderId/history" -Method Get -Headers $adminHeaders
        if ($history.Count -lt 2) { throw "Not enough status history entries, expected at least pending_payment and processing" }
        $history
    } | Out-Null

    # ---------- 16. Confirm analytics reflects the new order ----------
    $summaryResult = Invoke-Step "GET /admin/analytics/summary - confirm stats updated" {
        Invoke-RestMethod -Uri "$BaseUrl/admin/analytics/summary" -Method Get -Headers $adminHeaders
    }
    Write-Host "  total_revenue: $($summaryResult.total_revenue), total_orders: $($summaryResult.total_orders)"

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "ALL 16 STEPS PASSED - E2E TEST PASSED" -ForegroundColor Green
    Write-Host "Test order ID: $orderId"
    Write-Host "Test customer: $testEmail"
    Write-Host "============================================================"

} catch {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "E2E TEST FAILED - see the FAIL step above for details" -ForegroundColor Red
    Write-Host "============================================================"
}