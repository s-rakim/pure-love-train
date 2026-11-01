/**
 * The big bank behind This or that. Each topic is a list of options, and every two
 * options in a topic make one pair ("Pizza or Tacos"), which is how a few thousand
 * options turn into more than 36,500 pairs: 50 a day for over two years.
 *
 * Picks are saved under a pair's id, and the day a pair arrives comes from its
 * place in the order, so: never edit, reorder or remove an option or a topic here.
 * To add more, put a new list in a new volume at the end of VOLUMES.
 */
export type Topic = { key: string; options: string };

const VOLUME_1: Topic[] = [
  {
    key: 'food',
    options:
      '🍕 Pizza;🍣 Sushi;🌮 Tacos;🍔 Burgers;🍝 Pasta;🍜 Ramen;🍛 Curry;🥘 Paella;🍗 Fried chicken;🥩 Steak;🍲 A big stew;🥗 A fresh salad;🌯 Burritos;🥟 Dumplings;🍤 Shrimp;🦞 Lobster;🍖 Ribs;🌭 Hot dogs;🥙 Kebab;🧆 Falafel;🍱 A bento box;🥪 A club sandwich;🫕 Fondue;🍚 Fried rice;🥞 Pancakes for dinner;🍳 Breakfast for dinner;🐟 Fish and chips;🍢 Skewers;🫔 Tamales;🥧 Pot pie;🧀 Mac and cheese;🍠 Loaded sweet potato;🥓 A full BBQ;🍜 Pho;🥡 Chow mein;🍙 Rice balls;🫓 Flatbread;🍛 Biryani;🥘 Lasagna;🦀 Crab legs;🍛 Butter chicken;🌶️ Jerk chicken;🍝 Spaghetti and meatballs;🥩 Sunday roast;🍲 Chili;🍖 Lamb chops;🍣 Poke bowl;🥘 Jollof rice;🐙 Grilled octopus;🦪 Oysters;🍗 Chicken tikka;🥟 Pierogi;🍜 Pad thai;🍤 Tempura;🥙 Shawarma;🌮 Quesadillas;🍕 Calzone;🍔 Sliders;🫕 Korean BBQ;🍛 Katsu curry',
  },
  {
    key: 'dessert',
    options:
      '🍰 Cheesecake;🍫 Chocolate cake;🍦 Ice cream;🍩 Donuts;🧁 Cupcakes;🍪 Warm cookies;🥧 Apple pie;🍮 Flan;🍨 Gelato;🥐 Croissants;🧇 Waffles;🍓 Strawberries and cream;🍌 Banana split;🍬 Candy;🍭 Lollipops;🍡 Mochi;🥮 Mooncake;🎂 Birthday cake;🍯 Baklava;🍫 Brownies;🥥 Coconut macaroons;🍋 Lemon tart;🍑 Peach cobbler;🫐 Blueberry muffins;🍒 Cherry pie;🍮 Crème brûlée;🍫 Chocolate fondue;🥛 A milkshake;🍧 Shaved ice;🥠 Churros;🍪 Macarons;🍰 Tiramisu;🍨 A sundae;🍏 Caramel apples;🍪 Snickerdoodles;🍰 Red velvet cake;🍯 Sticky toffee pudding;🍫 Lava cake;🍮 Rice pudding;🥧 Pumpkin pie;🍓 Pavlova;🍋 Key lime pie;🍨 Affogato;🍩 Beignets;🧁 Carrot cake;🍰 Black forest cake;🥮 Scones with jam;🍪 Shortbread;🍦 Frozen yogurt;🍫 Chocolate mousse',
  },
  {
    key: 'drink',
    options:
      '☕ Coffee;🍵 Green tea;🧋 Bubble tea;🥤 Soda;🍹 A fruity cocktail;🍷 Red wine;🥂 Champagne;🍺 Beer;🥛 Milk;🍫 Hot chocolate;🧃 Juice box;🍋 Lemonade;🥥 Coconut water;💧 Ice water;🍸 A martini;🥃 Whiskey;🍶 Sake;🧉 Mate;🍓 A smoothie;🧊 Iced peach tea;🫖 Chai latte;🥭 Mango lassi;🍊 Fresh orange juice;🍵 Matcha latte;🍦 A float;🍒 Cherry cola;🌿 Mint mojito;🍍 Piña colada;🧊 Iced coffee;🥛 Chocolate milk;🍫 Mocha;🍯 Honey lemon tea;🥤 Root beer;🍉 Watermelon juice;🍷 Rosé;🍺 Cider;🥃 Rum and coke;🍸 Espresso martini;🍹 Margarita;🍵 Earl grey',
  },
  {
    key: 'breakfast',
    options:
      '🥞 Pancakes;🧇 Waffles;🍳 Eggs and bacon;🥐 Croissant;🥯 Bagel;🥣 Cereal;🍓 Fruit bowl;🥑 Avocado toast;🍞 French toast;🌯 Breakfast burrito;🥓 Full fry-up;🍩 A donut;🧁 A muffin;🥛 Yogurt and granola;🥣 Oatmeal;🍌 Banana bread;🫓 Crêpes;🥚 Eggs Benedict;🌭 Sausages;🥔 Hash browns;🍳 An omelette;🥪 Breakfast sandwich;🍯 Toast and honey;🥤 Smoothie bowl',
  },
  {
    key: 'snack',
    options:
      '🍿 Popcorn;🥨 Pretzels;🍟 Fries;🥔 Chips;🧀 Cheese and crackers;🍫 Chocolate bar;🍪 Cookies;🍇 Grapes;🥜 Peanuts;🍎 Apple slices;🥕 Veggies and dip;🌶️ Spicy chips;🍬 Gummy bears;🍡 Rice cakes;🥟 Spring rolls;🧄 Garlic bread;🌮 Nachos;🍗 Chicken wings;🍕 A slice of pizza;🥒 Pickles;🍦 A cone;🥐 Pastry;🍌 A banana;🫘 Edamame;🍙 Onigiri;🥖 Bread and olive oil;🍩 Mini donuts;🍓 Chocolate strawberries;🥯 Mini bagels;🍫 Trail mix;🍿 Caramel popcorn;🧀 Cheese puffs;🍤 Prawn crackers;🍠 Sweet potato fries;🥔 Potato wedges;🫒 Olives;🥜 Cashews;🍮 Pudding cup;🍬 Sour strips;🍞 Toast',
  },
  {
    key: 'cuisine',
    options:
      '🇮🇹 Italian;🇯🇵 Japanese;🇲🇽 Mexican;🇨🇳 Chinese;🇮🇳 Indian;🇹🇭 Thai;🇫🇷 French;🇬🇷 Greek;🇰🇷 Korean;🇻🇳 Vietnamese;🇪🇸 Spanish;🇱🇧 Lebanese;🇹🇷 Turkish;🇧🇷 Brazilian;🇯🇲 Jamaican;🇪🇹 Ethiopian;🇳🇬 Nigerian;🇲🇦 Moroccan;🇵🇪 Peruvian;🇺🇸 American diner;🇩🇪 German;🇵🇭 Filipino;🇮🇩 Indonesian;🇬🇧 British pub food;🇨🇺 Cuban;🇵🇰 Pakistani;🇬🇭 Ghanaian;🇦🇷 Argentinian;🇲🇾 Malaysian;🇵🇹 Portuguese;🇸🇳 Senegalese;🇰🇪 Kenyan;🇨🇴 Colombian;🇮🇷 Persian;🇱🇰 Sri Lankan;🇸🇬 Singaporean;🇭🇺 Hungarian;🇵🇱 Polish;🇮🇪 Irish;🇹🇹 Trinidadian',
  },
  {
    key: 'fruit',
    options:
      '🍓 Strawberries;🍉 Watermelon;🍍 Pineapple;🥭 Mango;🍌 Bananas;🍇 Grapes;🍒 Cherries;🍑 Peaches;🍎 Apples;🍐 Pears;🍊 Oranges;🍋 Lemons;🫐 Blueberries;🥝 Kiwi;🥥 Coconut;🍈 Melon;🍏 Green apples;🫒 Olives;🍅 Tomatoes;🥑 Avocado;🍑 Apricots;🍇 Raisins',
  },
  {
    key: 'city',
    options:
      '🗼 Paris;🗾 Tokyo;🗽 New York;🎡 London;🏛️ Rome;🌉 San Francisco;🏝️ Bali;🕌 Istanbul;🌴 Miami;🎭 Barcelona;🚲 Amsterdam;🏔️ Zurich;🌸 Kyoto;🍜 Seoul;🌃 Hong Kong;🏙️ Dubai;🌊 Lisbon;🎶 New Orleans;🍷 Florence;🧀 Brussels;🦘 Sydney;🎨 Mexico City;🎉 Rio de Janeiro;🌆 Singapore;❄️ Reykjavik;🏰 Prague;🍝 Naples;🌞 Cape Town;🎎 Bangkok;🌿 Vancouver;🏟️ Madrid;☕ Vienna;🌅 Santorini;🐘 Marrakech;🏯 Osaka;🌺 Honolulu;🎻 Budapest;🥐 Montreal;🌁 Edinburgh;🗿 Lima;🌉 Sydney Harbour;🏞️ Queenstown;🌆 Chicago;🎬 Los Angeles;🌵 Austin;🍁 Quebec City;🎨 Copenhagen;🧇 Ghent;🍺 Munich;🏛️ Athens;🌊 Dubrovnik;🕌 Cairo;🎎 Hanoi;🌴 Cartagena;🍷 Buenos Aires;🏯 Taipei;🌸 Nara;🏙️ Shanghai;🌋 Naples coast;🌺 Havana',
  },
  {
    key: 'trip',
    options:
      '🏖️ Beach resort;🏕️ Camping;🚢 A cruise;🚐 Van life for a week;🏨 Fancy hotel;🛖 Treehouse stay;🏰 Castle stay;🚂 Train across a country;✈️ Two cities in one week;🗺️ Backpacking;🏝️ Private island;⛷️ Ski trip;🧖 Wellness retreat;🍷 Wine country;🎢 Theme parks;🛶 Lake cabin;🌋 Volcano hike;🐠 Snorkelling trip;🦁 Safari;🏜️ Desert glamping;🌌 Northern lights trip;🎪 A festival;🏙️ City weekend;🌾 Countryside farm stay;🛳️ River boat trip;🗻 Mountain lodge;🏄 Surf camp;🍜 A food tour;🎭 A theatre weekend;🚗 Road trip with no plan;🛶 Canoe camping;🏯 A temple stay;🍣 A Japan rail trip;🏝️ Island hopping;🐋 Whale watching trip;🧗 A climbing trip;🎿 Cross-country skiing;🚴 A cycling holiday;🎨 An art retreat;🍝 A cooking holiday in Italy',
  },
  {
    key: 'date',
    options:
      '🍿 Movie theatre;🎳 Bowling;⛸️ Ice skating;🎨 Painting class;🍝 Cooking class;🧗 Rock climbing;🎡 Fair rides;🏛️ Museum;🌳 Picnic in the park;🎤 Karaoke bar;🎸 Live music;🍣 Fancy dinner;🍔 Diner and milkshakes;🎮 Arcade;🔭 Stargazing;🌅 Sunset walk;🐠 Aquarium;🦒 Zoo;🍷 Wine tasting;🎭 Comedy show;🚴 Bike ride;🛶 Kayaking;🏺 Pottery class;🧩 Escape room;🌮 Food truck crawl;📚 Bookshop wander;🌸 Botanical garden;🎯 Mini golf;💃 Dance class;🧺 Farmers market;🧖 Spa evening;🐴 Horse riding;🎪 Circus;🏊 Night swim;🎆 Fireworks;🌲 Forest hike;🍦 Ice cream crawl;🛼 Roller skating;🎻 Orchestra night;📸 Photo walk;🌃 Rooftop bar;🎨 Gallery opening;🎟️ A surprise mystery date;🚣 Rowing boat;🍕 Pizza on a bench;🧘 Couples yoga;🎤 Open mic night;🎷 Jazz club;🏟️ A sports game;🍜 Night market;🌌 Planetarium;🎬 Outdoor cinema;🏖️ Beach bonfire;🛍️ Thrift shopping;🍫 Chocolate tasting;🎢 Theme park;🐎 Carriage ride;🍣 Sushi train;🧁 Cupcake decorating;🏹 Archery',
  },
  {
    key: 'home-date',
    options:
      '🍿 Movie marathon;🎲 Board games;🍳 Cook a new recipe;🛁 Bubble bath;🕯️ Candlelit dinner;🧩 A big puzzle;🎨 Paint each other;🏕️ Living room camping;💃 Dance in the kitchen;📖 Read to each other;🍕 Homemade pizza;🎮 Video games;🧁 Bake together;🍷 Wine and cheese night;🌙 Balcony stargazing;🎤 Karaoke at home;💆 Massage night;📸 Old photos night;🃏 Card games;🧘 Yoga together;🌱 Plant some herbs;🍣 Sushi making;☕ Coffee tasting;📝 Plan a dream trip;🎧 Make a playlist together;🏠 Rearrange a room;🍫 Chocolate fondue night;🎬 Make a silly video;✍️ Write love letters;🛋️ Pillow fort;🍜 Ramen bar at home;🎬 Rewatch our first movie;🏆 Home olympics;🍹 Cocktail making;🍝 Pasta from scratch;🕺 Learn a dance on video;🧖 Face masks and gossip;📺 A new series pilot night;🖼️ Frame our photos;🍩 Donut taste test;🧠 Quiz each other;🌮 Taco night;🧶 Craft night;🎨 Paint by numbers;🥧 Bake a pie',
  },
  {
    key: 'movie',
    options:
      '😂 Comedy;💕 Romance;😱 Horror;🚀 Sci-fi;🦸 Superhero;🕵️ Mystery;🐉 Fantasy;🎶 Musical;🎞️ Old classic;🧸 Animated;🔫 Action;😢 A tearjerker;📽️ Documentary;👻 Ghost story;🤠 Western;⚔️ Historical epic;🧠 Mind-bender;🏈 Sports drama;🎄 Holiday movie;🔪 Thriller;🌍 Foreign film;🧟 Zombies;👽 Aliens;🦖 Dinosaurs;🏴‍☠️ Pirates;🐾 Talking animals;🎓 Teen comedy;💍 Rom-com wedding;🚓 Heist;🕰️ Time travel;🧙 Wizards;🏝️ Survival;🐶 Dog movies;🚢 Disaster movies;🎤 Music biopics;🛸 Space adventures;🕵️ Spy movies;🌹 Period romance;🦇 Dark heroes;🤖 Robots',
  },
  {
    key: 'music',
    options:
      '🎤 Pop;🎸 Rock;🎧 Hip hop;🎷 Jazz;🎻 Classical;🤠 Country;💿 R&B;🎹 Soul;🪩 Disco;⚡ EDM;🥁 Afrobeats;🌴 Reggae;💃 Salsa;🎺 Funk;🎵 Indie;🔥 Rap;🎶 K-pop;🪕 Folk;🤘 Metal;🌙 Lo-fi;🎼 Movie soundtracks;📻 80s hits;📀 90s hits;💽 2000s throwbacks;🕺 Motown;🎙️ Acoustic covers;🌊 Chill house;🎹 Piano ballads;⛪ Gospel;🎸 Blues;💗 Love songs;🏝️ Bossa nova;🎙️ K-ballads;🎛️ Amapiano;🎶 Musicals;🎤 Karaoke classics;🌙 Late night jazz;🎸 Pop punk;💿 Neo soul;🎻 Film scores;🌴 Calypso;🎹 Synthwave',
  },
  {
    key: 'weather',
    options:
      '🌧️ Rainy day;☀️ Sunny day;❄️ Snow day;⛈️ Thunderstorm;🌫️ Foggy morning;🌈 Rainbow after rain;🍂 Crisp autumn day;🌸 Spring breeze;🔥 Heatwave;🌬️ Windy beach day;🌙 Warm summer night;☁️ Cloudy and cosy;🌅 Golden hour;🌨️ First snowfall;🌦️ Sun showers;🌡️ Cold and clear',
  },
  {
    key: 'pet',
    options:
      '🐶 A puppy;🐱 A kitten;🐰 A bunny;🐹 A hamster;🐠 Fish;🦜 A parrot;🐢 A turtle;🦎 A lizard;🐴 A horse;🐐 A goat;🐷 A mini pig;🦔 A hedgehog;🐍 A snake;🐔 Chickens;🐕 A big dog;🐩 A small fluffy dog;🐈‍⬛ A black cat;🦦 An otter;🐇 Two bunnies;🐾 No pets, just us;🐦 A canary;🐭 Pet rats;🦙 An alpaca;🐈 Two cats;🐕‍🦺 A rescue dog;🦆 Ducks;🐿️ A pet squirrel;🐸 A frog;🕷️ A tarantula;🐑 A sheep',
  },
  {
    key: 'animal',
    options:
      '🐼 Pandas;🐨 Koalas;🦁 Lions;🐘 Elephants;🦒 Giraffes;🐬 Dolphins;🐋 Whales;🐧 Penguins;🦦 Otters;🦊 Foxes;🐺 Wolves;🦉 Owls;🦋 Butterflies;🐢 Sea turtles;🦩 Flamingos;🐻 Bears;🐯 Tigers;🦓 Zebras;🐙 Octopuses;🦥 Sloths;🐒 Monkeys;🦘 Kangaroos;🦄 Unicorns;🐉 Dragons;🦈 Sharks;🐆 Cheetahs;🦚 Peacocks;🐳 Orcas;🦭 Seals;🐝 Bees;🐨 Red pandas;🦔 Hedgehogs;🐸 Frogs;🦜 Parrots;🦢 Swans;🐌 Snails;🦦 Sea otters;🐿️ Squirrels;🦙 Llamas;🐻‍❄️ Polar bears',
  },
  {
    key: 'hobby',
    options:
      '📸 Photography;🎨 Painting;🧶 Knitting;🎸 Guitar;🎹 Piano;🌱 Gardening;🍞 Baking bread;🧘 Yoga;🏃 Running;🚴 Cycling;🧗 Climbing;📚 A book club;✍️ Writing stories;🏺 Pottery;♟️ Chess;🎮 Gaming;🧩 Puzzles;🎣 Fishing;🏊 Swimming;💃 Dancing;🎤 Singing;🪴 House plants;🧁 Cake decorating;🔭 Astronomy;🪡 Sewing;🪵 Woodworking;🏄 Surfing;🛹 Skateboarding;🥋 Martial arts;🎯 Darts;🍷 Learning about wine;🗣️ Learning a language;🎬 Filmmaking;🧪 Home science;🦜 Bird watching;🧵 Embroidery;🎳 Bowling league;⛳ Golf;🧗 Bouldering;🎲 Board game nights;🍺 Home brewing;🍰 Pastry making;📷 Film photography;🌌 Night sky photos;🛶 Kayaking;🏹 Archery;🎭 Improv;🪁 Kite flying;🧩 Model building;🎻 Violin;🎤 Karaoke nights;🚶 Long walks;🐎 Horse riding;🛼 Roller skating;🧺 Foraging',
  },
  {
    key: 'sport',
    options:
      '⚽ Football;🏀 Basketball;🎾 Tennis;🏐 Volleyball;🏈 American football;⚾ Baseball;🏏 Cricket;🏉 Rugby;🏒 Hockey;🏓 Ping pong;🏸 Badminton;⛳ Golf;🥊 Boxing;🏊 Swimming;🏃 Track;🚴 Cycling race;⛷️ Skiing;🏂 Snowboarding;🤸 Gymnastics;🏄 Surfing;🛹 Skateboarding;🏎️ Racing;🎳 Bowling;⛸️ Figure skating;🧗 Climbing;🤽 Water polo;🥏 Frisbee;🏋️ Weightlifting',
  },
  {
    key: 'love-language',
    options:
      '🗣️ Sweet words;🤗 Hugs;🎁 Little gifts;⏳ Quality time;🧹 Help with chores;💌 Love notes;💋 Kisses;🍳 Breakfast in bed;💆 A massage;📞 A surprise call;🌹 Flowers for no reason;🎶 A song for me;📸 A photo of us framed;🛁 Running me a bath;🙌 Public praise;🤝 Holding hands;📝 A list of why you love me;🍫 My favourite snack;🚗 Picking me up;👂 Listening without fixing;🧸 A cuddle on the couch;🕯️ A planned date night;☕ Coffee made just right;🌙 Talking till late;💐 A single flower;🎟️ A surprise outing;🧺 A picnic made for me;🎧 Sharing one pair of earbuds;📸 You taking my photo;🧹 You cleaning without asking;💬 A long voice note;🫂 A hug from behind;🍷 Pouring my drink;🛏️ Warming my side of the bed;📅 Remembering little dates;😂 Making me laugh;🖐️ Playing with my hair;🍽️ Saving me the last bite;🙋 Asking about my day',
  },
  {
    key: 'gift',
    options:
      '💍 Jewellery;🌹 Roses;🍫 Chocolates;📚 A book;🎟️ Concert tickets;✈️ A trip;🧸 A teddy bear;⌚ A watch;👜 A bag;👟 Sneakers;🎮 A video game;🖼️ A framed photo;💌 A handwritten letter;🎨 Something handmade;🕯️ Candles;🧴 Perfume;🎧 Headphones;📷 A camera;🍷 A nice bottle;🪴 A plant;🛍️ A shopping day;🧖 A spa voucher;📓 A journal;🎂 A surprise cake;🧥 A cosy hoodie;💐 A bouquet;🎁 A mystery box;🗺️ A star map of our night;🎵 A playlist;🍽️ A dinner I cooked;🧦 Fun socks;🍰 A custom cake;🖊️ A nice pen;🪞 A vintage mirror;🎹 A music lesson;🌌 A night at a planetarium;🧺 A picnic set;🎮 A gaming chair;🪴 A bonsai tree;🧸 A plush of our pet;🍫 A chocolate subscription;🎨 A portrait of us;☕ A fancy mug;🛁 A bath set;🎒 A travel bag',
  },
  {
    key: 'scent',
    options:
      '🌹 Roses;🍦 Vanilla;🍫 Chocolate;☕ Fresh coffee;🍋 Lemon;🌲 Pine;🌊 Ocean air;🥥 Coconut;🍞 Fresh bread;🌧️ Rain;🍪 Cookies baking;🌸 Cherry blossom;🪵 Campfire;🧺 Clean laundry;🌿 Mint;🍊 Orange;💜 Lavender;🍑 Peach;🎄 Christmas tree;🍎 Apple pie;🌼 Jasmine;🍯 Honey;🥭 Mango;🕯️ Sandalwood',
  },
  {
    key: 'colour',
    options:
      '❤️ Red;💙 Blue;💚 Green;💛 Yellow;💜 Purple;🧡 Orange;🩷 Pink;🖤 Black;🤍 White;🤎 Brown;🩶 Grey;🩵 Light blue;🌊 Teal;🍑 Peach;🌿 Sage;🍷 Burgundy;✨ Gold;🥈 Silver;🌌 Navy;🌸 Lilac',
  },
  {
    key: 'power',
    options:
      '🦸 Flying;🫥 Invisibility;⏸️ Pausing time;🧠 Reading minds;🌀 Teleporting;💪 Super strength;🔮 Seeing the future;🗣️ Speaking every language;🐾 Talking to animals;⚡ Super speed;🩹 Healing;🔥 Controlling fire;🌊 Breathing underwater;⏪ Rewinding five minutes;🧬 Shape-shifting;🌱 Making plants grow;😴 Never needing sleep;🍀 Endless luck;🍕 Summoning any food;📚 Learning anything instantly',
  },
  {
    key: 'home',
    options:
      '🏡 Cottage in the countryside;🏙️ Penthouse in the city;🏖️ Beach house;🏔️ Mountain cabin;🏰 Old castle;🛖 Tiny house;🚤 Houseboat;🌴 Island villa;🏘️ Suburban house with a yard;🏢 Loft apartment;🌾 Farmhouse;🏯 Japanese style home;🏜️ Desert ranch;🌲 Treehouse home;🏛️ Victorian house;🪟 Glass house in the woods;🛳️ Living on a sailboat;🏝️ Lake house',
  },
  {
    key: 'home-feature',
    options:
      '🛁 A huge bathtub;🔥 A fireplace;📚 A library;🎬 A home cinema;🏊 A pool;🌿 A big garden;🍳 A chef kitchen;🛋️ A reading nook;🌙 A rooftop terrace;🎮 A game room;🧖 A sauna;🐶 A dog run;🪴 A greenhouse;🍷 A wine cellar;🏋️ A home gym;🎨 An art studio;🎵 A music room;🛏️ A giant bed;🪟 Floor to ceiling windows;🌳 A tree swing;♨️ A hot tub;🧺 A walk-in closet;🎱 A pool table;🔭 A stargazing deck',
  },
  {
    key: 'cosy',
    options:
      '🧦 Fuzzy socks;🛋️ A big blanket;☕ A warm mug;🕯️ Candles lit;📖 A good book;🔥 A crackling fire;🌧️ Rain on the window;🐱 A purring cat;🧸 A favourite hoodie;🍲 Soup on the stove;🎵 Soft music;🛏️ Fresh sheets;🌙 Fairy lights;🍪 Cookies in the oven;🧣 A scarf;🛁 A long bath;🎞️ An old movie;🫖 A pot of tea;🍫 Hot chocolate with marshmallows;🎶 A record playing;🧶 Knitting together;🐶 A dog on our feet;🌲 A cabin in the snow;💡 A lamp instead of the big light;🍞 Toast and butter;🌙 A late night chat',
  },
  {
    key: 'weekend',
    options:
      '😴 Sleep in;🥾 Early hike;🛍️ Shopping;🧹 Deep clean together;🍳 Big brunch;🎬 Cinema trip;👫 See friends;👪 Visit family;🏖️ Beach day;🚗 Day trip;🛋️ Stay in pyjamas;🧺 Market morning;🏋️ Gym together;🍷 Wine bar;🎉 House party;📚 Library afternoon;🌳 Park picnic;🎮 Gaming all day;🧁 Bake something;🌱 Garden work;🧖 Pamper day;🎨 Craft project;🐶 Dog park;🚴 Bike ride;🍝 Dinner party;🎤 Open mic night;🏕️ Overnight camping;🍜 Try a new restaurant;📸 Photo walk;🚂 Train to a new town;🧗 Climbing gym;🎨 Gallery hopping;🧁 Café hopping;🎲 Board game café;🍺 Brewery tour;🛶 Paddleboarding',
  },
  {
    key: 'game',
    options:
      '🃏 Uno;♟️ Chess;🎲 Monopoly style board game;🧩 Jigsaw;🀄 Mahjong;🎯 Darts;🎳 Bowling;🏓 Ping pong;🕹️ Retro arcade game;🎮 Racing game;🗡️ Co-op adventure game;❓ Trivia night;🎨 Drawing guessing game;🗣️ Charades;🂡 Poker;🧠 Crosswords;🔤 Word games;🎱 Pool;🪁 Twister;🔫 Laser tag;🏰 Strategy game;🕵️ Murder mystery;🎤 Sing-off;🪀 Jenga',
  },
  {
    key: 'holiday',
    options:
      '🎄 Christmas;🎃 Halloween;💘 Valentine’s Day;🎆 New Year’s Eve;🦃 Thanksgiving;🐣 Easter;🎂 Birthdays;🪔 Diwali;🧧 Lunar New Year;🌙 Eid;🎉 Our anniversary;☘️ St Patrick’s Day;🕎 Hanukkah;🎭 Carnival;🎇 Fourth of July;🌸 First day of spring;☀️ Midsummer;🍂 First day of autumn',
  },
  {
    key: 'transport',
    options:
      '🚗 Car;🚂 Train;✈️ Plane;🚢 Ship;🚲 Bike;🛵 Scooter;🏍️ Motorbike;🚐 Camper van;🚁 Helicopter;🎈 Hot air balloon;🛶 Canoe;⛵ Sailboat;🚌 Bus;🚠 Cable car;🐎 Horse;🚶 On foot;🛺 Tuk-tuk;🚤 Speedboat',
  },
  {
    key: 'romantic-spot',
    options:
      '🌉 A bridge at night;🏖️ A quiet beach;🌲 A forest clearing;🏔️ A mountain top;🎡 Top of a Ferris wheel;🌹 A rose garden;🌧️ Under one umbrella;🚗 A drive-in;🏛️ An old library;🎆 Under fireworks;🌅 A rooftop at sunset;🛶 A rowboat on a lake;🌌 Under the stars;🕯️ A tiny candlelit restaurant;🏰 A castle ruin;🎄 Under the mistletoe;🍂 A park in autumn;🌸 Under cherry blossoms;❄️ In the snow;🏠 Our own kitchen',
  },
  {
    key: 'outfit',
    options:
      '👗 A nice dress;👔 A crisp shirt;🧥 A cosy coat;👖 Jeans and a tee;🩳 Shorts;🧣 Scarf weather;👟 Sneakers;👠 Heels;🥾 Boots;🩴 Sandals;🎩 A hat;🕶️ Sunglasses;🧢 A cap;🤵 Suit and tie;👘 Something traditional;🩱 Swimwear;🥋 Matching tracksuits;🎨 Bright colours;🖤 All black;🤍 All white;🛌 Pyjamas all day;🎽 Gym clothes',
  },
  {
    key: 'bedtime',
    options:
      '🛏️ Window open;🔥 Heater on;🌙 Total darkness;💡 A little night light;🔇 Total silence;🌧️ Rain sounds;🧸 Cuddling all night;↔️ Our own space;🛌 Early to bed;🦉 Up past midnight;📱 Scroll in bed;📖 Read in bed;🍿 Movie in bed;☕ Coffee in bed;🐶 Pet on the bed;🧦 Socks on;❄️ Cold room, warm blanket;⏰ One alarm;😴 Snooze button;🌅 Wake with the sun',
  },
  {
    key: 'era',
    options:
      '🏛️ Ancient Rome;🏺 Ancient Egypt;🏰 Medieval times;🎭 The Renaissance;🕰️ Victorian era;🎷 The 1920s;🎙️ The 1950s;🌼 The 1960s;🕺 The 1970s;📼 The 1980s;💿 The 1990s;📱 The 2000s;🦖 Dinosaur times;🚀 The year 3000;🤠 The Wild West;⚓ The age of pirates;🗾 Feudal Japan;🧭 The age of explorers',
  },
  {
    key: 'adventure',
    options:
      '🪂 Skydiving;🤿 Scuba diving;🐋 Swimming with whales;🌋 Visiting a volcano;🏔️ Climbing a mountain;🎈 Hot air ballooning;🦈 Cage diving;🏜️ Camel trek;🌌 Seeing the northern lights;🛶 White water rafting;🧗 Abseiling;🦁 A safari;🚀 A trip to space;🐧 Antarctica;🏝️ A deserted island;🌊 Sailing around the world;🚞 The longest train ride;🏕️ A week off-grid;🤸 Bungee jumping;🦓 Volunteering with animals',
  },
  {
    key: 'pet-name',
    options:
      '🍯 Honey;💕 Babe;🐻 Teddy;🍬 Sugar;🌞 Sunshine;❤️ Love;😘 Baby;🐰 Bunny;🍑 Peach;✨ Star;👑 King or queen;🌹 Darling;🍪 Cookie;💎 Gem;🐼 Panda;🥰 Sweetheart;🧁 Cupcake;🦋 Butterfly;🌙 Moon;🫶 My person',
  },
  {
    key: 'flower',
    options:
      '🌹 Roses;🌷 Tulips;🌻 Sunflowers;🌸 Cherry blossoms;🌼 Daisies;💐 Peonies;🪻 Lavender;🌺 Hibiscus;🏵️ Marigolds;🪷 Lotus;🌾 Wildflowers;💮 Orchids;🌿 Eucalyptus;🍃 Baby’s breath;🥀 Dried flowers;🌵 Cacti instead',
  },
  {
    key: 'ice-cream',
    options:
      '🍦 Vanilla;🍫 Chocolate;🍓 Strawberry;🍪 Cookies and cream;🌿 Mint choc chip;🥜 Peanut butter;🍯 Salted caramel;☕ Coffee;🥭 Mango;🍋 Lemon sorbet;🥥 Coconut;🍒 Cherry;🍌 Banana;🍵 Matcha;🍑 Peach;🫐 Blueberry;🌰 Pistachio;🎂 Birthday cake;🍬 Bubblegum;🍰 Cheesecake;🍮 Dulce de leche;🍫 Rocky road',
  },
  {
    key: 'restaurant',
    options:
      '🕯️ Candlelit fine dining;🍔 A cheap and cheerful diner;🌮 A street food market;🍣 A sushi bar;🍕 A pizza place;🏞️ A riverside terrace;🌃 A rooftop bar;🍝 A family-run trattoria;🥘 A tapas bar;🍜 A tiny noodle shop;🍳 A brunch café;🍖 A smokehouse;🦞 A seafood shack;🧁 A cute bakery;🍷 A wine bar;🚚 A food truck;🍽️ A tasting menu;🛋️ Takeaway on the couch',
  },
  {
    key: 'nature',
    options:
      '🌊 The ocean;🏔️ Mountains;🌲 Forests;🏜️ Deserts;🏞️ Lakes;🌋 Volcanoes;🏝️ Islands;🌾 Meadows;🧊 Glaciers;💧 Waterfalls;🌴 Jungles;🕳️ Caves;🌅 Cliffs by the sea;🌌 Dark sky parks;🦩 Wetlands;🌸 Blossom valleys',
  },
  {
    key: 'water',
    options:
      '🏊 Swimming;🏄 Surfing;🤿 Snorkelling;🛶 Kayaking;⛵ Sailing;🚤 Jet skiing;🎣 Fishing;🏖️ Lying on the sand;🛟 Floating on a lazy river;🌊 Paddleboarding;🐬 Dolphin watching;🧜 Mermaid lessons;🎢 Water park;🧖 Hot springs;🌅 A sunset cruise',
  },
  {
    key: 'winter',
    options:
      '⛷️ Skiing;🏂 Snowboarding;⛸️ Ice skating;☃️ Building a snowman;🛷 Sledding;❄️ Snowball fight;🍫 Hot cocoa;🔥 Fireside nights;🎄 Christmas markets;🧖 A sauna;🌌 Northern lights;🧣 Wrapped up walks;🏔️ A chalet;🍲 Soup season;🎬 Holiday movies;🧶 Knitting by the fire',
  },
  {
    key: 'summer',
    options:
      '🏖️ Beach days;🍉 Watermelon;🍦 Ice cream;🌅 Late sunsets;🏕️ Camping;🎆 Fireworks;🍔 BBQs;🏊 Pool parties;🎪 Festivals;🚗 Road trips;🌻 Sunflower fields;🍹 Cold drinks outside;🚴 Evening bike rides;⛱️ Lazy afternoons;🐝 Picnics;🌙 Warm nights outside',
  },
  {
    key: 'instrument',
    options:
      '🎸 Guitar;🎹 Piano;🥁 Drums;🎻 Violin;🎷 Saxophone;🎺 Trumpet;🪕 Banjo;🪗 Accordion;🎤 Singing;🪈 Flute;🎼 Cello;🪘 Bongos;🎛️ DJ decks;🎵 Ukulele;🔔 Handbells;🪇 Maracas',
  },
  {
    key: 'dance',
    options:
      '💃 Salsa;🕺 Disco;🩰 Ballet;👯 Hip hop;🌹 Tango;🎩 Waltz;🤠 Line dancing;🌴 Bachata;🔥 Afrobeats dance;🎭 Swing;👠 Cha-cha;🥁 Samba;🪩 Freestyle in the kitchen;🎶 Slow dance;🌀 Breakdancing;🧑‍🤝‍🧑 Square dance',
  },
  {
    key: 'book',
    options:
      '💕 Romance;🕵️ Crime;🐉 Fantasy;🚀 Sci-fi;📜 History;🧠 Self-help;😂 Funny memoirs;👻 Ghost stories;🗺️ Travel writing;🍳 Cookbooks;🎨 Art books;📖 Poetry;🧒 Children’s classics;🦸 Comics;🔬 Popular science;🏰 Fairy tales;📰 Biographies;🌌 Space stories',
  },
  {
    key: 'chore',
    options:
      '🍽️ Washing dishes;🧺 Doing laundry;🧹 Vacuuming;🛒 Grocery shopping;🍳 Cooking dinner;🛏️ Making the bed;🚽 Cleaning the bathroom;🗑️ Taking out the bins;🌱 Watering plants;🐶 Walking the dog;👕 Folding clothes;🧽 Wiping counters;🪟 Cleaning windows;🚗 Washing the car;🍂 Raking leaves;🧾 Paying bills;🧼 Scrubbing the oven;🧊 Defrosting the freezer;🛁 Cleaning the tub;🧴 Restocking the cupboards;📦 Unpacking boxes;🔧 Fixing small things;🪴 Repotting plants;🧺 Changing the sheets',
  },
  {
    key: 'anniversary',
    options:
      '🍽️ Dinner where we first met;✈️ A weekend away;🏠 A cosy night in;🎁 Swapping handmade gifts;📸 A photo shoot;💌 Reading old messages;🎶 A concert;🌅 A sunrise picnic;🍾 Champagne and dancing;🧖 A spa day;🎟️ A surprise trip;📝 Writing our year in a letter;🌳 Planting a tree;🍰 Recreating our first date;🎨 A class together;🏨 A hotel in our own city',
  },
  {
    key: 'job',
    options:
      '🍰 Baker;🚀 Astronaut;🎨 Artist;🎤 Pop star;🧑‍🍳 Chef;🐬 Marine biologist;📚 Librarian;🌳 Park ranger;🎬 Film director;✈️ Pilot;🏛️ Museum curator;🌸 Florist;🧪 Inventor;🐾 Vet;📸 Travel photographer;🍷 Sommelier;🎢 Theme park designer;🧸 Toy maker;🏝️ Island tour guide;🕵️ Detective;📺 TV host;🏰 Royal for a day',
  },
  {
    key: 'live',
    options:
      '🇮🇹 A year in Italy;🇯🇵 A year in Japan;🇫🇷 A year in France;🇪🇸 A year in Spain;🇵🇹 A year in Portugal;🇬🇷 A year in Greece;🇲🇽 A year in Mexico;🇹🇭 A year in Thailand;🇦🇺 A year in Australia;🇨🇦 A year in Canada;🇳🇿 A year in New Zealand;🇰🇷 A year in Korea;🇮🇸 A year in Iceland;🇨🇭 A year in Switzerland;🇧🇷 A year in Brazil;🇿🇦 A year in South Africa;🇳🇱 A year in the Netherlands;🇸🇪 A year in Sweden;🇬🇭 A year in Ghana;🇯🇲 A year in Jamaica',
  },
  {
    key: 'cook',
    options:
      '🍝 Fresh pasta;🍣 Sushi rolls;🥟 Dumplings;🍞 Sourdough;🍕 Pizza dough;🍛 A curry from scratch;🌮 Tacos;🥐 Croissants;🍰 A layer cake;🍪 Cookies;🍲 A slow stew;🍜 Ramen broth;🥗 A fancy salad;🍖 A roast dinner;🥘 Paella;🧁 Cupcakes;🍳 A brunch spread;🥧 A pie;🍩 Donuts;🍫 Truffles',
  },
  {
    key: 'sandwich',
    options:
      '🥪 BLT;🧀 Grilled cheese;🍗 Chicken club;🥩 Steak sandwich;🐟 Tuna melt;🥖 Baguette with brie;🍖 Pulled pork;🥬 Veggie wrap;🍳 Egg and bacon roll;🌭 Meatball sub;🥓 Reuben;🥙 Gyro;🍤 Shrimp po’boy;🥜 Peanut butter and jelly;🍔 Sloppy joe;🫓 Banh mi',
  },
  {
    key: 'cheese',
    options:
      '🧀 Cheddar;🧀 Brie;🧀 Mozzarella;🧀 Parmesan;🧀 Gouda;🧀 Feta;🧀 Camembert;🧀 Blue cheese;🧀 Halloumi;🧀 Goat cheese;🧀 Swiss;🧀 Burrata;🧀 Manchego;🧀 Ricotta;🧀 Pepper jack;🧀 Smoked cheese',
  },
  {
    key: 'bakery',
    options:
      '🥐 Croissant;🥯 Bagel;🥖 Baguette;🍞 Sourdough;🧁 Muffin;🍩 Donut;🥨 Soft pretzel;🍪 Cookie;🥧 Hand pie;🍥 Cinnamon roll;🧇 Belgian waffle;🫓 Focaccia;🍫 Pain au chocolat;🍰 Danish;🥮 Scone;🍞 Banana bread',
  },
  {
    key: 'gesture',
    options:
      '💌 A note in my bag;🌹 Flowers at work;🎶 Dedicating a song;🛁 A bath waiting for me;🍳 Breakfast made;🚗 Car warmed up;🧥 Your jacket on my shoulders;📸 A photo album of us;🎟️ Tickets to my favourite show;🕯️ A surprise dinner;🗺️ A trip planned for me;💋 A kiss on the forehead;🤲 Holding my hand in public;🍫 My snack, just because;📱 A good morning text;🧺 A picnic set up;🎈 Balloons at home;🍰 Baking my favourite;🌙 Staying up to talk;🛌 Letting me sleep in',
  },
  {
    key: 'compliment',
    options:
      '😍 You look amazing;🧠 You’re so smart;😂 You’re hilarious;💪 You’re so strong;🫶 You’re so kind;🍳 You’re a great cook;🎨 You’re so creative;🔥 You’re hot;🙏 I’m proud of you;🏠 You feel like home;✨ You light up the room;👂 You’re a great listener;🌟 You inspire me;🥰 You’re my favourite person;🛡️ I feel safe with you;🎶 I love your voice',
  },
  {
    key: 'value',
    options:
      '😂 Humour;🤝 Trust;💬 Honest talks;🫶 Kindness;🔥 Passion;🧘 Patience;🎉 Adventure;🏠 Stability;🧠 Curiosity;🙏 Loyalty;🌱 Growing together;🎁 Generosity;🗣️ Openness;💪 Ambition;🕊️ Peace;🎶 Playfulness;📅 Reliability;❤️ Affection',
  },
  {
    key: 'landmark',
    options:
      '🗼 Eiffel Tower;🗽 Statue of Liberty;🏯 Mount Fuji;🧱 Great Wall of China;🏛️ Colosseum;🕌 Taj Mahal;🗿 Easter Island;🏜️ Pyramids of Giza;⛰️ Machu Picchu;🌉 Golden Gate Bridge;🎡 London Eye;🏔️ Swiss Alps;🌊 Great Barrier Reef;💦 Niagara Falls;🌋 Hawaii volcanoes;🏰 Neuschwanstein Castle;🛕 Angkor Wat;⛪ Sagrada Família;🦁 Serengeti;🌲 Yosemite',
  },
  {
    key: 'sound',
    options:
      '🌧️ Rain on the roof;🌊 Ocean waves;🔥 A crackling fire;🐦 Birds at dawn;🍃 Wind in the trees;😂 Your laugh;🎶 Your favourite song;🐱 A cat purring;☕ A coffee machine;🎹 Soft piano;⛈️ Distant thunder;🦗 Crickets at night;🎻 A string quartet;🔔 Wind chimes;🚂 A train passing;❄️ Snow crunching',
  },
  {
    key: 'time',
    options:
      '🌅 Early morning;☀️ Late morning;🍽️ Lunchtime;🌤️ Lazy afternoon;🌇 Golden hour;🌆 Early evening;🌙 Late night;🦉 2am conversations',
  },
  {
    key: 'ride',
    options:
      '🎢 Roller coaster;🎡 Ferris wheel;🎠 Carousel;🌊 Log flume;🚗 Bumper cars;👻 Ghost train;🌀 Teacups;🪂 Drop tower;🏰 Haunted house;🎯 Fairground games;🍭 Candy floss stand;🚂 Little train',
  },
  {
    key: 'nostalgia',
    options:
      '📼 Video tapes;💿 Burned CDs;📟 Pagers;🎮 Old game consoles;📺 Saturday morning cartoons;🍭 Corner shop sweets;🛼 Roller rinks;📷 Disposable cameras;💌 Passing notes in class;🎧 Portable CD players;🧃 Juice pouches;🪀 Yo-yos;🧸 Beanie toys;☎️ Landline calls;📻 Radio countdowns;🎒 School trips',
  },
  {
    key: 'pasta',
    options:
      '🍝 Spaghetti;🍝 Penne;🍝 Fusilli;🍝 Lasagna;🍝 Ravioli;🍝 Tortellini;🍝 Gnocchi;🍝 Fettuccine;🍝 Mac and cheese;🍝 Carbonara;🍝 Pesto pasta;🍝 Bolognese;🍝 Arrabbiata;🍝 Lobster linguine',
  },
  {
    key: 'sweet',
    options:
      '🍫 Milk chocolate;🍫 Dark chocolate;🍬 Sour sweets;🍭 Lollipops;🍡 Marshmallows;🍯 Toffee;🍬 Jelly beans;🍪 Fudge;🍫 White chocolate;🍬 Mints;🍬 Liquorice;🍫 Peanut butter cups;🍬 Caramels;🍭 Candy canes;🍬 Gummy worms;🍫 Truffles',
  },
  {
    key: 'soup',
    options:
      '🍜 Ramen;🍲 Chicken noodle;🍅 Tomato;🥣 Clam chowder;🧅 French onion;🥔 Potato leek;🍜 Pho;🌶️ Tom yum;🥕 Carrot and ginger;🫘 Lentil;🍄 Mushroom;🥬 Minestrone;🧀 Broccoli cheddar;🥘 Gumbo',
  },
  {
    key: 'season',
    options: '🌸 Spring;☀️ Summer;🍂 Autumn;❄️ Winter;🌧️ Monsoon;🎄 The holiday season;🌼 Early spring;🍁 Late autumn',
  },
  {
    key: 'tv',
    options:
      '😂 Sitcoms;🕵️ Crime dramas;🍳 Cooking shows;🏠 Home makeover shows;💍 Dating shows;🎤 Singing contests;🧁 Baking contests;🌍 Nature documentaries;👑 Period dramas;🦸 Superhero series;🧟 Zombie series;🔍 True crime;🚀 Space series;🏥 Hospital dramas;⚖️ Courtroom dramas;🎌 Anime;🤣 Stand-up specials;🏝️ Island reality shows;🏆 Game shows;🧸 Cartoons from our childhood;🧑‍⚖️ Legal comedies;🏰 Fantasy epics;🍷 Travel food shows;🐾 Pet rescue shows;👗 Fashion contests;🧪 Science shows;🎭 Sketch comedy;🕰️ Time travel series;💼 Office comedies;🏡 Property shows',
  },
  {
    key: 'morning',
    options:
      '☕ Coffee first;🚿 Shower first;🏃 A morning run;🧘 Stretching;📰 Reading the news;🎶 Music on;🍳 A big breakfast;🥤 Just a smoothie;😴 Snooze three times;🌅 Watching the sunrise;📱 Checking my phone;💋 A kiss before anything;🛏️ Breakfast in bed;🐶 Walk the dog;📓 Journaling;🧹 Tidy up',
  },
  {
    key: 'party',
    options:
      '🎉 A huge birthday party;🍽️ A small dinner with close friends;🎤 A karaoke party;👗 A costume party;🎮 A games night;🌮 A taco bar;🏊 A pool party;🎆 A rooftop party;🧺 A garden party;🍷 A wine tasting party;🎳 A bowling party;🕵️ A murder mystery party;🍕 A pizza and movie party;🌙 A pyjama party;🎵 A dance party;🔥 A bonfire',
  },
  {
    key: 'gadget',
    options:
      '📱 A new phone;💻 A new laptop;🎧 Noise cancelling headphones;⌚ A smartwatch;📷 An instant camera;🎮 A games console;📽️ A projector;🔊 A good speaker;🚁 A drone;🤖 A robot vacuum;☕ A fancy coffee machine;📚 An e-reader;🎹 A keyboard to learn on;🕶️ A VR headset;💡 Colour changing lights;🖨️ A photo printer',
  },
  {
    key: 'experience',
    options:
      '🌌 Seeing the northern lights;🎈 A hot air balloon at sunrise;🐋 Swimming with whale sharks;🏯 Cherry blossom season in Japan;🎭 A Broadway show;🍝 A cooking class in Italy;🚂 The Orient Express;🏔️ Hiking to a glacier;🏝️ A week on a deserted island;🎆 New Year in a new country;🐢 Watching turtles hatch;🌋 Standing on a volcano;🦁 A sunrise safari;🎶 Front row at a concert;🛳️ An Antarctic cruise;🏰 A night in a castle;🎢 The tallest roller coaster;🪂 Tandem skydiving;🐬 Swimming with dolphins;🌊 Surfing lessons in Bali;🚁 A helicopter over a city;🧊 Sleeping in an ice hotel;🌅 Sunrise on a mountain;⛵ Sailing the Greek islands;🍷 A vineyard harvest;🎪 A carnival in Rio;🛶 Paddling through a cave;🌸 Tulip fields in spring;🗼 A picnic by the Eiffel Tower;🌲 A treehouse hotel;🏜️ A night in the desert;🐧 Seeing wild penguins;🍜 Street food in Bangkok;🎨 Painting in Provence;🏟️ The World Cup;🎄 Christmas in Lapland;🦒 Feeding giraffes;🌺 A luau in Hawaii;🚞 A glass-roofed train;🍫 A chocolate factory tour;🏞️ The Grand Canyon at dawn;🗺️ A trip with no plan at all;💍 Renewing our vows somewhere wild;🛁 An outdoor hot spring in the snow;🌌 Camping under the Milky Way;🐎 Riding horses on a beach;🏙️ Dinner at the top of a skyscraper;🎻 An opera in Vienna;🌊 A night on a houseboat;🎡 A Ferris wheel at night;🐘 Bathing elephants at a sanctuary;🥾 A long distance trail;🍣 Sushi at a tiny counter in Tokyo;🎿 Learning to ski together;🌄 A sunrise hot air balloon;🍁 Autumn leaves in New England;🧗 Climbing a via ferrata;🌊 A catamaran day trip;🎇 Lantern festival;🏺 Ancient ruins at dawn;🦓 A night in a safari tent;🏄 Learning to surf;🍫 Making chocolate from bean to bar;🛩️ A seaplane flight;🎪 A circus workshop;🐟 Fishing at sunrise;🦋 A butterfly house;🍊 Picking fruit at an orchard;🎼 Front row at the ballet;🚴 Cycling through vineyards',
  },
  {
    key: 'rather',
    options:
      '🏝️ A week with no phones;🛋️ A month of lazy Sundays;✈️ A surprise trip every year;💌 A love letter every month;🍳 Breakfast in bed every Sunday;🎶 A song written about us;📸 A photographer for our whole life;🏠 Our dream house now;🌍 Travelling for a year;💰 Winning a small lottery together;🐶 A house full of pets;🍕 Free pizza for life;🎟️ Free concerts for life;🧹 Never doing chores again;😴 Always sleeping perfectly;🍷 A private wine cellar;🛳️ A yearly cruise;🏔️ A cabin to escape to;🚗 Our dream car;📚 A room full of books;🍰 A personal baker;🧑‍🍳 A personal chef;💆 A massage every week;🎮 A full arcade at home;🌴 Living by the beach;🏙️ Living in the city centre;🌾 Living on a farm;⏸️ One pause button for our best day;⏪ Reliving our first date;🔮 Seeing us in ten years;🗣️ Speaking every language together;🌌 One night in space;🌊 A home on the water;🦄 A pet unicorn;🎁 A surprise every Friday;💃 Dance lessons for life;🏖️ Every summer off;🎄 Christmas every month;🍝 Dinner in Italy any night;⛷️ A ski chalet;🧖 A home spa;🎨 A wall painted by us;🛏️ A bed that makes breakfast;📼 A video of every day together;🎂 A party every birthday;🪄 One wish each;🛶 A private lake;🌸 A garden that always blooms;🚂 Our own train carriage;🎬 A movie made about us;🌙 Late night drives forever;🧺 A picnic every Saturday;📖 A book written about us;🏰 A summer in a castle;🍣 Sushi whenever we want;🎭 Season tickets to the theatre;🐾 Fostering animals together;🌻 A sunflower field of our own;🚐 A camper van for weekends;🏝️ A tiny island cottage;🍫 A lifetime supply of chocolate;☕ The perfect coffee every morning;🎆 Fireworks on every anniversary;🧸 Matching onesies for winter;🛁 A clawfoot bath with a view;🛌 Breakfast delivered every day;🧳 Bags always packed for adventure;🎤 A recording studio at home;📚 A tiny library cafe of our own;🧘 A month long retreat;🗻 Climbing a famous peak together;🌌 A glass ceiling over our bed;🍽️ A table at every best restaurant;🎨 Our portrait in a museum;🌊 A surf shack by the sea;🐴 A horse each;🏕️ A forest we can camp in;🚀 A ride on a rocket;🎟️ A golden ticket to anywhere;🍿 Our own cinema',
  },
  {
    key: 'country',
    options:
      '🇮🇹 Italy;🇯🇵 Japan;🇫🇷 France;🇪🇸 Spain;🇬🇷 Greece;🇵🇹 Portugal;🇲🇽 Mexico;🇹🇭 Thailand;🇮🇩 Indonesia;🇻🇳 Vietnam;🇰🇷 South Korea;🇮🇸 Iceland;🇳🇴 Norway;🇨🇭 Switzerland;🇦🇹 Austria;🇩🇪 Germany;🇳🇱 Netherlands;🇬🇧 Scotland;🇮🇪 Ireland;🇨🇦 Canada;🇺🇸 USA road trip;🇧🇷 Brazil;🇦🇷 Argentina;🇵🇪 Peru;🇨🇴 Colombia;🇨🇷 Costa Rica;🇯🇲 Jamaica;🇨🇺 Cuba;🇲🇦 Morocco;🇪🇬 Egypt;🇰🇪 Kenya;🇿🇦 South Africa;🇹🇿 Tanzania;🇬🇭 Ghana;🇳🇬 Nigeria;🇦🇪 UAE;🇹🇷 Türkiye;🇮🇳 India;🇱🇰 Sri Lanka;🇳🇵 Nepal;🇲🇻 Maldives;🇵🇭 Philippines;🇸🇬 Singapore;🇦🇺 Australia;🇳🇿 New Zealand;🇫🇯 Fiji;🇭🇷 Croatia;🇨🇿 Czechia;🇭🇺 Hungary;🇸🇪 Sweden;🇩🇰 Denmark;🇫🇮 Finland;🇵🇱 Poland;🇧🇪 Belgium;🇨🇱 Chile;🇪🇪 Estonia;🇸🇮 Slovenia;🇲🇹 Malta;🇨🇾 Cyprus;🇯🇴 Jordan;🇴🇲 Oman;🇧🇼 Botswana;🇳🇦 Namibia;🇲🇺 Mauritius;🇸🇨 Seychelles;🇧🇧 Barbados;🇧🇸 Bahamas;🇰🇭 Cambodia;🇱🇦 Laos;🇲🇳 Mongolia',
  },
  {
    key: 'perfect-day',
    options:
      '🌅 Watching the sunrise;😴 Sleeping till noon;🥞 A slow breakfast;☕ Coffee on the balcony;🚶 A long walk;🛍️ A little shopping;🍜 A long lunch;🏖️ Lying on a beach;📖 Reading side by side;🎬 A matinee;🧺 A picnic;🛁 A bath for two;🍷 An early evening drink;🍝 Cooking dinner together;🎶 Dancing in the living room;🌌 Stargazing;🎲 A game night;🏊 A swim;🚴 A bike ride;🧖 A spa visit;🎨 Making something together;📸 Taking silly photos;🎤 Singing in the car;🍦 Ice cream at sunset;🔥 A fire pit chat;🛋️ A nap together;🌳 Lying in the grass;🍿 A movie in bed;📞 Calling family together;🎡 A fair at night;🏞️ A drive with no destination;🍰 Cake for no reason;🌧️ Listening to the rain;🎧 Sharing new music;💋 Lots of kisses;🗺️ Planning our future;🧁 Baking cupcakes;🎮 A gaming marathon;🍣 A sushi lunch;📝 Writing notes to each other;🌸 A garden walk;🚤 A boat ride;🥂 A toast to us;🌃 A city walk at night;🎳 Bowling;🎨 A museum wander;🍕 Pizza on the floor;🧩 A puzzle;🌻 Picking flowers;🎢 A day of rides',
  },
  {
    key: 'cocktail',
    options:
      '🍹 Margarita;🍸 Martini;🍍 Piña colada;🌿 Mojito;🍊 Aperol spritz;🍒 Cosmopolitan;🥃 Old fashioned;☕ Espresso martini;🍋 Whiskey sour;🍓 Daiquiri;🥂 Bellini;🍉 Watermelon cooler;🌶️ Spicy margarita;🍑 Sex on the beach;🥥 Coconut mocktail;🍹 Mai tai;🍸 Negroni;🍋 Tom Collins;🍇 Sangria;🫐 Berry mocktail',
  },
  {
    key: 'side',
    options:
      '🍟 Fries;🧄 Garlic bread;🥗 Side salad;🍚 Rice;🥔 Mashed potatoes;🌽 Corn on the cob;🧅 Onion rings;🥦 Roasted veggies;🍠 Sweet potato mash;🫘 Baked beans;🥒 Coleslaw;🍞 Bread rolls;🧀 Mac and cheese;🍄 Garlic mushrooms;🥟 Spring rolls;🍳 Fried egg on top;🥑 Guacamole;🌶️ Jalapeño poppers;🫓 Naan;🍗 Wings on the side',
  },
  {
    key: 'memory',
    options:
      '💭 Our first kiss;📱 Our first text;🍽️ Our first date;✈️ Our first trip;🏠 Our first night in;🎂 Our first birthday together;🎄 Our first holiday together;📸 Our first photo;💌 The first I love you;😂 Our first inside joke;🎶 Our first song;🌧️ Our first rainy day together;🥺 The first time you met my family;🤝 The first time we held hands;🌙 Our first late night talk;🎁 Our first gift swap',
  },
  {
    key: 'dinner-guest',
    options:
      '👵 My grandma;👴 Your grandpa;🧑‍🍳 A famous chef;🎤 Our favourite singer;😂 A comedian;🧙 A wizard;👽 A friendly alien;🐶 A talking dog;🕵️ A detective;🏴‍☠️ A pirate captain;👸 A princess;🤴 A prince;🦸 A superhero;🧛 A vampire;🧜 A mermaid;🥷 A ninja;🤠 A cowboy;🧚 A fairy;👨‍🚀 An astronaut;🎨 A great painter;📚 A favourite author;🦖 A friendly dinosaur;🐉 A small dragon;🧞 A genie;👻 A friendly ghost;🤖 A robot butler;🎻 A violinist;🎩 A magician;🐼 A panda;🦉 A wise owl',
  },
  {
    key: 'shoes',
    options:
      '👟 Sneakers;👠 Heels;🥾 Hiking boots;👢 Knee-high boots;🩴 Flip flops;👞 Loafers;🥿 Ballet flats;🩰 Ballet shoes;🛼 Roller skates;🧦 Just socks;🦶 Barefoot;👡 Sandals;🧸 Fluffy slippers;⛸️ Ice skates;☔ Rain boots;👞 Brogues',
  },
];

/** Each volume's pairs come after all of the one before, so adding a volume never moves a day you've had. */
export const VOLUMES: Topic[][] = [VOLUME_1];
