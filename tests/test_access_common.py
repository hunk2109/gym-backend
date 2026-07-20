import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src' / 'modules' / 'sync' / 'scripts'))

import access_common


class AccessCommonTests(unittest.TestCase):
    def test_resolve_access_db_path_prefers_explicit_existing_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            explicit_db = Path(tmpdir) / 'explicit.mdb'
            explicit_db.write_bytes(b'')
            default_db = Path(tmpdir) / 'default.accdb'
            default_db.write_bytes(b'')

            resolved = access_common.resolve_access_db_path(
                str(explicit_db),
                default_path=str(default_db),
                cwd=tmpdir,
            )

            self.assertEqual(resolved, str(explicit_db))

    def test_resolve_access_db_path_uses_relative_path_from_cwd(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            relative_db = Path(tmpdir) / 'subdir' / 'db.accdb'
            relative_db.parent.mkdir(parents=True, exist_ok=True)
            relative_db.write_bytes(b'')

            resolved = access_common.resolve_access_db_path(
                'subdir/db.accdb',
                default_path=None,
                cwd=tmpdir,
            )

            self.assertEqual(resolved, str(relative_db))


if __name__ == '__main__':
    unittest.main()
