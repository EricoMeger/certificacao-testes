# 1. Capa

**Instituição:** Instituto Federal do Paraná (IFPR) - Campus Pinhais
**Curso:** Bacharelado em Ciência da Computação
**Disciplina:** Testes de Software
**Professor:** Gerson Peres
**Aluno:** João da Silva
**Título:** Relatório de Testes: Cadastro e Login de Usuários com Regras de Senha
**Local:** Pinhais - PR
**Data:** Outubro de 2026

---

# 2. Introdução

Este relatório documenta o planejamento, a modelagem e os resultados dos testes do módulo de Cadastro e Login de Usuários. O sistema foi desenvolvido em TypeScript e implementa o padrão de retorno *Result* em vez de exceções (para melhor controle do fluxo de execução, segurança de tipos e previsibilidade das falhas operacionais).

O módulo deve atender às seguintes Regras de Negócio (RNs):

*   **RN01:** A senha deve ter entre 8 e 64 caracteres (inclusive).
    *   *Justificativa:* Segue as recomendações de segurança do NIST SP 800-63B, evitando senhas muito curtas (fáceis de quebrar por força bruta) e limitando o tamanho máximo para evitar ataques de negação de serviço (DoS) durante o hash.
*   **RN02:** A senha deve conter ao menos uma letra maiúscula, uma minúscula, um dígito e um caractere especial.
    *   *Justificativa:* Aumenta a entropia da senha e previne ataques baseados em dicionários de senhas comuns.
*   **RN03:** A senha não pode conter a parte local do e-mail (case-insensitive).
    *   *Justificativa:* Impede que usuários criem senhas previsíveis baseadas em sua própria identidade de login.
*   **RN04:** O e-mail deve possuir formato válido e ser único no sistema (case-insensitive, após aplicar *trim*).
    *   *Justificativa:* Garante que cada usuário tenha um identificador unívoco e corretamente formatado para comunicações futuras.
*   **RN05:** A senha deve ser armazenada apenas como *hash* (algoritmo scrypt), nunca em texto plano.
    *   *Justificativa:* Medida crítica de segurança. O uso do *scrypt* protege contra ataques de dicionário acelerados por hardware (GPUs/ASICs) devido à sua exigência de memória.
*   **RN06:** Após 3 tentativas falhas consecutivas de login, a conta é bloqueada por 15 minutos. Um login com sucesso zera o contador.
    *   *Justificativa:* Mitiga ataques de força bruta online (adivinhação de senhas). O contador e o tempo limite oferecem um equilíbrio entre segurança e usabilidade.

> *Nota de Segurança:* Como princípio de segurança, o sistema de login retorna o mesmo código de erro (`INVALID_CREDENTIALS`) tanto para e-mails não cadastrados quanto para senhas incorretas, a fim de evitar o vazamento de informações sobre quais contas existem no sistema (enumeração de contas).

---

# 3. Parte 1 (§3): Fundamentos e Planejamento

## 3.1. Erro, Defeito, Falha e Verificação vs. Validação

Com base no glossário do ISTQB/BSTQB, podemos ilustrar os conceitos fundamentais usando este módulo:

*   **Erro (Engano):** É uma ação humana que produz um resultado incorreto. Exemplo: O desenvolvedor não compreende bem o requisito RN01 e acha que "entre 8 e 64" significa que 8 e 64 são tamanhos inválidos.
*   **Defeito (Bug/Falha interna):** O resultado do erro inserido no código. Exemplo: Devido ao erro do desenvolvedor, o código escrito contém a condição `if (password.length > 8 && password.length < 64)` em vez de `if (password.length >= 8 && password.length <= 64)`.
*   **Falha (Falha externa):** A manifestação do defeito durante a execução. Exemplo: Quando o teste tenta criar uma conta com uma senha de exatamente 8 caracteres, o sistema a rejeita, falhando no caso de teste projetado.

Quanto aos processos de qualidade:
*   **Verificação:** O sistema foi construído corretamente? (Foco no processo e na especificação). Exemplo: Revisar o código para garantir que a função de hash usa `scrypt` em vez de `MD5` atende aos requisitos técnicos. Executar testes de unidade é uma atividade de verificação.
*   **Validação:** O sistema certo foi construído? (Foco na necessidade do usuário). Exemplo: Avaliar se o bloqueio de 15 minutos não frustra excessivamente os usuários reais enquanto impede ataques de força bruta.

