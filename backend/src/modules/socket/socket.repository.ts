import { InjectRedis } from "@nestjs-modules/ioredis";
import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { randomUUID } from "crypto";

@Injectable()
export class SocketRepository {
    private readonly logger = new Logger(SocketRepository.name);

    constructor(@InjectRedis() private readonly redis: Redis) { }

    async saveUserData(socketId: string, data: any): Promise<void> {
        await this.redis.hset(`user:${socketId}`, "data", JSON.stringify(data));
        await this.redis.expire(`user:${socketId}`, 3600);
    }

    async getUserData(socketId: string) {
        try {
            const json = await this.redis.hget(`user:${socketId}`, "data");
            return json ? JSON.parse(json) : null;
        } catch (e) {
            return null;
        }
    }

    async deleteUserData(socketId: string): Promise<void> {
        await this.redis.del(`user:${socketId}`);
    }

    async saveUserProfileToCache(userId: number | string, profileData: any): Promise<void> {
        await this.redis.set(`user_profile:${userId}`, JSON.stringify(profileData), "EX", 86400);
    }

    async getUserProfileFromCache(userId: number | string): Promise<any> {
        const data = await this.redis.get(`user_profile:${userId}`);
        return data ? JSON.parse(data) : null;
    }

    async deleteUserProfileFromCache(userId: number | string): Promise<void> {
        await this.redis.del(`user_profile:${userId}`);
    }

    async setUserBusy(userId: string): Promise<void> {
        await this.redis.set(`busy_user:${userId}`, "1", "EX", 3600);
    }

    async isUserBusy(userId: string): Promise<boolean> {
        return (await this.redis.get(`busy_user:${userId}`)) === "1";
    }

    async clearUserBusy(userId: string): Promise<void> {
        await this.redis.del(`busy_user:${userId}`);
    }

    async lockUser(userId: string): Promise<boolean> {
        const result = await this.redis.set(`busy_user:${userId}`, "1", "EX", 3600, "NX");
        return result === "OK";
    }

    async addUserToQueue(socketId: string, user: any): Promise<void> {
        const pipeline = this.redis.pipeline();
        pipeline.sadd("queue:all", socketId);
        pipeline.sadd(`queue:uni:${user.university}`, socketId);
        pipeline.sadd(`queue:gender:${user.gender}`, socketId);

        pipeline.sadd("tracked_universities", user.university);
        pipeline.sadd("tracked_genders", user.gender);

        await pipeline.exec();
    }

    async removeUserQueue(socketId: string): Promise<void> {
        const userData = await this.getUserData(socketId);
        const p = this.redis.pipeline();
        p.srem("queue:all", socketId);
        if (userData) {
            p.srem(`queue:uni:${userData.university}`, socketId);
            p.srem(`queue:gender:${userData.gender}`, socketId);
        }
        await p.exec();
    }

    async findCandidatesData(
        targetUni: string,
        targetGender: string,
        limit: number = 20
    ): Promise<any[]> {
        let ids: string[] = [];

        if (targetUni === 'any' && targetGender === 'any')
            ids = await this.redis.srandmember("queue:all", limit);
        else if (targetUni !== 'any' && targetGender === 'any')
            ids = await this.redis.srandmember(`queue:uni:${targetUni}`, limit);
        else if (targetUni === 'any' && targetGender !== 'any')
            ids = await this.redis.srandmember(`queue:gender:${targetGender}`, limit);
        else {
            const tempKey = `temp:inter:${randomUUID()}`;

            const p = this.redis.pipeline();
            p.sinterstore(tempKey, `queue:uni:${targetUni}`, `queue:gender:${targetGender}`);
            p.srandmember(tempKey, limit);
            p.del(tempKey);

            const results = await p.exec();

            if (results && results[1] && !results[1][0]) {
                ids = (results[1][1] as string[]) || [];
            } else {
                ids = [];
            }
        }

        if (ids.length === 0) return [];

        const pipeline = this.redis.pipeline();
        ids.forEach(id => pipeline.hget(`user:${id}`, "data"));
        const dataResults = await pipeline.exec();

        return dataResults!
            .map(([err, res]) => (res ? JSON.parse(res as string) : null))
            .filter(data => data !== null);
    }

