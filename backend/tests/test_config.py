"""Required configuration fails closed without reading the developer .env."""
import os
import runpy
import secrets
import unittest
from pathlib import Path
from unittest.mock import patch

CONFIG = Path(__file__).resolve().parents[1] / "app" / "config.py"

class ConfigTest(unittest.TestCase):
    def test_required_settings(self):
        values = {"ADMIN_EMAIL": "admin@example.test", "ADMIN_PASSWORD": secrets.token_urlsafe(24), "AUTH_SECRET": secrets.token_hex(32)}
        with patch("dotenv.load_dotenv"), patch.dict(os.environ, values, clear=True):
            settings = runpy.run_path(str(CONFIG))["settings"]
            for name, value in values.items():
                self.assertEqual(getattr(settings, name), value)

    def test_missing_and_blank_settings_fail_safely(self):
        values = {"ADMIN_EMAIL": "admin@example.test", "ADMIN_PASSWORD": secrets.token_urlsafe(24), "AUTH_SECRET": secrets.token_hex(32)}
        for name in values:
            for missing in (None, "", "   "):
                with self.subTest(name=name, missing=missing):
                    env = dict(values)
                    if missing is None:
                        del env[name]
                    else:
                        env[name] = missing
                    with patch("dotenv.load_dotenv"), patch.dict(os.environ, env, clear=True):
                        with self.assertRaisesRegex(RuntimeError, name) as raised:
                            runpy.run_path(str(CONFIG))
                        for value in values.values():
                            self.assertNotIn(value, str(raised.exception))