## 3.2. Plano de Teste Resumido

*   **Escopo:** Testar o módulo de registro (`register`) e autenticação (`login`), validando todas as regras de complexidade de senha, hash e política de bloqueio de contas.
*   **Itens a testar:** Serviço de Autenticação (`AuthService`), Utilitários de Validação de Senha (`PasswordPolicy`), Repositório de Usuários em Memória (`UserRepository`), Funções Criptográficas Hash.
*   **Fora do escopo:** Integração com banco de dados real (SQL/NoSQL), interface de usuário (UI/Front-end), envio de e-mails de recuperação de senha.
*   **Níveis e Tipos:** Testes de Unidade, Testes de Integração (focados nas regras de negócio e integrações internas). Testes funcionais estruturais e baseados em especificação.
*   **Critérios de Entrada:** A interface (assinatura das funções) do módulo deve estar definida. O ambiente de desenvolvimento (Node.js e Vitest) configurado.
*   **Critérios de Saída:** Cobertura de instrução mínima de 90%. Todos os defeitos críticos corrigidos. 100% de execução dos casos de teste definidos na seção 4.
*   **Riscos:** Uso inadequado do algoritmo `scrypt` (lento para os testes). Complexidade na simulação de passagem de tempo (temporizadores para o bloqueio de 15 minutos).
*   **Ambiente:** Node.js v20+, TypeScript, framework de testes Vitest com uso de *Fake Timers* para manipulação de data/hora.
*   **Papéis:** João da Silva atuará como Analista de Testes (modelagem), Desenvolvedor (implementação TDD) e Testador (execução e relato).

## 3.3. Níveis e Tipos de Teste

De acordo com o ISTQB, os níveis de teste referem-se às fases do ciclo de vida em que os testes são aplicados. Neste projeto, temos:

*   **Executados:**
    *   **Teste de Unidade (Componente):** Foco isolado nas classes/módulos. Foram desenvolvidos testes unitários para a política de senha (`password-policy`) e para o `auth-service` utilizando *mocks/stubs* para o repositório e para a criptografia.
    *   **Teste de Integração (Componente):** Foco na comunicação entre os módulos internos. O `auth-service` foi testado integrando-se com um repositório em memória (`in-memory repo`) e com a implementação real do gerador de hash (`scrypt`).
*   **Apenas Planejados (Não executados nesta etapa):**
    *   **Teste de Integração de Sistema / Teste de API:** Testar as requisições HTTP REST (roteadores Express/Fastify).
    *   **Teste de Sistema / UI:** Testar o cadastro e login por meio do navegador (Cypress/Playwright).
    *   **Teste de Desempenho:** Testar quantos logins simultâneos a CPU suporta antes da latência ficar inaceitável, devido ao alto custo computacional do `scrypt`.

---

# 4. Parte 2 (§4): Técnicas de Modelagem e Casos de Teste

## 4.1. Partição de Equivalência e Análise do Valor Limite

### a) Tamanho da Senha (RN01)
A regra diz que a senha deve ter entre 8 e 64 caracteres.
*   **Classes de Equivalência:**
    *   Inválida: < 8 caracteres
    *   Válida: 8 a 64 caracteres
    *   Inválida: > 64 caracteres
*   **Valores Limites Analisados:**
    *   **7:** O maior tamanho inválido inferior. Usado para testar se senhas curtas demais são rejeitadas.
    *   **8:** O menor tamanho válido. Usado para verificar a inclusão do limite inferior (>= 8).
    *   **9:** O menor valor válido acima do limite. Verifica se a faixa de tolerância não é "apenas 8".
    *   **63:** O maior valor válido abaixo do limite superior.
    *   **64:** O maior tamanho válido. Usado para verificar a inclusão do limite superior (<= 64).
    *   **65:** O menor tamanho inválido superior. Usado para testar se o sistema bloqueia senhas muito extensas.

