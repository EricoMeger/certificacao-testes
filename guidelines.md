# GUIDELINES — Trabalho de Testes de Software
## Módulo: Cadastro e Login de Usuários com Regras de Senha (TypeScript)

> Instruções para o agente (Antigravity). **Leia este arquivo inteiro antes de executar qualquer ação** e siga as fases na ordem. Onde estiver escrito **[PARADA]**, pare e espere a resposta do usuário.

---

## 0. Contexto

- **Instituição/curso:** IFPR Campus Pinhais — Bacharelado em Ciências da Computação.
- **Disciplina:** Testes de Software — Prof. Gerson Peres.
- **Trabalho:** individual, vale 10,0 pontos. **Entrega: 08/10/26.** Depois há arguição oral de até 15 min (20h20) que confirma a autoria; **a nota pode cair até 30% se o aluno não demonstrar domínio do que entregou.**
- **Módulo do aluno:** Cadastro e login de usuários com regras de senha.
- **Aluno (capa do relatório):** `[NOME COMPLETO — perguntar ao usuário, não presumir]`.
- **Entregáveis:** (1) relatório em PDF; (2) repositório com código-fonte e testes.

Os três exemplos de pergunta da arguição são: *"Por que você escolheu esses valores-limite?"*, *"Mostre um ciclo do TDD e explique o que mudou no Refactor"* e *"O que a cobertura de 100% garante e o que ela não garante?"*. Tudo que você produzir deve permitir que o aluno responda a essas perguntas com as próprias palavras.

---

## 1. Princípios de trabalho (valem para todas as fases)

1. **O aluno vai defender tudo oralmente.** Para cada decisão técnica, explique *o porquê* e as alternativas descartadas, tanto no chat quanto nos documentos. Prefira explicar a só entregar o resultado.
2. **Simplicidade.** Sem interface, sem banco de dados, sem servidor HTTP, sem frameworks de DI. É uma biblioteca TypeScript pura. Não crie abstrações, camadas ou arquivos além dos listados na seção 4. Se achar que algo extra é necessário, pergunte antes.
3. **Honestidade.** Nunca fabrique resultados. Logs, status de testes, percentuais de cobertura e hashes de commit devem vir de execuções reais. Se um teste falhar de forma inesperada, relate; não esconda.
4. **TDD de verdade.** Nunca escreva código de produção antes de ter um teste falhando para ele (seção 6).
5. **Idiomas.**
   - Código, identificadores, comentários, nomes de testes e mensagens de commit: **inglês**.
   - Relatório e demais documentos em `docs/`: **português do Brasil**, com linguagem técnica (terminologia ISTQB/BSTQB).
6. **Rastreabilidade.** Regras de negócio têm IDs (`RN01`…), casos de teste têm IDs (`CT-01`…), defeitos têm IDs (`D1`, `D2`). Os testes automatizados citam o ID do caso de teste no nome.
7. **Dependências:** instale sempre a versão estável mais recente via `npm install` (não fixe versões de memória).

---

## 2. Stack

| Item | Escolha | Por quê |
|---|---|---|
| Runtime | Node.js ≥ 20 | LTS, tem `node:crypto` com `scrypt` embutido |
| Linguagem | TypeScript com `strict: true` | Tipos ajudam a modelar resultados e violações |
| Testes | **Vitest** | Roda TS sem configuração extra; API compatível com Jest (`it.each`, `vi.fn()`, `vi.useFakeTimers`) |
| Cobertura | `@vitest/coverage-istanbul` | Istanbul mede branches de forma mais confiável que o provider v8 |
| Hash de senha | `crypto.scrypt` (sem dependência externa) | Evita biblioteca nativa (bcrypt) que pode falhar na instalação |

`tsconfig`: `strict`, `module: ESNext`, `moduleResolution: Bundler`, `noEmit: true`.
`package.json`: `"type": "module"` e scripts `test`, `test:coverage`, `typecheck`.

---

## 3. Regras de negócio

Estas são **propostas**. O enunciado exige que o aluno defina de 4 a 6 regras, então ele tem a palavra final.

