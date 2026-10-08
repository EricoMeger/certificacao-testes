# Cadastro e Login de Usuários

Projeto em TypeScript para cadastro e autenticação de usuários com validação de senha, bloqueio por tentativas e armazenamento seguro de hash em bcrypt.

A aplicação combina uma camada de domínio pura, infraestrutura de persistência e hashing, e uma API HTTP em Express para expor os casos de uso.

## Requisitos

- Node.js ≥ 20
- npm

## Instalação

```bash
npm install
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia a API em modo watch |
| `npm start` | Inicia a API em produção |
| `npm test` | Executa toda a suíte de testes |
| `npm run test:coverage` | Executa os testes com relatório de cobertura |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |

## Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Senha entre 8 e 64 caracteres (inclusive) |
| RN02 | Ao menos uma maiúscula, uma minúscula, um dígito e um caractere especial |
| RN03 | Senha não pode conter a parte local do e-mail (case-insensitive) |
| RN04 | E-mail válido e único (case-insensitive, com trim) |
| RN05 | Senha armazenada somente como hash (bcrypt) |
| RN06 | 3 falhas consecutivas de login bloqueiam a conta por 15 minutos |

## Estrutura do projeto

```text
app.ts                → export da aplicação HTTP
server.ts             → bootstrap da API
src/
  domain/
    auth-service.ts   → regra principal de autenticação
    config.ts         → constantes do domínio
    email.ts          → normalização e validação de e-mail
    password-policy.ts → regras de complexidade da senha
    ports.ts          → contratos de uso (repository, hasher, clock)
  infrastructure/
    persistence/
      in-memory-user-repository.ts
    security/
      bcrypt-password-hasher.ts
  http/
    app.ts            → configuração das rotas Express
tests/
  app.test.ts         → testes http da API
  auth-service.test.ts
  infrastructure.test.ts
  integration.test.ts
  password-policy.test.ts
docs/                 → relatórios, roteiros e evidências
```

## API HTTP

A API é exposta em Express e usa os mesmos casos de uso do domínio.

### Endpoints

#### GET /health

Retorna o status da aplicação.

```bash
curl http://localhost:3000/health
```

Resposta:

```json
{
  "ok": true,
  "service": "auth-api"
}
```

#### POST /register

Cria um usuário com email e senha válidos.

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPass1!"}'
```

Resposta de sucesso:

```json
{
  "ok": true,
  "userId": "..."
}
```

#### POST /login

Autentica um usuário.

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPass1!"}'
```

Resposta de sucesso:

```json
{
  "ok": true,
  "userId": "..."
}
```

## Como executar

```bash
npm install
npm run dev
```

A API fica disponível em:

```text
http://localhost:3000
```

## Testes

```bash
npm test
```

A suíte cobre regras de negócio, infraestrutura, integração e o contrato HTTP da API.

## Autor

João da Silva — IFPR Campus Pinhais