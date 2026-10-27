'use strict';
/* Doodle Duel word packs. The host picks which packs are in play in the room. */
const WORD_PACKS = {
  easy: {
    name: 'Easy peasy',
    words: [
      'banana', 'giraffe', 'pizza', 'rocket', 'snowman', 'octopus', 'umbrella', 'volcano', 'ice cream', 'dinosaur',
      'toothbrush', 'cactus', 'penguin', 'rainbow', 'lighthouse', 'spider', 'hamburger', 'guitar', 'butterfly', 'castle',
      'mermaid', 'robot', 'tornado', 'snail', 'birthday cake', 'ghost', 'pirate', 'crab', 'helicopter', 'sandwich',
      'unicorn', 'skateboard', 'toilet', 'kangaroo', 'campfire', 'moon', 'shark', 'teapot', 'treasure map', 'popcorn',
    ],
  },
  silly: {
    name: 'Silly stuff',
    words: [
      'a cat in a tuxedo', 'angry pineapple', 'grandma on a skateboard', 'sleepy cloud', 'dancing toilet',
      'spaghetti monster', 'a shark eating ice cream', 'a cow on the moon', 'nervous banana', 'a dog driving a car',
      'haunted sandwich', 'a pigeon with a briefcase', 'a sad potato', 'a horse in pyjamas', 'an evil rubber duck',
      'a snowman at the beach', 'a fish riding a bicycle', 'a very tired sloth', 'a burrito in love', 'a dragon sneezing',
      'a chicken doing yoga', 'a turtle with a jetpack', 'an alien ordering pizza', 'a giraffe in a scarf', 'a bald lion',
      'a cupcake with teeth', 'a frog wearing a crown', 'a llama at the gym', 'a toaster with feelings', 'a cactus hugging someone',
    ],
  },
  desi: {
    name: 'Desi',
    words: [
      'auto rickshaw', 'masala dosa', 'chai', 'coconut tree', 'elephant', 'cricket', 'samosa', 'monsoon', 'rangoli',
      'houseboat', 'kathakali', 'biryani', 'pressure cooker', 'bollywood dance', 'mango', 'tiffin box', 'scooter with a family on it',
      'uncle on a plastic chair', 'mehendi', 'banana leaf meal', 'temple elephant', 'boat race', 'jalebi', 'mosquito',
      'wedding baraat', 'power cut', 'aunty with a broom', 'train with people on the roof', 'cow in traffic', 'puttu',
    ],
  },
};
