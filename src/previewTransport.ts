import type {PlayerRef} from '@remotion/player';

type Player=Pick<PlayerRef,'pause'|'seekTo'|'toggle'>;
type Gesture=NonNullable<Parameters<PlayerRef['toggle']>[0]>|KeyboardEvent;
type Scheduler={request:(callback:()=>void)=>number;cancel:(id:number)=>void};

// Keep seek coalescing separate from the decoder. Play must happen in the
// original user gesture, after the latest queued seek, never in the next RAF.
export function createPreviewTransport(getPlayer:()=>Player|null,scheduler:Scheduler,updateFrame:(frame:number)=>void){
  let pending:{id:number;frame:number}|undefined;
  const cancel=()=>{if(pending)scheduler.cancel(pending.id);pending=undefined;};
  const flush=()=>{
    if(!pending)return;
    const frame=pending.frame;cancel();getPlayer()?.seekTo(frame);updateFrame(frame);
  };
  return {
    seek(frame:number){
      getPlayer()?.pause();cancel();
      const request={id:0,frame};
      request.id=scheduler.request(()=>{if(pending!==request)return;flush();});
      pending=request;
    },
    toggle(event:Gesture){
      flush();
      // Remotion's runtime accepts native interaction events too. Its exported
      // PlayerRef currently types only React SyntheticEvent; retain the actual
      // native keyboard event rather than fabricating a user gesture.
      getPlayer()?.toggle(event as NonNullable<Parameters<PlayerRef['toggle']>[0]>);
    },
    dispose:cancel,
  };
}
