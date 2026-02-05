import os
import sys
import unittest
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest import mock

import pandas as pd
from fastapi import HTTPException

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app  # noqa: E402


class TestMarketDataHelpers(unittest.TestCase):
    def test_safe_float_and_int(self):
        self.assertEqual(app._safe_float("1.25"), 1.25)
        self.assertIsNone(app._safe_float("bad"))
        self.assertEqual(app._safe_int("42"), 42)
        self.assertIsNone(app._safe_int(None))

    def test_chunk(self):
        self.assertEqual(app._chunk(["A", "B", "C"], 2), [["A", "B"], ["C"]])
        self.assertEqual(app._chunk(["A", "B"], 0), [["A", "B"]])

    def test_map_quote_extended_uses_prev_close(self):
        quote = {
            "symbol": "ABC",
            "regularMarketPrice": 110,
            "regularMarketPreviousClose": 100,
        }
        result = app._map_quote_extended(quote)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result["changePct"], 0.10, places=6)

    def test_map_quote_extended_uses_change_percent(self):
        quote = {
            "symbol": "XYZ",
            "regularMarketPrice": None,
            "regularMarketPreviousClose": None,
            "regularMarketChangePercent": 12.0,
        }
        result = app._map_quote_extended(quote)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result["changePct"], 0.12, places=6)

    def test_validate_intraday_request_rejects_invalid(self):
        with self.assertRaises(HTTPException) as exc:
            app._validate_intraday_request(app.ScannerUniverseRequest(interval="10m"))
        self.assertEqual(exc.exception.status_code, 400)

    def test_effective_price_bounds_enforces_floor(self):
        request = app.ScannerUniverseRequest(minPrice=0.5, maxPrice=1.0)
        min_price, max_price = app._effective_price_bounds(request)
        self.assertEqual(min_price, app.MIN_PRICE_FLOOR)
        self.assertEqual(max_price, app.MIN_PRICE_FLOOR)

    def test_period_days(self):
        self.assertEqual(app._period_days("2d"), 2)
        self.assertEqual(app._period_days(" 5D "), 5)
        self.assertIsNone(app._period_days("1w"))
        self.assertIsNone(app._period_days("bad"))

    def test_compute_rvol_recent_k_1m(self):
        tz = ZoneInfo("America/New_York")
        idx = pd.DatetimeIndex(
            [
                datetime(2024, 1, 2, 10, 0, tzinfo=tz),
                datetime(2024, 1, 2, 10, 5, tzinfo=tz),
                datetime(2024, 1, 3, 10, 0, tzinfo=tz),
                datetime(2024, 1, 3, 10, 5, tzinfo=tz),
            ]
        )
        df = pd.DataFrame(
            {
                "Open": [1, 1, 1, 1],
                "High": [1, 1, 1, 1],
                "Low": [1, 1, 1, 1],
                "Close": [1, 1, 1, 1],
                "Volume": [100, 100, 200, 200],
            },
            index=idx,
        )

        result = app._compute_rvol_recent_k_1m(
            df,
            baseline_days=1,
            k_bars=2,
            include_today=False,
            exclude_last_k_from_today=True,
        )
        self.assertEqual(result["todayBarVol"], 400)
        self.assertEqual(result["todayCumVol"], 400)
        self.assertEqual(result["baselineBarVol"], 200.0)
        self.assertAlmostEqual(result["relVolTod"], 2.0, places=6)
        self.assertAlmostEqual(result["relVol"], 2.0, places=6)
        self.assertEqual(result["barTime"], "10:05")


class TestScannerWrappers(unittest.TestCase):
    def test_scan_hod_breakouts_adjusts_payload(self):
        payload = {
            "scanner": "hod_vwap_momentum",
            "asOf": "2024-01-02T15:00:00Z",
            "sorted_by": "placeholder",
            "results": [
                {
                    "symbol": "AAA",
                    "price_change_pct": 2.0,
                    "relative_volume": 3.0,
                    "vwap": 10.0,
                    "vwap_distance": 0.5,
                }
            ],
        }
        request = app.HodBreakoutsRequest()

        with mock.patch.object(
            app, "_read_scan_cache_entry", return_value=(None, None)
        ), mock.patch.object(app, "_write_scan_cache_entry", return_value={}), mock.patch.object(
            app, "scan_hod_vwap_momentum", return_value=payload
        ):
            result = app.scan_hod_breakouts(request)

        self.assertEqual(result["scanner"], "hod_breakouts")
        self.assertEqual(
            result["sorted_by"], "price_change_pct desc, relative_volume desc"
        )
        self.assertEqual(result["asOf"], "2024-01-02T15:00:00Z")
        row = result["results"][0]
        self.assertIsNone(row["vwap"])
        self.assertIsNone(row["vwap_distance"])


class TestQuotesEndpoint(unittest.TestCase):
    def test_quotes_uses_cache_entry_when_available(self):
        cached_payload = {
            "asOf": "2024-01-02T15:00:00Z",
            "results": [{"symbol": "AAA", "price": 12.34}],
        }
        cache_info = {
            "isStale": False,
            "source": "cache",
            "fetchedAt": "2024-01-02T15:00:00Z",
            "freshUntil": "2024-01-02T15:05:00Z",
            "staleUntil": "2024-01-03T15:00:00Z",
            "willRevalidate": False,
            "retryAfterMs": None,
        }

        with mock.patch.object(
            app, "_read_scan_cache_entry", return_value=(cached_payload, cache_info)
        ):
            result = app.quotes(app.QuotesRequest(tickers=["AAA"]))

        self.assertEqual(result["asOf"], "2024-01-02T15:00:00Z")
        self.assertEqual(result["results"][0]["symbol"], "AAA")
        self.assertEqual(result["results"][0]["price"], 12.34)
        self.assertEqual(result["cache"]["source"], "cache")

    def test_quotes_computes_price_from_last_close(self):
        tz = ZoneInfo("America/New_York")
        idx = pd.DatetimeIndex([datetime(2024, 1, 2, 10, 0, tzinfo=tz)])
        df = pd.DataFrame({"Close": [5.0]}, index=idx)

        with mock.patch.object(app, "_read_scan_cache_entry", return_value=(None, None)), mock.patch.object(
            app, "_write_scan_cache_entry", return_value={}
        ), mock.patch.object(app, "_download_intraday", return_value={"AAA": df}):
            result = app.quotes(app.QuotesRequest(tickers=["AAA"], interval="1m", period="1d"))

        self.assertEqual(result["results"][0]["symbol"], "AAA")
        self.assertEqual(result["results"][0]["price"], 5.0)


if __name__ == "__main__":
    unittest.main()
