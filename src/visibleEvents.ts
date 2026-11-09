type Stream={onmessage:((event:MessageEvent<string>)=>void)|null;onopen:((event:Event)=>void)|null;close:()=>void};
type Visibility={visibilityState:string;addEventListener:(type:'visibilitychange',listener:()=>void)=>void;removeEventListener:(type:'visibilitychange',listener:()=>void)=>void};

// HTTP/1 event streams share the browser's six origin connections with media.
// Hidden editors must release theirs, then reconcile missed updates on return.
export function subscribeVisibleEvents(url:string,onMessage:(data:string)=>void,onOpen:()=>void,visibility:Visibility=document,connect:(url:string)=>Stream=url=>new EventSource(url)){
  let stream:Stream|null=null;
  const sync=()=>{
    if(visibility.visibilityState!=='visible'){stream?.close();stream=null;return;}
    if(stream)return;
    const current=connect(url);stream=current;
    current.onmessage=event=>{if(stream===current)onMessage(event.data);};
    current.onopen=()=>{if(stream===current)onOpen();};
  };
  visibility.addEventListener('visibilitychange',sync);sync();
  return()=>{visibility.removeEventListener('visibilitychange',sync);stream?.close();stream=null;};
}