| ID | Regra |
|---|---|
| RN01 | A senha deve ter entre **8 e 64 caracteres** (inclusive). |
| RN02 | A senha deve conter ao menos **uma letra maiúscula, uma minúscula, um dígito e um caractere especial**. |
| RN03 | A senha **não pode conter a parte local do e-mail** (texto antes do `@`), sem diferenciar maiúsculas de minúsculas. |
| RN04 | O e-mail deve ter formato válido e ser **único** (comparação sem diferenciar maiúsculas de minúsculas, após `trim`). |
| RN05 | A senha é armazenada **somente como hash**, nunca em texto puro. |
| RN06 | Após **3 falhas consecutivas** de login, a conta é **bloqueada por 15 minutos**. Login bem-sucedido zera o contador. |

### Comportamento detalhado (para eliminar ambiguidade)

- **Cadastro:** valida e-mail (RN04) → valida senha (RN01–RN03) → verifica unicidade (RN04) → gera hash → salva. Se a política de senha falhar, `hash` e `save` **não** podem ser chamados.
- **Login:**
  1. E-mail inexistente → `INVALID_CREDENTIALS` (mesma resposta de senha errada, para não revelar quais e-mails existem).
  2. Conta bloqueada (`now < lockedUntil`) → `ACCOUNT_LOCKED`, **mesmo com a senha correta**, e sem incrementar o contador.
  3. Se o bloqueio já expirou (`now >= lockedUntil`), trata a conta como desbloqueada e zera o contador antes de verificar a senha.
  4. Senha errada → incrementa `failedAttempts`. Ao chegar em 3, define `lockedUntil = now + 15 min`. **A 3ª falha ainda retorna `INVALID_CREDENTIALS`; a 4ª tentativa retorna `ACCOUNT_LOCKED`.**
  5. Senha correta → zera `failedAttempts`, limpa `lockedUntil`, retorna sucesso.
- **Fronteira de tempo:** exatamente em `lockedUntil` a conta está **desbloqueada**.
- **Validação de e-mail:** regex simples e documentada (não tente cobrir a RFC inteira; justifique no relatório).

### [PARADA 1]
Apresente as regras ao usuário (com a justificativa de cada uma) e **espere a confirmação ou os ajustes** antes de seguir. Se ele alterar alguma regra, atualize as seções afetadas deste arquivo mentalmente e use as regras finais em todos os documentos.

---

## 4. Arquitetura e estrutura do repositório

```
.
├── README.md                  # como instalar e rodar
├── package.json / tsconfig.json / vitest.config.ts
├── src/
│   ├── config.ts              # MIN_LENGTH=8, MAX_LENGTH=64, MAX_FAILED_ATTEMPTS=3, LOCK_MINUTES=15
│   ├── password-policy.ts     # validatePassword (função pura)
│   ├── email.ts               # normalizeEmail, isValidEmail
│   ├── ports.ts               # interfaces: UserRepository, PasswordHasher, Clock
│   ├── auth-service.ts        # classe AuthService: register, login
│   ├── in-memory-user-repository.ts
│   └── scrypt-password-hasher.ts
├── tests/
│   ├── password-policy.test.ts   # unitários + parametrizados (EP/BVA)
│   ├── auth-service.test.ts      # unitários com mocks/stubs
│   └── integration.test.ts       # AuthService + repositório em memória + scrypt real (poucos testes)
└── docs/
    ├── relatorio.md           # fonte do relatório (vira PDF)
    ├── evidence/              # logs de execução (red/green, cobertura, defeitos)
    └── roteiro-arguicao.md    # material de estudo para a defesa oral
```

Estrutura plana dentro de `src/` e `tests/` (sem subpastas por camada).

### Contratos (siga estas assinaturas)

```ts
// password-policy.ts
export type PasswordViolation =
  | 'TOO_SHORT' | 'TOO_LONG'
  | 'MISSING_UPPERCASE' | 'MISSING_LOWERCASE' | 'MISSING_DIGIT' | 'MISSING_SPECIAL'
  | 'CONTAINS_EMAIL_LOCAL_PART';

/** Returns all violations found; an empty array means the password is valid. */
export function validatePassword(password: string, email: string): PasswordViolation[];

// ports.ts
export interface User {
  id: string; email: string; passwordHash: string;
  failedAttempts: number; lockedUntil: Date | null;
}
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
export interface Clock { now(): Date; }

// auth-service.ts
export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'INVALID_EMAIL' | 'EMAIL_ALREADY_REGISTERED' | 'WEAK_PASSWORD';
      violations?: PasswordViolation[] };
export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' };
```

