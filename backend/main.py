from fastapi import FastAPI, HTTPException, Depends
from typing import Optional, Literal
from database import supabase
from pydantic import BaseModel, ConfigDict, Field
from auth import get_current_user, get_current_user_optional
import re
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone


# ---------- App 初始化（一定要在所有 @app.xxx 之前） ----------
app = FastAPI(title="STUDIO MONTRO API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic Models ----------
class ProductCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: float = Field(ge=0)
    stock_quantity: int = Field(ge=0)
    material: Optional[str] = None
    dimensions: Optional[str] = None
    status: Literal["active", "inactive"] = "active"
    category_id: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    material: Optional[str] = None
    dimensions: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None
    category_id: Optional[str] = None

class OrderCreate(BaseModel):
    address_id: str
    note: Optional[str] = None
    
class AddressCreate(BaseModel):
    label: Optional[str] = None
    recipient_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: Optional[str] = None
    postcode: str
    country: str = "Malaysia"
    is_default: bool = False
    
class ProductImageCreate(BaseModel):
    image_url: str
    sort_order: int = 0

class ProductImageUpdate(BaseModel):
    image_url: Optional[str] = None
    sort_order: Optional[int] = None

class PaymentVerify(BaseModel):
    payment_status: Literal["verified"]
    
class PaymentProofUpdate(BaseModel):
    payment_proof_url: str
    
    
    
class OrderStatusUpdate(BaseModel):
    status: Literal[
        "pending_payment",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
    ]
    cancellation_reason: Optional[str] = None

class RefundComplete(BaseModel):
    reference: str = Field(min_length=1, max_length=200)
    note: Optional[str] = Field(default=None, max_length=1000)
    
class CancellationRequestCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class CancellationRequestResolve(BaseModel):
    action: Literal["approve", "reject"]
    resolution_message: Optional[str] = Field(
        default=None,
        max_length=1000
    )
    admin_note: Optional[str] = Field(
        default=None,
        max_length=1000
    )


HEX_COLOR_PATTERN = re.compile(r'^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$')

class ProductColorCreate(BaseModel):
    color_name: str
    color_hex: str

class ProductColorUpdate(BaseModel):
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    
class AddressUpdate(BaseModel):
    label: Optional[str] = None
    recipient_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None

class CustomerProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)


class CategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    
VALID_STATUSES = ["pending_payment", "processing", "ready_to_ship", "shipped", "delivered", "cancelled"]

class InventoryAdjustmentCreate(BaseModel):
    mode: Literal["add", "remove", "set"]
    quantity: int = Field(ge=0)
    reason: Literal[
        "restock",
        "manual_correction",
        "damaged",
        "return",
        "other",
    ]
    note: Optional[str] = None


def require_admin(current_user):
    profile = (
        supabase
        .table("customer_profiles")
        .select("is_admin")
        .eq("user_id", current_user.id)
        .execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=403,
            detail="Admin profile not found"
        )

    if not profile.data[0].get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
# ---------- Root ----------
@app.get("/")
def root():
    return {"message": "STUDIO MONTRO API is running"}

# ---------- Auth Test ----------
@app.get("/me")
def read_current_user(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email
    }

# ---------- Categories ----------
@app.get("/categories")
def get_categories():
    categories_response = (
        supabase
        .table("categories")
        .select("id, name, slug")
        .order("name")
        .execute()
    )
    active_products_response = (
        supabase
        .table("products")
        .select("category_id")
        .eq("status", "active")
        .execute()
    )

    active_product_counts = {}
    for product in active_products_response.data or []:
        category_id = product.get("category_id")

        if category_id:
            active_product_counts[category_id] = (
                active_product_counts.get(category_id, 0) + 1
            )

    return [
        {
            **category,
            "active_product_count": active_product_counts.get(
                category["id"],
                0,
            ),
        }
        for category in categories_response.data or []
    ]

# ---------- Products ----------
VALID_SORTS = {
    "newest": ("created_at", True),
    "price_asc": ("price", False),
    "price_desc": ("price", True),
    "best_selling": None,
}


@app.get("/products")
def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
):
    if sort is not None and sort not in VALID_SORTS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sort value. "
                f"Must be one of {list(VALID_SORTS.keys())}"
            ),
        )

    # ---------------------------------------------------------
    # 1. Base active products
    # ---------------------------------------------------------

    query = (
        supabase
        .table("products")
        .select(
            "id, name, slug, description, price, stock_quantity, "
            "material, dimensions, status, category_id, created_at"
        )
        .eq("status", "active")
    )

    if category:
        category_response = (
            supabase
            .table("categories")
            .select("id")
            .eq("slug", category)
            .execute()
        )

        if not category_response.data:
            return []

        query = query.eq(
            "category_id",
            category_response.data[0]["id"],
        )

    if search:
        query = query.ilike(
            "name",
            f"%{search.strip()}%",
        )

    if min_price is not None:
        query = query.gte("price", min_price)

    if max_price is not None:
        query = query.lte("price", max_price)

    sort_key = sort or "newest"

    # best_selling is calculated from order_items below,
    # so use newest as a stable database ordering first.
    if sort_key == "best_selling":
        query = query.order("created_at", desc=True)
    else:
        sort_field, sort_desc = VALID_SORTS[sort_key]
        query = query.order(
            sort_field,
            desc=sort_desc,
        )

    products_response = query.execute()
    products = products_response.data or []

    if not products:
        return []

    product_ids = [product["id"] for product in products]

    # ---------------------------------------------------------
    # 2. Categories
    # ---------------------------------------------------------

    categories_response = (
        supabase
        .table("categories")
        .select("id, name, slug")
        .execute()
    )

    categories_by_id = {
        category["id"]: category
        for category in (categories_response.data or [])
    }

    # ---------------------------------------------------------
    # 3. Images
    # ---------------------------------------------------------

    images_response = (
        supabase
        .table("product_images")
        .select("id, product_id, image_url, sort_order")
        .in_("product_id", product_ids)
        .order("sort_order", desc=False)
        .execute()
    )

    images_by_product = {}

    for image in images_response.data or []:
        product_id = image["product_id"]

        if product_id not in images_by_product:
            images_by_product[product_id] = []

        images_by_product[product_id].append(image)

    # ---------------------------------------------------------
    # 4. Colors
    # ---------------------------------------------------------

    colors_response = (
        supabase
        .table("product_colors")
        .select(
            "id, product_id, color_name, color_hex"
        )
        .in_("product_id", product_ids)
        .execute()
    )

    colors_by_product = {}

    for color in colors_response.data or []:
        product_id = color["product_id"]

        if product_id not in colors_by_product:
            colors_by_product[product_id] = []

        colors_by_product[product_id].append({
            "id": color["id"],
            "color_name": color["color_name"],
            "color_hex": color["color_hex"],
        })

    # ---------------------------------------------------------
    # 5. Real sales totals
    #
    # Only:
    # - payment verified
    # - order not cancelled
    #
    # count as sales.
    # ---------------------------------------------------------

    units_sold_by_product = {
        product_id: 0
        for product_id in product_ids
    }

    valid_orders_response = (
        supabase
        .table("orders")
        .select("id")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .execute()
    )

    valid_order_ids = [
        order["id"]
        for order in (valid_orders_response.data or [])
    ]

    if valid_order_ids:
        sold_items_response = (
            supabase
            .table("order_items")
            .select(
                "product_id, quantity"
            )
            .in_("order_id", valid_order_ids)
            .in_("product_id", product_ids)
            .execute()
        )

        for item in sold_items_response.data or []:
            product_id = item.get("product_id")

            if not product_id:
                continue

            if product_id not in units_sold_by_product:
                continue

            units_sold_by_product[product_id] += int(
                item.get("quantity") or 0
            )

    # ---------------------------------------------------------
    # 6. Build customer-facing product response
    # ---------------------------------------------------------

    result = []

    for product in products:
        product_id = product["id"]

        product_images = images_by_product.get(
            product_id,
            [],
        )

        primary_image = (
            product_images[0]["image_url"]
            if len(product_images) > 0
            else None
        )

        secondary_image = (
            product_images[1]["image_url"]
            if len(product_images) > 1
            else None
        )

        category_data = categories_by_id.get(
            product.get("category_id")
        )

        result.append({
            "id": product["id"],
            "name": product["name"],
            "slug": product["slug"],
            "description": product["description"],
            "price": product["price"],
            "stock_quantity": product["stock_quantity"],
            "material": product["material"],
            "dimensions": product["dimensions"],
            "status": product["status"],
            "category": category_data,
            "primary_image": primary_image,
            "secondary_image": secondary_image,
            "colors": colors_by_product.get(
                product_id,
                [],
            ),
            "created_at": product["created_at"],

            # Real historical sales quantity.
            "units_sold": units_sold_by_product.get(
                product_id,
                0,
            ),
        })

    # ---------------------------------------------------------
    # 7. Best selling needs application-level sorting because
    # units_sold is calculated from order_items, not products.
    # ---------------------------------------------------------

    if sort_key == "best_selling":
        result.sort(
            key=lambda product: (
                product["units_sold"],
                product["created_at"],
            ),
            reverse=True,
        )

    return result


