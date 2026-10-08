# RELATÓRIO TÉCNICO DE TESTES DE SOFTWARE
## Módulo de Cadastro e Login de Usuários com Regras de Senha

---

# 1. Capa

- **Instituição:** Instituto Federal do Paraná (IFPR) — Campus Pinhais
- **Curso:** Bacharelado em Ciência da Computação
- **Disciplina:** Testes de Software
- **Docente:** Prof. Me. Gerson Peres
- **Discente:** João da Silva
- **Trabalho:** Projeto e Automação de Testes com TDD — Módulo de Cadastro e Autenticação
- **Local:** Pinhais — PR
- **Data de Entrega:** 08 de Outubro de 2026

---

# 2. Introdução

Este relatório documenta as atividades de engenharia de qualidade e teste de software aplicadas ao desenvolvimento de uma biblioteca em TypeScript pura voltada ao **Cadastro e Login de Usuários com Regras de Senha**. O módulo foi concebido sob a ótica de segurança defensiva (*secure by design*), baixo acoplamento e alta testabilidade.

A biblioteca implementa o padrão funcional de retorno **Result** (`{ ok: true, ... } | { ok: false, reason: ... }`) em detrimento do lançamento de exceções (`try/catch`). No domínio de autenticação e validação, erros de entrada (senha fraca, e-mail malformado ou credenciais incorretas) não constituem situações excepcionais ou anomalias do sistema operacional, mas sim fluxos alternativos esperados pelo domínio. O uso de uniões discriminadas do TypeScript garante checagem estática em tempo de compilação, elimina efeitos colaterais ocultos e simplifica sobremaneira a escrita de asserções nos testes automatizados (`expect(result).toEqual(...)`).

### Regras de Negócio Implementadas

| ID | Regra de Negócio | Justificativa Técnica / Segurança |
|---|---|---|
| **RN01** | A senha deve ter entre **8 e 64 caracteres** (inclusive). | O limite inferior (8) segue as diretrizes do NIST SP 800-63B para mitigar ataques de força bruta. O limite superior (64) evita ataques de Negação de Serviço (DoS) direcionados à CPU via submissão de strings gigantescas para a função de derivação criptográfica. |
| **RN02** | A senha deve conter ao menos **uma letra maiúscula, uma minúscula, um dígito e um caractere especial**. | Eleva a entropia computacional da senha e inviabiliza ataques baseados em tabelas arco-íris (*rainbow tables*) e dicionários de senhas triviais. |
| **RN03** | A senha **não pode conter a parte local do e-mail** (texto antes do `@`), sem diferenciar maiúsculas de minúsculas. | Evita a elaboração de senhas fracas baseadas no próprio identificador público do usuário (ex.: e-mail `joao@ifpr.edu.br` usando senha `Joao@2026!`). |
| **RN04** | O e-mail deve ter formato válido e ser **único** (comparação *case-insensitive*, após `trim`). | Assegura a integridade cadastral e impede a existência de contas duplicadas com variações tipográficas de caixa ou espaços em branco acidentais. |
| **RN05** | A senha é armazenada **somente como hash criptográfico**, nunca em texto puro. | Princípio fundamental de custódia de credenciais. Utiliza-se a função de derivação de chave `scrypt` com *salt* criptograficamente aleatório de 16 bytes, protegendo os dados contra vazamentos e aceleradores de hardware (GPUs/ASICs). |
| **RN06** | Após **3 falhas consecutivas** de login, a conta é **bloqueada por 15 minutos**. Login bem-sucedido zera o contador. | Defesa ativa contra ataques de força bruta online (*credential stuffing* e adivinhação automatizada). O intervalo de 15 minutos equilibra mitigação de ataque e usabilidade legítima. |

> **Princípio de Defesa contra Enumeração de Usuários:** Durante o processo de autenticação, o serviço retorna o resultado unificado `INVALID_CREDENTIALS` tanto na hipótese de e-mail inexistente quanto na hipótese de senha incorreta. Essa conduta impede que agentes maliciosos descubram quais e-mails estão cadastrados na base através do comportamento de resposta da API.

---

# 3. Parte 1 (§3): Fundamentos e Planejamento

## 3.1. Erro, Defeito, Falha e Verificação vs. Validação

Com base no glossário padrão do ISTQB/BSTQB, as distinções conceituais fundamentais foram mapeadas diretamente ao contexto do módulo:

*   **Erro (Engano humano):** Ação humana que produz um resultado incorreto.  
    *Exemplo no módulo:* O desenvolvedor interpreta equivocadamente o requisito RN01 acreditando que a expressão "entre 8 e 64" exclui os limites inferior e superior.
*   **Defeito (Bug / Falha interna):** A representação física do erro incorporada ao código-fonte ou documentação.  
    *Exemplo no módulo:* O desenvolvedor codifica `if (password.length > 8 && password.length < 64)` em vez de `if (password.length >= 8 && password.length <= 64)`.
*   **Falha (Manifestação externa do defeito):** Evento no qual o componente deixa de desempenhar a função requerida dentro dos limites especificados durante a execução.  
    *Exemplo no módulo:* Durante a execução do caso de teste `CT-02`, o teste submete a senha de exatamente 8 caracteres `'Aa1!xyzw'`. O sistema emite a violação `'TOO_SHORT'` e rejeita a senha válida. O teste falha com `AssertionError`.

Quanto às dimensões da garantia da qualidade:
*   **Verificação ("O produto está sendo construído corretamente?"):** Avalia se o software está em conformidade com as especificações técnicas, padrões de código e arquitetura definida.  
    *Exemplo no módulo:* Execução da suíte de testes unitários com Vitest, inspeção de tipos com `tsc --noEmit`, verificação estática de que o algoritmo de hash invocado é o `scrypt` (e não SHA-256 simples) e conferência de que a senha em texto puro não transita para o método `save()` do repositório.
