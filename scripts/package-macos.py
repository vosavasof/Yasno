#!/usr/bin/env python3
"""Build a self-contained macOS package. No credentials or live data are included."""
from pathlib import Path
import hashlib, shutil, tarfile, urllib.request, zipfile, json, os
root=Path(__file__).resolve().parent.parent
work=root/'work';stage=work/'macos-package'/'Yasna';cache=work/'node-runtime-cache'
version='24.22.3'
checksums={'arm64':'ff6e17d4874b76d272212b908cc020d6e815fba5a6c7eaaa06add725840307fd','x64':'977614af0504c81045e7fd85596dbca0e5f951b96681516dadafedcca8c447f7'}
cache.mkdir(parents=True,exist_ok=True)
if stage.exists():shutil.rmtree(stage)
stage.mkdir(parents=True)
for path in ['server.mjs','package.json']:
 shutil.copy2(root/path,stage/path)
for folder in ['dist','backend']:
 shutil.copytree(root/folder,stage/folder)
(stage/'scripts').mkdir()
for name in ['start-local.mjs','backup.mjs']:shutil.copy2(root/'scripts'/name,stage/'scripts'/name)
shutil.copy2(root/'local'/'Запустить Ясну.command',stage/'Запустить Ясну.command')
shutil.copy2(root/'docs'/'local-macos.md',stage/'ПРОЧИТАЙТЕ.txt')
# Always use the local source configuration, never a deployed Pages configuration.
(stage/'dist'/'config.js').write_text("window.YASNA_API_BASE='';\nwindow.YASNA_APP_PATH='/';\n")
(stage/'Запустить Ясну.command').chmod(0o755)
notices=[]
for arch,digest in checksums.items():
 filename=f'node-v{version}-darwin-{arch}.tar.gz';url=f'https://nodejs.org/dist/v{version}/{filename}';archive=cache/filename
 if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest()!=digest:
  print('Downloading official runtime: '+filename,flush=True)
  with urllib.request.urlopen(url,timeout=90) as response,archive.open('wb') as target:shutil.copyfileobj(response,target)
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=digest:raise RuntimeError('Runtime checksum mismatch: '+filename)
 target=stage/'runtime'/arch;(target/'bin').mkdir(parents=True)
 with tarfile.open(archive,'r:gz') as bundle:
  prefix=f'node-v{version}-darwin-{arch}/'
  for member,destination in [('bin/node',target/'bin'/'node'),('LICENSE',target/'LICENSE')]:
   with bundle.extractfile(prefix+member) as source,destination.open('wb') as output:shutil.copyfileobj(source,output)
 (target/'bin'/'node').chmod(0o755)
 notices.append(f'{url}\nSHA-256: {digest}\n')
(stage/'RUNTIME-SOURCES.txt').write_text('Official Node.js distributions, verified against pinned SHA-256 checksums.\n\n'+'\n'.join(notices))
# Refuse accidental data/credentials in the deliverable.
for path in stage.rglob('*'):
 for suffix in ['.sqlite','.sqlite-wal','.sqlite-shm','.key','.env']:
  if path.name.endswith(suffix):raise RuntimeError('Data must not enter package: '+str(path))
archive=work/'Yasna-macOS.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
 for path in sorted(stage.rglob('*')):
  if path.is_file():bundle.write(path,path.relative_to(stage.parent))
digest=hashlib.sha256(archive.read_bytes()).hexdigest();(work/'Yasna-macOS.zip.sha256').write_text(digest+'  Yasna-macOS.zip\n')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':digest}))
