
const paginaEntrada = document.getElementById("paginaEntrada");
const formEntrada = document.getElementById("formEntrada");
const mensagemEntrada = document.getElementById("mensagemEntrada");
const botaoEntrada = document.getElementById("botaoEntrada");

async function carregarEstoque() {
    const { data, error } = await supabaseClient
        .from("reuse_estoque")
        .select("preco, quantidade");

    if (error) {
        mensagemEntrada.textContent =
            "Erro ao consultar estoque: " + error.message;
        return;
    }

    document.getElementById("estoque5").textContent =
        data.find(item => item.preco === 5)?.quantidade ?? 0;

    document.getElementById("estoque10").textContent =
        data.find(item => item.preco === 10)?.quantidade ?? 0;
}

formEntrada.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const qtd5 = Number(document.getElementById("entrada5").value);
    const qtd10 = Number(document.getElementById("entrada10").value);

    if (!Number.isSafeInteger(qtd5) ||
        !Number.isSafeInteger(qtd10) ||
        qtd5 < 0 || qtd10 < 0 ||
        qtd5 + qtd10 === 0) {
        mensagemEntrada.textContent =
            "Informe quantidades inteiras e positivas.";
        return;
    }

    botaoEntrada.disabled = true;
    mensagemEntrada.textContent = "Registrando entrada...";

    try {
        if (qtd5 > 0) {
            const { error } = await supabaseClient.rpc(
                "registrar_entrada",
                { p_preco: 5, p_quantidade: qtd5 }
            );
            if (error) throw error;
        }

        if (qtd10 > 0) {
            const { error } = await supabaseClient.rpc(
                "registrar_entrada",
                { p_preco: 10, p_quantidade: qtd10 }
            );
            if (error) throw error;
        }

        mensagemEntrada.textContent =
            "Entrada registrada com sucesso!";

        formEntrada.reset();
        await carregarEstoque();

    } catch (erro) {
        console.error(erro);
        mensagemEntrada.textContent =
            "Não foi possível concluir: " + erro.message;
    } finally {
        botaoEntrada.disabled = false;
    }
});

async function iniciarPagina() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }

    paginaEntrada.style.display = "block";
    await carregarEstoque();
}

iniciarPagina();
