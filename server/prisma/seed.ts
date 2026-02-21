import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { generateQrToken } from './seed-utils.js';

// ---------------------------------------------------------------------------
// Types for locale data
// ---------------------------------------------------------------------------

interface CategoryLocales {
  [lang: string]: { name: string };
}

interface MenuLocales {
  [lang: string]: { name: string; description: string; cultural_note?: string };
}

interface OptionGroupLocales {
  [lang: string]: { group_name: string };
}

interface OptionValueLocales {
  [lang: string]: { label: string };
}

interface OptionValueDef {
  locales: OptionValueLocales;
  price_delta: number; // in cents
}

interface OptionGroupDef {
  locales: OptionGroupLocales;
  is_required: boolean;
  max_select: number;
  values: OptionValueDef[];
  sort_order: number;
}

interface MenuDef {
  locales: MenuLocales;
  base_price: number; // in cents
  image_url: string;
  is_recommended: boolean;
  dietary_tags: string[];
  allergens: string[];
  spiciness_level: number;
  challenge_level: number;
  sort_order: number;
  options: OptionGroupDef[];
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

const categoryDefs: { key: string; locales: CategoryLocales; sort_order: number }[] = [
  {
    key: 'recommended',
    sort_order: 0,
    locales: {
      en: { name: 'Recommended' },
      ko: { name: '추천' },
      ja: { name: 'おすすめ' },
      zh: { name: '推荐' },
      es: { name: 'Recomendados' },
    },
  },
  {
    key: 'appetizers',
    sort_order: 1,
    locales: {
      en: { name: 'Appetizers' },
      ko: { name: '전채' },
      ja: { name: '前菜' },
      zh: { name: '开胃菜' },
      es: { name: 'Aperitivos' },
    },
  },
  {
    key: 'main_dishes',
    sort_order: 2,
    locales: {
      en: { name: 'Main Dishes' },
      ko: { name: '메인' },
      ja: { name: 'メイン' },
      zh: { name: '主菜' },
      es: { name: 'Platos Principales' },
    },
  },
  {
    key: 'noodles_rice',
    sort_order: 3,
    locales: {
      en: { name: 'Noodles & Rice' },
      ko: { name: '면/밥' },
      ja: { name: '麺・ご飯' },
      zh: { name: '面食/米饭' },
      es: { name: 'Fideos y Arroz' },
    },
  },
  {
    key: 'side_dishes',
    sort_order: 4,
    locales: {
      en: { name: 'Side Dishes' },
      ko: { name: '반찬' },
      ja: { name: 'おかず' },
      zh: { name: '配菜' },
      es: { name: 'Acompañamientos' },
    },
  },
  {
    key: 'drinks',
    sort_order: 5,
    locales: {
      en: { name: 'Drinks' },
      ko: { name: '음료' },
      ja: { name: 'ドリンク' },
      zh: { name: '饮品' },
      es: { name: 'Bebidas' },
    },
  },
  {
    key: 'desserts',
    sort_order: 6,
    locales: {
      en: { name: 'Desserts' },
      ko: { name: '디저트' },
      ja: { name: 'デザート' },
      zh: { name: '甜点' },
      es: { name: 'Postres' },
    },
  },
];

// ---------------------------------------------------------------------------
// Menu definitions grouped by category key
// ---------------------------------------------------------------------------

function buildMenuDefs(): Record<string, MenuDef[]> {
  return {
    // ==============================
    // Appetizers
    // ==============================
    appetizers: [
      {
        locales: {
          en: {
            name: 'Kimchi',
            description: 'Traditional fermented napa cabbage with Korean chili flakes',
            cultural_note: "Korea's most iconic fermented side dish, aged for weeks to develop complex flavors",
          },
          ko: {
            name: '김치',
            description: '전통 배추김치, 한국 고춧가루로 절인 발효 배추',
            cultural_note: '한국의 대표적인 발효 반찬으로, 몇 주간 숙성시켜 깊은 맛을 냅니다',
          },
          ja: {
            name: 'キムチ',
            description: '韓国唐辛子で漬けた伝統的な白菜の発酵漬物',
            cultural_note: '韓国を代表する発酵おかず。数週間熟成させて複雑な風味を引き出します',
          },
          zh: {
            name: '泡菜',
            description: '用韩国辣椒粉腌制的传统发酵大白菜',
            cultural_note: '韩国最具代表性的发酵配菜，经过数周发酵产生复杂风味',
          },
          es: {
            name: 'Kimchi',
            description: 'Col napa fermentada tradicional con hojuelas de chile coreano',
            cultural_note: 'El plato fermentado más icónico de Corea, madurado durante semanas para desarrollar sabores complejos',
          },
        },
        base_price: 600,
        image_url: 'https://picsum.photos/seed/kimchi/400/300',
        is_recommended: false,
        dietary_tags: ['vegan'],
        allergens: [],
        spiciness_level: 3,
        challenge_level: 0,
        sort_order: 0,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Japchae',
            description: 'Glass noodle stir-fry with vegetables and sesame oil',
            cultural_note: 'Traditionally served at celebrations and holidays',
          },
          ko: {
            name: '잡채',
            description: '당면과 야채를 참기름으로 볶은 요리',
            cultural_note: '전통적으로 명절과 잔치에서 즐기는 음식입니다',
          },
          ja: {
            name: 'チャプチェ',
            description: '春雨と野菜のごま油炒め',
            cultural_note: '伝統的にお祝いや祝日に振る舞われる料理です',
          },
          zh: {
            name: '杂菜',
            description: '粉丝与蔬菜的芝麻油炒菜',
            cultural_note: '传统上在庆典和节日时享用的菜肴',
          },
          es: {
            name: 'Japchae',
            description: 'Fideos de cristal salteados con verduras y aceite de sésamo',
            cultural_note: 'Tradicionalmente servido en celebraciones y días festivos',
          },
        },
        base_price: 1200,
        image_url: 'https://picsum.photos/seed/japchae/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 1,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Mandu',
            description: 'Korean dumplings filled with seasoned pork and vegetables',
            cultural_note: 'A staple of Korean cuisine, enjoyed year-round but especially during Lunar New Year',
          },
          ko: {
            name: '만두',
            description: '양념한 돼지고기와 야채를 넣은 한국식 만두',
            cultural_note: '한국 요리의 필수 음식으로, 설날에 특히 즐깁니다',
          },
          ja: {
            name: 'マンドゥ',
            description: '味付け豚肉と野菜を包んだ韓国式餃子',
            cultural_note: '韓国料理の定番。旧正月に特に楽しまれています',
          },
          zh: {
            name: '馒头饺',
            description: '包裹调味猪肉和蔬菜的韩式饺子',
            cultural_note: '韩国料理的主食，全年享用，尤其在农历新年期间',
          },
          es: {
            name: 'Mandu',
            description: 'Empanadillas coreanas rellenas de cerdo sazonado y verduras',
            cultural_note: 'Un básico de la cocina coreana, disfrutado todo el año pero especialmente durante el Año Nuevo Lunar',
          },
        },
        base_price: 1000,
        image_url: 'https://picsum.photos/seed/mandu/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 2,
        options: [
          {
            locales: {
              en: { group_name: 'Type' },
              ko: { group_name: '종류' },
              ja: { group_name: 'タイプ' },
              zh: { group_name: '类型' },
              es: { group_name: 'Tipo' },
            },
            is_required: true,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Steamed' },
                  ko: { label: '찐만두' },
                  ja: { label: '蒸し' },
                  zh: { label: '蒸' },
                  es: { label: 'Al vapor' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Fried' },
                  ko: { label: '군만두' },
                  ja: { label: '焼き' },
                  zh: { label: '煎' },
                  es: { label: 'Frito' },
                },
                price_delta: 100,
              },
              {
                locales: {
                  en: { label: 'Boiled' },
                  ko: { label: '물만두' },
                  ja: { label: '水餃子' },
                  zh: { label: '煮' },
                  es: { label: 'Hervido' },
                },
                price_delta: 0,
              },
            ],
          },
        ],
      },
    ],

    // ==============================
    // Main Dishes
    // ==============================
    main_dishes: [
      {
        locales: {
          en: {
            name: 'Bibimbap',
            description: 'Mixed rice bowl topped with assorted vegetables, egg, and gochujang sauce',
            cultural_note: "Literally means 'mixed rice'. Stir thoroughly before eating for the best flavor",
          },
          ko: {
            name: '비빔밥',
            description: '각종 야채, 계란, 고추장 소스를 얹은 비빔밥',
            cultural_note: "'비빔밥'은 말 그대로 '비벼 먹는 밥'입니다. 잘 비벼야 제맛이 납니다",
          },
          ja: {
            name: 'ビビンバ',
            description: '様々な野菜、卵、コチュジャンソースをのせた混ぜご飯',
            cultural_note: "「混ぜご飯」という意味。よくかき混ぜてから食べるのが一番美味しい食べ方です",
          },
          zh: {
            name: '拌饭',
            description: '配有各种蔬菜、鸡蛋和辣椒酱的拌饭',
            cultural_note: '字面意思是"拌饭"。充分搅拌后食用风味最佳',
          },
          es: {
            name: 'Bibimbap',
            description: 'Bol de arroz mixto con verduras variadas, huevo y salsa gochujang',
            cultural_note: "Literalmente significa 'arroz mezclado'. Revuelve bien antes de comer para el mejor sabor",
          },
        },
        base_price: 1400,
        image_url: 'https://picsum.photos/seed/bibimbap/400/300',
        is_recommended: true,
        dietary_tags: ['halal'],
        allergens: [],
        spiciness_level: 2,
        challenge_level: 1,
        sort_order: 0,
        options: [
          {
            locales: {
              en: { group_name: 'Spicy Level' },
              ko: { group_name: '맵기' },
              ja: { group_name: '辛さ' },
              zh: { group_name: '辣度' },
              es: { group_name: 'Nivel de picante' },
            },
            is_required: false,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Mild' }, ko: { label: '순한맛' }, ja: { label: 'マイルド' },
                  zh: { label: '微辣' }, es: { label: 'Suave' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Medium' }, ko: { label: '보통' }, ja: { label: '中辛' },
                  zh: { label: '中辣' }, es: { label: 'Medio' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Hot' }, ko: { label: '매운맛' }, ja: { label: '辛口' },
                  zh: { label: '特辣' }, es: { label: 'Picante' },
                },
                price_delta: 0,
              },
            ],
          },
          {
            locales: {
              en: { group_name: 'Add-ons' },
              ko: { group_name: '추가' },
              ja: { group_name: 'トッピング' },
              zh: { group_name: '加料' },
              es: { group_name: 'Extras' },
            },
            is_required: false,
            max_select: 2,
            sort_order: 1,
            values: [
              {
                locales: {
                  en: { label: 'Extra Fried Egg' }, ko: { label: '계란 추가' }, ja: { label: '目玉焼き追加' },
                  zh: { label: '加煎蛋' }, es: { label: 'Huevo frito extra' },
                },
                price_delta: 150,
              },
              {
                locales: {
                  en: { label: 'Extra Vegetables' }, ko: { label: '야채 추가' }, ja: { label: '野菜追加' },
                  zh: { label: '加蔬菜' }, es: { label: 'Verduras extra' },
                },
                price_delta: 200,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Bulgogi',
            description: 'Tender marinated beef grilled to perfection with a sweet savory glaze',
            cultural_note: 'Fire meat - marinated in soy, sugar, and sesame for tenderness',
          },
          ko: {
            name: '불고기',
            description: '달콤한 양념에 재운 소고기를 완벽하게 구운 요리',
            cultural_note: "'불고기'는 '불에 구운 고기'라는 뜻으로, 간장, 설탕, 참기름에 재워 부드럽게 만듭니다",
          },
          ja: {
            name: 'プルコギ',
            description: '甘辛いタレに漬け込んだ牛肉を完璧に焼き上げた料理',
            cultural_note: '「火の肉」- 醤油、砂糖、ごまで漬け込んで柔らかく仕上げます',
          },
          zh: {
            name: '烤肉',
            description: '用甜咸酱汁腌制的嫩牛肉，烤至完美',
            cultural_note: '"火肉" - 用酱油、糖和芝麻腌制使其嫩滑',
          },
          es: {
            name: 'Bulgogi',
            description: 'Ternera marinada tierna a la parrilla con un glaseado dulce y salado',
            cultural_note: 'Carne al fuego - marinada en soja, azúcar y sésamo para suavidad',
          },
        },
        base_price: 1800,
        image_url: 'https://picsum.photos/seed/bulgogi/400/300',
        is_recommended: true,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 1,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Galbi',
            description: 'Grilled beef short ribs marinated in a sweet soy-based sauce',
            cultural_note: 'Premium cut short ribs, a centerpiece of Korean BBQ enjoyed at special gatherings',
          },
          ko: {
            name: '갈비',
            description: '달콤한 간장 양념에 재운 소 갈비구이',
            cultural_note: '한국 바비큐의 대표 메뉴로, 특별한 모임에서 즐기는 프리미엄 갈비입니다',
          },
          ja: {
            name: 'カルビ',
            description: '甘い醤油ベースのタレに漬け込んだ牛カルビの焼肉',
            cultural_note: 'プレミアムカルビ。特別な集まりで楽しむ韓国BBQの主役です',
          },
          zh: {
            name: '排骨',
            description: '用甜酱油酱汁腌制的烤牛小排',
            cultural_note: '优质短肋排，是韩国烧烤的主角，在特别聚会时享用',
          },
          es: {
            name: 'Galbi',
            description: 'Costillas cortas de res a la parrilla marinadas en salsa dulce de soja',
            cultural_note: 'Costillas cortas premium, pieza central del BBQ coreano disfrutado en reuniones especiales',
          },
        },
        base_price: 2400,
        image_url: 'https://picsum.photos/seed/galbi/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 2,
        options: [
          {
            locales: {
              en: { group_name: 'Size' },
              ko: { group_name: '크기' },
              ja: { group_name: 'サイズ' },
              zh: { group_name: '份量' },
              es: { group_name: 'Tamaño' },
            },
            is_required: true,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Regular' }, ko: { label: '보통' }, ja: { label: 'レギュラー' },
                  zh: { label: '普通' }, es: { label: 'Regular' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Large' }, ko: { label: '대' }, ja: { label: 'ラージ' },
                  zh: { label: '大份' }, es: { label: 'Grande' },
                },
                price_delta: 800,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Dakgalbi',
            description: 'Spicy stir-fried chicken with vegetables and gochujang',
            cultural_note: 'A signature dish from Chuncheon city, best enjoyed shared with friends at the table',
          },
          ko: {
            name: '닭갈비',
            description: '고추장 양념으로 야채와 함께 볶은 매운 닭고기',
            cultural_note: '춘천의 대표 음식으로, 친구들과 함께 나눠 먹으면 더 맛있습니다',
          },
          ja: {
            name: 'タッカルビ',
            description: '野菜とコチュジャンで炒めたスパイシーチキン',
            cultural_note: '春川市の名物料理。テーブルを囲んで友人とシェアするのが最高です',
          },
          zh: {
            name: '辣炒鸡排',
            description: '用辣椒酱与蔬菜一起炒的辣鸡肉',
            cultural_note: '春川市的招牌菜，与朋友在餐桌上共享最为美味',
          },
          es: {
            name: 'Dakgalbi',
            description: 'Pollo salteado picante con verduras y gochujang',
            cultural_note: 'Plato emblemático de la ciudad de Chuncheon, mejor disfrutado compartido con amigos en la mesa',
          },
        },
        base_price: 1600,
        image_url: 'https://picsum.photos/seed/dakgalbi/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 4,
        challenge_level: 2,
        sort_order: 3,
        options: [
          {
            locales: {
              en: { group_name: 'Spicy Level' },
              ko: { group_name: '맵기' },
              ja: { group_name: '辛さ' },
              zh: { group_name: '辣度' },
              es: { group_name: 'Nivel de picante' },
            },
            is_required: false,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Mild' }, ko: { label: '순한맛' }, ja: { label: 'マイルド' },
                  zh: { label: '微辣' }, es: { label: 'Suave' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Medium' }, ko: { label: '보통' }, ja: { label: '中辛' },
                  zh: { label: '中辣' }, es: { label: 'Medio' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Hot' }, ko: { label: '매운맛' }, ja: { label: '辛口' },
                  zh: { label: '特辣' }, es: { label: 'Picante' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Extra Hot' }, ko: { label: '아주 매운맛' }, ja: { label: '激辛' },
                  zh: { label: '超辣' }, es: { label: 'Extra picante' },
                },
                price_delta: 0,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Samgyeopsal',
            description: 'Thick-cut grilled pork belly served with lettuce wraps and dipping sauces',
            cultural_note: 'Wrap in lettuce with garlic and ssamjang paste for the authentic experience',
          },
          ko: {
            name: '삼겹살',
            description: '두툼하게 자른 삼겹살 구이, 상추쌈과 소스 제공',
            cultural_note: '상추에 마늘과 쌈장을 넣어 싸 먹으면 정통 삼겹살을 즐길 수 있습니다',
          },
          ja: {
            name: 'サムギョプサル',
            description: '厚切り豚バラ肉のグリル、レタス包みとディップソース付き',
            cultural_note: 'レタスにニンニクとサムジャンを添えて包んで食べるのが本場の食べ方です',
          },
          zh: {
            name: '五花肉',
            description: '厚切烤五花肉，配生菜卷和蘸酱',
            cultural_note: '用生菜包裹蒜片和包饭酱一起吃，体验最正宗的吃法',
          },
          es: {
            name: 'Samgyeopsal',
            description: 'Panceta de cerdo a la parrilla de corte grueso con envolturas de lechuga y salsas',
            cultural_note: 'Envuelve en lechuga con ajo y pasta ssamjang para la experiencia auténtica',
          },
        },
        base_price: 2000,
        image_url: 'https://picsum.photos/seed/samgyeopsal/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 4,
        options: [],
      },
    ],

    // ==============================
    // Noodles & Rice
    // ==============================
    noodles_rice: [
      {
        locales: {
          en: {
            name: 'Spicy Kimchi Jjigae',
            description: 'Hearty kimchi stew with pork, tofu, and fermented kimchi',
            cultural_note: 'A comforting home-style stew that is the soul of Korean family meals',
          },
          ko: {
            name: '김치찌개',
            description: '돼지고기, 두부, 묵은지가 들어간 든든한 김치찌개',
            cultural_note: '한국 가정식의 중심이 되는 따뜻한 찌개입니다',
          },
          ja: {
            name: 'キムチチゲ',
            description: '豚肉、豆腐、発酵キムチの辛いチゲ',
            cultural_note: '韓国の家庭料理の定番。心も体も温まるスープです',
          },
          zh: {
            name: '泡菜汤',
            description: '猪肉、豆腐和发酵泡菜的辣汤',
            cultural_note: '温馨的家常炖汤，是韩国家庭餐的灵魂',
          },
          es: {
            name: 'Kimchi Jjigae Picante',
            description: 'Estofado abundante de kimchi con cerdo, tofu y kimchi fermentado',
            cultural_note: 'Un estofado casero reconfortante que es el alma de las comidas familiares coreanas',
          },
        },
        base_price: 1300,
        image_url: 'https://picsum.photos/seed/kimchi-jjigae/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 4,
        challenge_level: 0,
        sort_order: 0,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Sundubu Jjigae',
            description: 'Soft tofu stew simmered with your choice of protein in a spicy broth',
            cultural_note: 'Crack a raw egg into the bubbling stew for extra richness, a beloved technique',
          },
          ko: {
            name: '순두부찌개',
            description: '원하는 단백질과 함께 매운 국물에 끓인 순두부찌개',
            cultural_note: '끓는 찌개에 생 계란을 넣으면 더욱 고소하고 풍부한 맛을 즐길 수 있습니다',
          },
          ja: {
            name: 'スンドゥブチゲ',
            description: 'お好みのタンパク質と辛いスープで煮込んだ純豆腐チゲ',
            cultural_note: 'グツグツ煮えるチゲに生卵を割り入れるのが通の食べ方です',
          },
          zh: {
            name: '嫩豆腐汤',
            description: '嫩豆腐与自选蛋白质在辣汤中炖煮',
            cultural_note: '在沸腾的汤里打入生鸡蛋增加浓郁度，是广受喜爱的吃法',
          },
          es: {
            name: 'Sundubu Jjigae',
            description: 'Estofado de tofu suave cocinado con tu proteína favorita en caldo picante',
            cultural_note: 'Rompe un huevo crudo en el estofado burbujeante para extra cremosidad, una técnica querida',
          },
        },
        base_price: 1400,
        image_url: 'https://picsum.photos/seed/sundubu-jjigae/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 3,
        challenge_level: 0,
        sort_order: 1,
        options: [
          {
            locales: {
              en: { group_name: 'Protein' },
              ko: { group_name: '단백질' },
              ja: { group_name: 'タンパク質' },
              zh: { group_name: '蛋白质' },
              es: { group_name: 'Proteína' },
            },
            is_required: true,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Pork' }, ko: { label: '돼지고기' }, ja: { label: '豚肉' },
                  zh: { label: '猪肉' }, es: { label: 'Cerdo' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Beef' }, ko: { label: '소고기' }, ja: { label: '牛肉' },
                  zh: { label: '牛肉' }, es: { label: 'Ternera' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Seafood' }, ko: { label: '해물' }, ja: { label: '海鮮' },
                  zh: { label: '海鲜' }, es: { label: 'Mariscos' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Vegetable' }, ko: { label: '야채' }, ja: { label: '野菜' },
                  zh: { label: '蔬菜' }, es: { label: 'Verduras' },
                },
                price_delta: 0,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Tteokbokki',
            description: 'Spicy rice cakes in a sweet and spicy gochujang sauce with fish cakes',
            cultural_note: "Korea's most popular street food. The chewy texture is the highlight",
          },
          ko: {
            name: '떡볶이',
            description: '고추장 소스에 어묵과 함께 볶은 매콤달콤한 떡',
            cultural_note: '한국의 가장 인기 있는 길거리 음식입니다. 쫄깃한 식감이 매력 포인트입니다',
          },
          ja: {
            name: 'トッポッキ',
            description: '甘辛いコチュジャンソースで煮込んだ餅とさつま揚げ',
            cultural_note: '韓国で最も人気のある屋台料理。もちもちした食感が魅力です',
          },
          zh: {
            name: '辣炒年糕',
            description: '用甜辣辣椒酱炒制的年糕配鱼饼',
            cultural_note: '韩国最受欢迎的街头小吃。Q弹的口感是亮点',
          },
          es: {
            name: 'Tteokbokki',
            description: 'Pasteles de arroz picantes en salsa dulce y picante de gochujang con pasteles de pescado',
            cultural_note: 'La comida callejera más popular de Corea. La textura masticable es lo más destacado',
          },
        },
        base_price: 1000,
        image_url: 'https://picsum.photos/seed/tteokbokki/400/300',
        is_recommended: true,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 3,
        challenge_level: 2,
        sort_order: 2,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Japchae Rice',
            description: 'Steamed rice served with glass noodle stir-fry and vegetables',
            cultural_note: 'A satisfying combination of two Korean favorites in one bowl',
          },
          ko: {
            name: '잡채밥',
            description: '잡채와 야채를 밥 위에 올린 한 그릇 요리',
            cultural_note: '한국인이 사랑하는 두 가지 음식을 한 그릇에 담았습니다',
          },
          ja: {
            name: 'チャプチェライス',
            description: 'ご飯にチャプチェと野菜をのせた一品',
            cultural_note: '韓国で人気の二つの料理を一つのどんぶりにまとめました',
          },
          zh: {
            name: '杂菜饭',
            description: '米饭配炒粉丝和蔬菜',
            cultural_note: '将两种韩国最爱的美食合二为一的满足组合',
          },
          es: {
            name: 'Arroz con Japchae',
            description: 'Arroz al vapor con fideos de cristal salteados y verduras',
            cultural_note: 'Una combinación satisfactoria de dos favoritos coreanos en un solo bol',
          },
        },
        base_price: 1300,
        image_url: 'https://picsum.photos/seed/japchae-rice/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 3,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Kimchi Fried Rice',
            description: 'Wok-fried rice with aged kimchi, topped with a fried egg',
            cultural_note: 'A beloved Korean comfort food that turns leftover rice and kimchi into a masterpiece',
          },
          ko: {
            name: '김치볶음밥',
            description: '묵은지로 볶은 볶음밥, 계란 프라이를 올려 제공',
            cultural_note: '남은 밥과 김치를 걸작으로 변신시키는 한국의 대표 간편식입니다',
          },
          ja: {
            name: 'キムチチャーハン',
            description: '熟成キムチの炒飯、目玉焼きトッピング',
            cultural_note: '残りご飯とキムチを絶品に変える韓国の定番コンフォートフードです',
          },
          zh: {
            name: '泡菜炒饭',
            description: '用陈泡菜炒制的炒饭，顶部放煎蛋',
            cultural_note: '韩国人最爱的家常美食，将剩饭和泡菜变成一道佳作',
          },
          es: {
            name: 'Arroz Frito con Kimchi',
            description: 'Arroz salteado al wok con kimchi envejecido, coronado con huevo frito',
            cultural_note: 'Una querida comida reconfortante coreana que convierte sobras de arroz y kimchi en una obra maestra',
          },
        },
        base_price: 1200,
        image_url: 'https://picsum.photos/seed/kimchi-fried-rice/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 2,
        challenge_level: 0,
        sort_order: 4,
        options: [
          {
            locales: {
              en: { group_name: 'Add-ons' },
              ko: { group_name: '추가' },
              ja: { group_name: 'トッピング' },
              zh: { group_name: '加料' },
              es: { group_name: 'Extras' },
            },
            is_required: false,
            max_select: 2,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Cheese' }, ko: { label: '치즈' }, ja: { label: 'チーズ' },
                  zh: { label: '芝士' }, es: { label: 'Queso' },
                },
                price_delta: 200,
              },
              {
                locales: {
                  en: { label: 'Fried Egg' }, ko: { label: '계란 프라이' }, ja: { label: '目玉焼き' },
                  zh: { label: '煎蛋' }, es: { label: 'Huevo frito' },
                },
                price_delta: 150,
              },
            ],
          },
        ],
      },
    ],

    // ==============================
    // Side Dishes
    // ==============================
    side_dishes: [
      {
        locales: {
          en: {
            name: 'Gyeran-jjim',
            description: 'Fluffy steamed egg casserole seasoned with sesame oil and green onion',
            cultural_note: 'Light and airy like a savory souffl\u00e9, this egg dish balances heavier main courses',
          },
          ko: {
            name: '계란찜',
            description: '참기름과 파로 간을 한 부드러운 계란찜',
            cultural_note: '수플레처럼 가볍고 부드러운 이 계란 요리는 무거운 메인 요리와 잘 어울립니다',
          },
          ja: {
            name: 'ケランチム',
            description: 'ごま油とネギで味付けしたふわふわの蒸し卵',
            cultural_note: 'スフレのように軽くふわふわ。重いメイン料理のバランスを取ります',
          },
          zh: {
            name: '鸡蛋羹',
            description: '用芝麻油和葱调味的蓬松蒸蛋',
            cultural_note: '像咸味舒芙蕾一样轻盈蓬松，可以平衡较重的主菜',
          },
          es: {
            name: 'Gyeran-jjim',
            description: 'Cazuela de huevo al vapor esponjosa con aceite de sésamo y cebolleta',
            cultural_note: 'Ligero y aireado como un suflé salado, este plato de huevo equilibra los platos principales más pesados',
          },
        },
        base_price: 700,
        image_url: 'https://picsum.photos/seed/gyeran-jjim/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 0,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Pajeon',
            description: 'Crispy Korean green onion pancake with a savory dipping sauce',
            cultural_note: 'Best enjoyed on rainy days with a glass of makgeolli - a Korean tradition',
          },
          ko: {
            name: '파전',
            description: '바삭한 한국식 파전, 양념 간장 소스 제공',
            cultural_note: '비 오는 날 막걸리와 함께 즐기는 것이 한국의 전통입니다',
          },
          ja: {
            name: 'パジョン',
            description: 'カリカリの韓国風ネギチヂミ、タレ付き',
            cultural_note: '雨の日にマッコリと一緒に楽しむのが韓国の伝統です',
          },
          zh: {
            name: '葱煎饼',
            description: '酥脆的韩式葱煎饼配蘸酱',
            cultural_note: '韩国传统是在雨天配上一杯米酒一起享用',
          },
          es: {
            name: 'Pajeon',
            description: 'Panqueque crujiente coreano de cebolleta con salsa para mojar',
            cultural_note: 'Mejor disfrutado en días lluviosos con un vaso de makgeolli - una tradición coreana',
          },
        },
        base_price: 1100,
        image_url: 'https://picsum.photos/seed/pajeon/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: ['gluten', 'eggs'],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 1,
        options: [
          {
            locales: {
              en: { group_name: 'Type' },
              ko: { group_name: '종류' },
              ja: { group_name: 'タイプ' },
              zh: { group_name: '类型' },
              es: { group_name: 'Tipo' },
            },
            is_required: true,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Vegetable' }, ko: { label: '야채' }, ja: { label: '野菜' },
                  zh: { label: '蔬菜' }, es: { label: 'Verduras' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Seafood' }, ko: { label: '해물' }, ja: { label: '海鮮' },
                  zh: { label: '海鲜' }, es: { label: 'Mariscos' },
                },
                price_delta: 300,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Dubu Kimchi',
            description: 'Warm silken tofu paired with stir-fried aged kimchi and pork',
            cultural_note: 'A popular anju (drinking snack) often enjoyed with soju or makgeolli',
          },
          ko: {
            name: '두부김치',
            description: '따뜻한 순두부와 돼지고기 볶음 김치',
            cultural_note: '소주나 막걸리와 함께 즐기는 인기 안주입니다',
          },
          ja: {
            name: 'トゥブキムチ',
            description: '温かい絹ごし豆腐と豚肉入り炒めキムチ',
            cultural_note: '焼酎やマッコリと一緒に楽しむ人気のおつまみです',
          },
          zh: {
            name: '豆腐泡菜',
            description: '温热嫩豆腐配炒陈泡菜和猪肉',
            cultural_note: '搭配烧酒或米酒的热门下酒菜',
          },
          es: {
            name: 'Dubu Kimchi',
            description: 'Tofu sedoso tibio con kimchi envejecido salteado y cerdo',
            cultural_note: 'Un popular aperitivo para beber (anju) a menudo disfrutado con soju o makgeolli',
          },
        },
        base_price: 900,
        image_url: 'https://picsum.photos/seed/dubu-kimchi/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 2,
        challenge_level: 0,
        sort_order: 2,
        options: [],
      },
    ],

    // ==============================
    // Drinks
    // ==============================
    drinks: [
      {
        locales: {
          en: {
            name: 'Soju',
            description: 'Classic Korean rice spirit, clean and smooth (360ml bottle)',
            cultural_note: "Never pour your own drink. It's customary for others to pour for you",
          },
          ko: {
            name: '소주',
            description: '깔끔하고 부드러운 한국 전통 증류주 (360ml)',
            cultural_note: '자신의 잔에 직접 따르지 않는 것이 예절입니다. 서로 잔을 채워주세요',
          },
          ja: {
            name: '焼酎（ソジュ）',
            description: 'クラシックな韓国の焼酎、クリーンでスムーズ（360mlボトル）',
            cultural_note: '自分で注がないのが韓国の礼儀。相手に注いでもらいましょう',
          },
          zh: {
            name: '烧酒',
            description: '经典韩国烧酒，清爽顺滑（360ml瓶装）',
            cultural_note: '不要给自己倒酒。让别人为你斟酒是韩国的礼仪',
          },
          es: {
            name: 'Soju',
            description: 'Licor de arroz coreano clásico, limpio y suave (botella de 360ml)',
            cultural_note: 'Nunca sirvas tu propia bebida. Es costumbre que otros sirvan para ti',
          },
        },
        base_price: 800,
        image_url: 'https://picsum.photos/seed/soju/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 3,
        sort_order: 0,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Makgeolli',
            description: 'Traditional Korean rice wine, milky and slightly sweet with a tangy finish',
            cultural_note: 'Korea\'s oldest alcoholic beverage, pairs perfectly with pajeon on rainy evenings',
          },
          ko: {
            name: '막걸리',
            description: '유백색의 달콤하고 새콤한 한국 전통 쌀 발효주',
            cultural_note: '한국에서 가장 오래된 술로, 비 오는 저녁 파전과 함께하면 최고입니다',
          },
          ja: {
            name: 'マッコリ',
            description: '韓国の伝統的な米酒、乳白色で甘酸っぱい味わい',
            cultural_note: '韓国最古のお酒。雨の夕べにパジョンと一緒に味わうのが最高です',
          },
          zh: {
            name: '米酒',
            description: '韩国传统米酒，乳白色，微甜带酸',
            cultural_note: '韩国最古老的酒类，在雨夜配葱煎饼最为完美',
          },
          es: {
            name: 'Makgeolli',
            description: 'Vino de arroz coreano tradicional, lechoso y ligeramente dulce con un toque ácido',
            cultural_note: 'La bebida alcohólica más antigua de Corea, combina perfectamente con pajeon en noches lluviosas',
          },
        },
        base_price: 1000,
        image_url: 'https://picsum.photos/seed/makgeolli/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 1,
        sort_order: 1,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Yuzu Tea',
            description: 'Hot citrus tea made with yuzu marmalade, refreshing and aromatic',
            cultural_note: 'A soothing caffeine-free drink perfect after a rich Korean meal',
          },
          ko: {
            name: '유자차',
            description: '유자 마멀레이드로 만든 뜨거운 시트러스 차',
            cultural_note: '풍성한 한국 식사 후 즐기기 좋은 카페인 프리 음료입니다',
          },
          ja: {
            name: 'ゆず茶',
            description: '柚子マーマレードで作った温かいシトラスティー',
            cultural_note: '韓国料理の後にぴったりの、カフェインフリーの癒やしのドリンクです',
          },
          zh: {
            name: '柚子茶',
            description: '用柚子果酱冲泡的热柑橘茶，清爽芳香',
            cultural_note: '丰盛的韩餐后享用的完美无咖啡因饮品',
          },
          es: {
            name: 'Té de Yuzu',
            description: 'Té cítrico caliente hecho con mermelada de yuzu, refrescante y aromático',
            cultural_note: 'Una bebida relajante sin cafeína perfecta después de una rica comida coreana',
          },
        },
        base_price: 500,
        image_url: 'https://picsum.photos/seed/yuzu-tea/400/300',
        is_recommended: false,
        dietary_tags: ['vegan'],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 2,
        options: [],
      },
    ],

    // ==============================
    // Desserts
    // ==============================
    desserts: [
      {
        locales: {
          en: {
            name: 'Bingsu',
            description: 'Shaved ice dessert with sweetened red beans, mochi, and condensed milk',
            cultural_note: 'Best shared among the table. A perfect summer treat',
          },
          ko: {
            name: '빙수',
            description: '단팥, 떡, 연유를 올린 빙수',
            cultural_note: '함께 나눠 먹으면 더 맛있습니다. 여름에 완벽한 디저트입니다',
          },
          ja: {
            name: 'ピンス',
            description: 'あずき、もち、練乳がのったかき氷デザート',
            cultural_note: 'テーブルの皆でシェアするのがベスト。夏にぴったりのデザートです',
          },
          zh: {
            name: '刨冰',
            description: '配有红豆、麻糬和炼乳的刨冰甜品',
            cultural_note: '最适合全桌共享。完美的夏日甜品',
          },
          es: {
            name: 'Bingsu',
            description: 'Postre de hielo raspado con frijoles rojos dulces, mochi y leche condensada',
            cultural_note: 'Mejor compartido entre la mesa. Un postre perfecto para el verano',
          },
        },
        base_price: 1200,
        image_url: 'https://picsum.photos/seed/bingsu/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 0,
        options: [
          {
            locales: {
              en: { group_name: 'Flavor' },
              ko: { group_name: '맛' },
              ja: { group_name: 'フレーバー' },
              zh: { group_name: '口味' },
              es: { group_name: 'Sabor' },
            },
            is_required: true,
            max_select: 1,
            sort_order: 0,
            values: [
              {
                locales: {
                  en: { label: 'Red Bean' }, ko: { label: '팥' }, ja: { label: 'あずき' },
                  zh: { label: '红豆' }, es: { label: 'Frijol rojo' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Mango' }, ko: { label: '망고' }, ja: { label: 'マンゴー' },
                  zh: { label: '芒果' }, es: { label: 'Mango' },
                },
                price_delta: 0,
              },
              {
                locales: {
                  en: { label: 'Matcha' }, ko: { label: '말차' }, ja: { label: '抹茶' },
                  zh: { label: '抹茶' }, es: { label: 'Matcha' },
                },
                price_delta: 0,
              },
            ],
          },
        ],
      },
      {
        locales: {
          en: {
            name: 'Hotteok',
            description: 'Sweet Korean pancake filled with brown sugar, cinnamon, and chopped nuts',
            cultural_note: 'A beloved winter street snack. Be careful of the hot filling when you take your first bite!',
          },
          ko: {
            name: '호떡',
            description: '흑설탕, 계피, 다진 견과류가 들어간 달콤한 호떡',
            cultural_note: '겨울 길거리 간식의 대표주자! 첫 입에 뜨거운 속 조심하세요!',
          },
          ja: {
            name: 'ホットク',
            description: '黒糖、シナモン、ナッツが入った甘い韓国式パンケーキ',
            cultural_note: '冬の定番屋台スナック。中の熱い餡にご注意ください！',
          },
          zh: {
            name: '糖饼',
            description: '内馅为红糖、肉桂和碎坚果的甜煎饼',
            cultural_note: '深受喜爱的冬季街头小吃。第一口小心烫嘴的内馅！',
          },
          es: {
            name: 'Hotteok',
            description: 'Panqueque dulce coreano relleno de azúcar moreno, canela y nueces picadas',
            cultural_note: 'Un querido snack callejero de invierno. ¡Cuidado con el relleno caliente en el primer bocado!',
          },
        },
        base_price: 600,
        image_url: 'https://picsum.photos/seed/hotteok/400/300',
        is_recommended: false,
        dietary_tags: [],
        allergens: ['gluten'],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 1,
        options: [],
      },
      {
        locales: {
          en: {
            name: 'Songpyeon',
            description: 'Half-moon shaped rice cakes filled with sesame, beans, or chestnuts',
            cultural_note: 'Traditional Chuseok (harvest festival) dessert shaped like half-moons',
          },
          ko: {
            name: '송편',
            description: '깨, 콩 또는 밤 소를 넣은 반달 모양 떡',
            cultural_note: '추석(한가위)에 빚어 먹는 전통 떡으로, 반달 모양이 특징입니다',
          },
          ja: {
            name: 'ソンピョン',
            description: 'ごま、豆、栗を包んだ半月形のお餅',
            cultural_note: '秋夕（チュソク、収穫祭）の伝統的なデザートで、半月の形をしています',
          },
          zh: {
            name: '松饼',
            description: '以芝麻、豆或栗子为馅的半月形年糕',
            cultural_note: '中秋节（丰收节）传统甜点，形如半月',
          },
          es: {
            name: 'Songpyeon',
            description: 'Pasteles de arroz en forma de media luna rellenos de sésamo, frijoles o castañas',
            cultural_note: 'Postre tradicional del Chuseok (festival de la cosecha) con forma de media luna',
          },
        },
        base_price: 700,
        image_url: 'https://picsum.photos/seed/songpyeon/400/300',
        is_recommended: false,
        dietary_tags: ['vegan', 'gluten_free'],
        allergens: [],
        spiciness_level: 0,
        challenge_level: 0,
        sort_order: 2,
        options: [],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('[Seed] Starting seed...\n');

  // ------------------------------------------------------------------
  // 1. Clear all existing data (in correct foreign-key order)
  // ------------------------------------------------------------------
  console.log('[Seed] Clearing existing data...');
  await prisma.cartItem.deleteMany();
  await prisma.sharedCart.deleteMany();
  await prisma.order.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.menuOption.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.store.deleteMany();
  await prisma.owner.deleteMany();
  console.log('[Seed] Cleared all existing data.\n');

  // ------------------------------------------------------------------
  // 2. Create owner
  // ------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('admin123', 12);
  const owner = await prisma.owner.create({
    data: {
      email: 'admin@anytable.com',
      password_hash: passwordHash,
      name: 'Admin',
    },
  });
  console.log(`[Seed] Created owner: ${owner.email} (${owner.id})`);

  // ------------------------------------------------------------------
  // 3. Create store
  // ------------------------------------------------------------------
  const store = await prisma.store.create({
    data: {
      owner_id: owner.id,
      name: 'Seoul Kitchen',
      address: '123 Gangnam-daero, Gangnam-gu, Seoul',
      phone: '+82-2-1234-5678',
      default_language: 'en',
      supported_languages: ['en', 'ko', 'ja', 'zh', 'es'],
      settings: {
        order_confirm_mode: 'ANYONE',
        session_ttl_minutes: 180,
        allow_additional_orders: true,
        tax_rate: 0.08,
        service_charge_rate: 0.10,
        tax_included: false,
      },
    },
  });
  console.log(`[Seed] Created store: ${store.name} (${store.id})`);

  // ------------------------------------------------------------------
  // 4. Create 12 tables with QR tokens
  // ------------------------------------------------------------------
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const tableId = crypto.randomUUID();
    const qrToken = generateQrToken(store.id, tableId, 1);

    const table = await prisma.table.create({
      data: {
        id: tableId,
        store_id: store.id,
        table_number: i,
        label: `Table ${i}`,
        seats: 4,
        status: 'ACTIVE',
        qr_token: qrToken,
        qr_token_version: 1,
      },
    });
    tables.push(table);
  }
  console.log(`[Seed] Created ${tables.length} tables.`);

  // ------------------------------------------------------------------
  // 5. Create categories
  // ------------------------------------------------------------------
  const categoryMap: Record<string, string> = {};
  for (const def of categoryDefs) {
    const category = await prisma.category.create({
      data: {
        store_id: store.id,
        sort_order: def.sort_order,
        locales: def.locales,
        is_active: true,
      },
    });
    categoryMap[def.key] = category.id;
  }
  console.log(`[Seed] Created ${categoryDefs.length} categories.`);

  // ------------------------------------------------------------------
  // 6. Create menus with options
  // ------------------------------------------------------------------
  const allMenuDefs = buildMenuDefs();
  let menuCount = 0;

  for (const [categoryKey, menuDefs] of Object.entries(allMenuDefs)) {
    const categoryId = categoryMap[categoryKey];
    if (!categoryId) {
      console.warn(`[Seed] Warning: category key "${categoryKey}" not found, skipping.`);
      continue;
    }

    for (const def of menuDefs) {
      const menu = await prisma.menu.create({
        data: {
          store_id: store.id,
          category_id: categoryId,
          base_price: def.base_price,
          image_url: def.image_url,
          is_sold_out: false,
          is_recommended: def.is_recommended,
          is_hidden: false,
          dietary_tags: def.dietary_tags,
          allergens: def.allergens,
          spiciness_level: def.spiciness_level,
          challenge_level: def.challenge_level,
          locales: def.locales,
          sort_order: def.sort_order,
        },
      });

      // Create menu options
      for (const optDef of def.options) {
        const optionValues = optDef.values.map((v, idx) => ({
          id: crypto.randomUUID(),
          locales: v.locales,
          price_delta: v.price_delta,
          sort_order: idx,
        }));

        await prisma.menuOption.create({
          data: {
            menu_id: menu.id,
            locales: optDef.locales,
            is_required: optDef.is_required,
            max_select: optDef.max_select,
            values: optionValues,
            sort_order: optDef.sort_order,
          },
        });
      }

      menuCount++;
    }
  }
  console.log(`[Seed] Created ${menuCount} menus with options.\n`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log(
    `Seeded: 1 owner, 1 store, ${tables.length} tables, ${categoryDefs.length} categories, ${menuCount} menus`,
  );

  // ------------------------------------------------------------------
  // Print test QR token for Table 1
  // ------------------------------------------------------------------
  const table1 = tables[0];
  console.log(`\n[Test] QR token for Table 1 (id: ${table1.id}):`);
  console.log(`  Token: ${table1.qr_token}`);
  console.log(`\n[Test] Use this token in the join-session API:`);
  console.log(`  POST /api/public/table-sessions/join`);
  console.log(`  Body: { "qr_token": "${table1.qr_token}", "nickname": "TestUser", "device_fingerprint": "test-fp-123" }`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n[Seed] Done.');
  })
  .catch(async (e) => {
    console.error('[Seed] Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
