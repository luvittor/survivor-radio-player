# Survivor Radio Player

Interface mobile-first para controlar a rádio executada pelo `harmonyfm-mimic`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/player/`. O Vite encaminha chamadas de `/api` para `http://survivor:18081`, removendo o prefixo. Para usar outro endereço durante o desenvolvimento, altere `server.proxy` em `vite.config.ts`.

## Validação

```bash
npm run lint
npm test
npm run build
```

O build é gerado em `dist/` com base pública `/player/`. O projeto não reproduz áudio no navegador: ele apenas controla o serviço existente.