*   **Validação ("O produto certo foi construído?"):** Avalia se o software atende às reais necessidades de negócio e expectativas do usuário final.  
    *Exemplo no módulo:* Análise de usabilidade e segurança para avaliar se a penalidade de bloqueio de 15 minutos após 3 falhas é aceitável para um usuário humano que digita incorretamente sua senha no celular, enquanto continua efetiva contra ataques de dicionário.

## 3.2. Plano de Teste Resumido

*   **Escopo:** Módulo de domínio para validação de políticas de senha, registro de novos usuários com verificação de unicidade e cálculo de hash, e mecanismo de autenticação de login com bloqueio temporal por tentativas consecutivas.
*   **Itens a testar:**
    1. Função pura `validatePassword` (`src/password-policy.ts`);
    2. Utilitários de normalização e validação de e-mail `normalizeEmail` e `isValidEmail` (`src/email.ts`);
    3. Classe controladora de regras de negócio `AuthService` (`src/auth-service.ts`);
    4. Implementação em memória do repositório `InMemoryUserRepository` (`src/in-memory-user-repository.ts`);
    5. Implementação de hash criptográfico `ScryptPasswordHasher` (`src/scrypt-password-hasher.ts`).
*   **Itens fora do escopo:**
    *   Bancos de dados relacionais ou NoSQL externos (PostgreSQL, MongoDB);
    *   Camada de transporte HTTP, servidores REST (Express/Fastify) e autenticação baseada em tokens (JWT/Cookies);
    *   Interface gráfica de usuário (HTML/React);
    *   Envio real de e-mails para recuperação de credenciais (SMTP).
*   **Níveis e Tipos de Teste:** Testes de Unidade (isolados com Mocks e Stubs), Testes de Integração de Componentes (AuthService com InMemoryUserRepository e Scrypt real), Testes Funcionais de Caixa-Preta (EP, BVA, Tabela de Decisão) e Caixa-Branca (Cobertura de Instruções e Ramos).
*   **Critérios de Entrada:**
    *   Assinaturas e contratos das portas (`src/ports.ts`) definidas e validadas;
    *   Ambiente Node.js 20+ e Vitest configurados;
    *   Especificação formal das regras RN01 a RN06 aprovada.
*   **Critérios de Saída:**
    *   100% dos testes da suíte automatizada executando com sucesso (Green);
    *   Cobertura de instruções e linhas superior a 90% via `@vitest/coverage-istanbul`;
    *   Cobertura de branches superior a 90%;
    *   Todos os casos de teste formais da Parte 2 implementados e validados;
    *   Dois defeitos intencionais (`D1` e `D2`) testados, evidenciados e revertidos na branch de controle `seeded-defects`.
*   **Riscos e Contingências:**
    *   *Risco 1:* Custo de CPU do `scrypt` tornar a execução dos testes lenta. *Mitigação:* Uso de mock/stub nas dezenas de testes unitários do `AuthService` e execução de `scrypt` real concentrada na suíte de integração (`integration.test.ts`).
    *   *Risco 2:* Testes de tempo do bloqueio de 15 minutos dependerem de temporizadores reais (`sleep`), tornando a suíte inviável. *Mitigação:* Injeção de dependência da interface `Clock`, permitindo que os testes controlem o tempo de forma determinística e instantânea via stub.
*   **Ambiente de Testes:** Linux x86_64, Node.js v20.12.2, TypeScript 7.0 (strict mode), Vitest 2.1.9, provedor de cobertura Istanbul.
*   **Papéis e Responsabilidades:** João da Silva — Projeto dos casos de teste, desenvolvimento orientado a testes (TDD), execução da automação, relatório de defeitos e análise crítica.

## 3.3. Níveis e Tipos de Teste: Executados vs. Apenas Planejados

| Nível / Tipo | Classificação | Justificativa Técnica |
|---|---|---|
| **Teste de Unidade (Componente)** | **EXECUTADO** | Testou individualmente as regras isoladas de validação de senha (`password-policy.test.ts`) e o comportamento de controle de fluxo de negócio do serviço de autenticação com dublês de teste (`auth-service.test.ts`). |
| **Teste de Integração de Componente** | **EXECUTADO** | Validou o acoplamento real entre o `AuthService`, o armazenamento em mapa de memória (`InMemoryUserRepository`) e a derivação criptográfica do sistema operacional (`ScryptPasswordHasher`) em `integration.test.ts`. |
| **Teste de Sistema / UI** | **APENAS PLANEJADO** | Como o módulo é uma biblioteca puramente de lógica de negócio sem interface com o usuário, este nível foi projetado para quando houver telas web (ex.: formulários React com Cypress), mas não executado nesta entrega. |
| **Teste de Integração de Sistema / API** | **APENAS PLANEJADO** | Planejado para validar os endpoints HTTP (`POST /register`, `POST /login`) através de ferramentas como Postman/Newman ou Supertest, cobrindo serialização JSON e códigos de status HTTP (201, 400, 401, 429). |
| **Teste de Desempenho / Carga** | **APENAS PLANEJADO** | Planejado para mensurar a taxa máxima de requisições por segundo suportada pela CPU sob processamento concorrente do `scrypt` (via k6 ou JMeter), visto que o hashing intencionalmente consome ciclos de processador para resistir a ataques. |

---

# 4. Parte 2 (§4): Técnicas de Modelagem e Casos de Teste

## 4.1. Partição de Equivalência (EP) e Análise do Valor-Limite (BVA)

