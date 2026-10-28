import path from 'node:path';
import {homedir} from 'node:os';

export function absoluteDirectory(input:string,home=homedir()){
  const value=input.trim();
  const expanded=value==='~'?home:value.startsWith('~/')?path.join(home,value.slice(2)):value;
  if(!path.isAbsolute(expanded))throw new Error('Provide an absolute folder path or a path starting with ~/.');
  return path.resolve(expanded);
}

export function defaultProjectsDirectory(env:NodeJS.ProcessEnv=process.env,home=homedir()){
  const override=env.CUTROOM_PROJECTS_DIR?.trim();
  return override?absoluteDirectory(override,home):path.join(home,'Documents','Cut Room');
}
