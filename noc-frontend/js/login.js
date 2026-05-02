/**
 * login.js
 * Lógica da tela de login.
 * Depende de auth.js — deve ser carregado depois.
 */

// Se já estiver logado, vai direto pro dashboard
auth.redirecionarSeLogado();

const campoLogin = document.getElementById('campo-login');
const campoSenha = document.getElementById('campo-senha');
const btnLogin   = document.getElementById('btn-login');
const erroMsg    = document.getElementById('erro-msg');
const erroTexto  = document.getElementById('erro-texto');

// Enter no campo login avança para senha
campoLogin.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') campoSenha.focus();
});

// Enter no campo senha dispara o login
campoSenha.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fazerLogin();
});

btnLogin.addEventListener('click', fazerLogin);


async function fazerLogin() {
  const login = campoLogin.value.trim();
  const senha = campoSenha.value;

  // Validação básica antes de chamar a API
  if (!login || !senha) {
    mostrarErro('Preencha o login e a senha.');
    return;
  }

  // Desabilita o botão enquanto aguarda resposta da API
  btnLogin.disabled = true;
  btnLogin.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Entrando...';
  erroMsg.classList.remove('visivel');

  try {
    await auth.fazerLogin(login, senha);

    // Login bem-sucedido — redireciona para o dashboard
    window.location.href = 'index.html';
  } catch (erro) {
    mostrarErro(erro.message || 'Erro ao conectar com o servidor.');
  } finally {
    // Reabilita o botão independente do resultado
    btnLogin.disabled = false;
    btnLogin.innerHTML = '<i class="fa fa-sign-in-alt"></i> Entrar';
  }
}


function mostrarErro(mensagem) {
  erroTexto.textContent = mensagem;
  erroMsg.classList.add('visivel');
}