import test from 'ava';
import { compareAnswer } from '../src/utils/compare.mjs';

// Manual Unit testing of the default compareAnswer function in compare.mjs
test('Comparing identical regular strings', (t) => {
  const strings = [
    'Aiguines',
    'Gorge du Verdon',
    'Sainte-Croix-du-Verdon',
    'The D957',
    "Chateau d'Aiguines",
    'VAR & ALPES-DE-HAUTE-PROVENCE',
    'y = 2x + 10^2 - (x % 2)',
  ];

  for (const str of strings) {
    t.true(
      compareAnswer(str, str),
      `Comparing ${str} to itself returned false`
    );
  }
});

test('Comparing identical trimmable strings', (t) => {
  const strings = [
    ' Riez',
    'Roumoules ',
    ' Montagnac-Montpezat ',
    'Chapelle   Saint-Maxime',
    "    Camping   de l'Aigle  - Campasun     ",
    '    1 vie   2 chiens',
    'Chapelle Saint-Pierre  ',
    ' 1 = 2  - 2+1 *    0 + 1  ',
  ];

  for (const str of strings) {
    t.true(
      compareAnswer(str, str),
      `Comparing ${str} to itself returned false`
    );
  }
});

test('Comparing equivalent trimmed strings with non trimmed strings', (t) => {
  const strings = [
    [' Riez', 'Riez'],
    ['Roumoules ', 'Roumoules'],
    [' Montagnac-Montpezat ', 'Montagnac-Montpezat'],
    ['Chapelle   Saint-Maxime', 'Chapelle Saint-Maxime'],
    [
      "    Camping   de l'Aigle  - Campasun     ",
      "Camping de l'Aigle - Campasun",
    ],
    ['    1 vie   2 chiens', '1 vie 2 chiens'],
    ['Chapelle Saint-Pierre  ', 'Chapelle Saint-Pierre'],
    [' 1 = 2  - 2+1 *    0 + 1  ', '1 = 2 - 2+1 * 0 + 1'],
  ];

  for (const [trimmable, trimmed] of strings) {
    t.true(
      compareAnswer(trimmable, trimmed),
      `Comparing ${trimmable} to ${trimmed} returned false`
    );
  }
});

test('Comparing trimmed strings with non trimmed strings using special whitespace', (t) => {
  const strings = [
    ['\tLac de Sainte-Croix\n', 'Lac de Sainte-Croix'],
    ['\nBauden\n', 'Bauden'],
    ['   Regusse\n', 'Regusse'],
    ['\t\tQuinson  ', 'Quinson'],
    ['Puimoisson\t&\t  Riez', 'Puimoisson\t& Riez'],
    ['Tennison\t\t\n \ndanihe', 'Tennison danihe'],
    ['Mo \n Na \t Co', 'Mo Na Co'],
  ];

  for (const [trimmable, trimmed] of strings) {
    t.true(
      compareAnswer(trimmable, trimmed),
      `Comparing ${trimmable} to ${trimmed} returned false`
    );
  }
});

test('Comparing wrongly trimmed strings with non trimmed strings', (t) => {
  const strings = [
    ['Daniel\tBrathagen', 'Daniel Brathagen'],
    ['S\tT\nA O J', 'S T A O J'],
    ['S\nT A O\tJ', 'STAOJ'],
    ['S    T A OJ  ', 'STAOJ'],
    ['   STAO J', 'STAOJ'],
    ['S\n\nTAOJ', 'STAOJ'],
    ['S\t\tTAOJ', 'STAOJ'],
    ['S  TAOJ', 'STAOJ'],
    ['1 2 3 4', '1234'],
    ['STAOJ', 'staoj'],
    ['STAOJ', 'StAOJ'],
    [' J', 'j'],
  ];

  for (const [nonTrimmable, trimmed] of strings) {
    t.false(
      compareAnswer(nonTrimmable, trimmed),
      `Comparing ${nonTrimmable} to ${trimmed} returned true`
    );
  }
});

test('Comparing completely different strings', (t) => {
  const strings = [
    ['AJR', 'Quinn XCII'],
    ['Jon', 'Bellion'],
    ['12', '21'],
    ['23', '23 23'],
    ['2 3', '2323'],
    ['2   3', '32'],
    ['42', ''],
    ['', '1000'],
    ['Jonathon', 'Johnny'],
  ];

  for (const [str1, str2] of strings) {
    t.false(
      compareAnswer(str1, str2),
      `Comparing ${str1} to ${str2} returned true`
    );
  }
});
