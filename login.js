
const telaLogin = document.getElementById("telaLogin");
const sistema = document.getElementById("sistema");
const erroLogin = document.getElementById("erroLogin");
const formulario = document.getElementById("formLogin");

// Mostra o sistema somente quando existe uma sessão
function mostrarSistema(logado) {
    telaLogin.style.display = logado ? "none" : "block";
    sistema.style.display = logado ? "block" : "none";
}

// Efetua login
formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const email = document.getElementById("emailLogin").value;
    const senha = document.getElementById("senhaLogin").value;
    const botao = formulario.querySelector("button");

    erroLogin.textContent = "";
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

        if (error) {
            erroLogin.textContent =
                "Não foi possível entrar. Confira e-mail e senha.";
            mostrarSistema(false);
            return;
        }

        mostrarSistema(Boolean(data.session));
        document.getElementById("senhaLogin").value = "";

    } catch (erro) {
        console.error(erro);
        erroLogin.textContent =
            "Erro de conexão. Tente novamente.";
    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar no sistema";
    }
});

// Sair do sistema
async function sair() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Não foi possível sair. Tente novamente.");
        return;
    }

    mostrarSistema(false);
}

// Recupera uma sessão que já estava aberta
async function verificarLogin() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(error);
            mostrarSistema(false);
            return;
        }

        mostrarSistema(Boolean(data.session));
    } catch (erro) {
        console.error(erro);
        mostrarSistema(false);
    }
}

// Mantém a interface sincronizada com o login
supabaseClient.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "SIGNED_IN" ||
        evento === "SIGNED_OUT" ||
        evento === "INITIAL_SESSION") {
        mostrarSistema(Boolean(sessao));
    }
});

verificarLogin();
