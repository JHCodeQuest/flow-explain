"""Offline transport checks: all upstream calls are mocked."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.request import Request

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('query', ROOT / 'src/integrations/zetaris-query.py')
query = importlib.util.module_from_spec(spec)
spec.loader.exec_module(query)
DATA = json.loads((ROOT / 'data/demo.json').read_text(encoding='utf-8'))


def snapshot():
    data = copy.deepcopy(DATA)
    data['cases'] = data['cases'][:1]
    data['events'] = [e for e in data['events'] if e['caseId'] == 'FE-101']
    return data


class Tests(unittest.TestCase):
    def test_join_and_escaping(self):
        data = snapshot()
        data['cases'][0]['title'] = "O'Brien \\ laptop; DROP TABLE x --"
        sql = query.build_query(data, 'FE-101')
        self.assertTrue(sql.startswith('WITH cases AS (SELECT '))
        self.assertIn('events AS (SELECT ', sql)
        self.assertIn('rules AS (SELECT ', sql)
        self.assertIn('CROSS JOIN rules r LEFT JOIN events e', sql)
        self.assertTrue(sql.endswith("WHERE c.id = 'FE-101' LIMIT 100"))
        self.assertIn("O''Brien \\\\ laptop; DROP TABLE x --", sql)
        self.assertEqual(query.literal("'"), "''''")
        with self.assertRaises(ValueError):
            query.build_query(data, "FE-101' OR 1=1")

    def test_complete_result_required(self):
        data = snapshot()
        rows = query.expected_rows(data)
        self.assertEqual(query.verify_rows(data, list(reversed(rows))), data)
        for bad in [rows[:-1], rows + rows[:1], [], {}, [dict(id='untrusted')]]:
            with self.assertRaises(ValueError):
                query.verify_rows(data, bad)
        changed = copy.deepcopy(rows)
        changed[0][0] = 'FE-999'
        with self.assertRaises(ValueError):
            query.verify_rows(data, changed)

    def test_rest_numeric_cells_are_strings(self):
        data = snapshot()
        rows = query.expected_rows(data)
        numeric_index = len(query.CASE) + query.RULE.index('limitHours')
        for row in rows:
            row[numeric_index] = str(row[numeric_index])
        self.assertEqual(query.verify_rows(data, rows), data)
        for invalid in ['48.0', ' 48', '4.8e1', True]:
            bad = copy.deepcopy(rows)
            bad[0][numeric_index] = invalid
            with self.assertRaises(ValueError):
                query.verify_rows(data, bad)

    def test_configuration_is_local_and_explicit(self):
        with tempfile.TemporaryDirectory() as folder:
            env = Path(folder) / 'config'
            def config(url, org='1', key='synthetic-test-key'):
                env.write_text(f'ZETARIS_REST_URL={url}\nZETARIS_ORG_ID={org}\nZETARIS_API_KEY={key}\n')
                return query.configuration(str(env))
            for url in ['http://localhost:8888/api/v1.0', 'http://127.0.0.1/api/v1.0', 'http://[::1]:8888/api/v1.0']:
                self.assertEqual(config(url)['ZETARIS_REST_URL'], url)
            for url in ['http://example.org/api/v1.0', 'http://localhost/api/v1.0?x=1', 'http://u:p@localhost/api/v1.0', 'file:///api/v1.0', 'http://localhost/other']:
                with self.assertRaises(ValueError):
                    config(url)
            with self.assertRaises(ValueError):
                config('http://localhost/api/v1.0', org='bad')
            with self.assertRaises(ValueError):
                config('http://localhost/api/v1.0', key='')

    def test_no_redirects(self):
        with self.assertRaises(ValueError):
            query.NoRedirect().redirect_request(Request('http://localhost'), None, 302, '', {}, 'http://external')

    def test_transport_with_mocked_approved_channel(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = Path(folder)
            (repo / 'scripts').mkdir()
            (repo / 'scripts/zetaris_sql.py').write_text('''import os
class RestChannel:
 def __init__(self):
  self.base=os.environ['ZETARIS_REST_URL']; self.org=os.environ['ZETARIS_ORG_ID']; self._key=os.environ['ZETARIS_API_KEY']
 def run(self, sql, limit):
  assert limit == 100
  class Result: pass
  result=Result(); result.rows=self._call('/sql-editor/sqls/run', {'sql':sql})['data']; return result
 def close(self): pass
''')
            env = repo / 'config'
            env.write_text('ZETARIS_REST_URL=http://localhost:8888/api/v1.0\nZETARIS_ORG_ID=1\nZETARIS_API_KEY=synthetic-key\n')
            data = snapshot()
            response = unittest.mock.MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps({'data': query.expected_rows(data)}).encode()
            opener = unittest.mock.MagicMock()
            opener.open.return_value = response
            with patch.object(query, 'build_opener', return_value=opener) as build:
                self.assertEqual(query.run({'dataset': data, 'caseId': 'FE-101'}, str(repo), str(env)), data)
                self.assertEqual(build.call_args.args[0].proxies, {})
                self.assertIsInstance(build.call_args.args[1], query.NoRedirect)
                self.assertEqual(opener.open.call_args.kwargs['timeout'], 100)

    def test_safe_cli_errors(self):
        with patch.object(query.sys, 'argv', ['helper', 'repo', 'env']), patch.object(query.sys, 'stdin') as stdin:
            stdin.buffer.read.return_value = b'{}'
            output = io.StringIO()
            with patch.object(query.sys, 'stderr', output), patch.object(query, 'run', side_effect=RuntimeError('SECRET upstream body')):
                self.assertEqual(query.main(), 1)
            self.assertEqual(output.getvalue(), query.SAFE_ERROR + '\n')


if __name__ == '__main__':
    unittest.main()
