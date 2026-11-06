import React,{createContext,useContext} from 'react';
import {AbsoluteFill,Easing,Img,interpolate,staticFile,getRemotionEnvironment} from 'remotion';
import {studioDefaults,type StudioInstance} from './registry';
const uploadBounds={x:52,y:234.375,width:286,height:286};
const finalBounds={'.product-detail-card':[{y:574.8671875}],'.sell-editor-footer':[{y:737.3828125}]};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const assetRoot='/studio/product-flow-es/';
const DemoPreview=createContext(false);
function DemoImage({src,style}:{src:string;style?:React.CSSProperties}){const preview=useContext(DemoPreview);return preview?<img src={src} style={style} alt=""/>:<Img src={src} style={style}/>;}
const asset=(name:string)=>getRemotionEnvironment().isRendering?staticFile(`studio/product-flow-es/${name}`):assetRoot+name;
const screen=(name:string)=>asset(`screens/${name}.png`);
const Shot=({name,style={}}:{name:string;style?:React.CSSProperties})=><DemoImage src={screen(name)} style={{position:'absolute',width:'100%',height:'100%',objectFit:'fill',...style}}/>;
// The original rendered app stays intact. Only its independently clipped regions
// move, using the measured 390 × 844 CSS-pixel positions in home-bounds.json.
function HomeLayer({frame,delay,clip,travel=12,scale=false,press=1}:{frame:number;delay:number;clip:string;travel?:number;scale?:boolean;press?:number}) {
  const progress=interpolate(frame,[delay,delay+20],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  return <div style={{position:'absolute',inset:0,opacity:progress,transform:`translateY(${(1-progress)*travel}px) scale(${(scale?0.965+progress*0.035:1)*press})`,transformOrigin:'195px 381px'}}>
    <Shot name="home" style={{clipPath:clip}}/>
  </div>;
}
function HomeIntro({frame}:{frame:number}) {
  const press=interpolate(frame,[73,77,81,86],[1,0.94,0.94,1],{...clamp,easing:Easing.inOut(Easing.cubic)});
  const nav=interpolate(frame,[16,36],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background:'white'}}>
    <HomeLayer frame={frame} delay={0} clip="inset(0 190px 749px 0)" travel={8}/>
    <HomeLayer frame={frame} delay={2} clip="inset(0 0 749px 300px)" travel={8}/>
    <HomeLayer frame={frame} delay={5} clip="inset(170px 80px 551px 80px)" travel={14}/>
    <HomeLayer frame={frame} delay={9} clip="inset(295px 100px 376px 100px)" travel={16} scale press={press}/>
    <HomeLayer frame={frame} delay={13} clip="inset(550px 0 0 0)" travel={18}/>
    <div style={{position:'absolute',inset:0,opacity:nav,transform:`translateY(${(1-nav)*12}px)`}}><Shot name="home" style={{clipPath:"inset(720px 0 0 0)"}}/></div>
  </AbsoluteFill>;
}
const photos=['skincare.png','skincare-related-1.png','skincare-products.png','skincare-related-2.png','skincare-selfie.png','skincare-related-3.png'];
function Gallery({frame}:{frame:number}){const selected=frame>=116;return <AbsoluteFill style={{background:'#f6f6f8',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',fontSize:17}}><div style={{height:70,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',background:'white'}}><span style={{color:'#007aff'}}>Cancelar</span><span style={{fontWeight:600}}>Fotos</span><span style={{color:'#007aff',fontWeight:600}}>Añadir</span></div><div style={{padding:'13px 20px 20px',fontSize:14,color:'#777'}}>Selecciona una foto</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>{photos.map((p,i)=><div key={p} style={{position:'relative',aspectRatio:'1',overflow:'hidden'}}><DemoImage src={asset(p)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>{selected&&i===0&&<><div style={{position:'absolute',inset:0,background:'#008ffe18',border:'3px solid #008ffe'}}/><div style={{position:'absolute',bottom:8,right:8,width:24,height:24,borderRadius:'50%',background:'#008ffe',color:'white',display:'grid',placeItems:'center',fontSize:15}}>1</div></>}</div>)}</div>{selected&&<div style={{position:'absolute',bottom:30,left:0,width:'100%',textAlign:'center',color:'#777',fontSize:15}}>1 foto seleccionada</div>}</AbsoluteFill>}
function Upload({frame}:{frame:number}){const progress=interpolate(frame,[132,149,178,194,199],[0,21,76,96,100],clamp);return <AbsoluteFill style={{background:'white',fontFamily:'"Inter Variable",sans-serif'}}><div style={{position:'absolute',right:24,top:16,width:48,height:48,borderRadius:'50%',boxShadow:'0 3px 14px #0001',display:'grid',placeItems:'center',fontSize:32,fontWeight:300}}>×</div><DemoImage src={asset('upload-crown.svg')} style={{position:'absolute',left:116,top:298,width:158,height:158}}/><svg style={{position:'absolute',left:uploadBounds.x,top:uploadBounds.y,width:uploadBounds.width,height:uploadBounds.height}} viewBox="0 0 286 286"><circle cx="143" cy="143" r="140" fill="none" stroke="#d9d9d9" strokeWidth="6"/><circle cx="143" cy="143" r="140" fill="none" stroke="#008ffe" strokeWidth="6" pathLength="100" strokeDasharray="100" strokeDashoffset={100-progress} transform="rotate(-90 143 143)"/></svg><div style={{position:'absolute',top:554,width:'100%',textAlign:'center',fontSize:16,fontWeight:650}}>Subiendo tu archivo…</div><div style={{position:'absolute',top:595,left:42,right:42,textAlign:'center',fontSize:12,color:'#777',lineHeight:1.45}}>Por favor, no cierres ni minimices esta página.</div></AbsoluteFill>}
const phoneScale=1920/844;
const phoneStyle:React.CSSProperties={width:390,height:844,position:'absolute',left:(1080-390*phoneScale)/2,transform:`scale(${phoneScale})`,transformOrigin:'top left',overflow:'hidden'};
// Reuse the actual app sheet artwork, but compose its scrim and surface at
// video-canvas width so the taller phone layout never exposes white side bars.
function SheetOverlay({frame,name,start,close,end,top}:{frame:number;name:string;start:number;close:number;end:number;top:number}) {
  const opening=interpolate(frame,[start,start+10],[0,1],{...clamp,easing:Easing.bezier(0.22,1,0.36,1)});
  const closing=interpolate(frame,[close,end],[0,1],{...clamp,easing:Easing.inOut(Easing.cubic)});
  const visibility=opening*(1-closing);
  const travel=(844-top)*phoneScale;
  return <>
    <AbsoluteFill style={{background:'#000',opacity:0.865*visibility}}/>
    <div style={{position:'absolute',top:top*phoneScale,left:0,right:0,bottom:0,background:'white',borderRadius:`${40*phoneScale}px ${40*phoneScale}px 0 0`,overflow:'hidden',boxShadow:'0 -8px 48px #00000012',transform:`translateY(${travel*(1-opening+closing)}px)`}}>
      <div style={{...phoneStyle,top:-top*phoneScale}}>
        <Shot name={name} style={{clipPath:`inset(${top+24}px 20px 50px 20px)`}}/>
      </div>
    </div>
  </>;
}
function PickerScene({frame}:{frame:number}) {
  const gallery=frame>=101;
  const progress=interpolate(frame,[101,109],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background:gallery?'#f6f6f8':'white'}}>
    {gallery&&<div style={{position:'absolute',top:0,left:0,right:0,height:70*phoneScale,background:'white'}}/>}
    <div style={phoneStyle}>{gallery?<div style={{position:'absolute',inset:0,transform:`translateY(${40*(1-progress)}px)`}}><Gallery frame={frame}/></div>:<HomeIntro frame={frame}/>}</div>
    <SheetOverlay frame={frame} name="picker" start={80} close={101} end={111} top={449}/>
  </AbsoluteFill>;
}
function ShareScene({frame}:{frame:number}) {
  return <AbsoluteFill style={{background:'white'}}>
    {frame<400?<div style={phoneStyle}><Shot name="ready"/></div>:<FinalScreen name="published"/>}
    <SheetOverlay frame={frame} name="link" start={384} close={400} end={406} top={556}/>
  </AbsoluteFill>;
}
const contentSteps=[
  {start:200,end:225,previous:'upload'},
  {start:225,end:270,previous:'uploaded'},
  {start:270,end:299,previous:'price-set'},
  {start:299,end:310,previous:'title'},
  {start:310,end:365,previous:'preview'},
  {start:365,end:384,previous:'description'},
];
function StepScreen({frame,name}:{frame:number;name:string}) {
  const step=contentSteps.find(step=>frame>=step.start&&frame<step.end);
  if(!step)return <Shot name={name}/>;
  const duration=Math.min(12,step.end-step.start-3);
  const progress=interpolate(frame,[step.start,step.start+duration],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  return <>
    <Shot name={name}/>
    {/* Only the actual step content moves; the 74px navigation and bottom action stay fixed. */}
    <div style={{position:'absolute',top:74,left:0,width:390,height:666,overflow:'hidden',background:name==='preview'||name==='ready'?'#f5ffff':'white'}}>
      <div style={{position:'absolute',top:-74,left:0,width:390,height:844,opacity:interpolate(frame,[step.start,step.start+3],[1,0],clamp),transform:`translateX(${-18*progress}px)`}}><Shot name={step.previous}/></div>
      <div style={{position:'absolute',top:-74,left:0,width:390,height:844,opacity:progress,transform:`translateX(${24*(1-progress)}px)`}}><Shot name={name}/></div>
    </div>
  </>;
}
function FinalScreen({name}:{name:string}) {
  const cardTop=finalBounds['.product-detail-card'][0].y;
  const footerTop=finalBounds['.sell-editor-footer'][0].y;
  return <AbsoluteFill style={{background:'#f5ffff'}}>
    <div style={{position:'absolute',top:cardTop*phoneScale,left:0,right:0,bottom:0,background:'white',borderRadius:`${40*phoneScale}px ${40*phoneScale}px 0 0`,boxShadow:'0 16px 46px #00000017'}}/>
    <div style={{position:'absolute',top:footerTop*phoneScale,left:0,right:0,bottom:0,background:'white',borderTop:`${phoneScale}px solid #d9d9d9`}}/>
    <div style={phoneStyle}>
      <Shot name={name} style={{clipPath:`inset(0 0 ${844-cardTop}px 0)`}}/>
      <Shot name={name} style={{clipPath:`inset(${cardTop}px 0 0 round 42px 42px 0 0)`}}/>
    </div>
  </AbsoluteFill>;
}
function DemoScene({f}:{f:number}){let name='home';
  if(f>=80)name='picker';
  if(f>=200)name='uploaded';
  if(f>=225)name=f<244?'price':'price-set';
  if(f>=270)name=`title-${Math.min(7,Math.floor((f-270)/3))}`;
  if(f>=299)name='preview';
  if(f>=310)name=f>=361?'description':`description-${Math.min(17,Math.floor((f-310)/3))}`;
  if(f>=365)name='ready';
  if(f>=384)name='link';
  if(f>=384&&f<406)return <ShareScene frame={f}/>;
  if(f>=80&&f<132)return <PickerScene frame={f}/>;
  if(f>=400)return <FinalScreen name={f>=418?'copied':'published'}/>;
  const translate=f>=101&&f<132?interpolate(f,[101,107],[40,0],clamp):0;
  return <AbsoluteFill style={{background:'#fff'}}><div style={phoneStyle}>
    <div style={{position:'absolute',inset:0,transform:`translateY(${translate}px)`}}>
      {f<80?<HomeIntro frame={f}/>:f>=101&&f<132?<Gallery frame={f}/>:f>=132&&f<200?<Upload frame={f}/>:<StepScreen frame={f} name={name}/>}
    </div>
  </div></AbsoluteFill>;
}
export function productDemoFrame(frame:number,speed:number){return Math.max(0,Math.min(437,frame*speed));}
export function ProductFlowDemo({instance,frame,libraryPreview=false}:{instance:StudioInstance;frame:number;libraryPreview?:boolean}){
 const p={...studioDefaults('product-flow-demo-es'),...instance.props};const f=productDemoFrame(frame,Number(p.speed));
 // A fixed SVG coordinate space scales the original editable 1080×1920 composition
 // with the normal overlay controls; its local frame preserves trimming and splitting.
 return <DemoPreview.Provider value={libraryPreview}><svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}} aria-label="Demo continuo de Creator Program en español"><foreignObject x="0" y="0" width="1080" height="1920"><div style={{position:'relative',width:1080,height:1920,overflow:'hidden'}}><DemoScene f={libraryPreview?Math.max(38,f):f}/></div></foreignObject></svg></DemoPreview.Provider>;
}
