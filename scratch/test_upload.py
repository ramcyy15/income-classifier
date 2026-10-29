import urllib.request
import json
import os

def test_file_upload(filepath):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    filename = os.path.basename(filepath)
    with open(filepath, 'rb') as f:
        file_content = f.read()

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: text/csv\r\n\r\n'
    ).encode('utf-8') + file_content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/classify-barangay/batch-file',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print(f"{filename} -> Total Rows: {res['total_rows']}, Successfully Classified: {res['successful']}, Skipped/Failed: {res['failed']}")
            if res['errors']:
                print("  Detected Validation Errors as expected:")
                for err in res['errors']:
                    print(f"   - Row {err['row']} ({err['barangay']}): {', '.join(err['errors'])}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")

test_file_upload('district_v_barangays_test.csv')
print("-" * 50)
test_file_upload('district_v_validation_test.csv')