### a) Tamanho da Senha (RN01: 8 a 64 caracteres)
*   **Classes de Equivalência:**
    *   $CE_1$ (Inválida): $\text{tamanho} < 8$ (muito curta, violação `TOO_SHORT`).
    *   $CE_2$ (Válida): $8 \le \text{tamanho} \le 64$ (tamanho permitido).
    *   $CE_3$ (Inválida): $\text{tamanho} > 64$ (muito longa, violação `TOO_LONG`).
*   **Valores-Limite Analisados e Justificativa de Cada Escolha:**
    *   **7 caracteres (Limite inferior $- 1$):** Maior valor da classe inválida inferior. É crucial testá-lo porque erros clássicos de "deslocamento por um" (*off-by-one*) costumam aceitar 7 caso o código use inadvertidamente `> 7`.
    *   **8 caracteres (Limite inferior exato):** Menor valor válido permitido pela especificação. Garante que o operador relacional inclua a igualdade (`>= 8`) e não rejeite senhas no limite mínimo.
    *   **9 caracteres (Limite inferior $+ 1$):** Menor valor estritamente interno da classe válida. Confirma que a faixa de aceitação é contínua e não restrita a um caso pontual.
    *   **63 caracteres (Limite superior $- 1$):** Maior valor estritamente interno antes da fronteira máxima. Garante que senhas longas e válidas não sofrem truncamento prematuro.
    *   **64 caracteres (Limite superior exato):** Maior valor válido permitido. Garante que o código aceite o limite máximo (`<= 64`).
    *   **65 caracteres (Limite superior $+ 1$):** Menor valor da classe inválida superior. Valida que a aplicação barra imediatamente senhas que ultrapassam a cota estabelecida contra ataques de DoS.

### b) Contador de Falhas Consecutivas de Login (RN06: Bloqueio na 3ª falha)
*   **Classes de Equivalência:**
    *   $CE_1$ (Conta não bloqueada): $0 \le \text{falhas} < 3$.
    *   $CE_2$ (Conta com bloqueio ativado): $\text{falhas} \ge 3$.
*   **Valores-Limite Analisados e Justificativa:**
    *   **0 falhas:** Estado inicial do usuário cadastrado ou imediatamente após login bem-sucedido.
    *   **1 falha:** Primeira tentativa incorreta. Deve incrementar o contador sem alterar o estado de bloqueio.
    *   **2 falhas:** Último estado válido antes do disparo do bloqueio.
    *   **3 falhas:** Ponto exato de transição (*trigger* do bloqueio). A especificação dita que a 3ª falha ainda retorna `INVALID_CREDENTIALS`, mas fixa `lockedUntil = now + 15 min`.
    *   **4 falhas (Tentativa subsequente sob bloqueio):** Primeira tentativa com a conta já bloqueada. O sistema deve retornar `ACCOUNT_LOCKED` imediatamente sem processar a senha nem alterar contadores.

### c) Duração do Bloqueio Temporal (RN06: 15 minutos)
*   **Classes de Equivalência:**
    *   $CE_1$ (Bloqueio em vigor): $\text{now} < \text{lockedUntil}$ (rejeição com `ACCOUNT_LOCKED`).
    *   $CE_2$ (Bloqueio expirado): $\text{now} \ge \text{lockedUntil}$ (conta tratada como desbloqueada, contador zerado).
*   **Valores-Limite Analisados e Justificativa:**
    *   **14 minutos e 59 segundos (Fronteira $- 1$s):** Faltando 1 segundo para a expiração do bloqueio. Garante que o bloqueio não expire prematuramente.
    *   **15 minutos e 00 segundos (Fronteira exata):** Momento em que $\text{now} = \text{lockedUntil}$. O requisito estipula que a fronteira é inclusiva para desbloqueio: exatamente ao completar 15 minutos, a conta deve estar liberada.
    *   **15 minutos e 01 segundo (Fronteira $+ 1$s):** Primeiro segundo após a expiração formal. Assegura que o sistema retoma o fluxo normal de autenticação sem retenções indevidas.

## 4.2. Tabela de Decisão do Login

Condições de entrada:
*   **C1:** O e-mail informado existe na base de dados? (V/F)
*   **C2:** A conta NÃO ESTÁ bloqueada ($\text{now} \ge \text{lockedUntil}$)? (V/F)
*   **C3:** A senha informada coincide com o hash gravado? (V/F)

Ações resultantes:
*   **A1:** Autenticar com sucesso (`ok: true`, zera falhas, limpa bloqueio).
*   **A2:** Rejeitar com `INVALID_CREDENTIALS` (incrementa falhas e agenda bloqueio se atingir 3).
*   **A3:** Rejeitar com `ACCOUNT_LOCKED` (não processa senha, não incrementa falhas).

### Tabela Completa (8 Combinações)

| Regra | C1: E-mail Existe? | C2: Conta Não Bloqueada? | C3: Senha Correta? | Ação | Justificativa do Comportamento |
|:---:|:---:|:---:|:---:|:---:|---|
| **R1** | V | V | V | **A1** | Autenticação bem-sucedida. Contador de falhas é zerado. |
| **R2** | V | V | F | **A2** | Falha de autenticação. Incrementa `failedAttempts`. Se atingir 3, define `lockedUntil`. |
| **R3** | V | F | V | **A3** | Conta sob bloqueio vigente. Acesso negado mesmo com senha correta. Não incrementa contador. |
| **R4** | V | F | F | **A3** | Conta sob bloqueio vigente. Acesso negado. Hash não é processado para economizar CPU. |
| **R5** | F | V | V | **A2** | E-mail inexistente. Retorna `INVALID_CREDENTIALS` para evitar enumeração de contas. |
| **R6** | F | V | F | **A2** | E-mail inexistente. Retorna `INVALID_CREDENTIALS`. |
| **R7** | F | F | V | **A2** | Inexistente (impossível estar bloqueada fisicamente, tratada como não encontrada). |
| **R8** | F | F | F | **A2** | Inexistente. Retorna `INVALID_CREDENTIALS`. |

