import os
import unittest
from unittest.mock import patch

from app.main import DEVELOPMENT_CORS_ORIGINS, _configured_cors_origins


class ConfigurationTests(unittest.TestCase):
    def test_development_uses_local_origins_when_not_configured(self):
        with patch.dict(os.environ, {"APP_ENV": "development"}, clear=True):
            self.assertEqual(_configured_cors_origins(), DEVELOPMENT_CORS_ORIGINS)

    def test_production_requires_explicit_origins(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "CORS_ORIGINS must be configured"):
                _configured_cors_origins()

    def test_production_accepts_only_explicit_specific_origins(self):
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "CORS_ORIGINS": "https://app.example.test, https://admin.example.test/",
            },
            clear=True,
        ):
            self.assertEqual(
                _configured_cors_origins(),
                ["https://app.example.test", "https://admin.example.test"],
            )

    def test_rejects_wildcards_and_non_origin_paths(self):
        for origins in (
            "*",
            "https://*.example.test",
            "https://app.example.test/path",
            "https://app.example.test:invalid",
            "https://[",
        ):
            with self.subTest(origins=origins), patch.dict(
                os.environ,
                {"APP_ENV": "production", "CORS_ORIGINS": origins},
                clear=True,
            ), self.assertRaisesRegex(RuntimeError, "specific HTTP or HTTPS origins"):
                _configured_cors_origins()


if __name__ == "__main__":
    unittest.main()
