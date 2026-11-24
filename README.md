# Survivor Radio Player

Interface mobile-first para controlar a rádio executada pelo `harmonyfm-mimic`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/player/`. Para encaminhar chamadas de `/api` ao backend, copie `.env.example` para `.env.local`, ajuste `RADIO_API_PROXY_TARGET` e inicie o Vite. O proxy remove o prefixo `/api`. Arquivos `.env*` locais ficam fora do Git, exceto o modelo `.env.example`.

## Validação

```bash
npm run lint
npm test
npm run build
```

O build é gerado em `dist/` com base pública `/player/`. O projeto não reproduz áudio no navegador: ele apenas controla o serviço existente.

## Deploy

No PowerShell, copie `scripts/deploy.example.json` para `scripts/deploy.local.json` e preencha os caminhos, URLs, serviço e destino SSH do seu ambiente. O arquivo local é ignorado pelo Git. O SSH deve funcionar por chave, sem solicitação interativa de senha.

```powershell
.\scripts\deploy.ps1
```

O script valida testes, lint e build, faz backup datado no caminho configurado, publica os arquivos estáticos e confere a página, os assets, a URL de status e o serviço. Se a verificação falhar, restaura os arquivos anteriores. Ele publica o conteúdo atual da working tree, inclusive alterações ainda não commitadas, sem reiniciar o serviço.

Para usar outro arquivo de configuração, passe `-ConfigPath caminho/do/arquivo.json`.

Para validar e gerar o build sem publicar:

```powershell
.\scripts\deploy.ps1 -ValidateOnly
```