### Tabela Simplificada (com "Don't Care" / `-`)

| Regra Simplificada | C1: E-mail Existe? | C2: Não Bloqueada? | C3: Senha Correta? | Ação | Regras Originais Mescladas e Justificativa |
|:---:|:---:|:---:|:---:|:---:|---|
| **S1** | V | V | V | **A1** | **R1:** Caminho feliz de autenticação. |
| **S2** | V | V | F | **A2** | **R2:** Usuário existe, conta livre, mas senha errada. |
| **S3** | V | F | **-** | **A3** | **Mescla R3 e R4:** Se a conta está bloqueada (C2=F), a verificação de senha (C3) é irrelevante (*don't care*), pois o acesso deve ser sumariamente bloqueado. |
| **S4** | F | **-** | **-** | **A2** | **Mescla R5, R6, R7 e R8:** Se o e-mail não existe (C1=F), o estado de bloqueio e a senha são irrelevantes (*don't care*), retornando sempre a falha genérica de credenciais. |

## 4.3. Casos de Teste Formais

| ID | Regra | Pré-condição | Passos de Execução | Dados de Entrada | Resultado Esperado | Prioridade |
|---|---|---|---|---|---|---|
| **CT-01** | RN01 | Nenhuma | Validar senha de 7 caracteres | `password: 'Aa1!xyz'`, `email: 'u@e.com'` | Retorna lista contendo `'TOO_SHORT'` | Alta |
| **CT-02** | RN01 | Nenhuma | Validar senha com exatos 8 caracteres | `password: 'Aa1!xyzw'`, `email: 'u@e.com'` | Lista não contém `'TOO_SHORT'` | Alta |
| **CT-03** | RN01 | Nenhuma | Validar senha com 9 caracteres | `password: 'Aa1!xyzwk'`, `email: 'u@e.com'` | Lista não contém `'TOO_SHORT'` | Média |
| **CT-04** | RN01 | Nenhuma | Validar senha com 63 caracteres | `password: 'Aa1!' + 'b'*59`, `email: 'u@e.com'` | Lista não contém `'TOO_LONG'` | Média |
| **CT-05** | RN01 | Nenhuma | Validar senha com exatos 64 caracteres | `password: 'Aa1!' + 'b'*60`, `email: 'u@e.com'` | Lista não contém `'TOO_LONG'` | Alta |
| **CT-06** | RN01 | Nenhuma | Validar senha com 65 caracteres | `password: 'Aa1!' + 'b'*61`, `email: 'u@e.com'` | Retorna lista contendo `'TOO_LONG'` | Alta |
| **CT-07** | RN02 | Nenhuma | Validar senha sem maiúscula / minúscula / dígito / especial | Entradas parametrizadas (`it.each`) | Detecta `'MISSING_UPPERCASE'`, `'MISSING_LOWERCASE'`, etc. | Alta |
| **CT-08** | RN02 | Nenhuma | Validar senha com todas as 4 classes de caracteres | `password: 'Abcdef1!'`, `email: 'u@e.com'` | Não contém nenhuma violação de complexidade | Alta |
| **CT-09** | RN02 | Nenhuma | Validar senha com múltiplas regras violadas | `password: 'abcdefgh'`, `email: 'u@e.com'` | Retorna `MISSING_UPPERCASE`, `MISSING_DIGIT`, `MISSING_SPECIAL` | Alta |
| **CT-10** | RN03 | Nenhuma | Validar senha contendo parte local do e-mail exata | `email: 'user@ex.com'`, `password: 'Pass!user123'` | Retorna lista contendo `'CONTAINS_EMAIL_LOCAL_PART'` | Alta |
| **CT-11** | RN03 | Nenhuma | Validar senha com parte local em maiúsculas | `email: 'user@ex.com'`, `password: 'Pass!USER123'` | Retorna `'CONTAINS_EMAIL_LOCAL_PART'` (case-insensitive) | Alta |
| **CT-12** | RN03 | Nenhuma | Validar senha que não contém parte local | `email: 'user@ex.com'`, `password: 'SecurePass1!'` | Não contém `'CONTAINS_EMAIL_LOCAL_PART'` | Média |
| **CT-13** | RN04 | Nenhuma | Chamar `register` com e-mail inválido | `email: 'invalid-email'`, `password: 'Strong1!'` | `{ ok: false, reason: 'INVALID_EMAIL' }`. Não invoca hash/save. | Alta |
| **CT-14** | RN01, RN05 | Nenhuma | Chamar `register` com senha fraca | `email: 'u@e.com'`, `password: 'short'` | `{ ok: false, reason: 'WEAK_PASSWORD' }`. Não invoca hash/save. | Alta |
| **CT-15** | RN04 | E-mail já cadastrado | Chamar `register` com e-mail duplicado | `email: 'u@e.com'`, `password: 'Strong1!'` | `{ ok: false, reason: 'EMAIL_ALREADY_REGISTERED' }`. Não salva. | Alta |
| **CT-16** | RN04, RN05 | Nenhuma | Chamar `register` com dados válidos | `email: 'u@e.com'`, `password: 'Strong1!'` | `{ ok: true, userId: string }`. `save()` recebe hash, nunca texto puro. | Crítica |
| **CT-17** | RN04 | Nenhuma | Chamar `register` com e-mail com espaços e maiúsculas | `email: '  User@Domain.COM  '` | `findByEmail` e `save` recebem `'user@domain.com'` normalizado. | Média |
| **CT-18** | RN06 | E-mail inexistente | Chamar `login` com e-mail não registrado | `email: 'ghost@e.com'`, `password: 'Any1!'` | `{ ok: false, reason: 'INVALID_CREDENTIALS' }`. Não verifica hash. | Alta |
| **CT-19** | RN06 | Usuário ativo | Chamar `login` com senha incorreta | `email: 'u@e.com'`, `password: 'Wrong1!'` | `{ ok: false, reason: 'INVALID_CREDENTIALS' }`. `failedAttempts` vai para 1. | Alta |
| **CT-20** | RN06 | Usuário com 2 falhas | Chamar `login` com senha correta | `email: 'u@e.com'`, `password: 'Correct1!'` | `{ ok: true }`. `failedAttempts` é resetado para 0. | Alta |
| **CT-21** | RN06 | Usuário com 2 falhas | 3ª falha consecutiva de login | `email: 'u@e.com'`, `password: 'Wrong1!'` | `{ ok: false, reason: 'INVALID_CREDENTIALS' }`. `lockedUntil = now + 15m`. | Crítica |
| **CT-22** | RN06 | Usuário bloqueado | Login aos 14min59s com senha correta | Relógio em `now = lockedUntil - 1s` | `{ ok: false, reason: 'ACCOUNT_LOCKED' }`. Não verifica hash. | Crítica |
| **CT-23** | RN06 | Usuário bloqueado | Login aos 15min00s exatos com senha correta | Relógio em `now = lockedUntil` | `{ ok: true }`. Conta desbloqueia e `failedAttempts` zera. | Alta |
| **CT-24** | RN06 | Usuário bloqueado | Login aos 15min01s com senha incorreta | Relógio em `now = lockedUntil + 1s` | Bloqueio expira, falha zera e incrementa para 1. Retorna `INVALID_CREDENTIALS`. | Alta |

---

# 5. Parte 3 (§5): Execução e TDD

## 5.1. Ciclos Red-Green-Refactor

O desenvolvimento seguiu rigorosamente o fluxo de **TDD genuíno**: nenhum código de produção foi escrito sem a prévia existência de um teste falhando por asserção. Abaixo estão registrados os ciclos e seus respectivos commits reais extraídos do histórico Git:

| Ciclo | Comportamento Implementado | Commit Red | Commit Green | Commit Refactor | Transformação Realizada no Refactor |
|:---:|---|:---:|:---:|:---:|---|
| **C1** | Rejeição de senha curta (< 8 chars, RN01) | `c67aa01` | `a5c3772` | `a25b4f1` | Substituição do número mágico `8` pela constante `MIN_LENGTH` importada de `config.ts`. |
| **C2** | Rejeição de senha longa (> 64 chars, RN01) | `2c38231` | `832aad3` | `4c1efed` | Extração da constante `MAX_LENGTH` e unificação da verificação de tamanho em bloco condicional estruturado. |
| **C3** | Regras de complexidade de caracteres (RN02) | `d34c415` | `415dd99` | `715d745` | Substituição de 4 instruções `if` sequenciais por um array declarativo de regras `{ violation, pattern }` iterado via laço `for`. |
| **C4** | Proibição da parte local do e-mail na senha (RN03) | `aa640e2` | `124cce1` | `f6827b4` | Extração da função auxiliar pura `extractLocalPart` eliminando duplicidade de normalização e `toLowerCase()`. |
| **C5** | Validação de formato de e-mail e senha no registro | `c05db6f` | `c72d055` | `d0680db` | Normalização unificada de e-mail (`trim` + `toLowerCase`) antes das validações de formato e política. |
| **C6** | Unicidade de e-mail e persistência apenas de hash | `e98e629` | `bc5b4bf` | `b013ee2` | Encapsulamento da instanciação do modelo `User` em método fábrica privado `createUser()`. |
| **C7** | Fluxo básico de login e verificação de credenciais | `a8bbb50` | `b057c50` | `54db6f8` | Extração do método auxiliar `resetLoginState()` para consolidar o reset de tentativas e desbloqueio. |
| **C8** | Bloqueio após 3 falhas e expiração de 15 minutos | `5661f93` | `12733e9` | `cd431a3` | Decomposição do método `login` em métodos de domínio semânticos: `isAccountLocked()`, `handleExpiredLock()` e `handleFailedLogin()`. |

### Detalhamento dos Ciclos 1 a 3 (Ciclos Principais da Defesa Oral)

#### Ciclo 1: Limite Inferior de Tamanho de Senha (RN01)
*   **Red (`c67aa01`):** Adicionado o caso de teste `CT-01`, que submete uma senha de 7 caracteres (`'Aa1!xyz'`). Como a implementação inicial continha apenas um esqueleto ingênuo que retornava `[]`, o teste falhou com:
    ```text
    FAIL tests/password-policy.test.ts > CT-01: rejects password with 7 characters (RN01, lower boundary - 1)
    AssertionError: expected [] to include 'TOO_SHORT'
    ```
*   **Green (`a5c3772`):** Implementada a verificação mais simples possível: `if (password.length < 8) violations.push('TOO_SHORT')`. Testes passaram.
*   **Refactor (`a25b4f1`):** O número mágico `8` foi removido do código de validação e extraído para `src/config.ts` como `export const MIN_LENGTH = 8;`, centralizando a parametrização do sistema.

#### Ciclo 2: Limite Superior de Tamanho de Senha (RN01)
*   **Red (`2c38231`):** Adicionado o caso de teste `CT-06`, submetendo uma senha de 65 caracteres. O teste falhou por asserção:
    ```text
    FAIL tests/password-policy.test.ts > CT-06: rejects password with 65 characters (RN01, upper boundary + 1)
    AssertionError: expected [] to include 'TOO_LONG'
    ```
*   **Green (`832aad3`):** Adicionado `if (password.length > 64) violations.push('TOO_LONG')`.
*   **Refactor (`4c1efed`):** Extraído `MAX_LENGTH = 64` para o arquivo de configuração e estruturada a checagem com `else if`, garantindo que uma senha não possa ser simultaneamente curta e longa.

#### Ciclo 3: Complexidade de Caracteres com Testes Parametrizados (RN02)
*   **Red (`d34c415`):** Adicionados testes parametrizados via `it.each` cobrindo a ausência individual de maiúscula, minúscula, dígito e caractere especial, além do caso cumulativo `CT-09`. Cinco testes falharam simultaneamente por asserção.
*   **Green (`415dd99`):** Escritas quatro instruções `if` condicionais sequenciais com expressões regulares (`/[A-Z]/`, `/[a-z]/`, `/[0-9]/`, `/[^A-Za-z0-9]/`).
*   **Refactor (`715d745`):** Os quatro blocos `if` repetitivos foram refatorados para uma lista declarativa constante e imutável `COMPLEXITY_RULES`. Um loop conciso percorre a lista avaliando os padrões, facilitando manutenibilidade e permitindo adicionar novos critérios de complexidade sem alterar a lógica de controle.

## 5.2. Dublês de Teste: Mocks, Stubs e Testes Parametrizados

*   **Testes Parametrizados (`it.each`):** Utilizados para avaliar partições de equivalência das regras de complexidade (`tests/password-policy.test.ts`). Evitam repetição de código de teste (*boilerplate*), permitindo que múltiplos pares de dados de entrada e saídas esperadas sejam processados pela mesma asserção lógica.
*   **Dublês de Teste (Test Doubles):**
    *   **Mock (`vi.fn()`):** Utilizado para verificar *comportamento e interações*. No `AuthService`, o `userRepository` e o `passwordHasher` foram mockados para atestar:
        1. Que `passwordHasher.hash()` é invocado com a senha pura e que o resultado retornado é repassado ao `userRepository.save()`;
        2. Que caso a senha seja inválida, os métodos `hash()` e `save()` **nunca** são invocados;
        3. Que o objeto persistido no repositório nunca contém o texto puro da senha (inspeção via `JSON.stringify`).
    *   **Stub:** Utilizado para fornecer *respostas pré-programadas de estado*. A interface `Clock` teve seu método `now()` implementado como um stub que retorna datas fixas programadas. Isso permitiu testar a fronteira exata de bloqueio aos 14m59s, 15m00s e 15m01s sem congelar a execução do teste.
    *   **Fake:** Uma implementação funcional simplificada. A classe `InMemoryUserRepository` implementa a porta `UserRepository` gravando instâncias em um `Map` do JavaScript. Ela foi usada na suíte de integração para testar a aplicação de ponta a ponta sem necessidade de provisionamento de um banco PostgreSQL ou SQLite.

## 5.3. Medição e Análise Crítica da Cobertura de Código

Executado o comando `npm run test:coverage` com o provedor `@vitest/coverage-istanbul`. A saída real do terminal gravada em `docs/evidence/coverage.txt` é resumida na tabela a seguir:

| Arquivo Analisado | % Instruções (Stmts) | % Ramos (Branch) | % Funções (Funcs) | % Linhas (Lines) | Linhas Não Cobertas |
|---|:---:|:---:|:---:|:---:|---|
| **auth-service.ts** | **100%** | **100%** | **100%** | **100%** | Nenhuma |
| **config.ts** | **100%** | **100%** | **100%** | **100%** | Nenhuma |
| **email.ts** | **100%** | **100%** | **100%** | **100%** | Nenhuma |
| **password-policy.ts** | **100%** | **100%** | **100%** | **100%** | Nenhuma |
| **in-memory-user-repository.ts** | **100%** | **50%** | **100%** | **100%** | Linha 13 |
| **scrypt-password-hasher.ts** | **95.45%** | **90%** | **100%** | **95.45%** | Linha 44 |
| **TOTAL CONSOLIDADO** | **98.94%** | **95.45%** | **100%** | **98.94%** | — |

*   *Justificativa da linha não coberta (Linha 44 em `scrypt-password-hasher.ts`):* Corresponde ao tratamento de erro `if (err) reject(err);` no callback da função nativa em C++ `crypto.scrypt`. Esta linha só é disparada se o runtime do Node.js sofrer falha catastrófica interna (como falta de memória na alocação de buffers criptográficos pelo sistema operacional), não sendo reprodutível em ambiente de teste padrão.
*   *Justificativa do branch 50% em `in-memory-user-repository.ts`:* O branch refere-se à verificação de e-mail no loop do Map, onde o branch negativo não foi avaliado isoladamente.

### O que a alta cobertura garante vs. O que ela NÃO garante (Questão da Arguição Oral)
*   **O que 100% de cobertura garante:** Garante estritamente que cada instrução, linha e desvio condicional (`if/else`) do código-fonte foi exercitado ao menos uma vez durante a execução da suíte de testes. Assegura a ausência de código morto (*dead code*).
*   **O que 100% de cobertura NÃO garante:**
    1. **Não garante correção das asserções:** Um teste pode percorrer todas as linhas sem executar asserções válidas (`expect`), alcançando 100% de cobertura sem detectar erros;
    2. **Não garante completude de requisitos:** Se uma regra de negócio inteira foi omitida pelo desenvolvedor na implementação, ela não terá linhas no código e, portanto, a cobertura indicará 100% mesmo com o sistema incompleto;
    3. **Não garante integridade sob combinações de dados:** Cobertura avalia ramos isolados, mas não testa a explosão combinatória de diferentes estados e entradas imprevistas;
    4. **Não garante resistência contra concorrência e carga:** Não atesta ausência de condições de corrida (*race conditions*) nem vazamento de memória sob estresse.
*   *Técnica complementar indispensável — Teste de Mutação (Mutation Testing):* Ferramentas de mutação (como o *Stryker Mutator*) introduzem intencionalmente pequenos defeitos sintáticos nos fontes (mutantes: trocam `+` por `-`, `>=` por `>`, invertem booleanos). Se a suíte de testes não falhar ao rodar contra o código mutado, o mutante "sobrevive", revelando testes fracos com asserções insuficientes, mesmo que a cobertura métrica indique 100%.

---

# 6. Parte 4 (§6): Resultados dos Testes, Defeitos e Ferramentas

## 6.1. Tabela de Execução dos Casos de Teste Formais

Execução realizada em **07/10/2026** no ambiente Node.js v20.12.2 com Vitest v2.1.9:

| Caso de Teste | Status | Data de Execução | Arquivo de Teste / Evidência |
|:---:|:---:|:---:|---|
| **CT-01** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-1-green.txt`) |
| **CT-02** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-1-green.txt`) |
| **CT-03** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-1-green.txt`) |
| **CT-04** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-2-green.txt`) |
| **CT-05** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-2-green.txt`) |
| **CT-06** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-2-green.txt`) |
| **CT-07** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-3-green.txt`) |
| **CT-08** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-3-green.txt`) |
| **CT-09** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-3-green.txt`) |
| **CT-10** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-4-green.txt`) |
| **CT-11** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-4-green.txt`) |
| **CT-12** | **Aprovado** | 07/10/2026 | `tests/password-policy.test.ts` (`cycle-4-green.txt`) |
| **CT-13** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-5-green.txt`) |
| **CT-14** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-5-green.txt`) |
| **CT-15** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-6-green.txt`) |
| **CT-16** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-6-green.txt`) |
| **CT-17** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-6-green.txt`) |
| **CT-18** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-7-green.txt`) |
| **CT-19** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-7-green.txt`) |
| **CT-20** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-7-green.txt`) |
| **CT-21** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-8-green.txt`) |
| **CT-22** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-8-green.txt`) |
| **CT-23** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-8-green.txt`) |
| **CT-24** | **Aprovado** | 07/10/2026 | `tests/auth-service.test.ts` (`cycle-8-green.txt`) |

