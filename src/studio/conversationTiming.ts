/** The animation clock is source-local, so splitting a clip keeps its state. */
export type ConversationProps = Record<string, string | number>;
export type ConversationScenario = 'waiting' | 'manual' | 'followup';
export const conversationDefaults: ConversationProps = {
  scenario: 'followup', contact: 'Entrenador personal',
  message1: 'Hola, ¿me enviás la rutina? Ya hice el pago.',
  message2: '¿Alguna novedad con la rutina?', message3: 'Hola, sigo esperando…',
  documentName: 'Rutina.pdf', sendSecondAt: 28, sendThirdAt: 60, receiveAt: 84,
};
export function conversationState(frame: number, input: ConversationProps) {
  const p = {...conversationDefaults, ...input};
  const scenario: ConversationScenario = p.scenario === 'waiting' || p.scenario === 'manual' ? p.scenario : 'followup';
  const second = Math.max(8, Number(p.sendSecondAt));
  const third = Math.max(second + 8, Number(p.sendThirdAt));
  const receive = Math.max(scenario === 'manual' ? 20 : third + 8, Number(p.receiveAt));
  const messages = [{text: String(p.message1), at: -20, time: '09:41', incoming: scenario === 'manual'}];
  let draft = '';
  if (scenario === 'followup') {
    for (const [text, at, time] of [[String(p.message2), second, '10:18'], [String(p.message3), third, '12:36']] as const) {
      if (frame >= at) messages.push({text, at, time, incoming: false});
      else if (frame >= at - 20) draft = text.slice(0, Math.floor(text.length * Math.min(1, (frame - at + 20) / 17)));
    }
  }
  return {scenario, messages, draft, receive,
    attached: scenario === 'manual' && frame >= receive - 32 && frame < receive,
    document: scenario !== 'waiting' && frame >= receive,
    documentIncoming: scenario !== 'manual',
    download: Math.min(1, Math.max(0, (frame - receive) / 13)),
  };
}
export const conversationProgress = (frame: number, at: number, duration = 9) => {
  const t = Math.max(0, Math.min(1, (frame - at) / duration));
  return 1 - (1 - t) ** 3;
};
