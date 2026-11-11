import os
import zipfile
from pathlib import Path

def create_zip(output_zip_path: str):
    root_dir = Path(os.getcwd())
    output_path = Path(output_zip_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    exclude_dirs = {
        'node_modules',
        '.git',
        'dist',
        'repo',
        'imported_jarves_repo',
        '__pycache__',
        '.cache',
        '.npm',
    }

    exclude_files = {
        '.env',
        'bun.lock',
        'JARVIS-v2.0-Windows-Portable.zip',
    }

    print(f"Creating portable ZIP archive at: {output_zip_path}")
    count = 0

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in root_dir.rglob('*'):
            # Skip excluded dirs
            if any(part in exclude_dirs for part in file_path.parts):
                continue
            if file_path.name in exclude_files:
                continue
            if file_path.is_file():
                rel_path = file_path.relative_to(root_dir)
                zipf.write(file_path, arcname=str(rel_path))
                count += 1

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"✓ Archive successfully created: {count} files packaged ({size_mb:.2f} MB)")

if __name__ == '__main__':
    create_zip('dist/JARVIS-v2.0-Windows-Portable.zip')