*Taxa de Sucesso:* 100% dos 34 testes automatizados aprovados (0 reprovados, 0 bloqueados no escopo executado).

## 6.2. Relatórios de Defeitos Introduzidos (Branch `seeded-defects`)

Para comprovar a sensibilidade e a eficácia da suíte de testes na captura de regressões e violações de fronteira, foram injetados dois defeitos na branch isolada `seeded-defects`.

### Relatório de Defeito D1: Rejeição Indevida de Senha de 8 Caracteres
*   **ID do Defeito:** D1
*   **Título:** Falha de valor-limite inferior: senha com exatamente 8 caracteres é rejeitada como `TOO_SHORT`.
*   **Commit do Defeito:** `4568361` na branch `seeded-defects`.
*   **Commit de Reversão:** `0c4aa80` na branch `seeded-defects`.
*   **Arquivo Modificado:** `src/password-policy.ts`.
*   **Regra Afetada:** RN01 (Tamanho da senha).
*   **Severidade:** Alta (impede usuários com senhas válidas de se cadastrarem).
*   **Prioridade:** Alta.
*   **Passos para Reproduzir:**
    1. Alterar a condição de tamanho em `src/password-policy.ts` de `password.length < MIN_LENGTH` para `password.length <= MIN_LENGTH`;
    2. Executar a suíte de testes com `npx vitest run`.
