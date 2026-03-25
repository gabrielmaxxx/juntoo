

## Transformando o Juntoo em App Nativo (Play Store & Apple Store)

O Juntoo já está muito bem preparado — ele já é uma PWA com Service Worker, manifest.json, e design mobile-first. Para publicar nas lojas, existem duas abordagens:

### Opção 1: PWA (o que vocês já têm)
O app já pode ser "instalado" direto do navegador no celular. No Android, PWAs podem inclusive ser listadas na Play Store via **TWA (Trusted Web Activity)** usando o [Bubblewrap](https://github.com/nicaemma/nicaemma). Na Apple Store, PWAs não são aceitas diretamente.

### Opção 2: Capacitor (recomendado para as duas lojas)
O **Capacitor** empacota o app web atual dentro de um container nativo real, gerando projetos Xcode (iOS) e Android Studio (Android) prontos para publicação. Vocês mantêm todo o código React/TypeScript existente e ganham acesso a APIs nativas (câmera, push notifications nativas, biometria, etc.).

### O que seria feito no código

1. **Instalar dependências**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
2. **Inicializar o Capacitor** com `npx cap init` (appId: `app.lovable.28c18fc30ed04d26b64581e4d3070b26`, appName: `juntoo`)
3. **Configurar o `capacitor.config.ts`** com server URL apontando para o preview do Lovable (para desenvolvimento com hot-reload)
4. **Ajustar `vite.config.ts`** com `base: './'` para que os assets funcionem no protocolo `file://`

### O que você precisa fazer fora do Lovable

Após as mudanças no código, você precisará:

1. **Exportar o projeto para o GitHub** (botão "Export to Github" no Lovable)
2. **Clonar o repositório** e rodar `npm install`
3. **Adicionar as plataformas**: `npx cap add ios` e/ou `npx cap add android`
4. **Buildar e sincronizar**: `npm run build` → `npx cap sync`
5. **Abrir nos IDEs nativos**: `npx cap open ios` (requer Mac + Xcode) ou `npx cap open android` (Android Studio)
6. **Testar em dispositivo/emulador** e publicar nas lojas

### Pré-requisitos para publicação

| Loja | Requisitos |
|------|-----------|
| **Google Play** | Conta de desenvolvedor ($25 única), ícones 512x512, screenshots, política de privacidade |
| **Apple App Store** | Apple Developer Program ($99/ano), Mac com Xcode, ícones em todos os tamanhos, review da Apple |

### Resumo

A parte de código no Lovable é simples (instalar Capacitor + configurar). O trabalho maior está na etapa de build/publicação, que acontece localmente no seu computador com as ferramentas nativas.

Para mais detalhes, consulte o [guia oficial do blog Lovable sobre Capacitor](https://lovable.dev/blog).

