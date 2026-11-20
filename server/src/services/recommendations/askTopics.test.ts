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

  // Final review, Important 1: everyday health words, not only diagnoses.
  it('everyday health questions are medical', () => {
    for (const question of [
      'My son is sick, can he play outside?',
      'My daughter has a sore throat, can she go to school?',
      'My mother has trouble breathing, can she go for a walk?',
      'I have difficulty breathing on smoggy days',
      'Does smog cause breathing problems?',
      "I can't breathe well, should I stay in?",
      'I have a headache, should I go for a run?',
      'I feel unwell, can I go jogging?',
      'My grandmother has diabetes, can she walk in the park?',
      'Can my dad go out? He is a heart patient',
      'My father has a heart problem, can he walk?',
      'My eyes are burning, should I go outside?',
      'I get burning eyes on the way to work',
      'Itchy eyes after cycling to work',
      'Can I exercise with a migraine?',
      'I feel nauseous after my commute',
      'I feel dizzy outdoors',
      'My aunt has cancer, can she open the windows?',
    ]) {
      expect(classify(question), question).toBe('medical');
    }
    // "I'll" loses its apostrophe, and must not read as "ill".
    expect(classify("I'll walk to the park later")).toBe('outdoors');
    expect(classify('Keep an eye on the forecast for my walk')).toBe(
      'outdoors',
    );
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