    async createMatch(user1: string, user2: string): Promise<string> {
        const matchId = randomUUID();
        const pipeline = this.redis.pipeline();

        pipeline.set(`match:${user1}`, user2, "EX", 3600);
        pipeline.set(`match:${user2}`, user1, "EX", 3600);

        pipeline.incr('admin:active_matches_count');

        await pipeline.exec();
        return matchId;
    }

    async getMatch(socketId: string): Promise<string | null> {
        return await this.redis.get(`match:${socketId}`);
    }

    async deleteMatch(socketId: string): Promise<void> {
        const other = await this.redis.get(`match:${socketId}`);
        const pipeline = this.redis.pipeline();
        pipeline.del(`match:${socketId}`);
        if (other) {
            pipeline.del(`match:${other}`);
            pipeline.decr('admin:active_matches_count');
        }
        await pipeline.exec();
    }

    async checkRateLimit(socketId: string): Promise<boolean> {
        const key = `ratelimit:${socketId}`;
        const count = await this.redis.incr(key);
        if (count === 1) await this.redis.expire(key, 10);
        return count <= 6;
    }

    async setBannedUser(userId: number, bannedUntil: Date | null) {
        const key = `banned_user:${userId}`;

        if (bannedUntil) {
            const now = new Date().getTime();
            const banEndTime = new Date(bannedUntil).getTime();
            const ttlSeconds = Math.max(0, Math.floor((banEndTime - now) / 1000));

            if (ttlSeconds > 0)
                await this.redis.set(key, bannedUntil.toISOString(), 'EX', ttlSeconds);
        } else
            await this.redis.set(key, 'PERMA_BAN');
    }

    async isUserBanned(userId: number): Promise<boolean> {
        const isBanned = await this.redis.exists(`banned_user:${userId}`);
        return isBanned === 1;
    }

    async removeBannedUser(userId: number) {
        await this.redis.del(`banned_user:${userId}`);
    }

    async getActiveUsersCount(): Promise<number> {
        return await this.redis.scard("queue:all");
    }

    async getActiveMatchesCount(): Promise<number> {
        const count = await this.redis.get("admin:active_matches_count");
        return count ? Math.max(0, parseInt(count, 10)) : 0;
    }

    async getQueueCount(): Promise<number> {
        return await this.redis.scard("queue:all");
    }

    async getUniversityStatsForPanel(): Promise<Record<string, number>> {
        let uniNames = await this.redis.smembers("tracked_universities");

        if (uniNames.length === 0) {
            const keys = await this.redis.keys("queue:uni:*");
            uniNames = keys.map(k => k.replace("queue:uni:", ""));
        }

        if (uniNames.length === 0) return {};

        const p = this.redis.pipeline();
        uniNames.forEach(uni => p.scard(`queue:uni:${uni}`));
        const results = await p.exec();

        const stats: Record<string, number> = {};

        uniNames.forEach((uniName, index) => {
            const count = results && results[index] ? (results[index][1] as number) : 0;
            if (count > 0) stats[uniName] = count;
        });

        return stats;
    }

    async getGenderCount(): Promise<Record<string, number>> {
        let genderNames = await this.redis.smembers("tracked_genders");

        if (genderNames.length === 0) {
            const keys = await this.redis.keys("queue:gender:*");
            genderNames = keys.map(k => k.replace("queue:gender:", ""));
        }

        if (genderNames.length === 0) return {};

        const p = this.redis.pipeline();
        genderNames.forEach(gender => p.scard(`queue:gender:${gender}`));
        const results = await p.exec();

        const stats: Record<string, number> = {};

        genderNames.forEach((genderName, index) => {
            const count = results && results[index] ? (results[index][1] as number) : 0;
            if (count > 0) stats[genderName] = count;
        });

        return stats;
    }
}