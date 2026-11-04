import {isBundledFont,type FontManifest} from './fonts';
const loading=new Map<string,Promise<void>>();
export function loadProjectFont(projectId:string,family:string):Promise<void>{
  if(isBundledFont(family))return Promise.resolve();
  const key=projectId+':'+family,existing=loading.get(key);if(existing)return existing;
  const base=`http://127.0.0.1:4317/api/projects/${encodeURIComponent(projectId)}`;
  const promise=(async()=>{const response=await fetch(`${base}/fonts/${encodeURIComponent(family)}`);if(!response.ok)throw new Error(`Couldn’t load ${family}. Check your connection and try again.`);const manifest:FontManifest=await response.json();
    const faces=await Promise.all(manifest.faces.map(async face=>{const font=new FontFace(family,`url("${base}/font-files/${encodeURIComponent(family)}/${face.file}")`,{weight:face.weight,style:face.style,...(face.unicodeRange?{unicodeRange:face.unicodeRange}:{})});await font.load();return font;}));
    for(const face of faces)document.fonts.add(face);
  })();loading.set(key,promise);void promise.catch(()=>loading.delete(key));return promise;
}
