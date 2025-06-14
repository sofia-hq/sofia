import { Step, Route, createDecisionModel } from '../src/index.js';
import { Tool } from '../src/models/tool.js';
import { z } from 'zod';

const greet = new Step({
  step_id: 'start',
  description: 'Greet the user and optionally echo back text',
  routes: [
    { target: 'end', condition: 'user says bye' }
  ],
  available_tools: ['echo']
});

const end = new Step({
  step_id: 'end',
  description: 'Conversation finished',
  auto_flow: true
});

const echo = new Tool('echo', 'Repeat back provided text', (args: {text: string}) => args.text, {
  text: { type: z.string() }
});

const decisionModel = createDecisionModel(greet, [echo]);

console.log('Decision schema expects:', decisionModel.shape);
console.log(decisionModel.parse({
  reasoning: ['say hello'],
  action: 'ASK',
  response: 'Hello!'
}));

