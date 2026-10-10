# Pokémon Coworking — especificação de design e integração

> Documento-briefing para uma IA de geração de imagem ou para o Claude Design.
> Objetivo: redesenhar o escritório pixel-art do **coworking-agents** como um
> mundo Pokémon, em que cada **sala de trabalho é uma zona climática** e cada
> **agente de IA é um Pokémon do tipo daquela zona**, com sprites animados
> vindos da **PokéAPI**.

---

## 1. Visão em uma frase

Um mapa visto de cima, no estilo dos jogos Pokémon de GBA/DS (FireRed, HeartGold
e Black/White), em que cada repositório é um bioma (vulcão, lago, floresta,
caverna de gelo…) e cada sessão de Claude Code ou Codex é um Pokémon trabalhando
numa mesa dentro desse bioma.

## 2. Referência: o escritório atual (o que manter)

O layout atual (ver `docs/office-day.png` e `docs/office-night.png`) é a base. **A
estrutura fica igual; só o tema muda.**

| Elemento atual | O que é | Versão Pokémon |
|---|---|---|
| Barra superior (HUD) com contadores `trabalhando / precisa de você / sua vez / dormindo` | Status global | HUD no estilo da caixa de diálogo de Pokémon (borda branca arredondada e fundo azul-escuro), com ícones de Poké Ball no lugar dos pontos coloridos |
| Parede de fundo com quadros, placar semanal, "Agent of the Month", "ON AIR" | Decoração e métricas | Quadro de insígnias de ginásio, "Treinador do Mês" com a foto do Pokémon e placa "ON AIR" num rádio Pokégear |
| **Salas de equipe** (uma por repositório, título no topo, uma mesa por sessão, rótulo com nome, tarefa e estado) | Zona de trabalho | **Zona climática** (seção 4) |
| Copa/cozinha à direita | Onde o agente espera quando é a sua vez | **Centro Pokémon** (balcão da enfermeira Joy, máquina de cura) |
| Mesa de ping-pong | Lazer | **Arena de batalha** em miniatura |
| Sala de reunião de vidro | Onde vai quem está delegando a subagentes | **Ginásio**, com o Pokémon principal no centro e os subagentes como Pokémon menores ao redor |
| Canto da soneca ("DESCANSO") | Sessões dormindo | **Creche Pokémon** (Day Care), com camas de feno e um Snorlax decorativo |
| Sala de jogos (fliperamas, pebolim, sinuca, aquário, máquina SHOP, cavalete, mural) | Ociosos e acesso aos relatórios | **Zona Safari**: grama alta, lago com Magikarp, PokéMart no lugar da SHOP, mural de notícias e o jornal "The Office Times" virando "Pokémon Times" |
| Toast "Novo certificado na parede!" | Conquistas | Caixa de diálogo "Seu Pokémon ganhou uma insígnia!" |
| Ponto de exclamação vermelho sobre o agente | Precisa de você | O **"!" de encontro** dos jogos Pokémon, branco num balão |

Medidas que o código usa hoje (`public/js/floorplan.js`), para que as artes
encaixem sem refazer o layout:

- célula de mesa: **100 × 96 px** (unidades lógicas);
- largura da ala direita: **148 px**;
- cabeçalho da sala: **14 px**, padding de **6 px**;
- até **9 sessões por sala** e **24 por andar**;
- renderização em pixel art pura (`image-rendering: pixelated`), sem antialiasing.

## 3. Integração com a PokéAPI

API pública, sem chave e sem autenticação: `https://pokeapi.co/api/v2/`.
A política de uso justo pede **cache local**. Os sprites devem ser baixados uma vez
e guardados em `~/.config/coworking-agents/pokemon-cache/`, nunca buscados a cada
frame.

### 3.1 Endpoints usados

| Para quê | Endpoint | Campos usados |
|---|---|---|
| Lista de Pokémon de um tipo | `GET /type/{fire\|water\|grass\|…}` | `pokemon[].pokemon.name`, `pokemon[].pokemon.url` |
| Dados e sprites de um Pokémon | `GET /pokemon/{id ou nome}` | `id`, `name`, `types[].type.name`, `sprites` |
| Nome localizado (pt-BR não existe; usar `en` ou `ja-Hrkt`) | `GET /pokemon-species/{id}` | `names[]`, `is_legendary`, `is_mythical`, `evolves_from_species` |

### 3.2 Sprites de movimento: o que existe de fato

A PokéAPI **não tem ciclo de caminhada em 4 direções (overworld)**. Ela oferece
sprites de batalha, alguns animados:

