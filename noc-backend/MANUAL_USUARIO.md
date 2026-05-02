# NOC Visual — Manual do Usuário

**Sistema de Monitoramento de Rede**
Uso exclusivo da equipe NOC / Suporte Técnico

---

## O que é o NOC Visual?

O NOC Visual é um painel de monitoramento de rede em tempo real. Ele mostra no mapa todos os equipamentos da provedora
(POPs, rádios, servidores e clientes corporativos), indica o status de cada um (online, offline ou instável)
e gera alertas automáticos quando algum equipamento cai ou apresenta problema.

---

## Acesso ao Sistema

O sistema possui autenticação. Ao acessar o endereço do NOC Visual, você será redirecionado para a tela de login.

- **Login:** seu usuário cadastrado (padrão inicial: `admin`)
- **Senha:** sua senha cadastrada
- Após o login, o token de acesso é salvo automaticamente no navegador por **8 horas**
- Ao expirar, o sistema redireciona automaticamente para o login

> ⚠️ Não compartilhe suas credenciais. Cada operador deve ter seu próprio usuário.

---

## Tela Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR: online / offline / instável / enlaces / relógio / Sair │
├──────────┬──────────────────────────────────────┬───────────────┤
│ ESQUERDA │              MAPA                    │   DIREITA     │
│ Ferramen.│                                      │ Alertas       │
│ Busca    │   [elementos no mapa]                │ Estatísticas  │
│ Elementos│                                      │ Detalhe       │
│          │                                      │ Latência      │
└──────────┴──────────────────────────────────────┴───────────────┘
```

---

## Cores dos elementos

| Cor da borda | Significado |
|---|---|
| 🟢 Verde | Online — respondendo normalmente |
| 🔴 Vermelho (piscando) | Offline — sem resposta ao ping |
| 🟡 Amarelo | Instável — latência alta ou perda de pacotes |
| ⚪ Cinza | Desconhecido — ainda não foi verificado |

**Linhas de enlace:**

| Cor | Significado |
|---|---|
| Verde | Ambos os lados online |
| Vermelho | Um dos lados offline |
| Amarelo | Um dos lados instável |

---

## Como cadastrar um equipamento

1. No painel esquerdo, clique no **tipo** do equipamento:
   - **POP** — ponto de presença
   - **RB/OLT** — rádio, bridge, OLT
   - **Servidor** — servidores da empresa
   - **Corporativo** — clientes com contrato prioritário

2. O cursor muda para mira (+). **Clique no mapa** na posição do equipamento.

3. Preencha o formulário:
   - **Nome** — identifique claramente (ex: "OLT Cidade A", "Hospital Municipal")
   - **IP** — endereço IP acessível pelo servidor de monitoramento
   - **Tipo** — confirme o tipo correto
   - **Prioridade** — use 1 para equipamentos críticos
   - **Localização** — endereço físico (opcional, mas recomendado)

4. Clique em **Salvar**.

> ⚠️ O equipamento começa a ser monitorado automaticamente em até 30 segundos.

---

## Como criar um enlace entre dois equipamentos

1. Clique em **Enlace** na toolbox
2. Clique no equipamento **origem** (ex: POP)
3. Clique no equipamento **destino** (ex: OLT)
4. Preencha as informações opcionais e clique em **Criar Enlace**

O enlace aparece como uma linha colorida conectando os dois pontos.
A cor muda automaticamente conforme o status dos equipamentos.

> ℹ️ Os enlaces são salvos no banco de dados e persistem após recarregar a página.

---

## Como editar um equipamento

- Clique no ícone do equipamento no mapa → botão **Editar** no popup
- Ou clique no nome na lista esquerda para selecionar → botão **Editar** no painel direito

---

## Como remover um equipamento

- Clique no ícone do mapa → botão **Remover** no popup
- Ou clique no **X** ao lado do nome na lista esquerda

> ⚠️ A remoção é permanente e apaga o histórico de pings.

---

## Painel de Alertas (direita)

Os alertas aparecem automaticamente quando:
- Um equipamento fica **offline** → alerta CRÍTICO (vermelho)
- Latência alta ou perda de pacotes → alerta WARNING (amarelo)
- Equipamento volta ao normal → alerta é resolvido automaticamente

Os alertas são ordenados do mais recente para o mais antigo.

---

## Gráfico de Latência

Ao clicar em qualquer equipamento, o gráfico no rodapé direito mostra o histórico de latência das últimas medições.
A linha tracejada amarela indica o limite de atenção (100ms).

---

## Botões do topo

| Botão | Função |
|---|---|
| Monitoramento | Liga/desliga a atualização automática da tela |
| Simular Falha | Simula uma falha aleatória para treinamento |
| Restaurar | Restaura todos os elementos após simulação |
| Exportar | Baixa a lista de equipamentos em JSON |
| Importar | Importa uma lista de equipamentos de um JSON |
| **Sair** | Encerra a sessão e redireciona para o login |

---

## Camadas do mapa

Use os botões flutuantes no topo do mapa:
- **Rua** — mapa padrão OpenStreetMap
- **Satélite** — imagem de satélite
- **Dark** — modo escuro (recomendado para NOC)
- **Ajustar** — centraliza o mapa em todos os elementos

---

## Busca no mapa

Digite um endereço ou nome de cidade na caixa de busca (painel esquerdo) para navegar rapidamente até uma localização.

> ⚠️ A busca requer conexão com a internet. Em rede offline, navegue pelo mapa manualmente.

---

## Simulação de falha (treinamento)

O botão **Simular Falha** no topo cria uma falha aleatória num enlace ou equipamento para treinamento da equipe.
Use o botão **Restaurar** para voltar ao normal. A simulação é apenas visual — não afeta o monitoramento real.

---

## Como sair do sistema

Clique no botão **Sair** no canto superior direito da topbar. O sistema encerrará sua sessão e retornará à tela de login.

> ℹ️ A sessão expira automaticamente após 8 horas mesmo sem clicar em Sair.

---

## Perguntas frequentes

**O equipamento sumiu do mapa após recarregar a página?**
Os dispositivos são carregados do banco de dados automaticamente.
Se sumiram, verifique se o backend está rodando.

**Os alertas não aparecem mesmo com o equipamento offline?**
Verifique se o worker de ping está rodando. Sem o worker, não há monitoramento real.

**Fui redirecionado para o login sem querer sair?**
O token de sessão expira após 8 horas. Faça login novamente normalmente.

**O enlace some ao recarregar a página?**
Os enlaces são salvos no banco de dados e devem persistir. Se sumirem, verifique se o backend está rodando.

**Como saber se o sistema está funcionando?**
Verifique o contador no topo. Se os números estiverem atualizando, o sistema está ativo.
Você pode também acessar `http://[IP-SERVIDOR]:8000/health` para verificar a API.