### b) Contador de Falhas de Login (RN06)
A regra define bloqueio após 3 falhas.
*   **Classes de Equivalência:**
    *   Válida: 0 a 2 falhas (Login normal permitido)
    *   Inválida/Bloqueio ativado: 3 ou mais falhas
*   **Valores Limites Analisados:**
    *   **0:** Nenhuma falha (estado inicial ou limpo).
    *   **1:** Primeira tentativa falha. O sistema deve registrar, mas não bloquear.
    *   **2:** Segunda tentativa falha. Conta ativa, mas próxima do limite.
    *   **3:** Terceira tentativa falha. *Gatilho do bloqueio.* A partir deste limite, `lockedUntil` recebe a data atual + 15min. (Nota: a resposta da 3ª falha ainda é `INVALID_CREDENTIALS`).
    *   **4:** Quarta tentativa. A conta já está bloqueada. O sistema deve retornar `ACCOUNT_LOCKED`.

### c) Duração do Bloqueio (RN06)
A conta fica bloqueada por exatos 15 minutos.
*   **Classes de Equivalência:**
    *   Inválida (Tempo de bloqueio vigente): Momento atual < tempo `lockedUntil`
    *   Válida (Bloqueio expirado): Momento atual >= tempo `lockedUntil`
*   **Valores Limites Analisados:**
    *   **14:59 minutos:** Faltando um milissegundo/segundo para expirar, o acesso deve ser negado (`ACCOUNT_LOCKED`), assegurando que a penalidade inteira seja cumprida.
    *   **15:00 minutos:** O tempo exato de desbloqueio. Como o requisito estipula "15 minutos", no exato milissegundo de término, a conta deve ser considerada desbloqueada.
    *   **15:01 minutos:** Após o término. Assegura que o temporizador não falhou em liberar permanentemente a conta.

## 4.2. Tabela de Decisão

A funcionalidade de login envolve a avaliação de 3 condições principais:
*   **C1:** E-mail existe (cadastrado)?
*   **C2:** A conta NÃO ESTÁ sob bloqueio (momento atual >= `lockedUntil`)?
*   **C3:** A senha fornecida está correta?

As ações esperadas são:
*   **A1:** Retornar `SUCCESS` e zerar falhas
*   **A2:** Retornar `INVALID_CREDENTIALS` (e incrementar contador se for conta válida não bloqueada)
*   **A3:** Retornar `ACCOUNT_LOCKED`

### Tabela Completa (8 Combinações)

| Regra | C1: Email Existe | C2: Conta Não Bloqueada | C3: Senha Correta | Ação Esperada | Observação / Ação Interna |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **R1** | V | V | V | SUCCESS | Zera falhas, limpa bloqueio |
| **R2** | V | V | F | INVALID_CREDENTIALS | Incrementa falhas |
| **R3** | V | F | V | ACCOUNT_LOCKED | Mantém contador/bloqueio inalterados |
| **R4** | V | F | F | ACCOUNT_LOCKED | Mantém contador/bloqueio inalterados |
| **R5** | F | V | V | INVALID_CREDENTIALS | Oculta inexistência do e-mail |
| **R6** | F | V | F | INVALID_CREDENTIALS | Oculta inexistência do e-mail |
| **R7** | F | F | V | INVALID_CREDENTIALS | Uma conta inexistente não tem estado de bloqueio |
| **R8** | F | F | F | INVALID_CREDENTIALS | Uma conta inexistente não tem estado de bloqueio |

### Tabela Simplificada (Com uso de *Don't Care*)

