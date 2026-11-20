// classify() is the only code that reads an Ask question (spec §9.4): it
// picks a topic from fixed words, medical first, and is otherwise pure.
import { describe, expect, it } from 'vitest';
import { classify } from './askTopics.ts';

describe('classify', () => {
  it('the five starters map to their own topics', () => {
    expect(
      [
        'Can I go for a morning walk today?',
        'Is it a good idea to open my windows?',
        'How can I improve my indoor air?',
        "What should I consider for my children's outdoor activities?",
        'How can I reduce pollution while commuting?',
      ].map(classify),
    ).toEqual(['outdoors', 'windows', 'indoor', 'family', 'commuting']);
  });

  it('topic precedence: family, windows, commuting, indoor, habits, outdoors', () => {
    expect(classify('walk to school with my kids')).toBe('family');
    expect(classify('keep windows shut because of traffic')).toBe('windows');
    expect(classify('cycle to the office')).toBe('commuting');
    expect(classify('smoke from cooking')).toBe('indoor');
    expect(classify('burning leaves')).toBe('habits');
  });

  it('every medical word and phrase is medical, before any topic', () => {
    for (const word of [
      'asthma',
      'an inhaler',
      'a nebuliser',
      'bronchitis',
      'pneumonia',
      'allergies',
      'a cough',
      'wheezing',
      'feeling breathless',
      'a fever',
      'an illness',
      'heart disease',
      'symptoms',
      'a diagnosis',
      'medicine',
      'medication',
      'a prescription',
      'treatment',
      'a doctor',
      'hospital',
      'being pregnant',
      'steroids',
      'antibiotics',
      'dawa',
      'dawai',
      'khansi',
      'bimar',
      'bukhar',
      'copd',
      'a pill',
      'tablets',
      'the dose',
      'a cure',
      'my lungs',
      'saans',
      'being short of breath',
      'chest pain',
      'a heart condition',
      'high blood pressure',
    ]) {
      expect(classify(`Can I walk outside with ${word}?`), word).toBe(
        'medical',
      );
    }
    expect(classify('my son has asthma, can he play outside?')).toBe('medical');
  });

  it('near misses are not medical', () => {
    expect(classify('Is it safe to walk today?')).toBe('outdoors');
    expect(classify('healthy habits')).toBe('habits');
    expect(classify('How is the air today?')).toBe('outdoors');
    expect(classify('What is the AQI?')).toBe('outdoors');
    expect(classify('heart of the city park')).toBe('outdoors');
    expect(classify('Should I wear a mask when I walk?')).toBe('outdoors');
    expect(classify('Can I take my pillow outside?')).toBe('outdoors');
    expect(classify('Is my door secure while airing the room?')).toBe(
      'windows',
    );
  });

  it('short words match whole words only', () => {
    expect(classify('How do I cut my carbon footprint?')).toBe('habits');
    expect(classify('Is it fine to go by car?')).toBe('commuting');
    expect(classify('Should I run the AC?')).toBe('habits');
  });

  it('anything else is out of scope', () => {
    expect(classify('What is the capital of India?')).toBe('out_of_scope');
    expect(classify('Tell me a joke')).toBe('out_of_scope');
  });

  it('handles case, apostrophes, punctuation, wide letters and 200 characters', () => {
    expect(classify('CAN I GO FOR A WALK???')).toBe('outdoors');
    expect(classify('children’s play area')).toBe('family');
    expect(classify('ｗａｌｋ today')).toBe('outdoors');
    expect(classify(`${'a '.repeat(98)}walk`)).toBe('outdoors');
  });
});
