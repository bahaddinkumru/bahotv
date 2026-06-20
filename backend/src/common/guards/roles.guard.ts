import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, retry } from "rxjs";
import { Role } from "../enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. O anki endpoint'te @Roles() etiketi var mı oku
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles)
            return true;

        // 2. JWT'den çözülen kullanıcıyı Request'ten al
        const { user } = context.switchToHttp().getRequest();

        // 3. Kullanıcının rolü, izin verilen rollerin içinde var mı kontrol et
        return requiredRoles.includes(user.role);
    }

}