from fastapi import Depends, HTTPException, status
from app.models import User
from app.core.auth import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role"
            )
        return current_user

class PermissionChecker:
    def __init__(self, required_permissions: list[str]):
        self.required_permissions = required_permissions

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role == "Admin":
            return current_user
        
        permissions = current_user.permissions or {}
        if any(permissions.get(perm) is True for perm in self.required_permissions):
            return current_user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. You do not have permissions for the required sections: {', '.join(self.required_permissions)}"
        )