*   **Resultado Esperado:** A senha de 8 caracteres `'Aa1!xyzw'` deve ser considerada válida em relação ao tamanho mínimo.
*   **Resultado Obtido:** O teste falha com `AssertionError: expected [ 'TOO_SHORT' ] to not include 'TOO_SHORT'`.
*   **Teste que Detectou:** `CT-02: accepts password with exactly 8 characters (RN01, lower boundary)`.
*   **Evidência Salva:** `docs/evidence/defect-D1.txt`.
*   **Resolução:** Defeito revertido via `git revert 4568361`, restabelecendo o operador correto `< MIN_LENGTH`.

### Relatório de Defeito D2: Persistência do Contador de Falhas após Login Bem-Sucedido
*   **ID do Defeito:** D2
*   **Título:** Contador `failedAttempts` não é resetado para zero após autenticação bem-sucedida.
*   **Commit do Defeito:** `45f969a` na branch `seeded-defects`.
*   **Commit de Reversão:** `005dfa1` na branch `seeded-defects`.
*   **Arquivo Modificado:** `src/auth-service.ts` (método `resetLoginState`).
*   **Regra Afetada:** RN06 (Política de tentativas de login).
*   **Severidade:** Crítica (um usuário que falhou 2 vezes no passado e acertou o login será injustamente bloqueado na próxima falha isolada).
*   **Prioridade:** Alta.
*   **Passos para Reproduzir:**
    1. No método `resetLoginState`, suprimir a instrução `user.failedAttempts = 0;`;
    2. Executar `npx vitest run`.
