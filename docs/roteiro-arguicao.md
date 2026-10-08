# ROTEIRO DE ESTUDO PARA A ARGUIÇÃO ORAL
## Módulo: Cadastro e Login de Usuários com Regras de Senha
**Aluno:** João da Silva | **Disciplina:** Testes de Software — IFPR Campus Pinhais | **Prof.:** Gerson Peres

> **Dica do João para a apresentação:** Mantenha a calma! As respostas abaixo foram estruturadas exatamente com base nas decisões que você tomou no código e nos commits reais do repositório. Você pode abrir o VS Code e mostrar os arquivos e o histórico do Git durante a arguição.

---

## Pergunta 1: *"Por que você escolheu esses valores-limite?"*

### Como responder:
> *"Professor, a técnica de Análise do Valor-Limite (BVA - Boundary Value Analysis) parte do princípio testado empiricamente na engenharia de software de que a maioria esmagadora dos defeitos ocorre nas fronteiras entre classes de equivalência, geralmente por erros de 'off-by-one' (troca de `>=` por `>`, ou `<` por `<=`). No meu projeto, eu analisei três fronteiras principais:"*

1. **Tamanho da Senha (RN01: 8 a 64 caracteres):**
   - **Valores escolhidos:** `7, 8, 9` (no limite inferior) e `63, 64, 65` (no limite superior).
   - **Por quê 7, 8 e 9?**
     - **7:** É o maior valor inválido abaixo da fronteira ($L - 1$). Garante que o sistema rejeita senhas curtas.
     - **8:** É o limite mínimo válido ($L$). Garante que o operador relacional inclui a igualdade (`>= 8`). *Inclusive, foi exatamente o teste que pegou o defeito intencional D1!*
     - **9:** É o primeiro valor estritamente interno válido ($L + 1$). Prova que a faixa não aceita apenas o número 8 pontual.
   - **Por quê 63, 64 e 65?**
     - **63:** É o valor imediatamente anterior ao teto ($L - 1$).
     - **64:** É o limite máximo válido ($L$). Garante que a senha de 64 caracteres é aceita (`<= 64`).
     - **65:** É o primeiro valor inválido acima da fronteira ($L + 1$). Garante que o sistema barra senhas gigantes para evitar ataques de Negação de Serviço (DoS) que sobrecarregam a CPU no hashing.
   - *Onde ver no código:* `tests/password-policy.test.ts` (testes `CT-01` a `CT-06`).

2. **Contador de Falhas de Login (RN06: Bloqueio na 3ª falha):**
   - **Valores escolhidos:** `0, 1, 2, 3, 4`.
   - **Por quê?**
     - **0:** Estado inicial ou após login com sucesso.
     - **1 e 2:** Falhas consecutivas que ainda mantêm a conta ativa.
     - **3:** É a fronteira crítica. O requisito estipula que a **3ª falha ainda retorna `INVALID_CREDENTIALS`**, mas agenda o bloqueio `lockedUntil = now + 15 min`.
     - **4:** É a tentativa logo após o bloqueio. Ao tentar logar pela 4ª vez, o sistema retorna imediatamente `ACCOUNT_LOCKED`.
   - *Onde ver no código:* `tests/auth-service.test.ts` (`CT-19`, `CT-20`, `CT-21`).

3. **Duração do Bloqueio Temporal (RN06: 15 minutos):**
   - **Valores escolhidos:** `14:59`, `15:00` e `15:01` após o momento do bloqueio.
   - **Por quê?**
     - **14min 59s:** Faltando 1 segundo para acabar o bloqueio, a conta ainda DEVE estar bloqueada (`ACCOUNT_LOCKED`). Garante que a penalidade não expira antes do tempo.
     - **15min 00s:** Fronteira exata estipulada pela regra (`now == lockedUntil`). A especificação define que exatamente ao bater 15 minutos a conta é considerada liberada.
     - **15min 01s:** 1 segundo após o fim da penalidade. Assegura que o contador de falhas é reiniciado e o usuário consegue tentar novamente sem ficar preso em um bloqueio eterno.
   - *Onde ver no código:* `tests/auth-service.test.ts` (`CT-22`, `CT-23`, `CT-24`).

---

## Pergunta 2: *"Mostre um ciclo do TDD e explique o que mudou no Refactor"*

### Como responder:
> *"Professor, todos os comportamentos do sistema foram criados em ciclos de 3 commits: Red (teste falhando por asserção), Green (código mínimo para passar) e Refactor (melhoria estrutural sem alteração de comportamento externo). Posso demonstrar o Ciclo 3 ou o Ciclo 1 no Git:"*

