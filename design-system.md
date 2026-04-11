# Juntoo Design System

> Plataforma social de conexão por atividades presenciais.  
> Personalidade de marca: **acolhedora, humana, inspiradora, confiável, jovem (mas não infantil).**

---

## 1. Paleta de Cores

### Filosofia
A cor primária é um **teal vibrante** que transmite confiança, frescor e energia — sem cair no azul corporativo genérico. O **coral** como cor complementar adiciona calor humano e emoção, diferenciando o Juntoo de redes sociais frias.

### Primary — Teal Juntoo
| Token         | HSL                  | Uso                               |
|---------------|----------------------|-----------------------------------|
| primary-50    | 180 60% 96%         | Fundos sutis, hover states        |
| primary-100   | 181 58% 90%         | Badges leves, indicadores         |
| primary-200   | 182 55% 78%         | Bordas ativas                     |
| primary-300   | 183 60% 64%         | Ícones secundários                |
| primary-400   | 185 80% 48%         | Hover em botões                   |
| **primary-500** | **186 100% 36%**   | **Cor principal (botões, links)** |
| primary-600   | 187 100% 30%        | Pressed states                    |
| primary-700   | 188 100% 24%        | Textos sobre fundo claro          |
| primary-800   | 189 95% 19%         | Cabeçalhos de contraste alto      |
| primary-900   | 190 90% 14%         | Backgrounds escuros               |
| primary-950   | 191 85% 8%          | Dark mode backgrounds             |

### Coral — Calor Humano
| Token       | HSL               | Uso                               |
|-------------|-------------------|-----------------------------------|
| coral-500   | 8 78% 52%         | Badges de engajamento, destaques  |
| coral-300   | 12 85% 74%        | Hover suave, ilustrações          |

**Justificativa:** O coral evoca calor, conexão e emoção — qualidades essenciais para uma plataforma de encontros presenciais. Ele complementa o teal sem competir visualmente.

### Semânticas
| Cor         | HSL             | Uso                              |
|-------------|-----------------|----------------------------------|
| success     | 152 69% 38%    | Confirmações, participação OK    |
| warning     | 38 92% 50%     | Alertas, lotação próxima         |
| destructive | 0 72% 51%      | Erros, ações destrutivas         |
| info        | 213 94% 52%    | Informações, dicas               |

### Neutras Quentes
Ao contrário de cinzas puros, os neutros do Juntoo têm uma leve inclinação quente (hue 14–30), reforçando a sensação acolhedora mesmo em textos e fundos.

| Token        | HSL              |
|--------------|------------------|
| neutral-50   | 30 25% 98%      |
| neutral-500  | 20 6% 46%       |
| neutral-900  | 12 14% 10%      |

---

## 2. Tipografia

### Famílias
| Papel    | Fonte         | Justificativa                                           |
|----------|---------------|---------------------------------------------------------|
| Heading  | **Poppins**   | Geométrica mas amigável; personalidade jovem e confiável |
| Body     | **DM Sans**   | Excelente legibilidade em mobile; levemente humanista    |
| Mono     | **JetBrains Mono** | Dados, códigos de evento, identificadores         |

### Escala
| Token | Tamanho | Line Height | Uso                        |
|-------|---------|-------------|----------------------------|
| 2xs   | 10px    | 14px        | Badges, metadados mínimos  |
| xs    | 12px    | 16px        | Captions, timestamps       |
| sm    | 14px    | 20px        | Corpo secundário, labels   |
| base  | 16px    | 24px        | Corpo principal            |
| lg    | 18px    | 28px        | Subtítulos, cards          |
| xl    | 20px    | 28px        | Títulos de seção           |
| 2xl   | 24px    | 32px        | Títulos de página          |
| 3xl   | 30px    | 36px        | Hero sections              |
| 4xl   | 36px    | 40px        | Splash, onboarding         |

### Regra de Aplicação
- **Headings (h1–h6):** Sempre `font-heading` (Poppins), peso 600–700
- **Body text:** Sempre `font-body` (DM Sans), peso 400–500
- **Dados/IDs:** `font-mono` (JetBrains Mono)

---

## 3. Espaçamento

Base: **4px** (0.25rem). Toda a escala é múltipla de 4px.

| Token | Valor  | Uso                                |
|-------|--------|------------------------------------|
| 1     | 4px    | Gaps mínimos entre ícone e texto   |
| 2     | 8px    | Padding interno de badges          |
| 3     | 12px   | Gaps em listas compactas           |
| 4     | 16px   | Padding padrão de cards            |
| 5     | 20px   | Margin entre seções pequenas       |
| 6     | 24px   | Padding lateral de tela mobile     |
| 8     | 32px   | Separação entre seções             |
| 10    | 40px   | Espaço entre blocos grandes        |
| 12    | 48px   | Padding vertical de hero sections  |
| 16    | 64px   | Separação de áreas principais      |

