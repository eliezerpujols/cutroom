import type {StudioField} from './registry';
import {conversationDefaults} from './conversationTiming';
import {commentCardDefaults as card} from './CommentCard';
import {chatBubblesDefaults as bubbles} from './ChatBubbles';

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
const commentFields: StudioField[] = [
    {key:'initials',label:'Iniciales',type:'text',default:card.initials},
    {key:'name',label:'Nombre oculto',type:'text',default:card.name},
    {key:'message',label:'Mensaje',type:'text',default:card.message},
    {key:'background',label:'Fondo',type:'color',default:card.background},
    {key:'avatar',label:'Avatar',type:'color',default:card.avatar},
    {key:'initialsColor',label:'Color iniciales',type:'color',default:card.initialsColor},
    {key:'color',label:'Color texto',type:'color',default:card.color},
    {key:'radius',label:'Redondeo',type:'number',default:card.radius,min:0,max:150,step:1,unit:'px'},
];
const bubbleFields: StudioField[] = [
  {key:'message1',label:'Primer mensaje',type:'text',default:bubbles.message1},
  {key:'message2',label:'Segundo mensaje',type:'text',default:bubbles.message2},
  {key:'message3',label:'Tercer mensaje',type:'text',default:bubbles.message3},
  {key:'side',label:'Lado (in / out)',type:'text',default:bubbles.side},
  {key:'secondAt',label:'Segundo aparece',type:'number',default:bubbles.secondAt,min:0,max:900,step:1,unit:'fr'},
  {key:'thirdAt',label:'Tercero aparece',type:'number',default:bubbles.thirdAt,min:0,max:900,step:1,unit:'fr'},
];
export const conversationTemplates = [
  {id:'paper-conversation',name:'Chat · escribir y entregar',width:720,height:1020,duration:114,fields},
  {id:'paper-message',name:'Chat · mensaje recortado',width:720,height:240,duration:96,fields},
  // Figma iPhone chat kit at 393 points wide, rendered at 2×; the chat area is shortened to 700 points.
  {id:'phone-chat',name:'Chat · iPhone',width:786,height:1400,duration:114,fields},
  {id:'chat-bubbles',name:'Chat · burbujas sueltas',width:786,height:460,duration:60,fields:bubbleFields},
  {id:'comment-card',name:'Comentario · anónimo',width:968,height:300,duration:120,fields:commentFields},
];
export const conversationArtwork: Record<string,string> = {
  'paper-conversation':'/studio/paper-conversation.svg',
  'paper-message':'/studio/paper-conversation.svg',
  'phone-chat':'/studio/phone-chat.svg',
  'comment-card':'/studio/comment-card.svg',
  'chat-bubbles':'/studio/chat-bubbles.svg',
};