### Exemplo 1: Ciclo 3 — Regras de Complexidade de Senha (RN02)
- **1. Fase Red (Commit `d34c415`):**
  - Escrevi em `tests/password-policy.test.ts` os testes parametrizados com `it.each` cobrindo a falta de maiúscula, minúscula, número e caractere especial (`CT-07`), além de um teste sem três categorias (`CT-09`).
  - Como a função `validatePassword` ainda não tinha essas checagens, o comando `npx vitest run` falhou com 5 asserções vermelhas (evidência em `docs/evidence/cycle-3-red.txt`).
- **2. Fase Green (Commit `415dd99`):**
  - Escrevi o código mais direto e ingênuo possível para passar: quatro blocos `if` sequenciais com expressões regulares:
    ```ts
    if (!/[A-Z]/.test(password)) violations.push('MISSING_UPPERCASE');
    if (!/[a-z]/.test(password)) violations.push('MISSING_LOWERCASE');
    if (!/[0-9]/.test(password)) violations.push('MISSING_DIGIT');
    if (!/[^A-Za-z0-9]/.test(password)) violations.push('MISSING_SPECIAL');
    ```
  - Todos os testes passaram (Green). Evidência em `docs/evidence/cycle-3-green.txt`.
- **3. Fase Refactor (Commit `715d745`):**
  - **O que mudou?** Eliminei a repetição de `if`s imperativos criando uma estrutura declarativa constante `COMPLEXITY_RULES`:
    ```ts
    const COMPLEXITY_RULES = [
      { violation: 'MISSING_UPPERCASE', pattern: /[A-Z]/ },
      { violation: 'MISSING_LOWERCASE', pattern: /[a-z]/ },
      { violation: 'MISSING_DIGIT',     pattern: /[0-9]/ },
      { violation: 'MISSING_SPECIAL',   pattern: /[^A-Za-z0-9]/ },
    ];
    ```
  - E substituí os quatro `if`s por um laço simples:
    ```ts
    for (const { violation, pattern } of COMPLEXITY_RULES) {
      if (!pattern.test(password)) violations.push(violation);
    }
    ```
  - **Benefício:** O código ficou mais limpo, extensível (aberto a novas regras sem alterar a lógica de controle) e legível, com 100% dos testes continuando verdes (evidência em `docs/evidence/cycle-3-refactor.txt`).

### Exemplo 2: Ciclo 1 — Limite Inferior de Tamanho (RN01)
- **Red (`c67aa01`):** Teste `CT-01` com senha de 7 caracteres falhou esperando `'TOO_SHORT'`.
- **Green (`a5c3772`):** Implementado `if (password.length < 8) violations.push('TOO_SHORT')`.
- **Refactor (`a25b4f1`):** O número mágico `8` foi extraído para `src/config.ts` como `export const MIN_LENGTH = 8;`.

---

## Pergunta 3: *"O que a cobertura de 100% garante e o que ela NÃO garante?"*

### Como responder:
> *"Professor, nossa cobertura de código no projeto atingiu 98.94% de linhas e 95.45% de branches com o provedor Istanbul (com 100% no AuthService e PasswordPolicy). Porém, é fundamental entender os limites teóricos dessa métrica:"*

### O que a alta cobertura GARANTE:
1. Garante que **todas as instruções, linhas e desvios condicionais** (`if/else`) foram fisicamente executados pelo menos uma vez durante a bateria de testes.
2. Garante que **não há código morto** (*dead code*) ou caminhos inalcançáveis deixados para trás.

### O que a cobertura de 100% NÃO GARANTE:
1. **Não garante que as asserções estão corretas:** Um teste pode executar todas as linhas do código sem ter nenhum `expect()` ou com um `expect(true).toBe(true)`. A cobertura será de 100%, mas o teste é inútil.
2. **Não garante completude de requisitos:** Se o desenvolvedor esqueceu de implementar um requisito inteiro (por exemplo, esqueceu de implementar a regra de bloqueio), esse código sequer existe. Portanto, as linhas existentes terão 100% de cobertura, mas o software está incorreto e incompleto!
3. **Não garante ausência de falhas sob combinações de dados:** Cobertura de ramos avalia caminhos isolados, mas não testa a explosão de combinações complexas de entradas simultâneas.
4. **Não garante comportamento sob concorrência:** Não avalia condições de corrida (*race conditions*), problemas de memória ou sobrecarga de CPU.

### O que usar como complemento? (Técnica avançada para citar na arguição):
> *"Para complementar a cobertura de código, a técnica recomendada pelo ISTQB é o **Teste de Mutação** (usando ferramentas como Stryker Mutator). O teste de mutação altera intencionalmente o código (trocando `>=` por `>`, invertendo booleanos) para ver se os testes detectam e 'matam' o mutante. Se o mutante sobrevive, o teste era fraco, mesmo com 100% de cobertura métrica."*

