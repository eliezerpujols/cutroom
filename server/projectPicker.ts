import {execFile} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {promisify} from 'node:util';

const run=promisify(execFile);
// https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/PromptforaFileorFolder.html
const script=`on run argv
  try
    set startFolder to (POSIX file (item 1 of argv)) as alias
    set projectFile to choose file with prompt "Open a Cutroom project" of type {"cutroom"} default location startFolder
    return POSIX path of projectFile
  on error number -128
    return ""
  end try
end run`;
let choosing=false;

// Resolve the selected file on the server so media stays relative to its folder.
// Uploading just the manifest through a browser input would lose that location.
export async function chooseProjectFile(projectsRoot:string):Promise<string|null>{
  if(process.platform!=='darwin')throw new Error('The system project picker currently requires macOS. Projects can also be opened by name or path through the Cutroom MCP.');
  if(choosing)throw new Error('A project selector is already open. Choose a file or cancel that window first.');
  choosing=true;
  try{
    const libraryExists=await stat(projectsRoot).then(s=>s.isDirectory()).catch(()=>false);
    const directory=libraryExists?projectsRoot:homedir();
    const {stdout}=await run('/usr/bin/osascript',['-e',script,directory],{timeout:300000,maxBuffer:64*1024});
    // osascript appends one newline; preserve any whitespace in the file's path.
    return stdout.replace(/\r?\n$/,'')||null;
  }catch(error){
    const cause=error as NodeJS.ErrnoException&{killed?:boolean};
    if(cause.killed)throw new Error('The file selector timed out. Click Open project to choose a file again.');
    throw new Error('The system file selector could not open. Try Open project again.',{cause:error});
  }finally{choosing=false;}
}
