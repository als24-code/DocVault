import {fold} from './text';

const GROUPS: string[] = [
  'konkurrenz wettbewerb wettbewerber konkurrent',
  'kuendigen ausscheiden austritt',
  'gehalt lohn verguetung bezuege entgelt brutto netto',
  'urlaub urlaubsanspruch urlaubstage freistellung',
  'krank krankheit krankmeldung krankschreibung arbeitsunfaehigkeit attest',
  'ueberstunden mehrarbeit',
  'probezeit probe',
  'nebenjob nebentaetigkeit nebenbeschaeftigung zweitjob',
  'weihnachtsgeld sonderzahlung bonus gratifikation praemie',
  'miete mietzins kaltmiete warmmiete',
  'vermieter eigentuemer hausverwaltung',
  'kaution sicherheitsleistung',
  'versicherung police versicherer',
  'beitrag praemie',
  'selbstbeteiligung eigenanteil franchise',
  'frist termin zeitraum dauer',
  'widerspruch einspruch widerruf',
  'zahlen zahlung bezahlen ueberweisen',
  'rueckzahlung erstattung rueckerstattung',
  'schadensfall schaden leistungsfall',
  'bescheid schreiben mitteilung',
  'steuer finanzamt steuerbescheid',
  'vertrag vereinbarung abmachung',
  'verbot untersagt untersagen',
  'geheimhaltung verschwiegenheit schweigepflicht',
];

const MAP = new Map<string, string[]>();
for (const g of GROUPS) {
  const ws = g.split(' ').map(fold);
  for (const w of ws) MAP.set(w, ws.filter(x => x !== w));
}

export function alternatives(word: string): string[] {
  return MAP.get(word) || [];
}