@app.get("/products/saved")
def get_saved_products(
    current_user=Depends(get_current_user)
):
    response = (
        supabase
        .table("saved_products")
        .select(
            """
            id,
            created_at,
            product_id,
            products(
                id,
                name,
                slug,
                description,
                price,
                stock_quantity,
                material,
                dimensions,
                status
            )
            """
        )
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )

    saved_products = []

    for item in response.data:
        product = item.get("products")

        # 如果 product 已经不存在 / inactive，不返回给 customer
        if not product or product.get("status") != "active":
            continue

        saved_products.append({
            "saved_id": item["id"],
            "saved_at": item["created_at"],
            "product": product
        })

    return saved_products

@app.get("/products/{product_id}")
def get_product(product_id: str, current_user = Depends(get_current_user_optional)):
    response = (
        supabase
        .table("products")
        .select("id, name, slug, description, price, stock_quantity, material, dimensions, status, category_id")
        .eq("id", product_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = response.data[0]

    # 权限检查：inactive 商品只有 admin 能看，其他人一律当作不存在
    if product["status"] != "active":
        is_admin = False
        if current_user:
            profile = (
                supabase
                .table("customer_profiles")
                .select("is_admin")
                .eq("user_id", current_user.id)
                .single()
                .execute()
            )
            is_admin = bool(profile.data and profile.data.get("is_admin"))

        if not is_admin:
            raise HTTPException(status_code=404, detail="Product not found")

    # category（可能没有）
    category = None
    if product.get("category_id"):
        cat_response = (
            supabase
            .table("categories")
            .select("id, name, slug")
            .eq("id", product["category_id"])
            .execute()
        )
        if cat_response.data:
            category = cat_response.data[0]

    # images，按 sort_order 排序
    images_response = (
        supabase
        .table("product_images")
        .select("id, product_id, image_url, sort_order, created_at")
        .eq("product_id", product_id)
        .order("sort_order", desc=False)
        .execute()
    )

    # colors（不含 stock_quantity，Task 1 已经把这个字段从 product_colors 移除了）
    colors_response = (
        supabase
        .table("product_colors")
        .select("id, product_id, color_name, color_hex, created_at")
        .eq("product_id", product_id)
        .execute()
    )

    return {
        "id": product["id"],
        "name": product["name"],
        "slug": product["slug"],
        "description": product["description"],
        "price": product["price"],
        "stock_quantity": product["stock_quantity"],
        "material": product["material"],
        "dimensions": product["dimensions"],
        "status": product["status"],
        "category": category,
        "images": images_response.data,
        "colors": colors_response.data,
    }

@app.post("/products/{product_id}/save")
def save_product(
    product_id: str,
    current_user=Depends(get_current_user)
):
    # 1. 确认 product 存在，而且是 active
    product_check = (
        supabase
        .table("products")
        .select("id, name, status")
        .eq("id", product_id)
        .execute()
    )

    if not product_check.data:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = product_check.data[0]

    if product["status"] != "active":
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # 2. 检查是否已经 save
    existing = (
        supabase
        .table("saved_products")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("product_id", product_id)
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="Product already saved"
        )

    # 3. Save
    response = (
        supabase
        .table("saved_products")
        .insert({
            "user_id": current_user.id,
            "product_id": product_id
        })
        .execute()
    )

    return {
        "message": "Product saved",
        "saved_product": response.data[0]
    }

@app.delete("/products/{product_id}/save")
def unsave_product(
    product_id: str,
    current_user=Depends(get_current_user)
):
    # 1. 找到这个用户的 saved product
    existing = (
        supabase
        .table("saved_products")
        .select("id")
        .eq("user_id", current_user.id)
        .eq("product_id", product_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Product is not saved"
        )

    # 2. 删除
    (
        supabase
        .table("saved_products")
        .delete()
        .eq("user_id", current_user.id)
        .eq("product_id", product_id)
        .execute()
    )

    return {
        "message": "Product unsaved"
    }



# ---------- Product Images ----------

@app.post("/products/{product_id}/images")
def create_product_image(
    product_id: str,
    image: ProductImageCreate,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    product_check = supabase.table("products").select("id").eq("id", product_id).execute()
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if not image.image_url.strip():
        raise HTTPException(status_code=400, detail="image_url cannot be empty")

    response = (
        supabase
        .table("product_images")
        .insert({
            "product_id": product_id,
            "image_url": image.image_url,
            "sort_order": image.sort_order
        })
        .execute()
    )
    return response.data[0]


@app.get("/products/{product_id}/images")
def get_product_images(
    product_id: str,
    current_user = Depends(get_current_user_optional)
):
    product_check = (
        supabase
        .table("products")
        .select("id, status")
        .eq("id", product_id)
        .execute()
    )
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product_check.data[0]

    if product["status"] != "active":
        is_admin = False
        if current_user:
            profile = (
                supabase
                .table("customer_profiles")
                .select("is_admin")
                .eq("user_id", current_user.id)
                .single()
                .execute()
            )
            is_admin = bool(profile.data and profile.data.get("is_admin"))

        if not is_admin:
            raise HTTPException(status_code=404, detail="Product not found")

    response = (
        supabase
        .table("product_images")
        .select("id, product_id, image_url, sort_order, created_at")
        .eq("product_id", product_id)
        .order("sort_order", desc=False)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data


@app.patch("/products/{product_id}/images/{image_id}")
def update_product_image(
    product_id: str,
    image_id: str,
    image: ProductImageUpdate,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("product_images")
        .select("*")
        .eq("id", image_id)
        .eq("product_id", product_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Image not found for this product")

    update_data = image.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "image_url" in update_data and not update_data["image_url"].strip():
        raise HTTPException(status_code=400, detail="image_url cannot be empty")

    response = (
        supabase
        .table("product_images")
        .update(update_data)
        .eq("id", image_id)
        .eq("product_id", product_id)
        .execute()
    )
    return response.data[0]


@app.delete("/products/{product_id}/images/{image_id}")
def delete_product_image(
    product_id: str,
    image_id: str,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("product_images")
        .select("id")
        .eq("id", image_id)
        .eq("product_id", product_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Image not found for this product")

    supabase.table("product_images").delete().eq("id", image_id).eq("product_id", product_id).execute()
    return {"message": "Image deleted"}

# ---------- Product Colors ----------

@app.post("/products/{product_id}/colors")
def create_product_color(
    product_id: str,
    color: ProductColorCreate,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    # 确认商品存在
    product_check = supabase.table("products").select("id").eq("id", product_id).execute()
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if not color.color_name.strip():
        raise HTTPException(status_code=400, detail="color_name cannot be empty")

    if not HEX_COLOR_PATTERN.match(color.color_hex):
        raise HTTPException(status_code=400, detail="color_hex must be a valid hex color, e.g. #1A1A1A")

    # 应用层先检查重复（给用户更友好的错误信息）
    existing = (
        supabase
        .table("product_colors")
        .select("id")
        .eq("product_id", product_id)
        .ilike("color_name", color.color_name.strip())
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail=f"Color '{color.color_name}' already exists for this product")

    try:
        response = (
            supabase
            .table("product_colors")
            .insert({
                "product_id": product_id,
                "color_name": color.color_name.strip(),
                "color_hex": color.color_hex
            })
            .execute()
        )
    except Exception:
        # 双保险：万一竞态条件绕过了上面的检查，数据库约束会挡下来
        raise HTTPException(status_code=400, detail=f"Color '{color.color_name}' already exists for this product")

    return response.data[0]


@app.get("/products/{product_id}/colors")
def get_product_colors(
    product_id: str,
    current_user = Depends(get_current_user_optional)
):
    product_check = (
        supabase
        .table("products")
        .select("id, status")
        .eq("id", product_id)
        .execute()
    )
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product_check.data[0]

    if product["status"] != "active":
        is_admin = False
        if current_user:
            profile = (
                supabase
                .table("customer_profiles")
                .select("is_admin")
                .eq("user_id", current_user.id)
                .single()
                .execute()
            )
            is_admin = bool(profile.data and profile.data.get("is_admin"))

        if not is_admin:
            raise HTTPException(status_code=404, detail="Product not found")

    response = (
        supabase
        .table("product_colors")
        .select("id, product_id, color_name, color_hex, created_at")
        .eq("product_id", product_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data


@app.patch("/products/{product_id}/colors/{color_id}")
def update_product_color(
    product_id: str,
    color_id: str,
    color: ProductColorUpdate,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    # 关键检查：这个颜色必须真的属于这个 product_id
    existing = (
        supabase
        .table("product_colors")
        .select("*")
        .eq("id", color_id)
        .eq("product_id", product_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Color not found for this product")

    update_data = color.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "color_name" in update_data:
        if not update_data["color_name"].strip():
            raise HTTPException(status_code=400, detail="color_name cannot be empty")
        update_data["color_name"] = update_data["color_name"].strip()

        # 检查重名（排除自己这一条）
        dup_check = (
            supabase
            .table("product_colors")
            .select("id")
            .eq("product_id", product_id)
            .ilike("color_name", update_data["color_name"])
            .neq("id", color_id)
            .execute()
        )
        if dup_check.data:
            raise HTTPException(status_code=400, detail=f"Color '{update_data['color_name']}' already exists for this product")

    if "color_hex" in update_data:
        if not HEX_COLOR_PATTERN.match(update_data["color_hex"]):
            raise HTTPException(status_code=400, detail="color_hex must be a valid hex color, e.g. #1A1A1A")

    try:
        response = (
            supabase
            .table("product_colors")
            .update(update_data)
            .eq("id", color_id)
            .eq("product_id", product_id)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Color name already exists for this product")

    return response.data[0]


@app.delete("/products/{product_id}/colors/{color_id}")
def delete_product_color(
    product_id: str,
    color_id: str,
    current_user = Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("product_colors")
        .select("id")
        .eq("id", color_id)
        .eq("product_id", product_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Color not found for this product")

    supabase.table("product_colors").delete().eq("id", color_id).eq("product_id", product_id).execute()
    return {"message": "Color deleted"}

@app.post("/products")
def create_product(
    product: ProductCreate,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("products")
        .select("id")
        .eq("slug", product.slug)
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="Product slug already exists"
        )

    response = (
        supabase
        .table("products")
        .insert(product.model_dump())
        .execute()
    )

    return response.data[0]

@app.patch("/products/{product_id}")
def update_product(
    product_id: str,
    product: ProductUpdate,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("products")
        .select("id")
        .eq("id", product_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    update_data = product.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields to update"
        )

    response = (
        supabase
        .table("products")
        .update(update_data)
        .eq("id", product_id)
        .execute()
    )

    return response.data[0]

@app.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("products")
        .select("id")
        .eq("id", product_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    response = (
        supabase
        .table("products")
        .update({"status": "inactive"})
        .eq("id", product_id)
        .execute()
    )

    return {
        "message": "Product deactivated",
        "product": response.data[0]
    }

# ---------- Categories ----------

@app.get("/categories/{category_id}")
def get_category(category_id: str):
    response = supabase.table("categories").select("*").eq("id", category_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Category not found")
    return response.data

# ---------- Cart Models ----------
class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1)
    selected_color_id: Optional[str] = None

class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)

# ---------- Cart Helper: 拿到（或自动建立）这个用户的购物车 ----------
def get_or_create_cart(user_id: str):
    existing = supabase.table("carts").select("*").eq("user_id", user_id).execute()
    if existing.data:
        return existing.data[0]
    
    new_cart = supabase.table("carts").insert({"user_id": user_id}).execute()
    return new_cart.data[0]

def get_or_create_customer_profile(user_id: str):
    existing = supabase.table("customer_profiles").select("*").eq("user_id", user_id).execute()
    if existing.data:
        return existing.data[0]
    
    new_profile = supabase.table("customer_profiles").insert({"user_id": user_id}).execute()
    return new_profile.data[0]
# ---------- GET /cart ----------
@app.get("/cart")
def get_cart(current_user = Depends(get_current_user)):
    cart = get_or_create_cart(current_user.id)
    
    items = (
        supabase
        .table("cart_items")
        .select("*, products(name, price, slug), product_colors(color_name, color_hex)")
        .eq("cart_id", cart["id"])
        .execute()
    )
    cart_items = []

    for item in items.data:
        product = item.get("products") or {}

        quantity = item["quantity"]
        price = product.get("price", 0)

        cart_items.append({
            **item,
            "subtotal": price * quantity
        })

    total = sum(item["subtotal"] for item in cart_items)

    return {
        "cart_id": cart["id"],
        "items": cart_items,
        "total": total
    }

# ---------- POST /cart/items ----------
@app.post("/cart/items")
def add_cart_item(item: CartItemCreate, current_user = Depends(get_current_user)):
    cart = get_or_create_cart(current_user.id)

    # 检查商品是否存在，并拿到库存
    product_check = (
        supabase
        .table("products")
        .select("id, stock_quantity, status")
        .eq("id", item.product_id)
        .execute()
    )
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product_check.data[0]
    if product["stock_quantity"] <= 0:
        raise HTTPException(
            status_code=400,
            detail="Product is out of stock"
        )
    if product["status"] != "active":
        raise HTTPException(status_code=400, detail="Product is not available")
    

    # 颜色验证（保留原本逻辑）
    if item.selected_color_id:
        color_check = (
            supabase
            .table("product_colors")
            .select("id")
            .eq("id", item.selected_color_id)
            .eq("product_id", item.product_id)
            .execute()
        )
        if not color_check.data:
            raise HTTPException(status_code=400, detail="Invalid color for this product")

    # 检查是否已在购物车里
    query = (
        supabase
        .table("cart_items")
        .select("*")
        .eq("cart_id", cart["id"])
        .eq("product_id", item.product_id)
    )
    if item.selected_color_id:
        query = query.eq("selected_color_id", item.selected_color_id)
    else:
        query = query.is_("selected_color_id", "null")

    existing = query.execute()

    if existing.data:
        new_qty = existing.data[0]["quantity"] + item.quantity
        if new_qty > product["stock_quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Only {product['stock_quantity']} in stock, cart already has {existing.data[0]['quantity']}"
            )
        response = (
            supabase
            .table("cart_items")
            .update({"quantity": new_qty})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
        return response.data
    else:
        if item.quantity > product["stock_quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Only {product['stock_quantity']} in stock"
            )
        response = (
            supabase
            .table("cart_items")
            .insert({
                "cart_id": cart["id"],
                "product_id": item.product_id,
                "quantity": item.quantity,
                "selected_color_id": item.selected_color_id
            })
            .execute()
        )
        return response.data

# ---------- PATCH /cart/items/{id} ----------
@app.patch("/cart/items/{item_id}")
def update_cart_item(item_id: str, item: CartItemUpdate, current_user = Depends(get_current_user)):
    cart = get_or_create_cart(current_user.id)

    existing = (
        supabase
        .table("cart_items")
        .select("*")
        .eq("id", item_id)
        .eq("cart_id", cart["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cart item not found")

    product_check = (
        supabase
        .table("products")
        .select("stock_quantity, status")
        .eq("id", existing.data[0]["product_id"])
        .execute()
    )
    if not product_check.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product_check.data[0]

    if product["status"] != "active":
        raise HTTPException(status_code=400, detail="Product is no longer available")

    stock = product["stock_quantity"]
    if item.quantity > stock:
        raise HTTPException(status_code=400, detail=f"Only {stock} in stock")

    response = (
        supabase
        .table("cart_items")
        .update({"quantity": item.quantity})
        .eq("id", item_id)
        .execute()
    )
    return response.data

# ---------- DELETE /cart/items/{id} ----------
@app.delete("/cart/items/{item_id}")
def delete_cart_item(item_id: str, current_user = Depends(get_current_user)):
    cart = get_or_create_cart(current_user.id)
    
    existing = (
        supabase
        .table("cart_items")
        .select("*")
        .eq("id", item_id)
        .eq("cart_id", cart["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    supabase.table("cart_items").delete().eq("id", item_id).execute()
    return {"message": "Item removed from cart"}

@app.get("/profile")
def get_my_profile(current_user = Depends(get_current_user)):
    profile = get_or_create_customer_profile(current_user.id)

    return {
        "id": profile["id"],
        "user_id": profile["user_id"],
        "full_name": profile.get("full_name"),
        "phone": profile.get("phone"),
        "email": getattr(current_user, "email", None),
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
    }


@app.patch("/profile")
def update_my_profile(
    payload: CustomerProfileUpdate,
    current_user = Depends(get_current_user),
):
    profile = get_or_create_customer_profile(current_user.id)

    update_data = payload.model_dump(exclude_unset=True)

    if "full_name" in update_data and update_data["full_name"] is not None:
        update_data["full_name"] = update_data["full_name"].strip() or None

    if "phone" in update_data and update_data["phone"] is not None:
        update_data["phone"] = update_data["phone"].strip() or None

    if not update_data:
        raise HTTPException(status_code=400, detail="No profile fields to update")

    response = (
        supabase
        .table("customer_profiles")
        .update(update_data)
        .eq("id", profile["id"])
        .eq("user_id", current_user.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Unable to update profile")

    updated = response.data[0]

    return {
        "id": updated["id"],
        "user_id": updated["user_id"],
        "full_name": updated.get("full_name"),
        "phone": updated.get("phone"),
        "email": getattr(current_user, "email", None),
        "created_at": updated.get("created_at"),
        "updated_at": updated.get("updated_at"),
    }


@app.post("/addresses")
def create_address(address: AddressCreate, current_user = Depends(get_current_user)):
    profile = get_or_create_customer_profile(current_user.id)

    data = address.model_dump()
    data["customer_id"] = profile["id"]

    # 如果这是客人的第一笔地址，自动设成 default
    existing_addresses = (
        supabase
        .table("addresses")
        .select("id")
        .eq("customer_id", profile["id"])
        .execute()
    )
    if not existing_addresses.data:
        data["is_default"] = True

    # 如果这笔要设成 default，先把其他地址的 default 取消
    if data.get("is_default"):
        supabase.table("addresses").update({"is_default": False}).eq("customer_id", profile["id"]).execute()

    response = supabase.table("addresses").insert(data).execute()
    return response.data[0]


@app.get("/addresses")
def get_my_addresses(current_user = Depends(get_current_user)):
    profile = get_or_create_customer_profile(current_user.id)

    response = (
        supabase
        .table("addresses")
        .select("*")
        .eq("customer_id", profile["id"])
        .order("created_at", desc=False)
        .execute()
    )
    return response.data


@app.patch("/addresses/{address_id}")
def update_address(address_id: str, address: AddressUpdate, current_user = Depends(get_current_user)):
    profile = get_or_create_customer_profile(current_user.id)

    # 归属检查：这笔地址必须属于当前登录客人
    existing = (
        supabase
        .table("addresses")
        .select("*")
        .eq("id", address_id)
        .eq("customer_id", profile["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Address not found")

    update_data = address.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # 如果这次要把这笔设成 default，先把这个客人其他地址的 default 取消
    if update_data.get("is_default") is True:
        supabase.table("addresses").update({"is_default": False}).eq("customer_id", profile["id"]).execute()

    response = (
        supabase
        .table("addresses")
        .update(update_data)
        .eq("id", address_id)
        .eq("customer_id", profile["id"])
        .execute()
    )
    return response.data[0]


@app.delete("/addresses/{address_id}")
def delete_address(address_id: str, current_user = Depends(get_current_user)):
    profile = get_or_create_customer_profile(current_user.id)

    existing = (
        supabase
        .table("addresses")
        .select("*")
        .eq("id", address_id)
        .eq("customer_id", profile["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = existing.data[0]["is_default"]

    try:
        supabase.table("addresses").delete().eq("id", address_id).eq("customer_id", profile["id"]).execute()
    except Exception as e:
        error_str = str(e)
        if "23503" in error_str or "foreign key" in error_str.lower():
            raise HTTPException(
                status_code=409,
                detail="This address is linked to an existing order and cannot be deleted"
            )
        raise HTTPException(status_code=500, detail="Failed to delete address")

    if was_default:
        remaining = (
            supabase
            .table("addresses")
            .select("id")
            .eq("customer_id", profile["id"])
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        if remaining.data:
            supabase.table("addresses").update({"is_default": True}).eq("id", remaining.data[0]["id"]).execute()

    return {"message": "Address deleted"}

@app.get("/orders")
def get_my_orders(current_user = Depends(get_current_user)):
    response = (
        supabase
        .table("orders")
        .select(
            """
            id,
            status,
            payment_status,
            payment_proof_url,
            refund_status,
            total,
            created_at,
            order_items(
                id,
                product_name,
                quantity
            ),
            order_cancellation_requests(
                id,
                status,
                created_at
            )
            """
        )
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data

@app.post("/orders")
def create_order(order: OrderCreate, current_user = Depends(get_current_user)):
    try:
        response = supabase.rpc("checkout_order", {
            "p_user_id": current_user.id,
            "p_address_id": order.address_id,
            "p_note": order.note,
            "p_payment_proof_url": None
        }).execute()
    except Exception as exc:
        message = str(exc)

        if "Cart is empty" in message:
            raise HTTPException(
                status_code=400,
                detail="Your cart is empty"
            )

        if "Insufficient stock" in message:
            raise HTTPException(
                status_code=409,
                detail="One or more items no longer have enough stock. Please review your cart."
            )

        if "no longer available" in message:
            raise HTTPException(
                status_code=409,
                detail="One or more products are no longer available."
            )

        if "Selected color is no longer valid" in message:
            raise HTTPException(
                status_code=409,
                detail="A selected product finish is no longer available."
            )

        if "Address not found" in message:
            raise HTTPException(
                status_code=400,
                detail="Please select a valid delivery address."
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to place your order. Please review your cart and try again."
        )
        
    order_id = response.data
    
    full_order = (
        supabase
        .table("orders")
        .select(
            """
            id,
            status,
            payment_status,
            payment_method,
            payment_proof_url,
            payment_proof_submitted_at,
            subtotal,
            total,
            note,
            created_at,
            order_items(
                id,
                product_name,
                unit_price,
                quantity,
                color_name
            ),
            addresses(
                recipient_name,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                postcode,
                country
            )
            """
        )
        .eq("id", order_id)
        .single()
        .execute()
    )
    return full_order.data

@app.patch("/orders/{order_id}/payment-proof")
def submit_payment_proof(
    order_id: str,
    payload: PaymentProofUpdate,
    current_user=Depends(get_current_user)
):
    proof_path = payload.payment_proof_url.strip()

    if not proof_path:
        raise HTTPException(
            status_code=400,
            detail="Payment proof path cannot be empty"
        )

    try:
        supabase.rpc(
            "submit_order_payment_proof",
            {
                "p_order_id": order_id,
                "p_user_id": current_user.id,
                "p_payment_proof_url": proof_path,
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        # Keep user-facing errors useful without exposing internals.
        if "Payment window has expired" in message:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The 24-hour payment window has expired. "
                    "This order can no longer accept payment proof."
                )
            )

        if "already been submitted" in message:
            raise HTTPException(
                status_code=409,
                detail="Payment proof has already been submitted"
            )

        if "permission" in message.lower():
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this order"
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to submit payment proof. Please try again or contact support."
        )

    response = (
        supabase
        .table("orders")
        .select(
            "id, status, payment_status, payment_method, payment_proof_url, "
            "payment_proof_submitted_at, refund_status, refund_reference, "
            "refunded_at, cancellation_reason, cancelled_at, subtotal, total, "
            "note, created_at, updated_at"
        )
        .eq("id", order_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return response.data

@app.get("/orders/{order_id}")
def get_my_order(
    order_id: str,
    current_user=Depends(get_current_user)
):
    response = (
        supabase
        .table("orders")
        .select(
            """
            id,
            status,
            payment_status,
            payment_method,
            payment_proof_url,
            payment_proof_submitted_at,
            refund_status,
            refund_reference,
            refunded_at,
            cancellation_reason,
            cancelled_at,
            subtotal,
            total,
            note,
            created_at,
            updated_at,
            order_items(
                id,
                product_name,
                unit_price,
                quantity,
                color_name
            ),
            addresses(
                recipient_name,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                postcode,
                country
            ),
            order_status_history(
                id,
                order_id,
                status,
                changed_at
            ),
            order_cancellation_requests(
                id,
                order_id,
                user_id,
                status,
                reason,
                resolution_message,
                reviewed_at,
                created_at,
                updated_at
            ),
            order_refund_history(
                id,
                order_id,
                event,
                amount,
                reference,
                created_at
            )
            """
        )
        .eq("id", order_id)
        .eq("user_id", current_user.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return response.data[0]

@app.patch("/admin/orders/{order_id}/payment")
def verify_payment(
    order_id: str,
    payload: PaymentVerify,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    if payload.payment_status != "verified":
        raise HTTPException(
            status_code=400,
            detail="Payment can only be verified"
        )

    try:
        supabase.rpc(
            "verify_order_payment",
            {
                "p_order_id": order_id,
                "p_changed_by": current_user.id,
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "already verified" in message:
            raise HTTPException(
                status_code=409,
                detail="Payment is already verified"
            )

        if "Cancelled orders" in message:
            raise HTTPException(
                status_code=409,
                detail="Cancelled orders cannot be verified"
            )

        if "Payment proof" in message:
            raise HTTPException(
                status_code=400,
                detail="A valid payment proof is required before verification"
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to verify payment."
        )

    response = (
        supabase
        .table("orders")
        .select("*")
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return response.data

@app.patch("/admin/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    # 1. Validate target status
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of {VALID_STATUSES}"
        )

    # 2. Get current order
    existing = (
        supabase
        .table("orders")
        .select("*")
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order = existing.data
    current_status = order["status"]
    new_status = payload.status
    payment_status = order["payment_status"]

    # 3. If status is unchanged, do nothing.
    #    cancelled -> cancelled is therefore also safe here.
    if current_status == new_status:
        return order

    # 4. Define allowed status transitions
    allowed_transitions = {
        "pending_payment": ["processing", "cancelled"],
        "processing": ["ready_to_ship", "cancelled"],
        "ready_to_ship": ["shipped", "cancelled"],
        "shipped": ["delivered"],
        "delivered": [],
        "cancelled": []
    }

    allowed_next_statuses = allowed_transitions.get(
        current_status,
        []
    )

    if new_status not in allowed_next_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status transition: "
                f"{current_status} -> {new_status}"
            )
        )

    # 5. Cancellation is special:
    #    status update + stock restoration + history are performed
    #    atomically inside PostgreSQL.
    if new_status == "cancelled":
        try:
            supabase.rpc(
                "cancel_order_and_restore_stock",
                {
                    "p_order_id": order_id,
                    "p_changed_by": current_user.id,
                    "p_reason": payload.cancellation_reason
                }
            ).execute()
        except Exception as exc:
            message = str(exc)

            if "Order cannot be cancelled" in message:
                raise HTTPException(
                    status_code=409,
                    detail=message
                )

            if "Order not found" in message:
                raise HTTPException(
                    status_code=404,
                    detail="Order not found"
                )

            raise HTTPException(
                status_code=400,
                detail="Unable to cancel order."
            )

        cancelled_order = (
            supabase
            .table("orders")
            .select("*")
            .eq("id", order_id)
            .single()
            .execute()
        )

        if not cancelled_order.data:
            raise HTTPException(
                status_code=500,
                detail="Order was cancelled but could not be reloaded"
            )

        return cancelled_order.data

    # 6. Payment must be verified before processing
    if (
        new_status == "processing"
        and payment_status != "verified"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Payment must be verified before order "
                "can enter processing"
            )
        )

    # 7. Normal non-cancellation transitions are also atomic.
    try:
        supabase.rpc(
            "transition_order_status",
            {
                "p_order_id": order_id,
                "p_new_status": new_status,
                "p_changed_by": current_user.id,
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "Invalid status transition" in message:
            raise HTTPException(
                status_code=409,
                detail=message
            )

        if "Payment must be verified" in message:
            raise HTTPException(
                status_code=400,
                detail="Payment must be verified before processing"
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to update order status."
        )

    updated_order = (
        supabase
        .table("orders")
        .select("*")
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not updated_order.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return updated_order.data


@app.post("/orders/{order_id}/cancellation-request")
def request_order_cancellation(
    order_id: str,
    payload: CancellationRequestCreate,
    current_user=Depends(get_current_user)
):
    try:
        response = supabase.rpc(
            "request_order_cancellation",
            {
                "p_order_id": order_id,
                "p_user_id": current_user.id,
                "p_reason": payload.reason.strip(),
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "Order not found" in message:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        if "already pending" in message:
            raise HTTPException(
                status_code=409,
                detail="A cancellation request is already pending"
            )

        if "can no longer be requested" in message:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This order can no longer be cancelled because "
                    "fulfilment has progressed too far."
                )
            )

        if "reason is required" in message:
            raise HTTPException(
                status_code=400,
                detail="Cancellation reason is required"
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to submit the cancellation request."
        )

    request_id = response.data

    request = (
        supabase
        .table("order_cancellation_requests")
        .select(
            "id, order_id, user_id, status, reason, "
            "resolution_message, reviewed_at, created_at, updated_at"
        )
        .eq("id", request_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )

    if not request.data:
        raise HTTPException(
            status_code=500,
            detail="Cancellation request was created but could not be reloaded"
        )

    return request.data


@app.get("/orders/{order_id}/history")
def get_order_history(
    order_id: str,
    current_user=Depends(get_current_user)
):
    owned_order = (
        supabase
        .table("orders")
        .select("id")
        .eq("id", order_id)
        .eq("user_id", current_user.id)
        .execute()
    )

    if not owned_order.data:
        # Admins may inspect any order history.
        require_admin(current_user)

        admin_order = (
            supabase
            .table("orders")
            .select("id")
            .eq("id", order_id)
            .execute()
        )

        if not admin_order.data:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

    response = (
        supabase
        .table("order_status_history")
        .select("id, order_id, status, changed_at")
        .eq("order_id", order_id)
        .order("changed_at")
        .execute()
    )

    return response.data

@app.get("/admin/me")
def get_admin_identity(current_user=Depends(get_current_user)):
    require_admin(current_user)

    return {
        "user_id": current_user.id,
        "is_admin": True,
    }


def get_admin_customer_email(user_id: str):
    if not user_id:
        return None

    try:
        response = supabase.auth.admin.get_user_by_id(user_id)
        user = response.user
        return user.email if user else None
    except Exception:
        return None


def get_admin_customer_email_map(user_ids):
    remaining_user_ids = {str(user_id) for user_id in user_ids if user_id}
    email_by_user_id = {}
    page = 1
    per_page = 1000

    try:
        while remaining_user_ids:
            users = supabase.auth.admin.list_users(
                page=page,
                per_page=per_page,
            )

            if not users:
                break

            for user in users:
                user_id = str(user.id)
                if user_id in remaining_user_ids:
                    email_by_user_id[user_id] = user.email
                    remaining_user_ids.remove(user_id)

            if len(users) < per_page:
                break

            page += 1
    except Exception:
        # Email is supplementary admin-facing data. A failed Auth lookup must
        # not prevent customer profiles and order metrics from loading.
        pass

    return email_by_user_id


@app.get("/admin/customers")
def get_admin_customers(current_user=Depends(get_current_user)):
    require_admin(current_user)

    profiles_response = (
        supabase
        .table("customer_profiles")
        .select("id, user_id, full_name, phone, created_at")
        .eq("is_admin", False)
        .order("created_at", desc=True)
        .execute()
    )
    profiles = profiles_response.data or []

    if not profiles:
        return []

    customer_ids = [profile["id"] for profile in profiles]
    orders_response = (
        supabase
        .table("orders")
        .select("customer_id, total, status, payment_status, created_at")
        .in_("customer_id", customer_ids)
        .order("created_at", desc=True)
        .execute()
    )

    metrics_by_customer = {
        customer_id: {
            "order_count": 0,
            "total_spent": 0.0,
            "last_order_at": None,
        }
        for customer_id in customer_ids
    }

    for order in orders_response.data or []:
        customer_id = order.get("customer_id")
        metrics = metrics_by_customer.get(customer_id)
        if not metrics:
            continue

        if metrics["last_order_at"] is None:
            metrics["last_order_at"] = order.get("created_at")

        if (
            order.get("payment_status") == "verified"
            and order.get("status") != "cancelled"
        ):
            metrics["order_count"] += 1
            metrics["total_spent"] += float(order.get("total") or 0)

    email_by_user_id = get_admin_customer_email_map(
        profile.get("user_id") for profile in profiles
    )

    return [
        {
            "customer_id": profile["id"],
            "full_name": profile.get("full_name"),
            "email": email_by_user_id.get(str(profile.get("user_id"))),
            "phone": profile.get("phone"),
            "joined_at": profile["created_at"],
            "order_count": metrics_by_customer[profile["id"]]["order_count"],
            "total_spent": round(
                metrics_by_customer[profile["id"]]["total_spent"],
                2,
            ),
            "last_order_at": metrics_by_customer[profile["id"]]["last_order_at"],
        }
        for profile in profiles
    ]


@app.get("/admin/customers/{customer_id}")
def get_admin_customer_detail(
    customer_id: str,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    profile_response = (
        supabase
        .table("customer_profiles")
        .select("id, user_id, full_name, phone, created_at, is_admin")
        .eq("id", customer_id)
        .eq("is_admin", False)
        .execute()
    )

    if not profile_response.data:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    profile = profile_response.data[0]
    orders_response = (
        supabase
        .table("orders")
        .select(
            "id, created_at, status, payment_status, total, refund_status"
        )
        .eq("customer_id", profile["id"])
        .order("created_at", desc=True)
        .execute()
    )
    orders = orders_response.data or []

    addresses_response = (
        supabase
        .table("addresses")
        .select(
            "recipient_name, phone, address_line1, address_line2, city, "
            "state, postcode, country, is_default"
        )
        .eq("customer_id", profile["id"])
        .order("is_default", desc=True)
        .order("created_at", desc=False)
        .execute()
    )

    valid_orders = [
        order
        for order in orders
        if order.get("payment_status") == "verified"
        and order.get("status") != "cancelled"
    ]

    return {
        "customer": {
            "customer_id": profile["id"],
            "full_name": profile.get("full_name"),
            "email": get_admin_customer_email(profile.get("user_id")),
            "phone": profile.get("phone"),
            "joined_at": profile["created_at"],
        },
        "summary": {
            "order_count": len(valid_orders),
            "total_spent": round(
                sum(float(order.get("total") or 0) for order in valid_orders),
                2,
            ),
            "last_order_at": orders[0].get("created_at") if orders else None,
        },
        "orders": [
            {
                "id": order["id"],
                "created_at": order["created_at"],
                "status": order["status"],
                "payment_status": order["payment_status"],
                "total": float(order.get("total") or 0),
                "refund_status": order.get("refund_status"),
            }
            for order in orders
        ],
        "addresses": addresses_response.data or [],
    }


def generate_category_slug(name: str):
    slug = re.sub(r"[^a-z0-9\s-]", "", name.lower().strip())
    slug = re.sub(r"\s+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-") or None


def normalize_category_data(data, generate_slug=False):
    normalized = {}

    if "name" in data:
        name = data["name"]
        if name is None or not name.strip():
            raise HTTPException(
                status_code=400,
                detail="Category name is required",
            )
        normalized["name"] = name.strip()

    for field_name in ("slug", "description", "image_url"):
        if field_name not in data:
            continue

        value = data[field_name]
        normalized[field_name] = value.strip() or None if value else None

    if generate_slug and normalized.get("slug") is None:
        normalized["slug"] = generate_category_slug(normalized["name"])

    return normalized


def ensure_category_is_unique(name: str, slug: Optional[str], exclude_id=None):
    response = (
        supabase
        .table("categories")
        .select("id, name, slug")
        .execute()
    )

    normalized_name = name.casefold()
    normalized_slug = slug.casefold() if slug else None

    for category in response.data or []:
        if exclude_id and category["id"] == exclude_id:
            continue

        existing_name = (category.get("name") or "").strip().casefold()
        existing_slug = (category.get("slug") or "").strip().casefold()

        if existing_name == normalized_name:
            raise HTTPException(
                status_code=409,
                detail="A category with this name already exists",
            )

        if normalized_slug and existing_slug == normalized_slug:
            raise HTTPException(
                status_code=409,
                detail="A category with this slug already exists",
            )


def get_category_product_count(category_id: str):
    response = (
        supabase
        .table("products")
        .select("id")
        .eq("category_id", category_id)
        .execute()
    )
    return len(response.data or [])


def handle_category_write_error(error):
    message = str(error).lower()
    if "23505" in message or "duplicate key" in message:
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists",
        )

    raise HTTPException(
        status_code=400,
        detail="Unable to save category",
    )


@app.get("/admin/categories")
def get_admin_categories(current_user=Depends(get_current_user)):
    require_admin(current_user)

    categories_response = (
        supabase
        .table("categories")
        .select("id, name, slug, description, image_url, created_at")
        .order("name")
        .execute()
    )
    products_response = (
        supabase
        .table("products")
        .select("category_id")
        .execute()
    )

    product_counts = {}
    for product in products_response.data or []:
        category_id = product.get("category_id")
        if category_id:
            product_counts[category_id] = product_counts.get(category_id, 0) + 1

    return [
        {
            **category,
            "product_count": product_counts.get(category["id"], 0),
        }
        for category in categories_response.data or []
    ]


@app.post("/admin/categories")
def create_admin_category(
    category: CategoryCreate,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    category_data = normalize_category_data(
        category.model_dump(),
        generate_slug=True,
    )
    ensure_category_is_unique(
        category_data["name"],
        category_data.get("slug"),
    )

    try:
        response = (
            supabase
            .table("categories")
            .insert(category_data)
            .execute()
        )
    except Exception as error:
        handle_category_write_error(error)

    return {
        **response.data[0],
        "product_count": 0,
    }


@app.patch("/admin/categories/{category_id}")
def update_admin_category(
    category_id: str,
    category: CategoryUpdate,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    existing_response = (
        supabase
        .table("categories")
        .select("id, name, slug, description, image_url, created_at")
        .eq("id", category_id)
        .execute()
    )
    if not existing_response.data:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = normalize_category_data(
        category.model_dump(exclude_unset=True)
    )
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = existing_response.data[0]
    effective_name = update_data.get("name", existing["name"])
    effective_slug = update_data.get("slug", existing.get("slug"))
    ensure_category_is_unique(
        effective_name,
        effective_slug,
        exclude_id=category_id,
    )

    try:
        response = (
            supabase
            .table("categories")
            .update(update_data)
            .eq("id", category_id)
            .execute()
        )
    except Exception as error:
        handle_category_write_error(error)

    return {
        **response.data[0],
        "product_count": get_category_product_count(category_id),
    }


@app.delete("/admin/categories/{category_id}")
def delete_admin_category(
    category_id: str,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    existing_response = (
        supabase
        .table("categories")
        .select("id")
        .eq("id", category_id)
        .execute()
    )
    if not existing_response.data:
        raise HTTPException(status_code=404, detail="Category not found")

    product_count = get_category_product_count(category_id)
    if product_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This category is used by {product_count} "
                f"product{'s' if product_count != 1 else ''}. "
                "Reassign those products before deleting it."
            ),
        )

    try:
        supabase.table("categories").delete().eq("id", category_id).execute()
    except Exception as error:
        message = str(error).lower()
        if "23503" in message or "foreign key" in message:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This category is still used by products. "
                    "Reassign those products before deleting it."
                ),
            )
        raise HTTPException(status_code=400, detail="Unable to delete category")

    return {
        "message": "Category deleted",
        "category_id": category_id,
    }


@app.get("/admin/products")
def get_admin_products(
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    response = (
        supabase
        .table("products")
        .select(
            "id, name, slug, price, stock_quantity, status, category_id, created_at, updated_at"
        )
        .order("created_at", desc=True)
        .execute()
    )

    return response.data

# ---------- Admin Product Inventory ----------

@app.get("/admin/products/{product_id}/inventory-adjustments")
def get_product_inventory_adjustments(
    product_id: str,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    product = (
        supabase
        .table("products")
        .select("id")
        .eq("id", product_id)
        .execute()
    )

    if not product.data:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    response = (
        supabase
        .table("product_inventory_adjustments")
        .select(
            "id, product_id, previous_quantity, adjustment, "
            "new_quantity, mode, reason, note, changed_by, created_at"
        )
        .eq("product_id", product_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return response.data


@app.post("/admin/products/{product_id}/inventory-adjustments")
def create_product_inventory_adjustment(
    product_id: str,
    adjustment: InventoryAdjustmentCreate,
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    try:
        response = supabase.rpc(
            "adjust_product_inventory",
            {
                "p_product_id": product_id,
                "p_changed_by": current_user.id,
                "p_mode": adjustment.mode,
                "p_quantity": adjustment.quantity,
                "p_reason": adjustment.reason,
                "p_note": adjustment.note,
            },
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "Product not found" in message:
            raise HTTPException(
                status_code=404,
                detail="Product not found",
            )

        if "Inventory cannot go below zero" in message:
            raise HTTPException(
                status_code=400,
                detail="Inventory cannot go below zero",
            )

        raise HTTPException(
            status_code=400,
            detail="Could not adjust inventory",
        )

    if not response.data:
        raise HTTPException(
            status_code=500,
            detail="Inventory adjustment returned no data",
        )

    # Depending on the Supabase/PostgREST response shape, a composite
    # return may arrive as a dict or a one-item list.
    if isinstance(response.data, list):
        return response.data[0]

    return response.data


@app.get("/admin/dashboard")
def get_admin_dashboard(current_user=Depends(get_current_user)):
    require_admin(current_user)

    now = datetime.now(timezone.utc)
    period_start = datetime.combine(
        now.date() - timedelta(days=29),
        datetime.min.time(),
        tzinfo=timezone.utc,
    )
    period_start_iso = period_start.isoformat()

    sales_response = (
        supabase
        .table("orders")
        .select("id, total, created_at")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .gte("created_at", period_start_iso)
        .order("created_at", desc=False)
        .execute()
    )
    sales_orders = sales_response.data or []
    sales_order_ids = [order["id"] for order in sales_orders]
    revenue = sum(float(order.get("total") or 0) for order in sales_orders)
    order_count = len(sales_orders)

    trend_by_date = {}
    for day_offset in range(30):
        day = (period_start.date() + timedelta(days=day_offset)).isoformat()
        trend_by_date[day] = {"date": day, "revenue": 0.0, "orders": 0}

    for order in sales_orders:
        day = order["created_at"][:10]
        if day not in trend_by_date:
            continue
        trend_by_date[day]["revenue"] += float(order.get("total") or 0)
        trend_by_date[day]["orders"] += 1

    product_sales = {}
    if sales_order_ids:
        items_response = (
            supabase
            .table("order_items")
            .select("product_id, product_name, unit_price, quantity")
            .in_("order_id", sales_order_ids)
            .execute()
        )

        for item in items_response.data or []:
            product_id = item.get("product_id")
            product_name = item.get("product_name") or "Unknown product"
            key = product_id or f"name:{product_name}"
            quantity = int(item.get("quantity") or 0)
            item_revenue = float(item.get("unit_price") or 0) * quantity

            if key not in product_sales:
                product_sales[key] = {
                    "product_id": product_id,
                    "product_name": product_name,
                    "units_sold": 0,
                    "revenue": 0.0,
                    "image_url": None,
                }

            product_sales[key]["units_sold"] += quantity
            product_sales[key]["revenue"] += item_revenue

    top_products = sorted(
        product_sales.values(),
        key=lambda product: (product["units_sold"], product["revenue"]),
        reverse=True,
    )[:5]

    top_product_ids = [
        product["product_id"]
        for product in top_products
        if product["product_id"]
    ]
    if top_product_ids:
        images_response = (
            supabase
            .table("product_images")
            .select("product_id, image_url, sort_order")
            .in_("product_id", top_product_ids)
            .order("sort_order", desc=False)
            .execute()
        )
        image_by_product = {}
        for image in images_response.data or []:
            image_by_product.setdefault(image["product_id"], image["image_url"])

        for product in top_products:
            product["image_url"] = image_by_product.get(product["product_id"])

    for product in top_products:
        product["revenue"] = round(product["revenue"], 2)

    recent_orders_response = (
        supabase
        .table("orders")
        .select(
            "id, total, status, payment_status, created_at, "
            "customer_profiles(full_name)"
        )
        .order("created_at", desc=True)
        .limit(8)
        .execute()
    )
    recent_orders = []
    for order in recent_orders_response.data or []:
        profile = order.get("customer_profiles")
        if isinstance(profile, list):
            profile = profile[0] if profile else None

        recent_orders.append({
            "id": order["id"],
            "customer": (profile or {}).get("full_name") or "Customer",
            "total": float(order.get("total") or 0),
            "status": order["status"],
            "payment_status": order["payment_status"],
            "created_at": order["created_at"],
        })

    payment_reviews = (
        supabase
        .table("orders")
        .select("id")
        .eq("status", "pending_payment")
        .eq("payment_status", "pending")
        .neq("payment_proof_url", "")
        .execute()
    )
    cancellation_requests = (
        supabase
        .table("order_cancellation_requests")
        .select("id")
        .eq("status", "pending")
        .execute()
    )
    refunds_required = (
        supabase
        .table("orders")
        .select("id")
        .eq("refund_status", "required")
        .execute()
    )
    low_stock_response = (
        supabase
        .table("products")
        .select("id, name, stock_quantity, status")
        .eq("status", "active")
        .lte("stock_quantity", 5)
        .order("stock_quantity", desc=False)
        .execute()
    )

    attention = {
        "payment_reviews": len(payment_reviews.data or []),
        "cancellation_requests": len(cancellation_requests.data or []),
        "refunds_required": len(refunds_required.data or []),
        "low_stock_products": len(low_stock_response.data or []),
    }

    return {
        "period": {
            "days": 30,
            "starts_at": period_start_iso,
            "ends_at": now.isoformat(),
        },
        "metrics": {
            "revenue": round(revenue, 2),
            "orders": order_count,
            "average_order_value": round(revenue / order_count, 2)
            if order_count
            else 0,
            "needs_attention": sum(attention.values()),
        },
        "attention": attention,
        "sales_trend": [
            {
                **trend_by_date[day],
                "revenue": round(trend_by_date[day]["revenue"], 2),
            }
            for day in sorted(trend_by_date)
        ],
        "top_products": top_products,
        "recent_orders": recent_orders,
        "low_stock_products": (low_stock_response.data or [])[:6],
    }


@app.get("/admin/analytics/summary")
def get_analytics_summary(current_user = Depends(get_current_user)):
    require_admin(current_user)

    # 1. 总营收（只算已确认付款且未取消的订单）
    verified_orders = (
        supabase
        .table("orders")
        .select("total")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .execute()
    )
    total_revenue = sum(o["total"] for o in verified_orders.data)

    # 2. 总订单数
    all_orders = supabase.table("orders").select("id, status").execute()
    total_orders = len(all_orders.data)

    # 3. 依状态分类的订单数量
    status_counts = {}
    for o in all_orders.data:
        status_counts[o["status"]] = status_counts.get(o["status"], 0) + 1

    # 4. 库存偏低提醒
    low_stock = (
        supabase
        .table("products")
        .select("id, name, stock_quantity")
        .lte("stock_quantity", 5)
        .execute()
    )

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "orders_by_status": status_counts,
        "low_stock_products": low_stock.data
    }


@app.get("/admin/analytics/top-products")
def get_top_products(current_user = Depends(get_current_user), limit: int = 5):
    require_admin(current_user)

    # 只有 payment_status = verified 且 status != cancelled 的订单才算销售
    valid_orders = (
        supabase
        .table("orders")
        .select("id")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .execute()
    )
    valid_order_ids = [o["id"] for o in valid_orders.data]

    if not valid_order_ids:
        return []

    items = (
        supabase
        .table("order_items")
        .select("product_id, product_name, quantity")
        .in_("order_id", valid_order_ids)
        .execute()
    )

    sales = {}
    for item in items.data:
        key = item["product_id"]
        if key not in sales:
            sales[key] = {"product_id": key, "product_name": item["product_name"], "total_sold": 0}
        sales[key]["total_sold"] += item["quantity"]

    sorted_sales = sorted(sales.values(), key=lambda x: x["total_sold"], reverse=True)
    return sorted_sales[:limit]

# ---------- Analytics: Monthly Sales ----------

@app.get("/admin/analytics/monthly-sales")
def get_monthly_sales(current_user = Depends(get_current_user)):
    require_admin(current_user)

    verified_orders = (
        supabase
        .table("orders")
        .select("total, created_at")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .order("created_at", desc=False)
        .execute()
    )

    monthly_sales = {}

    for order in verified_orders.data:
        month = order["created_at"][:7]

        if month not in monthly_sales:
            monthly_sales[month] = {
                "month": month,
                "revenue": 0,
                "orders": 0
            }

        monthly_sales[month]["revenue"] += order["total"]
        monthly_sales[month]["orders"] += 1

    result = sorted(monthly_sales.values(), key=lambda x: x["month"])
    return result

# ---------- Analytics: Growth ----------
@app.get("/admin/analytics/growth")
def get_analytics_growth(current_user = Depends(get_current_user)):
    require_admin(current_user)

    from datetime import datetime, timezone

    # 1. 用真实的 UTC 当前日期决定 current_month 和 previous_month
    #    不依赖数据里有没有订单
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    if now.month == 1:
        previous_date = now.replace(year=now.year - 1, month=12)
    else:
        previous_date = now.replace(month=now.month - 1)
    previous_month = previous_date.strftime("%Y-%m")

    # 2. 只统计已验证且未取消的订单
    verified_orders = (
        supabase
        .table("orders")
        .select("total, created_at")
        .eq("payment_status", "verified")
        .neq("status", "cancelled")
        .execute()
    )

    # 3. 按月份聚合
    monthly_data = {}
    for order in verified_orders.data:
        month = order["created_at"][:7]
        if month not in monthly_data:
            monthly_data[month] = {"month": month, "revenue": 0, "orders": 0}
        monthly_data[month]["revenue"] += order["total"]
        monthly_data[month]["orders"] += 1

    # 4. 分别取出 current 和 previous，数据里没有就补零（而不是跳过）
    current_data = monthly_data.get(
        current_month,
        {"month": current_month, "revenue": 0, "orders": 0}
    )
    previous_data = monthly_data.get(
        previous_month,
        {"month": previous_month, "revenue": 0, "orders": 0}
    )

    # 5. 计算增长率，避免除以零
    if previous_data["revenue"] == 0:
        revenue_growth = None
    else:
        revenue_growth = (
            (current_data["revenue"] - previous_data["revenue"])
            / previous_data["revenue"]
        ) * 100

    if previous_data["orders"] == 0:
        order_growth = None
    else:
        order_growth = (
            (current_data["orders"] - previous_data["orders"])
            / previous_data["orders"]
        ) * 100

    return {
        "current_month": current_data,
        "previous_month": previous_data,
        "revenue_growth": round(revenue_growth, 2) if revenue_growth is not None else None,
        "order_growth": round(order_growth, 2) if order_growth is not None else None
    }
    
# ---------- Collections ----------

class CollectionCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False

@app.post("/admin/collections")
def create_collection(collection: CollectionCreate, current_user = Depends(get_current_user)):
    require_admin(current_user)
    response = supabase.table("collections").insert(collection.model_dump()).execute()
    return response.data[0]

@app.get("/collections")
def get_collections():
    response = supabase.table("collections").select("*").execute()
    return response.data

@app.get("/collections/{collection_id}")
def get_collection(collection_id: str):
    response = supabase.table("collections").select("*").eq("id", collection_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Collection not found")
    return response.data

@app.get("/collections/{collection_id}/products")
def get_collection_products(collection_id: str):
    # 先确认 collection 存在
    collection = supabase.table("collections").select("*").eq("id", collection_id).single().execute()
    if not collection.data:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 透过中间表找出这个 collection 底下所有的 product_id
    links = (
        supabase
        .table("product_collections")
        .select("product_id")
        .eq("collection_id", collection_id)
        .execute()
    )
    product_ids = [row["product_id"] for row in links.data]

    if not product_ids:
        return []

    products = (
        supabase
        .table("products")
        .select("*")
        .in_("id", product_ids)
        .execute()
    )
    return products.data


class ProductCollectionLink(BaseModel):
    product_id: str
    collection_id: str

@app.post("/admin/product-collections")
def add_product_to_collection(link: ProductCollectionLink, current_user = Depends(get_current_user)):
    require_admin(current_user)

    response = (
        supabase
        .table("product_collections")
        .insert({"product_id": link.product_id, "collection_id": link.collection_id})
        .execute()
    )
    return response.data


@app.delete("/admin/product-collections")
def remove_product_from_collection(link: ProductCollectionLink, current_user = Depends(get_current_user)):
    require_admin(current_user)

    supabase.table("product_collections").delete()\
        .eq("product_id", link.product_id)\
        .eq("collection_id", link.collection_id)\
        .execute()
    return {"message": "Removed from collection"}



@app.patch("/admin/orders/{order_id}/cancellation-request/{request_id}")
def resolve_order_cancellation_request(
    order_id: str,
    request_id: str,
    payload: CancellationRequestResolve,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    existing = (
        supabase
        .table("order_cancellation_requests")
        .select("id, order_id, status")
        .eq("id", request_id)
        .eq("order_id", order_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Cancellation request not found"
        )

    try:
        supabase.rpc(
            "resolve_order_cancellation_request",
            {
                "p_request_id": request_id,
                "p_changed_by": current_user.id,
                "p_action": payload.action,
                "p_resolution_message": (
                    payload.resolution_message.strip()
                    if payload.resolution_message
                    else None
                ),
                "p_admin_note": (
                    payload.admin_note.strip()
                    if payload.admin_note
                    else None
                ),
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "already been resolved" in message:
            raise HTTPException(
                status_code=409,
                detail="Cancellation request has already been resolved"
            )

        if "Order cannot be cancelled" in message:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The order can no longer be cancelled from its "
                    "current fulfilment status."
                )
            )

        if "Cancellation request not found" in message:
            raise HTTPException(
                status_code=404,
                detail="Cancellation request not found"
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to resolve cancellation request."
        )

    refreshed = (
        supabase
        .table("orders")
        .select("""
            *,
            order_items(*),
            addresses(*),
            customer_profiles(full_name, phone),
            order_status_history(*),
            order_refund_history(*),
            order_cancellation_requests(*)
        """)
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not refreshed.data:
        raise HTTPException(
            status_code=500,
            detail="Request resolved but order could not be reloaded"
        )

    return refreshed.data


@app.patch("/admin/orders/{order_id}/refund")
def complete_order_refund(
    order_id: str,
    payload: RefundComplete,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    try:
        supabase.rpc(
            "complete_order_refund",
            {
                "p_order_id": order_id,
                "p_changed_by": current_user.id,
                "p_reference": payload.reference.strip(),
                "p_note": (
                    payload.note.strip()
                    if payload.note
                    else None
                ),
            }
        ).execute()
    except Exception as exc:
        message = str(exc)

        if "Order not found" in message:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        if (
            "Only cancelled orders" in message
            or "payment was not verified" in message
            or "Refund is not required" in message
            or "Refund reference is required" in message
        ):
            raise HTTPException(
                status_code=409,
                detail=message
            )

        raise HTTPException(
            status_code=400,
            detail="Unable to complete refund."
        )

    refreshed = (
        supabase
        .table("orders")
        .select("""
            *,
            order_items(*),
            addresses(*),
            customer_profiles(full_name, phone),
            order_status_history(*),
            order_refund_history(*),
            order_cancellation_requests(*)
        """)
        .eq("id", order_id)
        .single()
        .execute()
    )

    if not refreshed.data:
        raise HTTPException(
            status_code=500,
            detail="Refund completed but order could not be reloaded"
        )

    return refreshed.data


@app.get("/admin/orders")
def get_all_orders(
    current_user = Depends(get_current_user),
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    require_admin(current_user)

    query = (
        supabase
        .table("orders")
        .select("*, order_items(*), addresses(*), customer_profiles(full_name, phone), order_cancellation_requests(*)")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if status:
        query = query.eq("status", status)
    if payment_status:
        query = query.eq("payment_status", payment_status)

    response = query.execute()
    return response.data

@app.get("/admin/orders/{order_id}")
def get_order_detail(
    order_id: str,
    current_user=Depends(get_current_user)
):
    require_admin(current_user)

    response = (
        supabase
        .table("orders")
        .select("""
            *,
            order_items(*),
            addresses(*),
            customer_profiles(full_name, phone),
            order_status_history(*),
            order_refund_history(*),
            order_cancellation_requests(*)
        """)
        .eq("id", order_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return response.data[0]