| Caminho dentro de `sprites` | Formato | Uso no escritório |
|---|---|---|
| `other.showdown.front_default` | GIF animado (idle "respirando") | **Principal**: agente virado para a câmera |
| `other.showdown.back_default` | GIF animado | Agente de costas, sentado à mesa diante do monitor |
| `versions["generation-v"]["black-white"].animated.front_default` / `back_default` | GIF animado, estilo B/W, ids 1–649 | Alternativa com mais cara de pixel art |
| `front_default`, `back_default`, `front_shiny` | PNG estático 96 × 96 | Reserva, se não houver GIF |
| `other["official-artwork"].front_default` | PNG em alta resolução | Painel lateral e quadro "Treinador do Mês" |

Os mesmos arquivos estão em
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/…`,
o que facilita o cache.

**Regra para o movimento:**

1. **Andar para baixo**: GIF `front`. **Andar para cima**: GIF `back`.
   **Andar para os lados**: GIF `front` espelhado (`scaleX(-1)`) para a direita.
   Somar um *bob* vertical de 1–2 px a cada 150 ms para simular passos.
2. **Opcional (para a IA de imagem)**: gerar uma *spritesheet* overworld própria
   de **32 × 32 px, 4 direções × 3 quadros**, usando o sprite da PokéAPI como
   referência de forma e cor (prompt na seção 7.3).
3. Escalar sempre por **inteiro** (×1 ou ×2), nunca por fração.

### 3.3 Contrato de dados (o que o front-end recebe)

```json
{
  "sessionId": "8f3c…",
  "agent": "claude",
  "repo": "backend-challenge",
  "zone": { "biome": "volcano", "type": "fire" },
  "pokemon": {
    "id": 4,
    "name": "charmander",
    "types": ["fire"],
    "sprites": {
      "front": "/pokemon-cache/4/front.gif",
      "back": "/pokemon-cache/4/back.gif",
      "static": "/pokemon-cache/4/front.png",
      "artwork": "/pokemon-cache/4/artwork.png"
    }
  },
  "state": "thinking"
}
```

## 4. Zonas climáticas ↔ tipos

Cada sala de repositório recebe **um bioma**. A escolha é **determinística**:
`hash(nomeDoRepo) % biomas.length`, para que o mesmo repositório caia sempre na
mesma zona. Também pode ser fixada à mão num arquivo de configuração. Os
Pokémon da sala são do **tipo principal** do bioma; o tipo secundário entra
quando a sala tiver mais sessões do que variedade de Pokémon.

| Bioma | Tipo principal / secundário | Chão | Paredes e props | Clima animado | Paleta |
|---|---|---|---|---|---|
| **Vulcão** | fire / ground | rocha basáltica escura com rachaduras de lava | pilares de obsidiana, mesa de pedra, monitor sobre um bloco de magma | brasas subindo, distorção de calor | `#2b1a17` `#d9481c` `#f5a524` `#ffe07a` |
| **Lago tropical** | water / ice | deque de madeira sobre água rasa | boias, mesa de bambu, cascata ao fundo | ondas no chão, gotas de chuva intermitentes | `#123a5c` `#2f7fc1` `#6fd0e8` `#e8f6ff` |
| **Floresta** | grass / bug | grama alta com trilha de terra | troncos como mesa, cipós, cogumelos | folhas caindo, vaga-lumes à noite | `#1f3b1d` `#3f7a2e` `#8cc84b` `#e9f2b0` |
| **Tempestade** | electric / steel | piso metálico com faixas de alerta | torres de energia, cabos, mesa de servidor | relâmpagos no fundo, faíscas nos monitores | `#1c1f33` `#3a3f6b` `#f7d02c` `#fff7c2` |
| **Caverna de gelo** | ice / water | gelo azulado com reflexo | estalactites, mesa de gelo, iglu | neve fina, respiração visível | `#1d2c44` `#6e9cc9` `#bfe3f5` `#ffffff` |
| **Cânion do deserto** | ground / rock | areia com dunas | rochas vermelhas, cactos, mesa de arenito | tempestade de areia leve, tumbleweed | `#4a2e1a` `#b9733a` `#e8b86b` `#fbe6b5` |
| **Montanha rochosa** | rock / fighting | pedra cinza em blocos | rochas, fósseis na parede, mesa de pedra | pedrinhas rolando | `#2e2a26` `#6b5f53` `#a89a86` `#e2d8c6` |
| **Pântano tóxico** | poison / dark | lodo roxo com bolhas | árvores mortas, barris, mesa de madeira podre | bolhas estourando, névoa roxa | `#24142e` `#5b2a6e` `#a24bc4` `#d9a6f0` |
| **Céu nas nuvens** | flying / fairy | nuvens sólidas | pilares gregos, mesa flutuante, arco-íris | nuvens passando, pássaros | `#4d7fbf` `#9ec6f2` `#f2f7ff` `#ffd9ec` |
| **Torre assombrada** | ghost / dark | tábuas rangendo | velas, quadros tortos, teias, lápides | velas tremulando, fantasminhas transparentes | `#120e1f` `#33285a` `#6c5ba8` `#b7f0c8` |
| **Templo psíquico** | psychic / fairy | mármore rosado com mandalas | colunas, cristais, mesa levitando | partículas orbitando, brilho pulsante | `#2d1636` `#a2457f` `#f28fc1` `#ffe1f0` |
| **Covil do dragão** | dragon / fire | pedra antiga com runas | ossos, tesouro, mesa de pedra entalhada | fumaça, olhos brilhando no escuro | `#14131f` `#3b2f6e` `#7b5ce0` `#f2c14e` |
| **Fábrica de aço** | steel / electric | chapas rebitadas | engrenagens, esteiras, mesa industrial | engrenagens girando, vapor | `#1e2226` `#4d5966` `#9aa7b3` `#e3e9ee` |
| **Vila tranquila** | normal / fairy | piso de madeira clara (igual ao atual) | móveis comuns, vasos, quadros | nenhum (zona neutra, padrão) | a paleta atual do projeto |

