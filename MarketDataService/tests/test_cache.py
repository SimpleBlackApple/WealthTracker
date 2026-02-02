import os
import unittest
from unittest import mock

import redis

from cache import create_cache_client


class TestCreateCacheClient(unittest.TestCase):
    def test_uses_upstash_rest_when_configured(self):
        with mock.patch.dict(
            os.environ,
            {
                "UPSTASH_REDIS_REST_URL": "https://example.upstash.io",
                "UPSTASH_REDIS_REST_TOKEN": "token",
                "REDIS_URL": "redis://should-not-be-used:6379/0",
            },
            clear=False,
        ):
            client = create_cache_client()

        from upstash_redis import Redis as UpstashRedis

        self.assertIsInstance(client, UpstashRedis)

    def test_falls_back_to_redis_url(self):
        with mock.patch.dict(
            os.environ,
            {
                "UPSTASH_REDIS_REST_URL": "",
                "UPSTASH_REDIS_REST_TOKEN": "",
                "REDIS_URL": "redis://localhost:6379/0",
            },
            clear=False,
        ):
            client = create_cache_client()

        self.assertIsInstance(client, redis.Redis)

