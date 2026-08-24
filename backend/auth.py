from fastapi import Header, HTTPException
from database import supabase
from typing import Optional

def get_current_user(authorization: str = Header(...)):
    """
    从 request header 拿出 JWT，验证它，回传这个 user 是谁
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
def get_current_user_optional(authorization: Optional[str] = Header(None)):
    """
    可选登录：有合法 token 就回传 user，没有 token 或 token 无效都回传 None（不报错）
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user
    except Exception:
        return None