from pathlib import Path
import zipfile,hashlib
root=Path(__file__).resolve().parent.parent
files=[root/name for name in ['Dockerfile','compose.yaml','Caddyfile','package.json','package-lock.json','server.mjs','README.md','.env.example']]
for folder in ['backend','dist','scripts','deploy','docs']:
 files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in str(p))
target=root/'work'/'Yasna-server.zip';target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
 for path in sorted(set(files)):
  relative=path.relative_to(root)
  if '.terraform' in relative.parts or any(path.name.endswith(x) for x in ['.tfstate','.tfplan','.tfvars','.sqlite','.key','.pyc']):continue
  archive.write(path,'Yasna/'+str(relative))
(root/'work'/'Yasna-server.zip.sha256').write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  Yasna-server.zip\n')
print(str(target))
