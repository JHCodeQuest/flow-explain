"""Read-only join of three supplied synthetic snapshots using approved RestChannel.

No registered datasource, platform object, or SQL supplied by a caller is used.
"""
from __future__ import annotations

import contextlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

CASE = ('id', 'title', 'description', 'status', 'ownerRole', 'createdAt', 'scenario')
RULE = ('id', 'step', 'kind', 'limitHours', 'field', 'description')
EVENT = ('id', 'caseId', 'step', 'status', 'timestamp', 'detail', 'errorCode', 'field')
SAFE_ERROR = 'Zetaris synthetic snapshot query unavailable.'


class DiscardOutput:
    """Suppress helper noise without buffering potentially large upstream output."""
    def write(self, value: str) -> int:
        return len(value)

    def flush(self) -> None:
        pass


def literal(value: str | int) -> str:
    """Escape quotes and backslashes for Spark SQL string literals."""
    if type(value) is int:
        return str(value)
    if not isinstance(value, str) or len(value) > 4000 or any(ord(c) < 32 for c in value):
        raise ValueError(SAFE_ERROR)
    return "'" + value.replace('\\', '\\\\').replace("'", "''") + "'"


def validate(payload: dict) -> tuple[dict, str]:
    data, case_id = payload['dataset'], payload['caseId']
    if not isinstance(case_id, str) or not re.fullmatch(r'FE-10[1-4]', case_id):
        raise ValueError(SAFE_ERROR)
    if set(data) != {'asOf', 'cases', 'events', 'rules'} or not isinstance(data['asOf'], str):
        raise ValueError(SAFE_ERROR)
    if len(data['cases']) != 1 or data['cases'][0]['id'] != case_id:
        raise ValueError(SAFE_ERROR)
    for name, columns, maximum in [('cases', CASE, 1), ('events', EVENT, 20), ('rules', RULE, 20)]:
        records = data[name]
        if not isinstance(records, list) or not records or len(records) > maximum:
            raise ValueError(SAFE_ERROR)
        ids = set()
        for record in records:
            if not isinstance(record, dict) or set(record) != set(columns):
                raise ValueError(SAFE_ERROR)
            for column in columns:
                value = record[column]
                if column == 'limitHours':
                    if type(value) is not int or not 0 <= value <= 10000:
                        raise ValueError(SAFE_ERROR)
                elif not isinstance(value, str):
                    raise ValueError(SAFE_ERROR)
                literal(value)
            if record['id'] in ids:
                raise ValueError(SAFE_ERROR)
            ids.add(record['id'])
    if any(e['caseId'] != case_id or e['step'] not in {r['step'] for r in data['rules']} for e in data['events']):
        raise ValueError(SAFE_ERROR)
    if len(expected_rows(data)) > 100:
        raise ValueError(SAFE_ERROR)
    return data, case_id


def cte(name: str, records: list[dict], columns: tuple) -> str:
    return name + ' AS (' + ' UNION ALL '.join(
        'SELECT ' + ', '.join(literal(record[key]) + ' AS ' + key for key in columns)
        for record in records) + ')'


def build_query(data: dict, case_id: str) -> str:
    validate({'dataset': data, 'caseId': case_id})
    columns = ', '.join(f'{alias}.{key} AS {alias}_{key}'
                        for alias, keys in [('c', CASE), ('r', RULE), ('e', EVENT)] for key in keys)
    return ('WITH ' + ', '.join([cte('cases', data['cases'], CASE), cte('events', data['events'], EVENT),
                               cte('rules', data['rules'], RULE)]) + '\nSELECT ' + columns +
            ' FROM cases c CROSS JOIN rules r LEFT JOIN events e ON e.caseId = c.id AND e.step = r.step' +
            ' WHERE c.id = ' + literal(case_id) + ' LIMIT 100')


def expected_rows(data: dict) -> list[list]:
    case = data['cases'][0]
    return [[case[k] for k in CASE] + [rule[k] for k in RULE] +
            ([event[k] for k in EVENT] if event else [None] * len(EVENT))
            for rule in data['rules']
            for event in ([e for e in data['events'] if e['step'] == rule['step']] or [None])]


