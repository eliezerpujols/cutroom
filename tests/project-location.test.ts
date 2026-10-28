import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {ProjectStore} from '../server/projects';
import {absoluteDirectory,defaultProjectsDirectory} from '../server/paths';

test('default project location uses Documents/Cut Room independently of the checkout',()=>{
  const home=path.join(os.tmpdir(),'cutroom-home');
  assert.equal(defaultProjectsDirectory({},home),path.join(home,'Documents','Cut Room'));
  assert.equal(defaultProjectsDirectory({CUTROOM_PROJECTS_DIR:'  '},home),path.join(home,'Documents','Cut Room'));
  assert.equal(defaultProjectsDirectory({CUTROOM_PROJECTS_DIR:'~/Custom library'},home),path.join(home,'Custom library'));
  const explicit=path.join(home,'Other projects');
  assert.equal(defaultProjectsDirectory({CUTROOM_PROJECTS_DIR:explicit},home),explicit);
  assert.throws(()=>absoluteDirectory('relative/folder',home),/absolute/);
});

test('moving checkout-managed projects preserves their IDs and files while respecting explicit locations',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-location-'));
  try{
    const data=path.join(dir,'data'),oldRoot=path.join(dir,'checkout','projects'),newRoot=defaultProjectsDirectory({},dir);
    const oldStore=new ProjectStore(data,oldRoot);await oldStore.initialize();
    const id=oldStore.activeId(),oldFolder=oldStore.entry(id).folder;
    await fs.writeFile(path.join(oldFolder,'media','source.wav'),'media-content');
    await fs.writeFile(path.join(oldFolder,'exports','notes.txt'),'export-content');
    const custom=await oldStore.create('Explicit project',undefined,undefined,path.join(dir,'Client work'));
    const customFolder=oldStore.entry(custom.id).folder;
    const store=new ProjectStore(data,newRoot);await store.initialize();await store.migrateManagedRoot(oldRoot);
    assert.equal(store.activeId(),id);
    const w=await store.workspace(id);assert.equal(path.dirname(w.folder),newRoot);
    assert.equal(await fs.readFile(path.join(w.folder,'media','source.wav'),'utf8'),'media-content');
    assert.equal(await fs.readFile(path.join(w.exportsDir,'notes.txt'),'utf8'),'export-content');
    await assert.rejects(fs.access(oldFolder));
    assert.equal(store.entry(custom.id).folder,customFolder);
    const created=await store.create('New default');assert.equal(path.dirname(store.entry(created.id).folder),newRoot);
    const copy=await store.create('Copy elsewhere',id,undefined,path.join(dir,'Other destination'));assert.equal(path.dirname(store.entry(copy.id).folder),path.join(dir,'Other destination'));
    const restarted=new ProjectStore(data,newRoot);await restarted.initialize();await restarted.migrateManagedRoot(oldRoot);assert.equal((await restarted.workspace(id)).folder,w.folder);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('the default library is rediscovered after reinstall or an interrupted folder move',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-discovery-'));
  try{
    const root=defaultProjectsDirectory({},dir),data=path.join(dir,'data');
    const store=new ProjectStore(data,root);await store.initialize();const id=store.activeId();
    const second=await store.create('Another project');
    const fresh=new ProjectStore(path.join(dir,'fresh-install'),root);await fresh.initialize();
    assert.equal((await fresh.list()).length,2);assert.equal(await fresh.resolve('Another project'),second.id);
    const registryFile=path.join(data,'projects.json'),registry=JSON.parse(await fs.readFile(registryFile,'utf8'));
    registry.entries.find((e:{id:string})=>e.id===id).folder=path.join(dir,'old-missing-folder');
    await fs.writeFile(registryFile,JSON.stringify(registry));
    const recovered=new ProjectStore(data,root);await recovered.initialize();
    assert.equal(recovered.entry(id).folder,store.entry(id).folder);
    assert.equal((await recovered.workspace(id)).missingAssets.length,0);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