*   **Resultado Esperado:** Ao autenticar com a senha correta, o repositório deve salvar o usuário com `failedAttempts: 0`.
*   **Resultado Obtido:** O repositório persiste o usuário mantendo `failedAttempts: 2`. O teste falha acusando discrepância no mock de `userRepository.save`.
*   **Teste que Detectou:** `CT-20: returns success and resets failedAttempts on correct password (RN06)`.
*   **Evidência Salva:** `docs/evidence/defect-D2.txt`.
*   **Resolução:** Defeito revertido via `git revert 45f969a`, reativando a redefinição de tentativas para zero.

## 6.3. Comparação de Ferramentas para o Sistema Integrado

Considerando a evolução futura da biblioteca como núcleo de um sistema web completo (Backend Node.js REST + Frontend Web SPA):

| Critério / Aspecto | Cypress | Postman / Newman | Apache JMeter / k6 |
|---|---|---|---|
| **Foco Principal** | Testes End-to-End (E2E) e de Interface Web (UI). | Testes de Integração de API HTTP/REST. | Testes de Desempenho, Estresse e Carga. |
| **Camada Alvo** | Navegador (DOM, formulários, botões). | Endpoints de Rede (`/api/auth/login`). | Servidor, limites de CPU, I/O e concorrência. |
| **Facilidade de Automação CI/CD** | Média/Alta (requer headless browser). | Altíssima (execução CLI com `newman`). | Alta (execução CLI headless em pipelines). |
| **Linguagem / Scripting** | JavaScript / TypeScript. | JavaScript (em sandbox de coleções). | Groovy/Java (JMeter) ou JavaScript (k6). |
| **Adequação ao Módulo de Autenticação** | Ideal para testar a experiência do usuário: exibição de mensagens de erro amigáveis, bloqueio visual do formulário de login após 3 tentativas e máscara de digitação de senha. | Ideal para validar contratos de API: validação de status HTTP 400 (senha fraca), 401 (credenciais inválidas), 429 (bloqueio temporal), cabeçalhos de segurança e tempo de resposta. | Indispensável devido ao alto custo de CPU do algoritmo `scrypt`. Permite identificar quantos usuários simultâneos o backend suporta antes de esgotar as threads da CPU com cálculos criptográficos. |