Muitas condições são irrelevantes (*Don't Care* / "-") em certos contextos.
1. Se o e-mail não existe (C1=F), o sistema retornará sempre `INVALID_CREDENTIALS`, não importando o status de bloqueio ou a senha (uma vez que não há o que validar).
2. Se a conta está bloqueada (C2=F), o sistema retorna `ACCOUNT_LOCKED` independentemente da senha fornecida (C3) para evitar processamento de hash (economizar recursos contra DDoS) e avisar do bloqueio.

| Regra Simp. | C1: Email Existe | C2: Conta Não Bloq. | C3: Senha Correta | Ação Esperada | Justificativa de Simplificação |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **S1** | V | V | V | SUCCESS | Caminho feliz (R1) |
| **S2** | V | V | F | INVALID_CREDENTIALS | Autenticação falhou. Incrementa contador (R2) |
| **S3** | V | F | - | ACCOUNT_LOCKED | Se bloqueado, não processa senha (C3 é *don't care*). (Mescla R3 e R4) |
| **S4** | F | - | - | INVALID_CREDENTIALS | Se não existe, simula falha simples para segurança (C2 e C3 são *don't care*). (Mescla R5, R6, R7, R8) |

## 4.3. Casos de Teste Formais

| ID | Pré-condição | Passos | Dados de Entrada | Resultado Esperado | Prioridade | Rastreabilidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CT-01** | Sistema limpo | Chamar registro com senha muito curta | `senha=Abcd@12` (7 chars) | Falha de validação (tamanho) | Alta | RN01 |
| **CT-02** | Sistema limpo | Chamar registro com senha válida menor | `senha=Abcd@123` (8 chars) | Sucesso | Média | RN01 |
| **CT-03** | Sistema limpo | Chamar registro com senha gigantesca | `senha=` string de 65 chars válidos | Falha de validação (tamanho) | Média | RN01 |
| **CT-04** | Sistema limpo | Chamar registro sem letra maiúscula | `senha=abcd@123` | Falha de validação (maiúscula) | Alta | RN02 |
| **CT-05** | Sistema limpo | Chamar registro sem número | `senha=Abcdefg@` | Falha de validação (dígito) | Alta | RN02 |
| **CT-06** | Sistema limpo | Chamar registro sem caractere especial | `senha=Abcdef12` | Falha de validação (especial) | Alta | RN02 |
| **CT-07** | Sistema limpo | Chamar registro contendo e-mail (exato) | `email=joao@a.c`, `senha=Ajoao123@` | Falha de validação (parte local) | Alta | RN03 |
| **CT-08** | Sistema limpo | Chamar registro contendo e-mail (maiúsculo) | `email=joao@a.c`, `senha=AJOAO123@` | Falha de validação (parte local) | Alta | RN03 |
| **CT-09** | Usuário existe | Chamar registro com e-mail já usado (+espaços) | `email=" joao@a.c "` | Falha (E-mail duplicado após trim) | Alta | RN04 |
| **CT-10** | Usuário cadastrado | Checar base de dados | `user.password` | Não deve conter a senha em texto plano | Crítica | RN05 |
| **CT-11** | Usuário cadastrado | Fazer login com e-mail inexistente | `email=ghost@a.c` | Result = `INVALID_CREDENTIALS` | Alta | Segurança |
| **CT-12** | Usuário cadastrado | Fazer login com senha incorreta (1ª e 2ª vez) | `senha=errada` | Result = `INVALID_CREDENTIALS`, contadores em 1 e 2 | Alta | RN06 |
| **CT-13** | Usuário cadastrado (2 falhas) | Fazer login com senha incorreta (3ª vez) | `senha=errada` | Result = `INVALID_CREDENTIALS`, estado atualiza p/ bloqueio | Alta | RN06 |
| **CT-14** | Usuário bloqueado | Fazer login com senha CORRETA (4ª tentativa) | `senha=certa` | Result = `ACCOUNT_LOCKED` | Crítica | RN06 |
| **CT-15** | Usuário bloqueado (tempo exato) | Avançar tempo em 15m00s, fazer login com senha certa | `senha=certa` | Result = `SUCCESS`, contador de falhas zera | Alta | RN06 |

---

# 5. Parte 3 (§5): Execução e TDD
TODO - a ser preenchido após os ciclos de TDD.

# 6. Parte 4 (§6): Resultados dos Testes
TODO - a ser preenchido após a execução.

# 7. Parte 5 (§7): Análise Crítica
TODO - a ser preenchido.

# 8. Referências
1. ISTQB® - *Certified Tester Foundation Level Syllabus*, Versão 4.0.
2. NIST SP 800-63B - *Digital Identity Guidelines: Authentication and Lifecycle Management*.
3. Documentação oficial do Node.js (módulo `crypto`).
4. Documentação oficial do Vitest.
