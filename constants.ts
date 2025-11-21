
export const WORLD_WIDTH = 9000;
export const WORLD_HEIGHT = 9000;

export const INITIAL_PLAYER_RADIUS = 30;
export const FOOD_RADIUS = 5;
export const MAX_BOTS = 70;
export const MAX_FOOD = 1700;
export const MAX_MASS=10000
export const MASS_SCALE = 5; // Visual scaling factor: Radius = sqrt(Mass) * MASS_SCALE
export const COLLISION_COOLDOWN = 5000; // 5 seconds before cells can touch/rub
export const MIN_SPLIT_RADIUS = 40; // Minimum size required to split
export const SPLIT_FORCE = 25; // Velocity boost when splitting
export const MERGE_COOLDOWN = 12000; // 10 seconds before cells can re-merge

export const COLORS = [
  '#F87171', // Red
  '#60A5FA', // Blue
  '#34D399', // Green
  '#FBBF24', // Yellow
  '#A78BFA', // Purple
  '#F472B6', // Pink
  '#FB923C', // Orange
  '#2DD4BF', // Teal
];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const BOT_NAMES = [
  "Orbiter", "Nebula", "Quasar", "Pulsar", "Comet", 
  "Asteroid", "Vortex", "Galaxy", "Cosmos", "Eclipse",
  "Nova", "Zenith", "Apex", "Vertex", "Matrix",
  "Glitch", "Byte", "Pixel", "Vector", "Scalar",
  
  "Zeta","John","Alex","ibrahim","Ahmet",
  "Sevil","Hülya","Kalender","Sinem","Filiz",
  "handsome","badboy","frankestein","hellboy",
  "arsenal","brazil","helga","julia",
  "Liam","Noah","Oliver","Elijah","James",
  "William","Benjamin","Lucas","Henry","Alexander",
"Emma","Olivia","Ava","Sophia","Isabella",
"Mia","Charlotte","Amelia","Harper","Evelyn",
"Mateo","Levi","Sebastian","Jack","Owen",
"Daniel","Michael","Logan","Jackson","Samuel",
"Hannah","Chloe","Victoria","Grace","Zoey",
"Nora","Riley","Lily","Eleanor","Hazel",
"Fatima","Aisha","Zara","Yusuf","Omar","Ali",
"Hassan","Ibrahim","Ahmed","Maryam",
"Chen","Wei","Hiroshi","Yuki","Sakura","Minato",
"Jin","Sora","Mei","Ling",
"Diego","Carlos","Juan","Jose","Maria","Ana",
"Lucia","Sofia","Camila","Valentina",
"Ivan","Dimitri","Svetlana","Nadia","Olga",
"Katarina","Mikhail","Nikolai","Alexei","Elena",
"Jean","Pierre","Louis","Marie","Camille","Luc",
"Andre","Hugo","Manon","Lea",
"Tokyo","Delhi","Shanghai","Sao Paulo",
"Mexico City","Cairo","Mumbai","Beijing","Dhaka","Osaka",
"New York","Karachi","Buenos Aires",
"Chongqing","Istanbul","Kolkata","Manila","Lagos","Rio de Janeiro","Tianjin",
"London","Paris","Seoul","Jakarta",
"Barcelona","Manchester",
"Ajax","Benfica","Fenerbahce","Galatasaraylı","sivaslı","mersyside blue"

];