---

## 4. Border Radius

| Token  | Valor  | Uso                              |
|--------|--------|----------------------------------|
| sm     | 6px    | Inputs, badges                   |
| md     | 8px    | Chips, tags de categoria         |
| lg     | 12px   | Cards padrão                     |
| xl     | 16px   | Cards de destaque, modais        |
| 2xl    | 20px   | Imagens de evento, hero cards    |
| 3xl    | 24px   | Bottom sheets, drawers           |
| full   | 9999px | Avatares, FABs, pills            |

**Filosofia:** Cantos mais arredondados = mais acolhedor. O Juntoo usa raios generosos, mas evita cantos totalmente redondos em cards (que pareceriam infantis).

---

## 5. Sombras

| Nível   | Descrição                    | Uso                              |
|---------|------------------------------|----------------------------------|
| subtle  | Quase imperceptível          | Cards em repouso, separadores    |
| medium  | Elevação moderada            | Cards de evento hover, dropdowns |
| strong  | Elevação dramática + tint    | FABs, modais, hero cards         |

**Decisão:** A sombra `strong` tem um tint da cor primária (teal) para reforçar a identidade da marca mesmo na profundidade visual — diferente de sombras genéricas cinzas.

---

## 6. Breakpoints

| Token | Valor  | Dispositivo                    |
|-------|--------|--------------------------------|
| xs    | 375px  | iPhone SE, smartphones menores |
| sm    | 640px  | Smartphones grandes            |
| md    | 768px  | Tablets portrait               |
| lg    | 1024px | Tablets landscape, laptops     |
| xl    | 1280px | Desktops                       |
| 2xl   | 1400px | Telas grandes                  |

**Abordagem:** Mobile-first. Todos os estilos base são para telas < 375px, progressivamente aprimorados.

---

## 7. Gradientes

| Nome            | Composição                              | Uso                           |
|-----------------|-----------------------------------------|-------------------------------|
| gradient-primary | primary-500 → primary-light            | Header, botões hero, CTAs     |
| gradient-warm   | coral-500 → warning                     | Badges de engajamento, empty states |
| gradient-story  | Instagram-style multicolor              | Story rings                   |
| gradient-subtle | background → neutral-100               | Fundos de seção               |

---

## 8. Hierarquia Visual — O Evento como Protagonista

O princípio central do design do Juntoo é que **o evento/atividade é o elemento de maior peso visual**. Isso se traduz em:

1. **Imagens grandes e arredondadas** (rounded-2xl) nos cards de evento
2. **Sombra `strong` com tint primário** nos cards hero e em destaque
3. **Tipografia heading (Poppins)** nos títulos de eventos — nunca no body text ao redor
4. **Cor coral** para métricas de engajamento (participantes, avaliações)
5. **Gradiente primário** apenas em CTAs e header — nunca competindo com cards de evento

### Hierarquia de Componentes
```
1. Event Card (hero)     → shadow-strong, rounded-2xl, imagem grande
2. Event Card (default)  → shadow-medium, rounded-xl
3. CTAs primários        → juntoo-gradient, shadow-card
4. Seções/Headers        → font-heading, sem sombra
5. Conteúdo auxiliar     → font-body, muted-foreground
```

---

## 9. Tema Escuro

O tema escuro mantém a mesma hierarquia e identidade, com ajustes:

- **Background quente** (hue 220, ligeiramente azulado — não preto puro)
- **Primary ligeiramente mais claro** para manter contraste WCAG AA
- **Sombras com maior opacidade** para funcionar em fundos escuros
- **Escala de neutros invertida** — os tokens 50-100 são escuros, 800-950 são claros

---

## 10. Tokens de Transição

| Nome             | Curva                                | Uso                         |
|------------------|--------------------------------------|-----------------------------|
| transition-smooth | `cubic-bezier(0.4, 0, 0.2, 1)` 300ms | Hover, focus, estado padrão |
| transition-bounce | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` 400ms | FABs, botões hero, celebrações |

---

## 11. Acessibilidade

- Todos os pares foreground/background atendem **WCAG AA** (contraste ≥ 4.5:1 para texto)
- `muted-foreground` ajustado para garantir contraste mínimo em ambos os temas
- Focus rings com cor primária e offset de 2px
- Skip links para navegação por teclado
- `sr-only` para conteúdo exclusivo de leitores de tela