---

## Perguntas Extras Prováveis da Banca

### 4. *"Qual a diferença entre Stub, Mock e Fake, e onde você usou cada um?"*
- **Mock:** Verifica **interações e chamadas comportamentais** (*behavior verification*). Usei `vi.fn()` para o `userRepository.save()` e `passwordHasher.hash()`. Com eles, verifiquei que o `hash` foi gerado e que a senha em texto puro nunca foi passada para o método `save`.
- **Stub:** Fornece **respostas prontas e pré-programadas de estado** (*state verification*). Usei stub na interface `Clock`. O método `clock.now()` retornava a data e hora exata que eu queria (14:59, 15:00, 15:01), permitindo testar o bloqueio de 15 minutos instantaneamente sem fazer o teste esperar na vida real.
- **Fake:** É uma **implementação funcional simplificada** de um componente. Criei o `InMemoryUserRepository`, que implementa a interface do repositório gravando os usuários em um `Map` do JavaScript em memória, dispensando um banco de dados real.

### 5. *"Por que você usou o padrão Result em vez de lançar Exceções (throw Error)?"*
> *"No domínio de autenticação e validação de senhas, um e-mail incorreto ou uma senha curta não são exceções catastróficas do sistema, mas sim cenários de negócio previstos. Ao retornar `Result` (`{ ok: true } | { ok: false, reason: ... }`), o fluxo do programa é explícito, o compilador TypeScript obriga quem consome o serviço a tratar os erros, e os testes ficam muito mais limpos e declarativos (`expect(result).toEqual(...)`) em vez de exigir blocos `try/catch` ou `expect().rejects`."*

### 6. *"Por que você usou scrypt e não SHA-256 puro ou bcrypt?"*
- **Por que não SHA-256 puro?** SHA-256 é uma função criptográfica rápida, projetada para integridade de dados e assinaturas. Por ser muito rápida, ela é extremamente vulnerável a ataques de força bruta offline e ataques com GPUs (que conseguem testar bilhões de hashes SHA-256 por segundo).
- **Por que scrypt?** O `scrypt` é uma KDF (*Key Derivation Function*) que exige intencionalmente tempo de CPU e **muita memória RAM** (*memory-hard*). Isso inviabiliza ataques em larga escala usando placas de vídeo ou chips ASIC dedicados.
- **Por que não bcrypt?** O `bcrypt` exige bibliotecas nativas compiladas em C/C++ (como node-gyp ou node-pre-gyp), que costumam quebrar dependências de instalação entre diferentes sistemas operacionais. O `scrypt` já vem embutido nativamente no módulo padrão `node:crypto` do Node.js, sendo robusto e portátil.

### 7. *"Por que a resposta de login é genérica ('INVALID_CREDENTIALS') tanto para e-mail inexistente quanto para senha errada?"*
> *"Isso é um princípio essencial de segurança defensiva chamado **prevenção contra enumeração de usuários** (*User Enumeration Defense*). Se o sistema dissesse 'E-mail não cadastrado', um invasor poderia usar uma lista vazada de milhares de e-mails para descobrir exatamente quais pessoas possuem conta naquele sistema e direcionar ataques de phishing."*

### 8. *"Por que você injetou a interface Clock em vez de chamar `new Date()` direto no código?"*
> *"Princípio da Inversão de Dependência (D do SOLID). Se o código chamasse `new Date()` diretamente dentro do método `login`, seria impossível testar a regra do bloqueio de 15 minutos sem congelar a execução do teste com um `setTimeout` de 15 minutos reais. Injetando a porta `Clock`, os testes passam em menos de 2 segundos simulando qualquer momento do tempo deterministamente."*

### 9. *"Como você transformaria esse módulo em uma API REST caso fosse para produção?"*
> *"Eu criaria uma camada externa de entrada (controladores HTTP usando Fastify ou Express) que receberia as requisições `POST /register` e `POST /login`, chamaria o `AuthService` e mapearia os `Results` para os códigos HTTP adequados:
> - Sucesso no registro $\rightarrow$ HTTP 201 Created;
> - `INVALID_EMAIL` ou `WEAK_PASSWORD` $\rightarrow$ HTTP 400 Bad Request;
> - `EMAIL_ALREADY_REGISTERED` $\rightarrow$ HTTP 409 Conflict;
> - `INVALID_CREDENTIALS` $\rightarrow$ HTTP 401 Unauthorized;
> - `ACCOUNT_LOCKED` $\rightarrow$ HTTP 429 Too Many Requests (ou 403 Forbidden com cabeçalho `Retry-After: 900`).
> A lógica de domínio do `AuthService` e as regras de senha continuariam 100% inalteradas, pois o domínio é puro e desacoplado da camada de transporte."*
