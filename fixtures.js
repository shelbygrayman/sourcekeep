// Original synthetic fixtures. This small public smoke set is not an independent evaluation.
export const samples = [
  ['travel.md', 'Travel expenses', 'Travel expenses must be submitted within 30 days. Attach itemized receipts. Rail tickets are reimbursed at standard class. Taxi rides require a business reason.'],
  ['study.md', 'Learning notes', 'Spaced repetition improves long-term recall by revisiting material at increasing intervals. Practice retrieval before rereading your notes. Sleep supports memory consolidation.'],
  ['design.md', 'Design handoff', 'The design handoff includes accessible color tokens, focus states, and mobile layouts. Every input needs a visible label. Use a minimum contrast ratio of 4.5:1 for ordinary text.'],
  ['garden.md', 'Garden journal', 'Water the balcony tomatoes at the soil in the morning. Yellow leaves may indicate overwatering. Basil prefers well-drained soil and six hours of sunlight.'],
  ['invoice.md', 'Invoice checklist', 'Client invoices need an invoice number, issue date, itemized services, total amount, and payment instructions. Payment is due 14 days after receipt.'],
  ['backup.md', 'Backup plan', 'Keep three copies of important files on two types of storage, with one copy offsite. Test a restore every month. Encrypt portable backup drives.'],
  ['launch.md', 'Launch notes', 'Before launch, test keyboard navigation and error messages. Confirm the signup flow on a small screen. Publish a changelog and monitor reported bugs after release.'],
  ['recipe.md', 'Bread recipe', 'For the bread dough, mix flour, water, salt, and yeast. Let it rise until doubled. Bake at 220 degrees Celsius for 30 minutes, then cool before slicing.'],
  ['meeting.md', 'Project meeting', 'The project meeting moved from Tuesday to Thursday at 10 am. Mina owns the prototype. Arun will check accessibility. The next milestone is a working search demo.'],
  ['privacy.md', 'Privacy notes', 'Document text is processed on the device. Downloading an AI model still contacts a model host. Local processing does not protect against malicious browser extensions.'],
  ['bike.md', 'Bicycle maintenance', 'Check tire pressure before a ride. Clean and lubricate the chain after wet rides. Replace brake pads before the wear marks disappear.'],
  ['research.md', 'Research method', 'Record the source, date, and exact quotation for each research claim. Separate observations from inference. A document hash detects changes but cannot prove a claim is true.']
].map(([name, title, text]) => ({ name, text: `# ${title}\n\n${text}` }));
export const questions = [
  ['When do travel expenses need receipts?', 'travel.md'],
  ['How can I remember what I learn?', 'study.md'],
  ['What contrast ratio does ordinary text need?', 'design.md'],
  ['How should I water tomatoes?', 'garden.md'],
  ['When must a client pay a bill?', 'invoice.md'],
  ['How do I recover my important files after losing a laptop?', 'backup.md'],
  ['What should be tested before launch?', 'launch.md'],
  ['What temperature is used to bake bread?', 'recipe.md'],
  ['Who owns the prototype?', 'meeting.md'],
  ['Does downloading a model contact another service?', 'privacy.md'],
  ['How do I maintain my bicycle brakes?', 'bike.md'],
  ['Can a hash prove that a research claim is true?', 'research.md']
].map(([query, expected]) => ({ query, expected }));
