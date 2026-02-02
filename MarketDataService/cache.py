import os

import redis


def create_cache_client():
    upstash_rest_url = (os.getenv("UPSTASH_REDIS_REST_URL") or "").strip()
    upstash_rest_token = (os.getenv("UPSTASH_REDIS_REST_TOKEN") or "").strip()
    if upstash_rest_url and upstash_rest_token:
        from upstash_redis import Redis as UpstashRedis

        return UpstashRedis(url=upstash_rest_url, token=upstash_rest_token)

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(redis_url, decode_responses=True)