**Por que `Result` em vez de exceções?** Falha de validação é um resultado *esperado* do domínio, não uma situação excepcional. Retornar o resultado deixa o teste simples (`expect(result).toEqual(...)`) e o fluxo explícito. Registre essa justificativa no relatório.

**Por que `Clock` e `PasswordHasher` como interfaces?** Para que os testes unitários não dependam do relógio real (bloqueio de 15 min) nem do custo do `scrypt`. É isso que viabiliza o uso de stub e mock.

---

## 5. Fases de trabalho

Execute uma fase por vez. Ao final de cada uma, resuma em poucas linhas o que foi feito e por quê.

### Fase 0 — Setup
`git init`, `npm init`, TypeScript, Vitest, cobertura Istanbul, `.gitignore` (inclua `node_modules`, `coverage`), `README.md` inicial. Um commit: `chore: project setup`. Rode um teste trivial só para confirmar que o ambiente funciona e **remova-o** antes de começar o TDD.

### Fase 1 — Projeto de testes (antes do código)
Gere os documentos da Parte 1 e da Parte 2 do relatório (veja o mapeamento na seção 7). Eles são a base dos testes automatizados. Conteúdo mínimo:

- **Partição de equivalência + valor-limite (≥ 2 campos).** Sugestão de três:
  - Tamanho da senha (RN01): classes inválida (<8), válida (8–64), inválida (>64). Limites: **7, 8, 9, 63, 64, 65**.
  - Contador de falhas (RN06): limites **0, 1, 2, 3, 4** (o bloqueio ocorre na 3ª falha).
  - Tempo de bloqueio (RN06): **14:59, 15:00, 15:01** após o bloqueio.
  - Para cada limite, escreva *por que* ele foi escolhido (isso é pergunta da arguição).
- **Tabela de decisão (≥ 3 condições)** para o login. Condições: C1 e-mail cadastrado; C2 senha correta; C3 conta não bloqueada. Ações: autenticar / `INVALID_CREDENTIALS` (+ incrementa contador) / `ACCOUNT_LOCKED`. Monte a tabela completa (8 combinações) e depois a versão simplificada com "don't care" (`-`), explicando a simplificação.
- **≥ 10 casos de teste formais**, cada um com: ID, pré-condição, passos, dados de entrada, resultado esperado, prioridade (Alta/Média/Baixa) e rastreio para a regra (`RNxx`). Cubra todas as regras. Inclua pelo menos um caso negativo por regra.

### Fase 2 — Implementação com TDD
Siga a seção 6 à risca. Plano sugerido de ciclos:

| Ciclo | Comportamento | Refactor esperado |
|---|---|---|
| 1 | Rejeitar senha curta (RN01, limite inferior) | Extrair `MIN_LENGTH` para `config.ts` |
| 2 | Rejeitar senha longa (RN01, limite superior) | Extrair `MAX_LENGTH`; unificar checagem de tamanho |
| 3 | Exigir maiúscula/minúscula/dígito/especial (RN02) com `it.each` | Trocar `if`s em sequência por uma lista de regras `{ violation, test }` |
| 4 | Rejeitar senha com a parte local do e-mail (RN03) | Remover duplicação de normalização (lowercase) |
| 5+ | `AuthService.register` (RN04, RN05), depois `login` e bloqueio (RN06) | O que o código pedir |

Os ciclos 1 a 3 (no mínimo) são os "ciclos documentados" do enunciado, e **cada um precisa ter um Refactor real**, com algo para mostrar na arguição.

### Fase 3 — Cobertura
Rode `npm run test:coverage`, salve a saída em `docs/evidence/coverage.txt` e inclua o resumo no relatório (linhas, branches, funções).

- **Meta:** alta cobertura (≥ 90% de linhas e branches), **mas não force 100% com testes artificiais.**
- Comente no relatório o que a cobertura **garante** (todas as linhas/ramos foram executados) e o que **não garante** (que as asserções estão certas, que os requisitos estão completos, que não faltam casos, que não há defeitos em combinações de entradas). Cite teste de mutação como técnica complementar. Isso responde diretamente à pergunta 3 da arguição.
- Se houver linha/branch não coberto, explique o motivo no relatório.