### 4.1 Cores por tipo (bordas, rótulos e brilhos)

Usar as cores oficiais de tipo nos rótulos das salas e no anel sob cada Pokémon:

`normal #A8A77A` · `fire #EE8130` · `water #6390F0` · `electric #F7D02C` ·
`grass #7AC74C` · `ice #96D9D6` · `fighting #C22E28` · `poison #A33EA1` ·
`ground #E2BF65` · `flying #A98FF3` · `psychic #F95587` · `bug #A6B91A` ·
`rock #B6A136` · `ghost #735797` · `dragon #6F35FC` · `dark #705746` ·
`steel #B7B7CE` · `fairy #D685AD`

## 5. Qual Pokémon cada agente recebe

1. Pegar a lista do tipo da zona (`GET /type/{tipo}`).
2. Filtrar: **ids ≤ 649** se for usar os GIFs Black/White; tirar formas alternativas
   (nomes com `-mega`, `-gmax`, `-alola`…) e, por padrão, lendários e míticos.
3. Escolher: `lista[hash(sessionId) % lista.length]`. A mesma sessão é sempre o
   mesmo Pokémon, e duas sessões da mesma sala não se repetem (em caso de colisão,
   avançar para o próximo índice).
4. **Evolução como progresso** (opcional): a sessão começa como forma básica e
   evolui conforme o tempo ativo ou os tokens gastos (por exemplo, Charmander →
   Charmeleon com 1 h ativa → Charizard com 4 h). A cadeia vem de
   `pokemon-species.evolution_chain.url`.
5. **Shiny** como conquista rara: usar `front_shiny` quando a sessão
   desbloquear um certificado de nível ouro ou maior.

Identidade de cada ferramenta de IA (acessório pequeno sobre o Pokémon, para
distinguir quem é quem):

| Ferramenta | Acessório |
|---|---|
| Claude Code | lenço laranja |
| Codex | boné verde |
| Gemini CLI | óculos azuis |
| Aider / OpenCode / outros | mochila cinza |

## 6. Estados do agente → animação Pokémon

Os estados vêm de `public/js/actors.js` e do snapshot do servidor.

| Estado no código | Onde o Pokémon fica | Animação | Balão |
|---|---|---|---|
| `working` / `editing` / `terminal` | Na mesa, de costas (`back`) | GIF back em loop; partículas do tipo saindo do teclado (brasas, gotas, folhas, faíscas…) | — |
| `thinking` | Na mesa | GIF front com *bob* lento | "…" no balão de diálogo Pokémon |
| `needs_you` / `waiting` | Na mesa, virado para a câmera | Pulo curto a cada 2 s | **"!" de encontro** branco, piscando |
| `turn` / `done` (sua vez) | Anda até o **Centro Pokémon** | Caminhada (seção 3.2) e depois idle no balcão | Toast "Done!" vira "Seu Pokémon está pronto!" |
| `delegate` (com subagentes) | **Ginásio** | Pokémon principal no centro; subagentes como Pokémon menores (escala ×1) da mesma linha evolutiva | Ícone de Poké Ball girando |
| `idle` | **Zona Safari** (lounge) | Passeio aleatório pela grama alta | — |
| `asleep` | **Creche** (nap) | GIF parado, quadro estático, levemente escurecido | "Zzz" |
| Chegada de sessão | Sala | Poké Ball cai, abre com flash branco e o Pokémon sai | — |
| Saída de sessão | Sala | Feixe vermelho de volta para a Poké Ball, que sai rolando | — |