def verify_rows(data: dict, rows: object) -> dict:
    expected = expected_rows(data)
    if not isinstance(rows, list) or len(rows) != len(expected) or len(rows) > 100:
        raise ValueError(SAFE_ERROR)
    remaining = expected.copy()
    for row in rows:
        if not isinstance(row, list) or len(row) != len(CASE) + len(RULE) + len(EVENT):
            raise ValueError(SAFE_ERROR)
        normalized = row.copy()
        numeric_index = len(CASE) + RULE.index('limitHours')
        numeric = normalized[numeric_index]
        # The approved REST API serializes SQL numeric cells as strings. Coerce
        # only this known integer column; do not loosen evidence/citation checks.
        if isinstance(numeric, str) and re.fullmatch(r'0|[1-9][0-9]{0,4}', numeric):
            numeric = int(numeric)
        if type(numeric) is not int or not 0 <= numeric <= 10000:
            raise ValueError(SAFE_ERROR)
        normalized[numeric_index] = numeric
        if normalized not in remaining:
            raise ValueError(SAFE_ERROR)
        remaining.remove(normalized)
    return data


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError(SAFE_ERROR)


def configuration(env_file: str) -> dict[str, str]:
    """Read only named file; inherited secret/configuration values are ignored."""
    values = {}
    for line in Path(env_file).read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
                value = value[1:-1]
            values[key.strip()] = value
    base = values.get('ZETARIS_REST_URL', 'http://localhost:8888/api/v1.0').rstrip('/')
    url = urlsplit(base)
    if (url.scheme not in ('http', 'https') or url.hostname not in ('localhost', '127.0.0.1', '::1')
            or url.username or url.password or url.path != '/api/v1.0' or url.query or url.fragment):
        raise ValueError(SAFE_ERROR)
    # Validate port parsing as well as numeric organization identity and presence of key.
    _ = url.port
    if not re.fullmatch(r'[0-9]+', values.get('ZETARIS_ORG_ID', '')) or not values.get('ZETARIS_API_KEY', '').strip():
        raise ValueError(SAFE_ERROR)
    return {key: value for key, value in values.items() if key in ('ZETARIS_ORG_ID', 'ZETARIS_API_KEY')} | {'ZETARIS_REST_URL': base}


def run(payload: dict, repo: str, env_file: str) -> dict:
    data, case_id = validate(payload)
    config = configuration(env_file)
    spec = importlib.util.spec_from_file_location('approved_zetaris', Path(repo) / 'scripts' / 'zetaris_sql.py')
    if spec is None or spec.loader is None:
        raise ValueError(SAFE_ERROR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for key in ('ZETARIS_API_KEY', 'ZETARIS_ORG_ID', 'ZETARIS_REST_URL'):
        os.environ[key] = config[key]

    class LocalChannel(module.RestChannel):
        def _call(self, path: str, body: dict | None = None):
            if path != '/sql-editor/sqls/run' or body is None:
                raise ValueError(SAFE_ERROR)
            request = Request(self.base + path, data=json.dumps(body).encode(), method='POST', headers={
                'Authorization': 'Bearer ' + self._key, 'X-Org-ID': self.org, 'Content-Type': 'application/json'})
            opener = build_opener(ProxyHandler({}), NoRedirect())
            with opener.open(request, timeout=100) as response:
                raw = response.read(256 * 1024 + 1)
                if len(raw) > 256 * 1024:
                    raise ValueError(SAFE_ERROR)
                result = json.loads(raw)
                if not isinstance(result, dict) or not isinstance(result.get('data'), list):
                    raise ValueError(SAFE_ERROR)
                return result

    channel = LocalChannel()
    try:
        return verify_rows(data, channel.run(build_query(data, case_id), limit=100).rows)
    finally:
        channel.close()


def main() -> int:
    try:
        if len(sys.argv) != 3:
            raise ValueError(SAFE_ERROR)
        raw = sys.stdin.buffer.read(128 * 1024 + 1)
        if len(raw) > 128 * 1024:
            raise ValueError(SAFE_ERROR)
        # Discard imported helper output as well as raw exception messages.
        with contextlib.redirect_stdout(DiscardOutput()), contextlib.redirect_stderr(DiscardOutput()):
            result = run(json.loads(raw), sys.argv[1], sys.argv[2])
        sys.stdout.write(json.dumps(result, separators=(',', ':')))
        return 0
    except Exception:
        sys.stderr.write(SAFE_ERROR + '\n')
        return 1


if __name__ == '__main__':
    sys.exit(main())
