import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {exportFile,latestExport} from '../server/exports';

test('reopening finds the latest completed full export for this project and format',async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-exports-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  const projectId=randomUUID();
  async function saved(filename:string,time:number,extra:Record<string,unknown>={}){
    const id=randomUUID();await fs.writeFile(path.join(folder,filename),'media');await fs.utimes(path.join(folder,filename),time,time);
    await fs.writeFile(path.join(folder,id+'.export.json'),JSON.stringify({id,projectId,status:'completed',progress:1,filename,...extra}));
  }
  await saved('old.mp4',1000);await saved('latest.mp4',2000);
  await saved('audio.wav',3000);await saved('selection.mp4',4000,{selection:{start:30,end:60}});
  await saved('other-project.mp4',5000,{projectId:randomUUID()});await saved('missing.mp4',6000);await fs.unlink(path.join(folder,'missing.mp4'));
  await fs.writeFile(path.join(folder,'dubbed.mp4'),'raw media');await fs.writeFile(path.join(folder,'broken.export.json'),'{');
  const job=await latestExport(folder,projectId,'mp4');assert.equal(job?.filename,'latest.mp4');
  assert.equal((await latestExport(folder,projectId,'wav'))?.filename,'audio.wav');
  assert.equal(await latestExport(folder,projectId,'mp3'),null);
});

test('reveal only resolves existing media inside the project exports folder',async t=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-reveal-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  const exportsDir=path.join(folder,'exports');await fs.mkdir(exportsDir);
  await fs.writeFile(path.join(exportsDir,'video.mp4'),'media');await fs.writeFile(path.join(folder,'outside.mp4'),'outside');
  assert.equal(await exportFile(exportsDir,'video.mp4'),await fs.realpath(path.join(exportsDir,'video.mp4')));
  await assert.rejects(exportFile(exportsDir,'../outside.mp4'));
  await assert.rejects(exportFile(exportsDir,'missing.mp4'),/no longer/);
  await fs.symlink(path.join(folder,'outside.mp4'),path.join(exportsDir,'link.mp4'));
  await assert.rejects(exportFile(exportsDir,'link.mp4'),/inside/);
});
