from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, hashlib, shutil

repo=Path(__file__).resolve().parents[4]
proof=Path(__file__).resolve().parent
out=repo/'dist/assets/inspirations'
originals=Path('/workspace/mir-inspiration-originals')
out.mkdir(exist_ok=True,parents=True);originals.mkdir(exist_ok=True,parents=True)
plan=json.loads((proof/'generation-plan.json').read_text())
previous={x['id']:x for x in json.loads((proof/'manifest.json').read_text())} if (proof/'manifest.json').exists() else {}
records={x['id']:x for x in plan if x.get('status')=='generated'}
for file in sorted(proof.glob('generated-batch-*.json')):
 for x in json.loads(file.read_text()):
  if x.get('status')=='generated':records[x['id']]=x
manifest=[]
for planned in plan:
 if planned['id'] not in records:continue
 row=dict(records[planned['id']]);source=Path(row['original']);target=originals/(row['id']+'.png')
 if not target.exists() or hashlib.sha256(source.read_bytes()).digest()!=hashlib.sha256(target.read_bytes()).digest():shutil.copy2(source,target)
 im=Image.open(target).convert('RGB');row['sourceDimensions']=list(im.size)
 row['sourceSha256']=hashlib.sha256(target.read_bytes()).hexdigest();row['originalCopy']=str(target)
 row['source']='Original AI architectural illustration generated with image_gen, 2026-11-18; not a real MIR project.'
 row['variants']=[]
 for width,suffix in [(960,''),(1600,'-large')]:
  image=im.copy();image.thumbnail((width,width),Image.Resampling.LANCZOS)
  dest=out/(row['id']+suffix+'.webp')
  if not dest.exists() or previous.get(row['id'],{}).get('sourceSha256')!=row['sourceSha256']:
   temporary=dest.with_suffix('.tmp.webp');image.save(temporary,quality=86,method=6);temporary.replace(dest)
  row['variants'].append({'path':str(dest.relative_to(repo)),'dimensions':list(image.size),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
 manifest.append(row)
(proof/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
cols=4;tilew=400;tileh=250
contact=Image.new('RGB',(cols*tilew,((len(manifest)+cols-1)//cols)*tileh),'#242522');draw=ImageDraw.Draw(contact)
for i,row in enumerate(manifest):
 im=Image.open(out/(row['id']+'.webp')).convert('RGB');im=ImageOps.contain(im,(tilew,225),Image.Resampling.LANCZOS)
 x=(i%cols)*tilew;y=(i//cols)*tileh;contact.paste(im,(x+(tilew-im.width)//2,y))
 draw.text((x+10,y+230),row['id'],fill='#f4f1ea')
contact.save(proof/'contact-sheet.jpg',quality=90)
print(json.dumps({'generated':len(manifest),'webpBytes':sum(v['bytes'] for r in manifest for v in r['variants']),'contactSheet':str(proof/'contact-sheet.jpg')}))
