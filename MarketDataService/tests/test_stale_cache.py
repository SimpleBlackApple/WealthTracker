import json
import unittest
from typing import Optional


class _FakeCacheClient:
    def __init__(self):
        self._store = {}

    def get(self, key: str):
        return self._store.get(key)

    def setex(self, key: str, ttl_seconds: int, value: str):
        self._store[key] = value

    def set(self, key: str, value: str, ex: Optional[int] = None):
        self._store[key] = value


class TestStaleWhileRevalidateCache(unittest.TestCase):
    def setUp(self):
        import app as market_app

        self.market_app = market_app
        self.fake_cache = _FakeCacheClient()
        self.market_app.cache_client = self.fake_cache

        self.market_app.CACHE_TTL_SECONDS = 60
        self.market_app.CACHE_STALE_TTL_SECONDS = 3600
        self.market_app.SERVE_STALE_WHILE_REVALIDATE = True
        self.market_app.STALE_RETRY_AFTER_MS = 1234

    def test_write_then_read_fresh(self):
        key = "md:test:scan"
        payload = {"scanner": "day_gainers", "sorted_by": "x", "results": []}
        self.market_app._write_scan_cache_entry(key, payload)

        cached, cache_info = self.market_app._read_scan_cache_entry(key)
        self.assertEqual(cached, payload)
        self.assertIsNotNone(cache_info)
        self.assertEqual(cache_info["source"], "cache")
        self.assertFalse(cache_info["isStale"])
        self.assertFalse(cache_info["willRevalidate"])

    def test_read_returns_stale_and_retry_when_expired_but_not_evicted(self):
        key = "md:test:scan"
        payload = {"scanner": "day_gainers", "sorted_by": "x", "results": []}
        self.market_app._write_scan_cache_entry(key, payload)

        envelope = json.loads(self.fake_cache.get(key))
        envelope["__cache"]["storedAt"] = "2000-01-01T00:00:00Z"
        envelope["__cache"]["freshUntil"] = "2000-01-01T00:00:01Z"
        envelope["__cache"]["staleUntil"] = "2999-01-01T00:00:00Z"
        self.fake_cache.setex(key, 3600, json.dumps(envelope))

        cached, cache_info = self.market_app._read_scan_cache_entry(key)
        self.assertEqual(cached, payload)
        self.assertTrue(cache_info["isStale"])
        self.assertTrue(cache_info["willRevalidate"])
        self.assertEqual(cache_info["retryAfterMs"], 1234)

    def test_read_stale_is_disabled_when_flag_off(self):
        self.market_app.SERVE_STALE_WHILE_REVALIDATE = False
        key = "md:test:scan"
        payload = {"scanner": "day_gainers", "sorted_by": "x", "results": []}
        self.market_app._write_scan_cache_entry(key, payload)

        envelope = json.loads(self.fake_cache.get(key))
        envelope["__cache"]["storedAt"] = "2000-01-01T00:00:00Z"
        envelope["__cache"]["freshUntil"] = "2000-01-01T00:00:01Z"
        envelope["__cache"]["staleUntil"] = "2999-01-01T00:00:00Z"
        self.fake_cache.setex(key, 3600, json.dumps(envelope))

        cached, cache_info = self.market_app._read_scan_cache_entry(key)
        self.assertIsNone(cached)
        self.assertIsNone(cache_info)

    def test_back_compat_payload_without_envelope(self):
        key = "md:test:scan"
        payload = {"scanner": "day_gainers", "asOf": "2000-01-01T00:00:00Z", "sorted_by": "x", "results": []}
        self.fake_cache.setex(key, 60, json.dumps(payload))

        cached, cache_info = self.market_app._read_scan_cache_entry(key)
        self.assertEqual(cached, payload)
        self.assertIsNotNone(cache_info)
        self.assertFalse(cache_info["isStale"])
