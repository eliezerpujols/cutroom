import type {StudioField} from './registry';
import {conversationDefaults} from './conversationTiming';

const fields: StudioField[] = [
  {key:'scenario',label:'Acción (waiting / manual / followup)',type:'text',default:conversationDefaults.scenario},
  {key:'contact',label:'Nombre oculto',type:'text',default:conversationDefaults.contact},
  {key:'message1',label:'Primer mensaje',type:'text',default:conversationDefaults.message1},
  {key:'message2',label:'Segundo mensaje',type:'text',default:conversationDefaults.message2},
  {key:'message3',label:'Tercer mensaje',type:'text',default:conversationDefaults.message3},
  {key:'documentName',label:'Documento',type:'text',default:conversationDefaults.documentName},
  ...(['sendSecondAt','sendThirdAt','receiveAt'] as const).map((key,i)=>({
    key,label:['Segundo envío','Tercer envío','Entrega del PDF'][i],type:'number' as const,
    default:conversationDefaults[key],min:0,max:900,step:1,unit:'fr',
  })),
];
export const conversationTemplates = [
  {id:'paper-conversation',name:'Chat · escribir y entregar',width:720,height:1020,duration:114,fields},
  {id:'paper-message',name:'Chat · mensaje recortado',width:720,height:240,duration:96,fields},
];
export const conversationArtwork: Record<string,string> = {
  'paper-conversation':'/studio/paper-conversation.svg',
  'paper-message':'/studio/paper-conversation.svg',
};