**Escolha Justificada:** Em uma arquitetura web integrada, adotar-se-ia o **Postman/Newman** para a esteira de API (validando contratos e segurança do endpoint), o **Cypress** para a validação da interface do usuário (garantindo que o usuário legítimo receba o feedback do bloqueio de 15 minutos), e o **k6/JMeter** para atestar a escalabilidade do algoritmo de hash sob carga real.

---

# 7. Parte 5 (§7): Análise Crítica e Melhorias

## 7.1. Resultados Alcançados
O projeto comprovou a eficácia do TDD em projetos de segurança crítica:
1. A arquitetura desacoplada via inversão de dependência (portas `UserRepository`, `PasswordHasher`, `Clock`) permitiu testar 100% dos comportamentos de tempo e persistência sem dependências de infraestrutura pesadas;
2. As 6 regras de negócio foram plenamente satisfeitas com 34 testes automatizados em 4 arquivos de suíte;
3. A cobertura obtida superou a meta estabelecida, alcançando **98.94% de linhas** e **95.45% de ramos** de forma limpa e fundamentada;
4. O isolamento de testes na branch `seeded-defects` demonstrou que tanto os testes de valor-limite quanto os testes de estado capturaram instantaneamente os defeitos induzidos.

## 7.2. Limitações Técnicas do Módulo
1. **Armazenamento Volátil:** O repositório em memória não persiste dados em disco após o encerramento do processo Node.js;
2. **Custo Computacional do Hashing:** O `scrypt` foi projetado para ser computacionalmente intensivo e consumidor de memória. Em um servidor monothread sem escalabilidade horizontal, ataques massivos de login podem causar exaustão de CPU;
3. **Ausência de Segundo Fator (MFA):** O módulo baseia-se exclusivamente no fator "algo que você sabe" (senha);
4. **Armazenamento de Estado de Bloqueio no Banco:** Em sistemas de alta escala, armazenar contadores de falhas em disco pode causar sobrecarga no banco de dados.

## 7.3. Propostas de Evolução e Próximos Passos
1. **Migração para Argon2id:** Avaliar a transição do `scrypt` para o `Argon2id` (vencedor da *Password Hashing Competition*), fornecendo maior resistência contra ataques por hardware dedicado;
2. **Rate Limiting Distribuído com Redis:** Deslocar a contagem de falhas e o bloqueio de 15 minutos para uma camada de cache em memória volátil ultrarrápida (Redis), poupando o banco de dados relacional de operações de escrita a cada tentativa falha;
3. **Persistência Relacional com Migrations:** Desenvolver uma implementação concreta de `UserRepository` utilizando PostgreSQL e Prisma/Drizzle com chaves estrangeiras e índices únicos;
4. **Exposição REST / OpenAPI:** Empacotar a biblioteca em uma API HTTP utilizando Fastify, com schemas JSON validados automaticamente via TypeBox/Zod;
5. **Autenticação de Múltiplos Fatores (TOTP/WebAuthn):** Introduzir suporte a chaves físicas de segurança (FIDO2) e códigos temporais de 6 dígitos.

---

# 8. Referências

1. **ISTQB® (International Software Testing Qualifications Board).** *Certified Tester Foundation Level Syllabus*, Versão 4.0, 2023.
2. **BSTQB (Brazilian Software Testing Qualifications Board).** *Glossário de Termos de Teste de Software*, Versão 3.2, 2021.
3. **NIST (National Institute of Standards and Technology).** *Digital Identity Guidelines: Authentication and Lifecycle Management*. NIST Special Publication 800-63B, 2017.
4. **FOWLER, Martin.** *Mocks Aren't Stubs*. Disponível em: <https://martinfowler.com/articles/mocksArentStubs.html>. Acesso em: out. 2026.
5. **BECK, Kent.** *Test Driven Development: By Example*. Addison-Wesley Professional, 2002.
6. **NODE.JS FOUNDATION.** *Node.js Cryptography Documentation (`node:crypto`)*. Disponível em: <https://nodejs.org/api/crypto.html>. Acesso em: out. 2026.
7. **VITEST.** *Vitest Documentation — Next Generation Testing Framework*. Disponível em: <https://vitest.dev/>. Acesso em: out. 2026.
