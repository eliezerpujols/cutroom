import path from 'node:path';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

export const EXPORT_METADATA_POLICY='minimal-optional-tags-v1';
type RunFfmpeg=(args:string[])=>Promise<unknown>;

// Only call on newly generated deliverables, never on imported originals.
// This removes ordinary optional tags, not encoded-content watermarks or codec
// information. It does not certify provenance or determine platform AI labels.
export async function finalizeExportMetadata(output:string,run:RunFfmpeg){
  const extension=path.extname(output).toLowerCase();
  if(!['.mp4','.wav','.mp3'].includes(extension))throw new Error('Unsupported export metadata format.');
  const temporary=path.join(path.dirname(output),`.metadata-${randomUUID()}${extension}`);
  const streams=extension==='.mp4'?['-map','0:v:0?','-map','0:a:0?']:['-map','0:a:0'];
  const options=extension==='.mp4'?['-movflags','+faststart']:extension==='.mp3'?['-id3v2_version','0','-write_id3v1','0']:[];
  try{
    await run([
      '-y','-v','error','-i',output,...streams,'-c','copy',
      '-map_metadata','-1','-map_metadata:s','-1','-map_chapters','-1',
      '-metadata','encoder=','-metadata','software=','-metadata','comment=',
      '-metadata:s','encoder=','-metadata:s','software=','-metadata:s','comment=',
      '-fflags','+bitexact',...options,temporary,
    ]);
    const result=await fs.stat(temporary);
    if(!result.isFile()||!result.size)throw new Error('The final export file is empty.');
    // Publish only after FFmpeg finishes. A failure leaves the rendered file
    // intact and prevents the export job from claiming a finalized result.
    await fs.rename(temporary,output);
    return {metadata_policy:EXPORT_METADATA_POLICY,cleanup_reencoded_media:false};
  }finally{await fs.unlink(temporary).catch(()=>{});}
}