## 7. Prompts prontos

### 7.1 Para o Claude Design (tela inteira)

```
Desenhe um mapa de escritório em pixel art visto de cima, no estilo Pokémon
HeartGold/Black-White (tiles de 16 px, escala 2x, sem antialiasing, contornos
escuros de 1 px). Layout:
- Topo: HUD como uma caixa de diálogo Pokémon (borda branca arredondada, fundo
  azul-marinho) com 4 contadores com ícones de Poké Ball: trabalhando, precisa de
  você, sua vez, dormindo.
- Parede de fundo: quadro de insígnias, retrato "Treinador do Mês", janelas.
- Esquerda e centro: 3 salas de trabalho lado a lado, cada uma num bioma:
  VULCÃO (fogo), LAGO TROPICAL (água), FLORESTA (planta). Cada sala tem título
  no topo numa plaquinha com a cor do tipo e 1 a 3 mesas com computador. Em cada
  mesa, um Pokémon do tipo da sala, sentado de costas digitando. Abaixo da mesa,
  um rótulo com o nome da sessão, a tarefa atual e o estado.
- Embaixo: Zona Safari larga com grama alta, lago com Magikarp, PokéMart e mural.
- Coluna direita: Centro Pokémon (balcão e máquina de cura), arena de batalha
  pequena, Ginásio de vidro e Creche com camas de feno.
- Um Pokémon na Floresta com o "!" branco de encontro na cabeça.
- Um toast no canto inferior esquerdo: "Seu Pokémon ganhou uma insígnia!".
Paleta coerente por bioma, iluminação diurna e proporção 16:9.
```

### 7.2 Para IA de imagem: um bioma por vez (tileset)

```
Top-down pixel art tileset, Pokémon Gen 5 style, 16x16 tiles, 2x scale,
crisp pixels, no antialiasing, 1px dark outlines, limited palette
{PALETA DO BIOMA}. Theme: {BIOMA} office room — floor tiles, wall tiles,
a desk with a CRT monitor and keyboard made of {MATERIAL}, a chair, 3
decorative props ({PROPS}), ambient effect frames ({CLIMA}, 4 frames).
Transparent background, grid-aligned, sprite sheet layout.
```

Exemplo preenchido (Vulcão): `PALETA = #2b1a17 #d9481c #f5a524 #ffe07a`,
`MATERIAL = obsidian and basalt`,
`PROPS = lava crack, obsidian pillar, ember brazier`,
`CLIMA = rising embers`.

### 7.3 Para IA de imagem: spritesheet overworld de um Pokémon

```
Pixel art overworld sprite sheet of {POKEMON}, Pokémon HeartGold walking
style, 32x32 px per frame, 4 rows (down, left, right, up) x 3 frames
(step-left, idle, step-right), transparent background, faithful to the
reference sprite colors and silhouette, 1px dark outline, no antialiasing.
Reference: {URL do sprites.other.showdown.front_default}
```

## 8. Critérios de aceite

- [ ] Cada sala tem bioma, rótulo e paleta próprios, coerentes com o tipo.
- [ ] Todo Pokémon de uma sala é do tipo dela (principal ou secundário).
- [ ] O mesmo `sessionId` gera sempre o mesmo Pokémon.
- [ ] Os sprites vêm da PokéAPI e ficam em cache local; o app abre offline depois
      do primeiro carregamento.
- [ ] Sem GIF, o Pokémon cai para o PNG estático e depois para o boneco atual.
- [ ] Os 9 estados da seção 6 são distinguíveis à primeira vista.
- [ ] Legível no modo noite (ver o `docs/office-night.png` atual) e no celular.
- [ ] Escala sempre inteira e pixels nítidos.

## 9. Aviso de propriedade intelectual

Pokémon, os nomes e os sprites são marcas e direitos da Nintendo, Game Freak e
The Pokémon Company. A PokéAPI distribui os sprites para fins de fã e de estudo.
Este tema deve ficar **para uso pessoal e local** (o servidor só escuta em
`127.0.0.1`). **Não** publicá-lo no pacote npm, na demo pública nem no material de
divulgação. Para uma versão pública, trocar por criaturas originais geradas pela
IA de imagem com os mesmos tipos, biomas e regras.