### Fase 4 — Execução, defeitos e ferramentas
1. **Tabela de execução:** rode a suíte completa e registre cada caso formal como *Aprovado / Reprovado / Bloqueado*, com a evidência (`docs/evidence/`) e a data. Use *Bloqueado* **somente** quando houver motivo real e explicável (ex.: caso manual que depende de camada de UI/API fora do escopo); explique o motivo.
2. **Dois defeitos introduzidos de propósito**, em uma branch `seeded-defects`, cada um em um commit separado (`defect(D1): ...`, `defect(D2): ...`). Sugestões, em regras diferentes:
   - **D1:** trocar `>=` por `>` na checagem de tamanho mínimo (senha de exatamente 8 caracteres passa a ser rejeitada). Deve ser pego pelo teste de valor-limite.
   - **D2:** não zerar `failedAttempts` após login bem-sucedido (ou bloquear na 4ª falha em vez da 3ª).
   Para cada um: rode a suíte, salve a saída com as falhas em `docs/evidence/defect-D1.txt` / `defect-D2.txt`, escreva o **relatório de defeito** (ID, título, passos para reproduzir, resultado esperado, resultado obtido, severidade, prioridade, regra afetada, teste que detectou) e depois reverta com `git revert`, mostrando a suíte verde de novo. **Não faça merge dos commits com defeito na branch principal.** Mantenha a branch no repositório como evidência.
3. **Comparação de 3 ferramentas** (sugestão: Cypress, Postman, JMeter; SonarQube e Jira também valem). O módulo entregue é uma biblioteca, sem UI nem API, então a comparação deve ser feita **considerando o módulo integrado a um sistema web** (formulário de login + endpoint REST). Diga qual usaria para interface, API e desempenho, com justificativa. Deixe claro no texto que isso é um plano, não algo executado.

### Fase 5 — Relatório
Escreva `docs/relatorio.md` na estrutura abaixo e depois gere o PDF.

1. Capa (instituição, curso, disciplina, professor, aluno, título, local, data)
2. Introdução: o módulo e as regras de negócio RN01–RN06 (com a justificativa de cada uma)
3. **Parte 1:** erro × defeito × falha e verificação × validação, **aplicados ao módulo** com exemplos concretos; Plano de Teste resumido (escopo, itens a testar e fora do escopo, níveis e tipos, critérios de entrada e saída, riscos, ambiente, papéis); níveis e tipos de teste, **diferenciando o que foi executado do que foi apenas planejado**
4. **Parte 2:** EP + BVA, tabela de decisão, casos de teste formais
5. **Parte 3:** TDD (3+ ciclos com evidência: hashes de commit e trechos de log), testes automatizados (stub/mock + parametrizados), cobertura e comentário
6. **Parte 4:** tabela de execução, relatórios de defeito, comparação de ferramentas
7. **Parte 5:** análise crítica (resultados, limitações, melhorias)
8. Referências
9. Apêndices (se necessário)

**Formatação:** use ABNT por padrão (seções numeradas, sumário, referências), a menos que o usuário informe outro modelo. Texto claro, objetivo e técnico.

**PDF:** tente `pandoc docs/relatorio.md -o docs/relatorio.pdf --pdf-engine=xelatex`; se não houver pandoc/LaTeX, tente `npx md-to-pdf`; se nada funcionar, entregue o `.md` e diga ao usuário como converter (Word ou Google Docs).

### Fase 6 — Material de estudo para a arguição
Crie `docs/roteiro-arguicao.md` (português, linguagem simples, como notas de estudo para o aluno), com respostas explicadas e apontando arquivos/commits reais para:

1. Por que escolhi esses valores-limite? (7/8/9, 63/64/65, 0–4 falhas, 14:59/15:00/15:01)
2. Mostre um ciclo TDD e explique o que mudou no Refactor (indique os commits red/green/refactor).
3. O que a cobertura de 100% garante e o que não garante?
4. Perguntas prováveis extras: diferença entre stub, mock e fake (e quais usei onde); por que `Result` em vez de exceção; por que a resposta de login é genérica para e-mail inexistente; por que `scrypt` e não SHA-256 puro; por que o relógio é injetado; como eu mudaria o módulo se virasse uma API.

---

## 6. Convenção TDD e commits

Cada ciclo tem **três commits**, nesta ordem, com este formato:

```
red(c1): add failing test for password shorter than 8 chars
green(c1): make minimum length check pass
refactor(c1): extract MIN_LENGTH to config
```

Regras:

