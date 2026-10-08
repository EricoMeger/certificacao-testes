# Cadastro e Login de Usuários com Regras de Senha

Módulo TypeScript puro para cadastro e autenticação de usuários com política de senha, bloqueio por tentativas e hash seguro (scrypt).

## Requisitos

- Node.js ≥ 20

## Instalação

```bash
npm install
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm test` | Executa toda a suíte de testes |
| `npm run test:coverage` | Executa os testes com relatório de cobertura (Istanbul) |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |

## Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Senha entre 8 e 64 caracteres (inclusive) |
| RN02 | Ao menos uma maiúscula, uma minúscula, um dígito e um caractere especial |
| RN03 | Senha não pode conter a parte local do e-mail (case-insensitive) |
| RN04 | E-mail válido e único (case-insensitive, com trim) |
| RN05 | Senha armazenada somente como hash (scrypt) |
| RN06 | 3 falhas consecutivas de login bloqueiam a conta por 15 minutos |

## Estrutura

```
src/           → Código de produção
tests/         → Testes automatizados (unitários, integração)
docs/          → Relatório e evidências
```

## Autor

João da Silva — IFPR Campus Pinhais