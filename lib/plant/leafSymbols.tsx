/**
 * Reusable leaf SVG asset library.
 *
 * Per the spec we use AI-designed, *static* leaf silhouettes — NOT one image
 * per comment. Each style is a <symbol> with a transparent background and an
 * internal area large enough for a short username. A <text> username is
 * overlaid programmatically on the frontend (never AI-generated text).
 *
 * The 20 styles share a consistent visual language (soft, organic, storybook
 * garden) but vary in silhouette, veins and hue so different users get
 * visibly distinct leaves.
 */

export const LEAF_SYMBOLS: string[] = [
  // 0 — classic oval with midrib
  `<path d="M50 4 C20 18 12 50 26 84 C40 100 60 100 74 84 C88 50 80 18 50 4 Z" fill="#6fbf73"/>
   <path d="M50 10 L50 92" stroke="#3f8f4f" stroke-width="3" fill="none"/>
   <path d="M50 34 L34 26 M50 34 L66 26 M50 54 L32 48 M50 54 L68 48" stroke="#3f8f4f" stroke-width="2" fill="none" opacity="0.7"/>`,
  // 1 — heart leaf
  `<path d="M50 88 C18 60 8 36 26 20 C38 9 50 18 50 28 C50 18 62 9 74 20 C92 36 82 60 50 88 Z" fill="#7ec97f"/>
   <path d="M50 80 L50 34" stroke="#4a9b57" stroke-width="3" fill="none"/>`,
  // 2 — maple-ish
  `<path d="M50 6 L58 30 L78 26 L64 44 L86 50 L64 56 L78 78 L58 66 L50 92 L42 66 L22 78 L36 56 L14 50 L36 44 L22 26 L42 30 Z" fill="#8bcf6b"/>
   <path d="M50 60 L50 92" stroke="#4f9444" stroke-width="3"/>`,
  // 3 — tall slim
  `<path d="M50 2 C32 22 28 60 40 96 C50 102 50 102 60 96 C72 60 68 22 50 2 Z" fill="#74c46f"/>
   <path d="M50 8 L50 94" stroke="#42923f" stroke-width="3"/>`,
  // 4 — round
  `<circle cx="50" cy="52" r="44" fill="#88cf74"/>
   <path d="M50 12 L50 92" stroke="#4a9b55" stroke-width="3"/>
   <path d="M50 40 L30 30 M50 40 L70 30 M50 64 L28 58 M50 64 L72 58" stroke="#4a9b55" stroke-width="2" opacity="0.7"/>`,
  // 5 — teardrop
  `<path d="M50 6 C16 36 16 74 50 96 C84 74 84 36 50 6 Z" fill="#79c878"/>
   <path d="M50 12 L50 92" stroke="#3f9b53" stroke-width="3"/>`,
  // 6 — three-lobed
  `<path d="M50 8 C70 14 86 30 80 50 C92 56 92 72 76 78 C82 92 64 96 56 86 C50 96 36 96 30 84 C14 80 14 62 28 56 C20 40 32 22 50 8 Z" fill="#83c873"/>`,
  // 7 — spade
  `<path d="M50 4 C24 26 24 56 50 64 C76 56 76 26 50 4 Z M50 60 L50 96" fill="#7cc776" stroke="#47994e" stroke-width="3"/>`,
  // 8 — pointed willow
  `<path d="M50 2 C40 26 40 60 48 98 L52 98 C60 60 60 26 50 2 Z" fill="#6fc06f"/>
   <path d="M50 10 L50 92" stroke="#3f9444" stroke-width="2"/>`,
  // 9 — clover
  `<circle cx="38" cy="40" r="22" fill="#86cf72"/><circle cx="62" cy="40" r="22" fill="#86cf72"/><circle cx="50" cy="64" r="22" fill="#86cf72"/>
   <path d="M50 70 L50 96" stroke="#47994e" stroke-width="3"/>`,
  // 10 — serrated oval
  `<path d="M50 4 L60 14 L56 24 L68 30 L60 42 L74 52 L60 60 L72 74 L56 76 L58 90 L50 84 L42 90 L44 76 L28 74 L40 60 L26 52 L40 42 L32 30 L44 24 L40 14 Z" fill="#7ecb76"/>`,
  // 11 — fan
  `<path d="M50 96 C20 80 16 40 50 8 C84 40 80 80 50 96 Z" fill="#8bd07a"/>
   <path d="M50 90 L34 30 M50 90 L50 18 M50 90 L66 30" stroke="#4a9b55" stroke-width="2" opacity="0.7"/>`,
  // 12 — lance
  `<path d="M50 2 C38 30 36 64 50 98 C64 64 62 30 50 2 Z" fill="#73c370"/>
   <path d="M50 10 L50 92" stroke="#3f9242" stroke-width="2.5"/>`,
  // 13 — twin leaf
  `<path d="M50 96 C30 80 24 50 44 24 C48 44 50 64 50 96 Z" fill="#7fc878"/>
   <path d="M50 96 C70 80 76 50 56 24 C52 44 50 64 50 96 Z" fill="#8ed183"/>`,
  // 14 — diamond
  `<path d="M50 4 L84 52 L50 96 L16 52 Z" fill="#7ccb73"/>
   <path d="M50 10 L50 90 M22 52 L78 52" stroke="#47994e" stroke-width="2" opacity="0.7"/>`,
  // 15 — bud cluster
  `<circle cx="50" cy="44" r="26" fill="#86cf72"/><circle cx="36" cy="60" r="16" fill="#9ad98a"/><circle cx="64" cy="60" r="16" fill="#9ad98a"/>
   <path d="M50 50 L50 92" stroke="#47994e" stroke-width="3"/>`,
  // 16 — wavy edge
  `<path d="M50 4 C26 14 22 36 36 46 C20 56 24 80 42 86 C40 92 60 92 58 86 C76 80 80 56 64 46 C78 36 74 14 50 4 Z" fill="#7ec975"/>`,
  // 17 — sword
  `<path d="M50 2 L58 40 L56 90 L44 90 L42 40 Z" fill="#74c46f"/>
   <path d="M50 8 L50 88" stroke="#3f9242" stroke-width="2"/>`,
  // 18 — scalloped
  `<path d="M50 6 C34 6 24 18 30 30 C16 34 16 52 30 54 C24 68 36 84 50 80 C64 84 76 68 70 54 C84 52 84 34 70 30 C76 18 66 6 50 6 Z" fill="#83cd77"/>`,
  // 19 — blossom leaf
  `<path d="M50 4 C22 20 18 54 44 86 C50 92 50 92 56 86 C82 54 78 20 50 4 Z" fill="#7ccb76"/>
   <circle cx="50" cy="40" r="9" fill="#ffd9ec"/><circle cx="50" cy="40" r="4" fill="#ff9ec7"/>`,
];

export const LEAF_SYMBOL_COUNT = LEAF_SYMBOLS.length;