1. **Red:** escreva *um* teste novo e rode. Ele deve **falhar por asserção**, não por erro de import/compilação. Se a função ainda não existe, crie primeiro um esqueleto que retorne um valor "ingênuo" (ex.: `return []`) para que a falha seja de comportamento. Salve a saída: `npx vitest run 2>&1 | tee docs/evidence/cycle-1-red.txt`. Só então faça o commit.
2. **Green:** escreva o **mínimo** de código para passar. Nada de generalizar cedo. Rode e salve em `cycle-1-green.txt`.
3. **Refactor:** melhore a estrutura **sem mudar comportamento**, com todos os testes verdes antes e depois. Salve `cycle-1-refactor.txt`.
4. Um comportamento por ciclo. Nunca misture código de produção e teste novo no mesmo commit de *red*.
5. Nomes de testes seguem o padrão `CT-xx: <comportamento> (RNxx, <detalhe do limite>)`, por exemplo `CT-03: rejects password with 7 characters (RN01, lower boundary)`.
6. Use **testes parametrizados** (`it.each`) para EP/BVA e para as regras de complexidade.
7. Use **mock** (`vi.fn()`) em `UserRepository` e `PasswordHasher` para verificar interações (ex.: `save` recebe o hash, nunca a senha pura; `hash` não é chamado quando a política falha). Use **stub** para `Clock` (data fixa controlada pelo teste).
8. Deve haver **no mínimo 8 testes unitários automatizados**; o esperado é bem mais que isso.

---

## 7. Mapeamento rubrica → entregáveis (checklist de pronto)

| Parte | Pts | Entregável | Onde |
|---|---|---|---|
| P1.1 | 0,5 | Erro/defeito/falha e V&V aplicados ao módulo | relatório §3 |
| P1.2 | 1,0 | Plano de Teste resumido (todos os itens pedidos) | relatório §3 |
| P1.3 | 0,5 | Níveis e tipos de teste, com justificativa | relatório §3 |
| P2.1 | 1,0 | EP + BVA em ≥ 2 campos/regras | relatório §4 |
| P2.2 | 0,75 | Tabela de decisão com ≥ 3 condições | relatório §4 |
| P2.3 | 0,75 | ≥ 10 casos formais (ID, pré-condição, passos, dados, resultado esperado, prioridade) | relatório §4 |
| P3.1 | 1,5 | ≥ 3 ciclos Red-Green-Refactor | `git log` + `docs/evidence/` + relatório §5 |
| P3.2 | 1,0 | ≥ 8 testes unitários + mock/stub ou parametrizados | `tests/` |
| P3.3 | 0,5 | Cobertura medida e comentada | `docs/evidence/coverage.txt` + relatório §5 |
| P4.1 | 0,5 | Tabela de execução (aprovado/reprovado/bloqueado) | relatório §6 |
| P4.2 | 0,5 | 2 defeitos introduzidos + relatórios de defeito | branch `seeded-defects` + relatório §6 |
| P4.3 | 0,5 | Comparação de 3 ferramentas e escolha por tipo de teste | relatório §6 |
| P5.1 | 0,5 | Análise crítica, limitações, melhorias | relatório §7 |
| P5.2 | 0,5 | Organização, clareza, linguagem técnica, formatação | relatório inteiro |

Critério de avaliação do professor (A/B/C/D): **correto, completo, justificado e coerente com o cenário**. Sempre justifique e sempre amarre ao módulo de login/senha.

---

## 7.1 Entrega final

Ao terminar, apresente ao usuário:

- como rodar tudo (`npm install`, `npm test`, `npm run test:coverage`);
- a lista de commits dos ciclos TDD (hashes);
- o resumo da cobertura;
- o que o usuário **precisa revisar manualmente**: nome na capa, regras de negócio finais, conferência do PDF, e a leitura de `docs/roteiro-arguicao.md` junto com o código antes da arguição.

---

## 8. O que NÃO fazer

- Não escrever o código de produção antes do teste que falha.
- Não inventar saídas de terminal, números de cobertura ou hashes de commit.
- Não adicionar UI, banco de dados, servidor, ORM, JWT, sessão ou qualquer coisa fora do escopo.
- Não adicionar dependências desnecessárias.
- Não apagar o histórico de commits (nada de `git rebase`/`squash` nos ciclos TDD, pois o histórico é a evidência).
- Não afirmar no relatório que algo foi executado se foi apenas planejado (UI, API e desempenho são só planejados).
- Não presumir dados pessoais do aluno; pergunte.
