/**
 * auth.js
 * Gerencia autenticação JWT no frontend.
 * Responsável por salvar/recuperar o token e redirecionar o usuário.
 */

const CHAVE_TOKEN = 'noc_token';        // Chave usada no localStorage
const CHAVE_USUARIO = 'noc_usuario';    // Chave para dados do usuário logado


const auth = {

  /**
   * Salva o token JWT recebido após o login.
   */
  salvarToken(token) {
    localStorage.setItem(CHAVE_TOKEN, token);
  },

  /**
   * Recupera o token salvo. Retorna null se não estiver logado.
   */
  obterToken() {
    return localStorage.getItem(CHAVE_TOKEN);
  },

  /**
   * Salva os dados do usuário logado (nome, login, admin).
   */
  salvarUsuario(usuario) {
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  },

  /**
   * Recupera os dados do usuário logado.
   */
  obterUsuario() {
    const dados = localStorage.getItem(CHAVE_USUARIO);
    return dados ? JSON.parse(dados) : null;
  },

  /**
   * Remove token e dados do usuário — efetua logout.
   */
  limparSessao() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  },

  /**
   * Verifica se o usuário está autenticado.
   * Redireciona para login.html se não estiver.
   */
  exigirLogin() {
    const token = this.obterToken();
    if (!token) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Se já estiver logado, redireciona para o dashboard.
   * Usado na página de login para não mostrar o form desnecessariamente.
   */
  redirecionarSeLogado() {
    const token = this.obterToken();
    if (token) {
      window.location.href = 'index.html';
    }
  },

  /**
   * Realiza o login — chama a API e salva o token.
   * Retorna true se sucesso, lança erro se falhar.
   */
  async fazerLogin(login, senha) {
    const res = await fetch(`${window.NOC_API_BASE || 'http://localhost:8000'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, senha }),
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.detail || 'Erro ao fazer login');
    }

    const dados = await res.json();

    // Salva o token recebido
    this.salvarToken(dados.access_token);

    // Busca e salva os dados do usuário logado
    const usuarioRes = await fetch(`${window.NOC_API_BASE || 'http://localhost:8000'}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${dados.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (usuarioRes.ok) {
      const usuario = await usuarioRes.json();
      this.salvarUsuario(usuario);
    }

    return true;
  },

  /**
   * Efetua logout — limpa a sessão e redireciona para o login.
   */
  fazerLogout() {
    this.limparSessao();
    window.location.href = 'login.html';
  },
};