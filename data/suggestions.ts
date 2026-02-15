
import { TransportMode } from '../types';

export const SUGGESTIONS: Record<TransportMode, string[]> = {
  [TransportMode.SNCB]: [
    'Bruxelles-Midi', 'Bruxelles-Central', 'Bruxelles-Nord', 'Bruxelles-Luxembourg', 'Bruxelles-Schuman',
    'Anvers-Central', 'Gand-Saint-Pierre', 'Liège-Guillemins', 'Namur', 'Charleroi-Central', 
    'Louvain (Leuven)', 'Malines (Mechelen)', 'Bruges (Brugge)', 'Ostende', 'Mons', 'Verviers-Central', 
    'Tournai', 'Arlon', 'Hasselt', 'Ottignies', 'Braine-l\'Alleud', 'Nivelles', 'Gembloux', 
    'Courtrai (Kortrijk)', 'Alost (Aalst)', 'Aalst', 'Denderleeuw', 'Louvain-la-Neuve', 
    'Zaventem (Brussels Airport)', 'Zottegem', 'Grammont (Geraardsbergen)', 'Audenarde (Oudenaarde)', 
    'Renaix (Ronse)', 'Wavre', 'Enghien', 'Soignies', 'Luttre', 'Marchienne-au-Pont', 'Berchem', 
    'Lierre (Lier)', 'Turnhout', 'Mol', 'Herentals', 'Diest', 'Tongres (Tongeren)', 'Ciney', 
    'Libramont', 'Marloie', 'Rochefort-Jemelle', 'Eupen', 'Welkenraedt', 'Visé', 'Genk', 'Beveren',
    'Saint-Nicolas (Sint-Niklaas)', 'Termonde (Dendermonde)', 'Knokke', 'Blankenberge', 'La Panne (De Panne)',
    'Roulers (Roeselare)', 'Ypres (Ieper)', 'Poperinge', 'Dunkerque', 'Maastricht', 'Luxembourg'
  ],
  [TransportMode.STIB]: [
    'Rogier', 'De Brouckère', 'Arts-Loi', 'Montgomery', 'Louise', 'Schuman', 'Gare Centrale',
    'Gare du Midi', 'Simonis', 'Delta', 'Beekkant', 'Trône', 'Porte de Namur', 'Mérode',
    'Stockel', 'Erasme', 'Roodebeek', 'Heysel', 'Belgica', 'Diamant', 'Flagey', 'Bourse',
    'Sainte-Catherine', 'Botanique', 'Madou', 'Parc', 'Porte de Hal', 'Horta', 'Albert'
  ],
  [TransportMode.DeLijn]: [
    'Antwerpen Rooseveltplaats', 'Antwerpen Groenplaats', 'Antwerpen Centraal', 'Gent Zuid', 
    'Gent Sint-Pieters', 'Mechelen Station', 'Leuven Station', 'Hasselt Station', 'Genk Station', 
    'Brugge Station', 'Oostende Station', 'Kortrijk Station', 'Aalst Station', 'Sint-Niklaas Station', 
    'Turnhout Station', 'Knokke Station', 'Lier Station', 'Tongeren Station', 'Ieper Station'
  ]
};
